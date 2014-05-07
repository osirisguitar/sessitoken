sessitoken
==========

Handles session or token based storing with sliding expiration

Currently supplies one store: FileStore. FileStore saves sessions to disk in JSON format.

##Useage

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

server.use(sessitoken(options));
```

When <code>req</code> is passed to the route handler, <code>req.token</code> and <code>req.session</code> will have been added. Changes to <code>req.session</code> will be persisted when the <code>response</code> is finished.
