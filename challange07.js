#!/usr/bin/env node

// Challenge 7: Write a script that will create 2 Cloud Servers and add them as nodes
// to a new Cloud Load Balancer. Worth 3 Points

var flavor = '2', // 512MB RAM
    image = 'c94f5e59-0760-467a-ae70-9a37cfa6b94e', // Arch Linux
    count = 2;

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

client.authorize(function(err) {
  if(err) {
    log("Error authenticating: %s", err);
    process.exit(1);
    return;
  }

  log("Authorized %s, building %d servers...", creds.username, count);

  var finished_servers = [];

  for(var n=1; n<=count; n++) {
    client.createServer({
      image: image,
      flavor: flavor,
      name: 'web-node-' + n,
    }, function(err, server) {
      log("Waiting for %s to finish", server.name);
      server.setWait({'status':'ACTIVE'}, { interval:2500, }, function(err, server) {
        log("%s: ip=%s, password=%s, id=%s", server.name, server.addresses['private'][0].addr,
          server.adminPass, server.id);

        finished_servers.push(server);

        if(finished_servers.length == count) {
          build_load_balancer(finished_servers);
        }
      });
    });
  }
});

function build_load_balancer(servers) {
  client.createLoadBalancer({
    name: 'challange7-web',
    nodes: _.map(servers, function(server) {
      return {address: server.addresses['private'][0].addr, port:80, condition:'ENABLED'};
    }),
    protocol: rackspace.Protocols.HTTP,
    virtualIps: [{type: rackspace.VirtualIpTypes.SERVICENET}],
  }, function(err, lb) {
    log("Made Load Balancer for these servers");
    log("%s: ip=%s:%s, id=%s", lb.name, lb.virtualIps[0].address, lb.port, lb.id);
  });
}

// vim: tabstop=2 expandtab syntax=javascript
