'use strict';

var connect   = require('../lib/connect.js');
var lcards    = require('../lib/lcards.js');
var insert    = lcards.insert;
var search    = lcards.search;
var timestamp = lcards.timestamp;
var expect    = require('chai').expect;
var co        = require('co');
var r         = require('rethinkdb');

function clean() {
  return co(function* () {
    var conn = yield connect();
    yield r.table('lcard').delete().run(conn);
  });
}

describe('Test lcards insertions', function () {

  beforeEach(clean);
  after(clean);

  it('Insert lcards', function () {
    var conn, lcards;
    return co(function* () {
      yield insert('123\n\n\r\n456\n\r', 'America');
      conn = yield connect();
      lcards = yield r.table('lcard').run(conn);
      lcards = yield lcards.toArray();
      expect(lcards.length).to.equal(2);
      expect(lcards[0].id).to.equal('123');
      expect(lcards[0].region).to.equal('America');
      expect(lcards[0].orders).is.an('Object');
      expect(lcards[0].bindings).is.an('Array');
    });
  });

});

describe('Test lcards searching', function () {

  beforeEach(clean);
  after(clean);

  it('Search lcards by no filters', function (done) {
    var conn, lcards, cursor, i = 0;
    co(function* () {
      yield insert('123\n456', 'America');
      yield insert('234\n567', 'Europe');
      conn = yield connect();
      return yield search(null, null, null, 1, 20);
    }).then(function (cursor) {
      cursor.on('data', function (lcard) {
        if (++i === 4) {
          cursor.close();
          done();
        }
      });
      cursor.on('error', done);
    }, done);;
  });

  it('Search lcards by id', function (done) {
    var conn, lcards, cursor;
    co(function* () {
      yield insert('123\n456', 'America');
      conn = yield connect();
      return yield search('123', null, null, 1, 20);
    }).then(function (cursor) {
      cursor.on('data', function (lcard) {
        expect(lcard.new_val.id).to.equal('123');
        cursor.close();
        done();
      });
      cursor.on('error', done);
    }, done);;
  });

  it('Search lcards by region', function (done) {
    var conn, lcards, cursor, i = 0;
    co(function* () {
      yield insert('123\n456', 'America');
      yield insert('234\n567', 'Europe');
      conn = yield connect();
      return yield search(null, null, 'Europe', 1, 20);
    }).then(function (cursor) {
      cursor.on('data', function (lcard) {
        expect(lcard.new_val.id).to.be.within('234', '567');
        if (++i === 2) {
          cursor.close();
          done();
        }
      });
      cursor.on('error', done);
    }, done);;
  });

  it('Search lcards by ctime', function (done) {
    var conn, lcards, update, cursor, i = 0;
    co(function* () {
      yield insert('123\n456', 'America');
      yield insert('234\n567', 'Europe');
      conn = yield connect();
      update = {ctime: r.epochTime(timestamp('2015.07.07'))};
      yield r.table('lcard').get('234').update(update).run(conn);
      return yield search(null, timestamp('2015.07.07'), null, 1, 20);
    }).then(function (cursor) {
      cursor.on('data', function (lcard) {
        expect(lcard.new_val.id).to.equal('234');
        cursor.close();
        done();
      });
      cursor.on('error', done);
    }, done);;
  });

});
