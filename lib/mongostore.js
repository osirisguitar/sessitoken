'use strict';
/**
 * Session store using MongoDB.
 */

var _ = require('lodash');
var promisedMongo = require('promised-mongo');

/**
 * Options available for MongoStore
 *
 * options 
 * {
 *  duration: expiry time of session in ms (default: 20 minutes)
 *  activeDuration: time session is extended with for each request in ms(default: 5 minutes)
 *  collection: MongoDB collection in which to store sessions (default: sessions)
 * }
 */
var standardOptions = {
  collection: 'sessions',
  duration: 20 * 60 * 1000,
  activeDuration: 5 * 60 * 1000
};

function MongoStore(options) {
  this.options = _.merge(standardOptions, options || {});
  var mongodb = promisedMongo(options.connectionString);
  this.sessionCollection = mongodb.collection(this.options.collection);
  this.sessionCollection.ensureIndex({ 'expires': 1 }, { expireAfterSeconds: 0 });
  this.sessionCollection.ensureIndex({ 'data.token': 1 });
}

MongoStore.prototype.get = function(key) {
  var sessionCollection = this.sessionCollection;
  return sessionCollection
    .findOne({ 'data.token': key })
    .then(function (session) {
      if (!session) {
        return {};
      } else if (session.expires.getTime() < Date.now()) {
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

  return sessionCollection
    .findOne({
      'data.token': key
    })
    .then(function(session) {
      // if no session and no data or data is empty object
      if (!session && (!data || !Object.keys(data).length)) {
        return;
      }

      var now = Date.now();
      // if no session, create a session having data and expires date
      if (!session) {
        session = {
          expires: new Date(now + options.duration),
          data: data
        };
      } else {
        // Update data
        if (data) {
          session.data = data;
        }
        // Update expiry
        if (session.expires.getTime() < now + options.activeDuration) {
          session.expires = new Date(session.expires.getTime() + options.activeDuration);
        }
      }

      return sessionCollection.save(session)
        .then(function(result) {
          return result;
        });
    });
};

module.exports = MongoStore;