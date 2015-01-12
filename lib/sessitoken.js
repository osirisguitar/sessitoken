'use strict';
var FileStore = require('./filestore'),
  tokenGenerator = require('./tokengenerator'),
  _ = require('lodash');
var MongoStore = require('./mongostore');

/**
 * Available options for sessitoken. Note that stores also have options that also affect
 * sessitoken's behavior.
 * 
 * options 
 * {
 *  duration: expiry time of session in ms (default: 20 minutes)
 *  activeDuration: time session is extended with for each request in ms(default: 5 minutes)
 *  ignoreHeader: name of a header which, if present, disables saving session. Used for mixed mode 
 *    applications that allow both regular sessions and stateless logins using signed requests. Exists
 *    to prevent signed requests from creating new sessions with each request.
 *  store: a store for sessions (default: FileStore)
 * }
 */
var standardOptions = {
  duration: 20 * 60 * 1000,
  activeDuration: 5 * 60 * 1000
};

function SessiToken(options) {
  this.options = _.merge(standardOptions, options || {});
  if(!this.options.store) {
    this.options.store = new FileStore(this.options);
  }
  this.options.store.duration = this.options.duration;
  this.options.store.activeDuration = this.options.activeDuration;

  this.requestHandler = this.requestHandler.bind(this);
}

SessiToken.prototype.getKey = function(req) {
  if(this.options.token && req.headers && req.headers[this.options.token]) {
    return req.headers[this.options.token];
  } else if(this.options.cookie && req.cookies && req.cookies[this.options.cookie]) {
    return req.cookies[this.options.cookie];
  } else {
    return;
  }
};

/**
 * Overrides response.end or response.send to save the session before sending
 * the response to the client. If req.headers contains options.ignoreHeader
 * The override isn't done and the session wont be saved.
 *
 * Params:
 * req - request object
 * res - response object
 * key - the session key (or undefined for new session)
 */
SessiToken.prototype.overrideFinalizeResponse = function(req, res, key) {
  var self = this;

  // Save session state at beginning of request to be able to
  // verify if any changes were made during the request
  var originalSession = JSON.stringify(req.session);

  function finalizeResponse() {
    /*jshint validthis:true */
    var _this = this;
    var args = arguments;
    self.saveSession(key, req, originalSession)
      .then(function () {
        // Call  original function after session is stored
        if (typeof _this === 'function') {
          _this.apply(res, args);
        }
      });
  }

  var saveSession = true;

  if (req.headers && this.options.ignoreHeader) {
    Object.keys(req.headers).forEach(function(headerName) {
      if (headerName.toLowerCase() === self.options.ignoreHeader.toLowerCase()) {
        saveSession = false;
      }
    });
  }

  if (saveSession) {    if (res.send) {
      res.send = finalizeResponse.bind(res.send);
    } else {
      res.end = finalizeResponse.bind(res.end);
    }    
  }
};

SessiToken.prototype.requestHandler = function(req, res, next) {
  var key = this.getKey(req);

  // Override response.send or response.end to save updated session before
  // the response goes out to the client
  this.overrideFinalizeResponse(req, res, key);

  if(key) {
    if(this.options.token) { req[this.options.token] = key; }

    this.options.store.get(key)
      .done(function (value) {
        req.session = value.data;
        return next();
      }, function (err) {
        // error should be handled outside of promise chain
        throw err;
      });
  } else {
    key = tokenGenerator.generate();
    if(this.options.cookie) {
      res.setHeader('Set-Cookie', [this.options.cookie + '=' + key]);
    }
    if(this.options.token) { req[this.options.token] = key; }
    req.session = {};
    return next();
  }
};

/**
 * Saves session with updated values, or just updates expiry time
 * if no fields were changed during request.
 *
 * @param  {string} key             Session token
 * @param  {object} req             Request
 * @param  {string} originalSession Session state at beginning of request (stringified)
 * @return {object}                 Promise
 */
SessiToken.prototype.saveSession = function (key, req, originalSession) {
  if(JSON.stringify(req.session) !== originalSession) {
    return this.options.store.update(key, req.session);
  } else {
    return this.options.store.update(key);
  }
};

module.exports = {
  MongoStore: MongoStore,
  FileStore: FileStore,
  sessitoken: function (opts) {
    var sessiToken = new SessiToken(opts);
    return sessiToken.requestHandler;
  }
};