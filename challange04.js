#!/usr/bin/env node

// Challenge 4: Write a script that uses Cloud DNS to create a new A record when passed 
// a FQDN and IP address as arguments. Worth 1 Point

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

if(process.argv.length < 4) {
  console.error("usage: node "+process.argv[1]+" FQDN IP_ADDRESS");
  process.exit(1);
}

var newName = process.argv[2],
    newIP = process.argv[3],
    ipv4 = !!newIP.match(/^([0-9]{1,3}\.){3}[0-9]{1,3}$/),
    ipv6 = !!newIP.match(/^([a-f0-9]{1,4}::?){1,7}[0-9a-f]{0,4}$/i);

if(!ipv4 && !ipv6) {
  console.error(newIP +" is not a valid IPv4 or IPv6 address!");
  process.exit(1);
}

if(!newName.match(/^[a-z0-9\.-]+$/i)) {
  console.error(newName +" is not a valid domain name!");
  process.exit(1);
}

client.authorize(function(err) {
  if(err) {
    log("Error authenticating: %s", err);
    process.exit(1);
    return;
  }

  log("Authorized %s", creds.username);

  var domain = null;
  client.getDomains(function(err, domains) {
    for(var i in domains) {
      var name = domains[i].name;
      if((new RegExp(name+'$')).exec(newName) && (!domain || name.length > domain.name.length)) {
        domain = domains[i];
      }
    }

    if(domain) {
      add_record(domain);
    }
    else {
      var newZone = newName.split('.').slice(-2).join('.');
      log("Adding new zone %s", newZone);
      client.createDomainsWithWait(
        [{name:newZone, emailAddress:"hostmaster@rackspace.com"}], function(err, newDomain) {
          if(err) {
            log("ERROR: %s", err);
            process.exit(2);
          }
          add_record(newDomain[0]);
        }
      );
    }
  });
});

function add_record(domain) {
  log("Adding record to zone %s", domain.name);
  var newType = ipv6 ? 'AAAA' : 'A';
  domain.addRecordsWithWait(
    [{name:newName, data:newIP, type:newType}], function(err, records) {
      log("Record added!");
      log("%s. IN %s %s", newName, newType, newIP);
    }
  );
}

// vim: tabstop=2 expandtab syntax=javascript
