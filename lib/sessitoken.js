'use strict';
var FileStore = require('./filestore'),
  tokenGenerator = require('./tokengenerator'),
  _ = require('lodash');

var standardOptions = {
  duration: 20 * 60 * 1000,
  activeDuration: 5 * 60 * 1000
};

function SessiToken(options) {
  this.options = _.merge(options || {}, standardOptions);
  if(!this.options.store) {
    this.options.store = new FileStore(this.options);
  }

  this.requestHandler = this.requestHandler.bind(this);
}

SessiToken.prototype.requestHandler = function(req, res, next) {
  var self = this, key;

  if(this.options.cookie && req.cookies && req.cookies[this.options.cookie]) {
    key = req.cookies[this.options.cookie];
  } else if(this.options.token && req.headers && req.headers[this.options.token]) {
    key = req.headers[this.options.token];
  }

  if(key) {
    this.options.store.get(key)
      .then(function (value) {
        req.session = value.data;
        res.on('finish', self.onResponseFinish.bind(self, key, req, JSON.stringify(req.session)));
        return next();
      }).catch(console.error.bind(console));
  } else {
    key = tokenGenerator.generate();
    if(this.options.cookie) {
      res.setHeader('Set-Cookie', [this.options.cookie + '=' + key]);
    }
    if(this.options.token) {
      req[this.options.token] = key;
    }
    req.session = {};
    res.on('finish', self.onResponseFinish.bind(self, key, req, JSON.stringify(req.session)));
    return next();
  }
};

SessiToken.prototype.onResponseFinish = function(key, req, originalSession) {
  if(JSON.stringify(req.session) !== originalSession) {
    this.options.store.update(key, req.session);
  } else {
    this.options.store.update(key);
  }
};

module.exports = function (opts) {
  var sessiToken = new SessiToken(opts);
  return sessiToken.requestHandler;
};