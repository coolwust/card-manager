'use strict';

var expect = require('chai').expect;
var lcards = require('../lib/lcards.js');
var co = require('co');
var r = require('rethinkdb');
var connect = require('../lib/connect.js');

describe('testing card query', function () {

  beforeEach(function (done) {
    co(function* () {
      var conn = yield connect();
      yield r.tableDrop('lcard').run(conn);
      yield r.tableCreate('lcard').run(conn);
      yield r.table('lcard').indexCreate('date_added').run(conn);
      var records = [
        { id: 12, region: 'europe', date_added: r.time(2016, 1, 1, '+08:00') },
        { id: 23, region: 'europe', date_added: r.time(2016, 2, 1, '+08:00') },
        { id: 34, region: 'usa', date_added: r.time(2016, 3, 1, '+08:00') },
        { id: 45, region: 'usa', date_added: r.time(2016, 4, 1, '+08:00') },
        { id: 56, region: 'usa', date_added: r.time(2016, 4, 1, '+08:00') }
      ];
      yield r.table('lcard').insert(records).run(conn);
    }).then(done, done);
  });

  it('find all cards', function (done) {
    co(function* () {
      var data = { page: 1, region: 'all' };
      var cursor = yield lcards.cardsSearch(data);
      var result = yield cursor.toArray();
      expect(result).to.have.length(5);
    }).then(done, done);
  });

  it('find cards filtered by id', function (done) {
    co(function* () {
      var data = { page: 1, region: 'all', id: '3' };
      var cursor = yield lcards.cardsSearch(data);
      var result = yield cursor.toArray();
      expect(result).to.have.length(2);
    }).then(done, done);
  });

  it('find cards filtered by region', function (done) {
    co(function* () {
      var data = { page: 1, region: 'usa' };
      var cursor = yield lcards.cardsSearch(data);
      var result = yield cursor.toArray();
      expect(result).to.have.length(3);
    }).then(done, done);
  });

  it('find cards filtered by date', function (done) {
    co(function* () {
      var data = { page: 1, region: 'all', date: { year: 2016, month: 4, day: 1 } };
      var cursor = yield lcards.cardsSearch(data);
      var result = yield cursor.toArray();
      expect(result).to.have.length(2);
    }).then(done, done);
  });

  it('find cards filtered by multiple constraints', function (done) {
    co(function* () {
      var data = { page: 1, id: '5', region: 'usa', date: { year: 2016, month: 4, day: 1 } };
      var cursor = yield lcards.cardsSearch(data);
      var result = yield cursor.toArray();
      expect(result).to.have.length(2);
    }).then(done, done);
  });
});
