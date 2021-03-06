#!/usr/bin/env node

// Challenge 8: Write a script that will create a static webpage served out of Cloud Files. The
// script must create a new container, cdn enable it, enable it to serve an index file, create
// an index file object, upload the object to the container, and create a CNAME record pointing
// to the CDN URL of the container. Worth 3 Points

var iniparser = require('iniparser'),
    util = require('util'),
    Stream = require('stream'),
    cloudfiles = require('cloudfiles'),
    rackspace = require('rackspace-openstack');

try {
  cf_common = require('./node_modules/cloudfiles/lib/cloudfiles/common');
} catch(ex) {
  console.error("Sorry, but this script requires that the 'cloudfiles' npm module be installed in ./node_modules/cloudfiles");
  process.exit(1);
}

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

// the cloudfiles modules doesn't support this,
// so we have to write our own function
cloudfiles.Container.prototype.setWebIndex = function(objectname, callback) {
  var self = this;

  cf_common.rackspace({
    client: cfclient,
    method: 'POST',
    uri: cfclient.storageUrl(this.name),
    headers: {'X-Container-Meta-Web-Index': objectname},
  }, callback, function (body, res) { callback(null, self) });
}


cfclient.setAuth(function(err) {
  if(err) {
    log("Error authenticating: %s", err);
    process.exit(1);
    return;
  }

  log("Authorized %s", creds.username);

  var container_name = "challange8-static-www",
      new_container = new cloudfiles.Container(cfclient, {name:container_name, cdnEnabled:true});
      subdomain_name = "www.challange8",
      index_file = "home.html";

  // instead of making a temporary file to just upload and delete, we make this in-memory stream that
  // the cloudfiles module can read and upload just as well.
  function StringReader(str) { this.data = str }
  util.inherits(StringReader, Stream);
  StringReader.prototype.resume = function() {
    this.emit('data', this.data);
    this.emit('end');
    this.emit('close');
  }

  var index_content = new StringReader("<html><body><h1>It works!</h1><h2>On Rackspace Cloud Files</h2></body></html>");

  cfclient.createContainer(new_container, function(err, container) {
    log("Created CDN-enabled container %s", container.name);

    var todo = 3, // number of outstanding tasks we will be setting off
        cdn_domain = container.cdnUri.replace('http://', '');

    // Make a CNAME record for this container (first domain we find)
    client.authorize(function(err) {
      client.getDomains(function(err, domains) {
        var domain_name = subdomain_name + "." + domains[0].name;
        domains[0].addRecordsWithWait(
          [{name:domain_name, data:cdn_domain, type:'CNAME'}], function(err, records) {
            log("Added CNAME record %s -> %s", domain_name, cdn_domain);
            next_task(--todo);
          }
        );
      });
    });

    // Set a default web index file name, old-school style
    container.setWebIndex(index_file, function(err, container) {
      log("Set container index");
      next_task(--todo);
    });

    // Upload initial index file
    container.addFile(index_file, false, {stream:index_content}, function(err, success) {
      log("%s file created", index_file);
      next_task(--todo);
    });
    index_content.resume();
  });
});

function next_task(todo) {
  if(todo !== 0) return;
  log("All tasks done.");
}

// vim: tabstop=2 expandtab syntax=javascript
