var FileStore = require('./lib/filestore');
var store = new FileStore();

store.set('abc123', 'foo', 'bar')
  .then(function () {
    console.log('set');
    return store.update();
  })
  .then(function () {
    console.log('saved to disk');
    return store.get('abc123');
  })
  .then(function (entry) {
    console.log('entry', entry);
    return store.get('abc123', 'foo');
  })
  .then(function (value) {
    console.log('value', value);
    return store.del('abc123', 'foo');
  })
  .then(function () {
    console.log('deleted');
    return store.get('abc123', 'foo');
  })
  .then(function (value) {
    console.log('value', value);
    return store.clear('abc123');
  })
  .then(function () {
    console.log('cleared');
    return store.update();
  })
  .then(function () {
    console.log('saved to disk');
  })
  .catch(console.error.bind(console));