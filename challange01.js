#!/usr/bin/env node

// Challenge 1: Write a script that builds three 512 MB Cloud Servers that following a similar
// naming convention. (ie., web1, web2, web3) and returns  the IP and login credentials for
// each server. Use any image you want. Worth 1 point

var flavor = '2', // 512MB RAM
    image = 'c94f5e59-0760-467a-ae70-9a37cfa6b94e', // Arch Linux
    count = 3;

var iniparser = require('iniparser'),
    util = require('util'),
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

client.authorize(function(err) {
  if(err) {
    log("Error authenticating: %s", err);
    process.exit(1);
    return;
  }

  log("Authorized %s, building %d servers...", creds.username, count);

  for(var n=1; n<=count; n++) {
    client.createServer({
      image: image,
      flavor: flavor,
      name: 'app-node-' + n,
    }, function(err, server) {
      log("Waiting for %s to finish", server.name);
      server.setWait(function(s) { return s.accessIPv4 && s.accessIPv4!='' }, { interval:2500, }, function(err, server) {
        log("%s: ip=%s, password=%s, id=%s", server.name, server.accessIPv4, server.adminPass, server.id);
      });
    });
  }
});

// vim: tabstop=2 expandtab syntax=javascript
