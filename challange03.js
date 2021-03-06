#!/usr/bin/env node

// Challenge 3: Write a script that accepts a directory as an argument as well as a 
// container name. The script should upload the contents of the specified directory to
// the container (or create it if it doesn't exist). The script should handle errors
// appropriately. (Check for invalid paths, etc.) Worth 2 Points

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    _ = require('underscore'),
    iniparser = require('iniparser'),
    cloudfiles = require('cloudfiles'),
    bagpipe = require('bagpipe');
    

function log(message) {
  var args = [message];
  for(var i=1; i<arguments.length; i++) {
    args[i] = typeof(arguments[i]) != "string" ? util.inspect(arguments[i]) : arguments[i];
  }
  util.log(util.format.apply(this, args));
}

function resolvePath(string) {
  // this is here to resolve the ~ character to the user's home directory.
  // it also removes a trailing / from the directory name while its at it.
  if(string.substr(0,1) === '~')
    string = process.env.HOME + string.substr(1);
  if(string.substr(string.length-1) == '/')
    string = string.substr(0, string.length-1);
  return path.resolve(string);
}

var config = iniparser.parseSync(process.env['HOME']+'/.rackspace_cloud_credentials'),
    creds = config.rackspace_cloud;
var client = cloudfiles.createClient({auth:{username:creds.username, apiKey:creds.api_key}});
var upload_queue = new bagpipe(3);

if(process.argv.length < 4) {
  console.error("usage: node "+process.argv[1]+" containerName directory");
  process.exit(1);
}

var targetContainer = process.argv[2],
    baseDirectory = resolvePath(process.argv[3]),
    num_files = 0, num_finished = 0;

try {
  var stat = fs.statSync(baseDirectory);
}
catch(ex) {
  console.error(baseDirectory+" does not exist");
  process.exit(1);
}

if(!stat.isDirectory()) {
  console.error(baseDirectory+" is not a directory");
  process.exit(1);
}

function check_container() {
  client.getContainers(function(err, containers) {
    container = _.find(containers, function(c) { return c.name == targetContainer });

    if(!container) {
      create_container();
    }
    else {
      upload_directory(baseDirectory);
    }
  });
}

function create_container() {
  log("Creating container: %s", targetContainer);
  client.createContainer(targetContainer, function(err, newContainer) {
    container = newContainer;
    upload_directory(baseDirectory);
  });
}

function upload_directory(base) {
  log("scanning directory: %s", base);
  fs.readdir(base, function(err, items) {
    for(var i=0; i<items.length; i++) {
      var item = base +'/'+ items[i];
      if(fs.statSync(item).isDirectory()) {
        upload_directory(item);
      }
      else {
        upload_file(item);
      }
    }
  });
}

function upload_file(file) {
  num_files++;
  var addFile_func = container.addFile.bind(container),
      remote_name = file.replace(new RegExp('^'+baseDirectory+'/'), '');
  upload_queue.push(addFile_func, remote_name, file, function(err) {
    if(err) {
      log("%s (%s)", err, file);
    }
    else {
      log("Success: %s", remote_name);
    }
  num_finished++;
  });
}

var progress_bar = setInterval(function() {
  if(num_files == 0) {
    return;
  }
  else if(num_files == num_finished) {
    log("all done.");
    clearInterval(progress_bar);
  }

  var progress = (num_finished / num_files) * 100;
  process.stdout.write("\r "+progress.toFixed(1) + "% of files done\r");
}, 200);

client.setAuth(check_container);

// vim: tabstop=2 expandtab syntax=javascript
