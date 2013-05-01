Install Dependencies
------------

    npm install iniparser rackspace-openstack cloudfiles bagpipe underscore form-data

_See note below about pulling in my fork of rackspace-openstack_

- `rackspace-openstack` is used to connect to most Rackspace Public API's.  It is the closest thing to a public NodeJS SDK out there today.  Make sure you have the most recent version, as I have had to submit a few patches to get everything to work.
- `cloudfiles` is used to interact with the Rackspace Cloud Files API.  This is the one thing that `rackspace-openstack` doesn't do.
- `bagpipe` is an asynchronous queueing system.  This is used in challange3 where the contents of an entire folder are uploaded to a Cloud Files container.
- `underscore` is a module of general NodeJS / Javascript utilities for handling different data structures.
- `form-data` generates multipart form data bodies, which is used to communicate the with Mailgun API in challange 12.

adregner/rackspace-openstack
------------
The pull requests bellow haven't been accepted yet, so you can run this command after installing the node modules with the command above to pull in my version of the codebase from my main integration branch on github:

    curl -sL https://github.com/adregner/rackspace-openstack/archive/ALL_THINGS.tar.gz | tar xzv -C node_modules/rackspace-openstack/ -s /rackspace-openstack-ALL_THINGS/./

Patches submitted upstream
------------
I have had to write some small and large patches for upstream modules needed to complete these challanges.  A summary of them will eventually be added below.

*Still pending merge upstream*
- https://github.com/kenperkins/rackspace-openstack/pull/6 (setWait callback on createServer)
- https://github.com/kenperkins/rackspace-openstack/pull/9 (fix expected response on LoadBalancer.setErrorPage)
- https://github.com/kenperkins/rackspace-openstack/pull/10 (implement cloud networks)
