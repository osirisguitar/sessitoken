'use strict';
/* jshint expr: true */
var chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  proxyquire = require('proxyquire');
var sinonPromise = require('sinon-promise');

chai.use(require('sinon-chai'));

describe('MongoStore', function () {
  var MongoStore, store, sandbox, promisedMongo, sessionCollection, mongoData;

  before(function() {
    sinonPromise(sinon);
  });

  after(function() {
    sinonPromise.restore();
  });

  beforeEach(function () {
    sessionCollection = {
      findOne: sinon.promise(),
      save: sinon.promise(),
      remove: sinon.promise(),
      ensureIndex: sinon.promise()
    };

    promisedMongo = {
      collection: sinon.stub().returns(sessionCollection)
    };

    sandbox = sinon.sandbox.create();

    MongoStore = proxyquire('../lib/mongostore', { 'promised-mongo': sinon.stub().returns(promisedMongo) });
    store = new MongoStore({ connectionString: 'foo' });

    mongoData = {
      foo: {
        expires: new Date(Date.now() + 21 * 60 * 10000),
        data: { herp: 'derp', token: 'foo' }
      },
      bar: {
        expires: new Date(Date.now() - 10),
        data: { baz: true, token: 'bar' }
      }
    };
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('#get', function () {
    it('calls sessionCollection find', function () {
      store.get('foo');
      expect(sessionCollection.findOne).calledOnce;
      expect(sessionCollection.findOne).calledWith({ 'data.token': 'foo' });
    });
    it('returns an object corresponding to the passed key', function () {
      var listener = sinon.spy();
      var fail = sinon.spy();
      store.get('foo').then(listener).catch(fail);
      sessionCollection.findOne.resolve(mongoData.foo);
      expect(listener).calledOnce;
      expect(listener).calledWith(mongoData.foo);
    });
    it('returns an empty object if session has expired', function () {
      var listener = sinon.spy();
      store.get('bar').then(listener);
      sessionCollection.findOne.resolve(mongoData.bar);
      sessionCollection.remove.resolve({});
      expect(listener).calledWith({});
    });
    it('returns an empty object if session does not exist in database', function () {
      var listener = sinon.spy();
      store.get('baz').then(listener);
      sessionCollection.findOne.resolve();
      expect(listener).calledWith({});
    });
  });

  describe('#update', function () {
    it('does nothing if no change and no session', function () {
      store.update('baz');
      sessionCollection.findOne.resolve();
      expect(sessionCollection.save).not.called;
    });
    it('does nothing if no change and session is an empty object', function () {
      store.update('baz', {});
      sessionCollection.findOne.resolve();
      expect(sessionCollection.save).not.called;
    });
    it('updates data and writes to database if changed', function () {
      mongoData.foo.data.herp = 'doge';

      store.update('foo', mongoData.foo.data);
      sessionCollection.findOne.resolve(mongoData.foo);

      expect(sessionCollection.save).calledOnce;
      expect(sessionCollection.save).calledWith(mongoData.foo);
    });
    it('updates expires and writes to database if time to expiry < activeDuration', function () {
      sandbox.stub(Date, 'now').returns(1000);
      mongoData.foo.expires = new Date(1100);
      store.update('foo');
      sessionCollection.findOne.resolve(mongoData.foo);
      expect(sessionCollection.save, 'sessionCollection.save').calledOnce;
      mongoData.foo.expires = 5 * 60 * 1000 + 1100;
      expect(sessionCollection.save).calledWith(mongoData.foo);
    });
  });
});