#!/usr/bin/env node

// Challenge 6: Write a script that creates a CDN-enabled container in Cloud Files. Worth 1 Point

var iniparser = require('iniparser'),
    util = require('util'),
    cloudfiles = require('cloudfiles');

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
var cfclient = cloudfiles.createClient({auth:{username:creds.username, apiKey:creds.api_key}});

// the cloudfiles modules doesn't support this,
// so we have to write our own function
cloudfiles.Container.prototype.enableCdn = function(enable, callback) {
  if (typeof enable === 'function') {
    callback = enable;
    enable = true;
  }

  var self = this;

  if (enable) {
    cf_common.rackspace({
      client: cfclient,
      method: 'PUT',
      uri: cfclient.cdnUrl(this.name),
      headers: {'X-CDN-Enabled': 'True'},
    }, callback, function (body, res) { callback(null, self) });
  }
  else {
    cf_common.rackspace({
      client: cfclient,
      method: 'PUT',
      uri: cfclient.cdnUrl(this.name),
      headers: {'X-CDN-Enabled': 'False'},
    }, callback, function (body, res) { callback(null, self) });
  }
}

cfclient.setAuth(function(err) {
  if(err) {
    log("Error authenticating: %s", err);
    process.exit(1);
    return;
  }

  log("Authorized %s, ", creds.username);

  cfclient.createContainer('challange6-CDN', function(err, container) {
    log("Created container %s", container.name);

    container.enableCdn(function(err, container) {
      log("Enabled CDN");
    });
  });
});

// vim: tabstop=2 expandtab syntax=javascript
