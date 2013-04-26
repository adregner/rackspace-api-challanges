#!/usr/bin/env node

// Challenge 12: Write an application that will create a route in mailgun so that when an email is
// sent to <YourSSO>@apichallenges.mailgun.org it calls your Challenge 1 script that builds 3 servers.
// Assume that challenge 1 can be kicked off by accessing http://cldsrvr.com/challenge1
// Assume the Mailgun API key exists at ~/.mailgunapi
// Worth 3 points

var fs = require('fs'),
    stream = require('stream'),
    FormData = require('form-data'),
    request = require('request');

var api_key = fs.readFileSync(process.env['HOME']+'/.mailgunapi') + '';

var form = new FormData();
form.append('priority', '1');
form.append('description', 'run challange1 script');
form.append('expression', 'match_recipient("andrew.regner@apichallenges.mailgun.org")');
form.append('action', 'forward("http://cldsrvr.com/challenge1")');
form.append('action', 'stop()');

// this is a dirty hack because its still the best way to get this
// multipart data into a string and not be chunked in the http transport
var form_data = "\r\n";
for(var i = 0; i < form._streams.length; i++) {
  if(typeof form._streams[i] !== 'function') {
    form_data += form._streams[i];
  }
  else {
    form_data += "\r\n";
  }
}

form_data += '--' + form._boundary + '--';

var mailgun_request = request('https://api.mailgun.net/v2/routes', {
  method: 'POST',
  auth: {
    username: 'api',
    password: api_key
  },
  headers: {
    'Content-Type': "multipart/form-data; boundary=" + form._boundary,
    'Content-Length': form_data.length
  },
}, function (error, response, body) {
  console.log(body);
}).write(form_data);

// vim: tabstop=2 expandtab syntax=javascript
