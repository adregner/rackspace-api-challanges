#!/usr/bin/env node

// Challenge 2: Write a script that clones a server (takes an image and deploys the image as a
// new server). Worth 2 Point

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

  log("Authorized %s, picking a server", creds.username);

  client.getServers(function(err, servers) {
    var targetServer = null;

    //console.log("found", servers.length, "servers");

    for(i in servers) {
      var server = servers[i];
      //console.log(server.name);
      // pick out the smallest, newest server on the account
      if(!targetServer || 
        server.flavor.id < targetServer.flavor.id ||
        false // server['changes-since'] > targetServer['changes-since']
      ) {
        //console.log("this one is better");
        targetServer = server;
      }
    }

    log("Choose server %s (%s), creating image", targetServer.name, targetServer.id);

    targetServer.createImage({name:"challange2"}, function(err, imageId) {
      var image = new rackspace.Image(client, {id:imageId});
      image.setWait({status:"ACTIVE"}, 4000, function(err, image) {
        log("Image %s (%s) finished", image.name, image.id);

        client.createServer({
          image: image.id,
          flavor: server.flavor.id,
          name: 'new-' + image.name
        }, function(err, server) {
          log("Waiting for server %s to finish", server.name);
          server.setWait(function(s) { return s.accessIPv4 && s.accessIPv4!='' }, { interval:2500, }, function(err, server) {
            log("%s: ip=%s, password=%s, id=%s", server.name, server.accessIPv4, server.adminPass, server.id);
          });
        });
      });
    });
  });
});

// vim: tabstop=2 expandtab syntax=javascript
