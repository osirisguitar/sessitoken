'use strict';
/**
 * Session store using MongoDB.
 */

var _ = require('lodash');

var promisedMongo = require('promised-mongo');

var standardOptions = {
  collection: 'sessions',
  duration: 20 * 60 * 1000,
  activeDuration: 5 * 60 * 1000
};

function MongoStore(options) {
  console.log('Creating new mongostore with connectionString', options.connectionString);
  this.options = _.merge(options || {}, standardOptions);
  var mongodb = promisedMongo(options.connectionString);
  this.sessionCollection = mongodb.collection(this.options.collection);
  this.sessionCollection.ensureIndex({ 'expires': 1 }, { expireAfterSeconds: 0 });
}

MongoStore.prototype.get = function(key) {
  var sessionCollection = this.sessionCollection;

  return sessionCollection.findOne({ 'data.token': key }).then(function (session) {
    if (!session) {
      return {};
    } else if (session.expires < Date.now()) {
      return sessionCollection.remove({ 'data.token': key }).then(function() {
        return {};
      });
    } else {
      return session;
    } 
  });
};

MongoStore.prototype.update = function (key, data) {
  var options = this.options;
  var sessionCollection = this.sessionCollection;

  return sessionCollection.findOne({ 'data.token': key }).then(function (session) {
    if (!session && !data) {
      return;
    }

    var now = Date.now();
    var dirty = false;
    if (!session) {
      session = {
        expires: now + options.duration,
        data: data
      };
      dirty = true;
    } else {
      // Update data
      if (data) {
        session.data = data;
        dirty = true;
      }
      // Update expiry
      if (session.expires < now + options.activeDuration) {
        session.expires += options.activeDuration;
        dirty = true;
      }
    }

    // Save if anything changed
    if (dirty) {
      return sessionCollection.save(session);
    } else {
      return;
    }
  });
};

module.exports = MongoStore;