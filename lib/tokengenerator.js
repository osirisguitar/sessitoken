'use strict';
var md5 = require('MD5');

exports.generate = function () {
  var str = Date.now().toString(16) + Math.floor(10000 * Math.random()).toString(16);
  return md5(str);
};