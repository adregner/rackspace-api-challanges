Install Dependencies
------------

    npm install iniparser rackspace-openstack cloudfiles bagpipe

- `rackspace-openstack` is used to connect to most Rackspace Public API's.  It is the closest thing to a public NodeJS SDK out there today.  Make sure you have the most recent version, as I have had to submit a few patches to get everything to work.
- `cloudfiles` is used to interact with the Rackspace Cloud Files API.  This is the one thing that `rackspace-openstack` doesn't do.
- `bagpipe` is an asynchronous queueing system.  This is used in challange3 where the contents of an entire folder are uploaded to a Cloud Files container.

We are awaiting these pull requests to make it into the npm published modules:
- https://github.com/nodejitsu/node-cloudfiles/pull/51
- https://github.com/kenperkins/rackspace-openstack/pull/7
