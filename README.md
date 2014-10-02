sessitoken
==========

Handles session or token based storing with sliding expiration

Currently supplies two stores: FileStore (default) and MongoStore. FileStore saves sessions to disk in JSON format, MongoStore saves session in a MongoDB database.

##Usage

```javascript
npm install sessitoken
```

```javascript
var sessitoken = require('sessitoken'),
  restify = require('restify');

var server = restify.createServer();

var options = {
  duration: 20 * 60 * 1000, // 20 minutes - default
  activeDuration: 5 * 60 * 1000, // 5 minutes - default. If the time to expiration < active duration, it will be increased by active duration
  token: 'auth', // a header named auth will be accepted and req.auth will be set
  cookie: 'authCookie' // a cookie named authCookie will be accepted and set
};

server.use(sessitoken.sessitoken(options));
```

When <code>req</code> is passed to the route handler, <code>req.token</code> and <code>req.session</code> will have been added. Changes to <code>req.session</code> will be persisted when the <code>response</code> is finished.

## Using MongoStore

sessitoken can save its sessions in MongoDB for easier access across multiple servers, for instance when using a load balancer.


```javascript
var sessitoken = require('sessitoken'),
  restify = require('restify');

var server = restify.createServer();

var options = {
  duration: 20 * 60 * 1000, // 20 minutes - default
  activeDuration: 5 * 60 * 1000, // 5 minutes - default. If the time to expiration < active duration, it will be increased by active duration
  token: 'auth', // a header named auth will be accepted and req.auth will be set
  cookie: 'authCookie' // a cookie named authCookie will be accepted and set,
  store: new sessitoken.MongoStore({ 
    connectionString: 'mongodb://localhost/mydatabase', // required
    collection: 'sessions' // 'sessions' - default
  })
};

server.use(sessitoken.sessitoken(options));
```