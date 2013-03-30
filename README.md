Install Dependencies
------------

    npm install iniparser rackspace-openstack cloudfiles bagpipe underscore

_TODO: specify versions in install command above for those that have been patched_

- `rackspace-openstack` is used to connect to most Rackspace Public API's.  It is the closest thing to a public NodeJS SDK out there today.  Make sure you have the most recent version, as I have had to submit a few patches to get everything to work.
- `cloudfiles` is used to interact with the Rackspace Cloud Files API.  This is the one thing that `rackspace-openstack` doesn't do.
- `bagpipe` is an asynchronous queueing system.  This is used in challange3 where the contents of an entire folder are uploaded to a Cloud Files container.
- `underscore` is a module of general NodeJS / Javascript utilities for handling different data structures.

Patches submitted upstream
------------
I have had to write some small and large patches for upstream modules needed to complete these challanges.  A summary of them will eventually be added below.
