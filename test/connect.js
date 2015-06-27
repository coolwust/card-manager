'use strict';

var r = require('rethinkdb');
var connect = require('../lib/connect.js');
var expect = require('chai').expect;
var co = require('co');

describe('connect to database', function () {
  it('connect to and manipulate database', function (done) {
    co(function* () {
      var conn = yield connect();
      var info = yield r.tableCreate('foo').run(conn);
      expect(info).to.be.an('object');
      info = yield r.tableDrop('foo').run(conn);
      expect(info).to.be.an('object');
    }).then(done, done);
  });
});
