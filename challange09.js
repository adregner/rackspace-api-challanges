#!/usr/bin/env node

// Challenge 9: Write an application that when passed the arguments FQDN, image, and flavor it
// creates a server of the specified image and flavor with the same name as the fqdn, and
// creates a DNS entry for the fqdn pointing to the server's public IP. Worth 2 Points.

var iniparser = require('iniparser'),
    util = require('util'),
    _ = require('underscore'),
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

if(process.argv.length < 4) {
  console.error("usage: node "+process.argv[1]+" FQDN IMAGE FLAVOR");
  process.exit(1);
}

var fqdn = process.argv[2],
    image = process.argv[3],
    flavor = process.argv[4];

client.authorize(function(err) {
  if(err) {
    log("Error authenticating: %s", err);
    process.exit(1);
    return;
  }

  log("Authorized %s", creds.username);

  client.createServer({image:image, flavor:flavor, name:fqdn}, function(err, server) {
    log("Building server %s", fqdn);
    server.setWait(function(s) {
      // wait for the server to have an IP address assigned.  this happens early in the build process,
      // but it still usually takes several seconds at least.
      try { return s.addresses['public'][0].addr.length > 0; }
      catch(ex) { return false; }
    }, { interval:1000, }, function(err, server) {
      var serverIP = _.select(server.addresses['public'], function(a) { return a.version == 4 })[0].addr;
      log("%s: ip=%s, password=%s, id=%s, status=%s%s", server.name, serverIP, server.adminPass, server.id,
        server['status'], (server['status'] == 'ACTIVE' && server.progress ? '' : ' ('+server.progress+'%)'));
      add_record(fqdn, serverIP);
    });
  });

  // while we are waiting for the server to get an IP address, we can look for a domain to add the new
  // record to, and create a new zone if necessary.
  var domain = null;
  client.getDomains(function(err, domains) {
    for(var i in domains) {
      var name = domains[i].name;
      if((new RegExp(name+'$')).exec(fqdn) && (!domain || name.length > domain.name.length)) {
        domain = domains[i];
      }
    }

    if(!domain) {
      var newZone = fqdn.split('.').slice(-2).join('.');
      log("Adding new zone %s", newZone);
      client.createDomainsWithWait(
        [{name:newZone, emailAddress:"hostmaster@rackspace.com"}], function(err, newDomain) {
          if(err) {
            log("ERROR creating zone: %s", err);
            process.exit(2);
          }
          domain = newDomain;
        }
      );
    }
  });

  function add_record(newName, newIP) {
    // this may get called too early.  just call ourselves again in a little bit and hope that the block above
    // is still working on creating a zone or something.
    if(!domain) {
      return setTimeout(function() { add_record(newName, newIP) }, 300);
    }

    log("Adding record to zone %s", domain.name);
    domain.addRecordsWithWait(
      [{name:newName, data:newIP, type:'A'}], function(err, records) {
        log("Record added!");
        log("%s. IN %s %s", newName, 'A', newIP);
      }
    );
  }
});

// vim: tabstop=2 expandtab syntax=javascript
