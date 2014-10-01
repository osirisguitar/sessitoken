'use strict';
/* jshint expr: true */
var chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  proxyquire = require('proxyquire');

chai.use(require('sinon-chai'));

describe('MongoStore', function () {
  var MongoStore, store, sandbox;

  beforeEach(function () {
    promisedMongo = {
    };

    fs = {
      readFileSync: sinon.stub(),
      writeFileSync: sinon.stub()
    };

    sandbox = sinon.sandbox.create();
    sandbox.stub(process, 'cwd').returns('/foo');
    sandbox.stub(process, 'nextTick').yields();

    MongoStore = proxyquire('../lib/mongostore', { 'fs': fs });
    store = new MongoStore({ connectionString: 'foo' });

    fileData = {
      foo: {
        expires: Date.now() + 21 * 60 * 10000,
        data: { herp: 'derp' }
      },
      bar: {
        expires: Date.now() - 10,
        data: { baz: true }
      }
    };
    fs.readFileSync.returns(JSON.stringify(fileData));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('#get', function () {
    it('calls fs.readFileSync', function () {
      store.get('foo');
      expect(fs.readFileSync).calledOnce;
      expect(fs.readFileSync).calledWith('/foo/.session');
    });
    it('returns an object corresponding to the passed key', function () {
      var listener = sinon.spy();
      store.get('foo').then(listener);
      expect(listener).calledWith(fileData.foo);
    });
    it('returns an empty object if session has expired', function () {
      var listener = sinon.spy();
      store.get('bar').then(listener);
      expect(listener).calledWith({});
    });
    it('returns an empty object if session does not exist in file', function () {
      var listener = sinon.spy();
      store.get('baz').then(listener);
      expect(listener).calledWith({});
    });
  });

  describe('#update', function () {
    it('does nothing if no change and no session', function () {
      store.update('baz');
      expect(fs.writeFileSync).not.called;
    });
    it('updates data and writes to file if changed', function () {
      fileData.foo.data.herp = 'doge';

      store.update('foo', fileData.foo.data);
      expect(fs.writeFileSync).calledOnce;
      expect(fs.writeFileSync).calledWith('/foo/.session', JSON.stringify(fileData));
    });
    it('updates expires and writes to file if time to expiry < activeDuration', function () {
      sandbox.stub(Date, 'now').returns(1000);
      fileData.foo.expires = 1100;
      fs.readFileSync.returns(JSON.stringify(fileData));
      store.update('foo');
      expect(fs.writeFileSync).calledOnce;
      fileData.foo.expires = 5 * 60 * 1000 + 1100;
      expect(fs.writeFileSync).calledWith('/foo/.session', JSON.stringify(fileData));
    });
  });
});