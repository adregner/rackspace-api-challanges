#!/usr/bin/env node

// Challenge 5: Write a script that creates a Cloud Database instance. This instance should
// contain at least one database, and the database should have at least one user that can 
// connect to it. Worth 1 Point

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

  log("Authorized %s, building database instance", creds.username);

  var username = "andrew",
      password = "kittens",
      dbname = "farm";

  client.createDatabaseInstanceWithWait({
    name: 'challange5-db',
    size: 1,
    flavor: 1,
    databases: [ { name: dbname } ],
    users: [ { name: username, password: password, databases: [ {name:dbname} ] } ],
  }, function(err, instance) {
    log("Instance finished: %s", instance.hostname);
    log("database: %s -- username: %s -- password: %s", dbname, username, password);
  });
});

// vim: tabstop=2 expandtab syntax=javascript
