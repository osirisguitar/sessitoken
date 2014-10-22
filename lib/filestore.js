'use strict';

var Q = require('q'),
  fs = require('fs'),
  path = require('path'),
  _ = require('lodash');

var standardOptions = {
  filename: '.session',
  duration: 20 * 60 * 1000,
  activeDuration: 5 * 60 * 1000
};

function FileStore(options) {
  this.options = _.merge(standardOptions, options || {});
  this.options.path = path.resolve(process.cwd() + '/' + this.options.filename);
}

FileStore.prototype.file = function() {
  try {
    var data = fs.readFileSync(this.options.path);
    return Q.fcall(function () {
      return JSON.parse(data);
    });
  } catch(err) {
    return Q.fcall(function () {
      return {};
    });
  }
};

FileStore.prototype.get = function(key) {
  var options = this.options;
  return this.file()
    .then(function (json) {
      if(!json[key]) {
        return {};
      } else if(json[key].expires < Date.now()) {
        delete json[key];
        fs.writeFileSync(options.path, JSON.stringify(json));
        return {};
      } else {
        return json[key];
      }
    });
};

FileStore.prototype.update = function (key, data) {
  var options = this.options;
  return this.file()
    .then(function (json) {
      var session = json[key];

      // no existing session and no data set
      if(!session && !data) { return; }

      var now = Date.now();
      var dirty = false;
      if(!session) {
        // Create new session
        json[key] = {
          expires: now + options.duration,
          data: data
        };
        dirty = true;
      } else {
        // Update data
        if(data) {
          session.data = data;
          dirty = true;
        }
        // Update expiry
        if(session.expires < now + options.activeDuration) {
          session.expires += options.activeDuration;
          dirty = true;
        }
      }

      // Save if anything changed
      if(dirty) {
        return Q.fcall(function () {
          fs.writeFileSync(options.path, JSON.stringify(json));
          return;
        });
      } else {
        return;
      }
    });
};

module.exports = FileStore;