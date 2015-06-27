'use strict';

var session = require('../lib/session.js');
var expect = require('chai').expect;
var koa = require('koa');
var http = require('http');
var connect = require('../lib/connect.js');
var r = require('rethinkdb');
var co = require('co');

describe('testing session module', function () {

  var app;
  before(function () {
    app = koa();
    app.keys = ['secret'];
    app.use(session());
    app.use(function* (next) {
      switch (this.request.path) {
        case '/login':
          this.session.name = 'kevin';
          break;
        case '/name':
          this.response.body = this.session.name || 'unknown';
          break;
        case '/update':
          this.session.name = 'mike';
          break;
        case '/logout':
          this.session = {};
          break;
      }
      yield next;
    });
    app.listen(3000);
  });

  beforeEach(function (done) {
    co(function* () {
      var conn = yield connect();
      yield r.tableDrop('session').run(conn);
      yield r.tableCreate('session').run(conn);
    }).then(done, done);
  });

  it('create a session', function (done) {
    var req = http.request({ port: 3000, path: '/login' });
    req.on('response', function (rep) {
      expect(rep.headers['set-cookie']).to.not.be.empty;
      done();
    });
    req.end();
  });

  it('retrive a session', function (done) {
    var req = http.request({ port: 3000, path: '/login' });
    req.end();
    req.on('response', function (rep) {
      var options = { 
        port: 3000,
        path: '/name',
        headers: { cookie: rep.headers['set-cookie'].join(';') }
      };
      var req = http.request(options);
      req.end();
      req.on('response', function (rep) {
        rep.on('data', function (data) {
          expect(data.toString()).to.equal('kevin');
          done();
        });
      });
    });
  });


  it('update a session', function (done) {
    var req = http.request({ port: 3000, path: '/login' });
    req.end();
    req.on('response', function (rep) {
      var options = { 
        port: 3000,
        path: '/update',
        headers: { cookie: rep.headers['set-cookie'].join(';') }
      };
      var req = http.request(options);
      req.end();
      req.on('response', function (rep) {
        var options = {
          port: 3000,
          path: '/name',
          headers: { cookie: rep.headers['set-cookie'].join(';') }
        }
        var req = http.request(options);
        req.end();
        req.on('response', function (rep) {
          rep.on('data', function (data) {
            expect(data.toString()).to.equal('mike');
            done();
          });
        });
      });
    });
  });

  it('delete a session', function (done) {
    var req = http.request({ port: 3000, path: '/login' });
    req.end();
    req.on('response', function (rep) {
      var options = { 
        port: 3000,
        path: '/logout',
        headers: { cookie: rep.headers['set-cookie'].join(';') }
      };
      var req = http.request(options);
      req.end();
      req.on('response', function (rep) {
        var options = {
          port: 3000,
          path: '/name',
          headers: { cookie: rep.headers['set-cookie'].join(';') }
        }
        var req = http.request(options);
        req.end();
        req.on('response', function (rep) {
          rep.on('data', function (data) {
            expect(data.toString()).to.equal('unknown');
            done();
          });
        });
      });
    });
  });

});
