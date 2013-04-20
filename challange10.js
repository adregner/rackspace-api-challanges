#!/usr/bin/env node

/* Challange 10: Write an application that will:
 *  - Create 2 servers, supplying a ssh key to be installed at /root/.ssh/authorized_keys.
 *  - Create a load balancer
 *  - Add the 2 new servers to the LB
 *  - Set up LB monitor and custom error page.
 *  - Create a DNS record based on a FQDN for the LB VIP.
 *  - Write the error page html to a file in cloud files for backup.
 * Whew! That one is worth 8 points!
 */

var iniparser = require('iniparser'),
    util = require('util'),
    _ = require('underscore'),
    Stream = require('stream'),
    cloudfiles = require('cloudfiles'),
    rackspace = require('rackspace-openstack');

function log(message) {
  var args = [message];
  for(var i=1; i<arguments.length; i++) {
    args[i] = typeof(arguments[i]) != "string" ? util.inspect(arguments[i]) : arguments[i];
  }
  util.log(util.format.apply(this, args));
}

var config = iniparser.parseSync(process.env['HOME']+'/.rackspace_cloud_credentials'),
    creds = config.rackspace_cloud;
var client = rackspace.createClient({auth:{username:creds.username, apiKey:creds.api_key}});
var cfclient = cloudfiles.createClient({auth:{username:creds.username, apiKey:creds.api_key}});

// instead of making a temporary file to just upload and delete, we make this in-memory stream that
// the cloudfiles module can read and upload just as well.
function StringReader(str) { this.data = str }
util.inherits(StringReader, Stream);
StringReader.prototype.resume = function() {
  this.emit('data', this.data);
  this.emit('end');
  this.emit('close');
}

// This is a general purpose function that will execute a callback when something else is "ready" for it.
function when_ready(obj, callback) {
  var waitingInterval = setInterval(function() {
    obj.getDetails(function(err, obj) {
      if(err) {
        clearInterval(waitingInterval);
        callback(null, err);
      }
      else if(obj.status == 'ACTIVE') {
        clearInterval(waitingInterval);
        callback(obj);
      }
    });
  }, 750);
}

// Settings
var container_name = "LB-backup",
    file_name = "errorpage.html",
    server_prefix = "mongrel",
    ssh_pubkey = "ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEArbg8B8H99BciVTNtBd/LSjmuNMtKVjY97xZ6A6vUnw" +
      "DqerMRHT73/5eOXqkQnPl9rm778akxSWkwZioqOPF4Xomvma6J3Vqj6XUFErk5+wLuii0PDmxcVAhqLBOz5ZXRxEN" +
      "N71Qt8PoSZJSc2hBc1Yh+SGtSU2rVMFf1pg+7r46oeeDYga1dvfwnlOk4KCNbnxhDqZsUZNn2MvipR9u5R32VG4cZ" +
      "TFWAaijuMJsaTd1F1MJHLVPZTs7vr4hyHL+Dt9hioRjxWo6TGtpcaVQyD5fD1ebwYJTp2Db2Y3YHyPo4TRkJoOXxU" +
      "kerilO/DQAweRjdSV3Sn8b9mhhr9Yljqw== andrew@aregner.com",
    error_page_content = "<html><body>" +
      "<h1>Oops!</h1><h2>Something just broke.</h2>" +
      "<p>Try clicking <a href='#' onclick='javascript:window.history.go(-1)'>here</a> to go back" +
      "to where you just were.  Or <a href='#' onclick='javascript:window.location.refresh()'>" +
      "click here</a> to reload the page and try again.  Or <a href='http://public.aregner.com/" +
      "bubblewrap.swf'>here</a> if you are just bored.</p></body></html>",
    error_page_stream = new StringReader(error_page_content),
    new_container = new cloudfiles.Container(cfclient, {name:container_name});

cfclient.setAuth(function(err) {
  if(err) {
    log("Error authenticating: %s", err);
    process.exit(1);
    return;
  }

  log("Authorized %s for Cloud Files", creds.username);

  cfclient.createContainer(new_container, function(err, container) {
    log("Created %s container", container.name);
    container.addFile(file_name, false, {stream:error_page_stream}, function(err, success) {
      log("Uploaded file %s (%s bytes)", file_name, error_page_content.length);
    });
    error_page_stream.resume();
  });
});

client.authorize(function(err) {
  if(err) {
    log("Error authenticating: %s", err);
    process.exit(1);
    return;
  }

  log("Authorized %s for Rackspace API", creds.username);

  var servers = [],
      persona = [{
        path: "/root/.ssh/authorized_keys",
        contents: (new Buffer(ssh_pubkey)).toString('base64')
      }],
      image = "a10eacf7-ac15-4225-b533-5744f1fe47c1"; //debian 6.0

  // kick off two servers
  for(var n=1; n<=2; n++) {
    client.createServer({image:image, flavor:2, name:server_prefix+n, personality:persona}, function(err, server) {
      log("Building server %s", server.name);
      server.setWait(function(s) {
        // wait for the server to have an IP address assigned.  this happens early in the build process,
        // but it still usually takes several seconds at least.
        try { return s.addresses['private'][0].addr.length > 0; }
        catch(ex) { return false; }
      }, { interval:1000, }, function(err, server) {
        if(err) {
          log("Erorr creating server: %s", err);
          process.exit(1);
        }
        log("%s: password=%s, id=%s, status=%s%s", server.name, server.adminPass, server.id,
          server['status'], (server['status'] != 'ACTIVE' && server.progress ? ' ('+server.progress+'%)' : ''));
        servers = servers.concat(server);
      });
    });
  }

  // wait for them both to finish
  var serverWaiting = setInterval(function() {
    if(servers.length < 2) { return; }
    else { clearInterval(serverWaiting); }

    // make a load balancer
    client.createLoadBalancer({
      name: 'LB_challange10',
      nodes: _.map(servers, function(server) {
        return {address: server.addresses['private'][0].addr, port:3000, condition:'ENABLED'};
      }),
      protocol: rackspace.Protocols.HTTP,
      virtualIps: [{type: rackspace.VirtualIpTypes.SERVICENET}],
    }, function(err, lb) {
      if(err) {
        log("Erorr creating load balancer: %s", err);
        process.exit(1);
      }
      log("Made Load Balancer for these servers");
      log("%s: ip=%s:%s, id=%s", lb.name, lb.virtualIps[0].address, lb.port, lb.id);

      // set the error page content
      when_ready(lb, function(lb) {
        lb.setErrorPage(error_page_content, function(err, errorpage) {
          if(err) {
            log("Erorr setting error page: %s", err);
            process.exit(1);
          }
          log("LB error page set");

          when_ready(lb, function(lb) {
            // set http health monitor
            lb.enableHealthMonitor({
              type: 'HTTP',
              delay: 10,
              timeout: 20,
              attemptsBeforeDeactivation: 2,
              path: '/',
              statusRegex: '^[23][0-9][0-9]$',
              bodyRegex: '.+',
            }, function(err, healthMonitor) {
              if(err) {
                log("Erorr enabling health monitor: %s", err);
                process.exit(1);
              }
              log("LB HTTP health monitor enabled");
            });
          });
        });
      });

      // make a DNS record
      client.getDomains(function(err, domains) {
        var domain_name = server_prefix + "." + domains[0].name;
        domains[0].addRecordsWithWait(
          [{name:domain_name, data:lb.virtualIps[0].address, type:'A'}], function(err, records) {
            if(err) {
              log("Erorr creating DNS A record: %s", err);
              process.exit(1);
            }
            log("Added A record %s -> %s", domain_name, lb.virtualIps[0].address);
          }
        );
      });

    });
  }, 200);
});

// vim: tabstop=2 expandtab syntax=javascript
