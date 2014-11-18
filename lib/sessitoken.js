'use strict';
var FileStore = require('./filestore'),
  tokenGenerator = require('./tokengenerator'),
  _ = require('lodash');
var MongoStore = require('./mongostore');

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

SessiToken.prototype.requestHandler = function(req, res, next) {
  var self = this;
  var key = this.getKey(req);

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

  // Override response.send or response.end to save updated session before
  // the response goes out to the client.
  if (res.send) {
    res.send = finalizeResponse.bind(res.send);
  } else {
    res.end = finalizeResponse.bind(res.end);
  }

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
  if (req.session && !Object.keys(req.session).length) {
    return;
  }
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