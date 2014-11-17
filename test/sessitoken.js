'use strict';
/* jshint expr: true */
var chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  Q = require('q'),
  proxyquire = require('proxyquire');

chai.use(require('sinon-chai'));

sinon.promise = function () {
  var deferred = Q.defer();
  var stub = sinon.stub().returns(deferred.promise);
  stub.resolve = deferred.resolve.bind(deferred);
  stub.reject = deferred.reject.bind(deferred);
  return stub;
};

describe('sessitoken', function () {
  var sessitoken, sandbox, clock, store, req, res, next, tokenGenerator;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(process, 'nextTick').yields();
    clock = sandbox.useFakeTimers();

    store = {
      get: sinon.promise(),
      update: sinon.promise()
    };

    req = {};
    res = {
      setHeader: sinon.spy()
    };
    next = sinon.spy();

    tokenGenerator = {
      generate: sinon.stub().returns('abcdef')
    };

    sessitoken = proxyquire('../lib/sessitoken', { './tokengenerator': tokenGenerator });
  });
  afterEach(function () {
    sandbox.restore();
  });

  it('returns a function taking three arguments', function () {
    var middleware = sessitoken.sessitoken();
    expect(middleware).to.be.a('function');
    expect(middleware).to.have.length(3);
  });

  describe('cookie', function () {
    var middleware;
    beforeEach(function () {
      middleware = sessitoken.sessitoken({ store: store, cookie: 'auth' });
    });
    it('tries to get session by cookie value', function () {
      req.cookies = { auth: 'abcdef' };
      middleware(req, res, next);
      expect(store.get).calledOnce;
      expect(store.get).calledWith('abcdef');
    });
    it('sets the sessiondata on the request and calls next', function () {
      req.cookies = { auth: 'abcdef' };
      middleware(req, res, next);
      var session = { expires: 0, data: { foo: 'bar' } };
      store.get.resolve(session);
      expect(req.session).to.equal(session.data);
      expect(next).calledOnce;
    });
  });

  describe('token', function () {
    var middleware;
    beforeEach(function () {
      middleware = sessitoken.sessitoken({ store: store, token: 'authToken' });
    });
    it('tries to get session by cookie value', function () {
      req.headers = { authToken: 'abcdef' };
      middleware(req, res, next);
      expect(store.get).calledOnce;
      expect(store.get).calledWith('abcdef');
    });
    it('sets the sessiondata on the request and calls next', function () {
      req.headers = { authToken: 'abcdef' };
      middleware(req, res, next);
      var session = { expires: 0, data: { foo: 'bar' } };
      store.get.resolve(session);
      expect(req.session).to.equal(session.data);
      expect(next).calledOnce;
    });
  });

  describe('none', function () {
    var middleware;
    beforeEach(function () {
      middleware = sessitoken.sessitoken({ store: store, token: 'authToken', cookie: 'auth' });
    });

    it('does not call store.get before next', function () {
      middleware(req, res, next);
      expect(store.get).not.called;
      expect(next).calledOnce;
    });

    it('adds a cookie if a cookie name is set', function () {
      middleware(req, res, next);
      expect(res.setHeader).calledOnce;
      expect(res.setHeader).calledWith('Set-Cookie', ['auth=abcdef']);
    });

    it('adds token to req if token name is set', function () {
      middleware(req, res, next);
      expect(req.authToken).to.equal('abcdef');
    });
  });

  describe('finalizing response', function () {
    var middleware;
    beforeEach(function () {
      middleware = sessitoken.sessitoken({ store: store, token: 'authToken', cookie: 'auth' });
    });
    it('updates session data on response finish event', function () {
      req.headers = { authToken: 'abcdef' };
      middleware(req, res, next);

      var session = { expires: 0, data: { foo: 'bar' } };
      store.get.resolve(session);
      req.session.herp = 'derp';

      // call the res.end function
      res.end();

      expect(store.update).calledOnce;
      expect(store.update).calledWith('abcdef', session.data);
    });

    it('updates session data on response finish event', function () {
      req.headers = { authToken: 'abcdef' };
      middleware(req, res, next);

      var session = { expires: 0, data: { foo: 'bar' } };
      store.get.resolve(session);
      req.session.herp = 'derp';

      // call the res.end function
      res.end();

      expect(store.update).calledOnce;
      expect(store.update).calledWith('abcdef', session.data);
    });

    it('works with res.send', function () {
      res.send = sinon.spy();
      var _send = res.send;

      req.headers = { authToken: 'abcdef' };
      middleware(req, res, next);

      var session = { expires: 0, data: { foo: 'bar' } };
      store.get.resolve(session);
      req.session.herp = 'derp';

      // call the res.end function
      res.send();

      // resolve the store update promise
      store.update.resolve();

      expect(_send).calledOnce;
    });

    it('works with res.end', function () {
      res.end = sinon.spy();
      var _end = res.end;

      req.headers = { authToken: 'abcdef' };
      middleware(req, res, next);

      var session = { expires: 0, data: { foo: 'bar' } };
      store.get.resolve(session);
      req.session.herp = 'derp';

      // call the res.end function
      res.end();

      // resolve the store update promise
      store.update.resolve();

      expect(_end).calledOnce;
    });

    it('does not update session data if not changed', function () {
      req.session = { foo: 'bar' };
      req.headers = { authToken: 'abcdef' };
      middleware(req, res, next);

      var session = { expires: 0, data: { foo: 'bar' } };
      store.get.resolve(session);

      // call the res.end function
      res.end();

      expect(store.update).calledWithExactly('abcdef');
    });
  });
});