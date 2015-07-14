'use strict'

var connect   = require('../lib/connect.js');
var orders    = require('../lib/orders.js');
var insert    = orders.insert;
var match     = orders.match;
var bind      = orders.bind;
var unbound   = orders.unbound;
var timestamp = orders.timestamp;
var chai      = require('chai');
var expect    = chai.expect;
var cap       = require("chai-as-promised")
var r         = require('rethinkdb');
var co        = require('co');
var moment    = require('moment-timezone');

chai.use(cap);

function clean() {
  return co(function* () {
    var conn = yield connect();
    yield r.table('lcard').delete().run(conn);
  });
}

describe('Test matching orders to lcards', function () {

  beforeEach(clean);
  after(clean);

  it('Match an order to an free lcard', function () {
    var lcards, conn, id;
    lcards = [
      {id: 0, region: 'America', free: r.epochTime(timestamp('2015.07.10'))},
      {id: 1, region: 'America', free: r.epochTime(timestamp('2015.07.01'))},
      {id: 2, region: 'America', free: r.epochTime(timestamp('2015.07.01'))},
      {id: 3, region: 'Europe', free: r.epochTime(timestamp('2015.06.05'))}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      id = yield match(timestamp('2015.07.09'), 'America', 1);
      expect(id).to.equal(2);
      id = yield match(timestamp('2015.06.05'), 'Europe');
      expect(id).to.equal(3);
    })
  });

  it('Match an order to a non-free lcard', function () {
    var lcards, conn;
    lcards = [
      {id: 0, region: 'America', free: r.epochTime(timestamp('2015.07.10'))},
      {id: 1, region: 'America', free: r.epochTime(timestamp('2015.07.01'))},
      {id: 3, region: 'Europe', free: r.epochTime(timestamp('2015.06.05'))},
    ];
    return expect(co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield match(timestamp('2015.07.09'), 'America', 1);
    })).to.eventually.be.rejectedWith(Error);
  });

});

describe('Test binding orders to lcards', function () {

  beforeEach(clean);
  after(clean);

  it('Bind orders to an lcard', function () {
    var lcard, conn;
    lcard = {id: 0, free: r.epochTime(0), orders: {}, bindings: []};
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield bind(0, 0, timestamp('2015.07.10'), timestamp('2015.07.17'));
      lcard = yield r.table('lcard').get(0).run(conn);
      expect(lcard.free.getTime()/1000).to.equal(timestamp('2015.07.10')+16*86400);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(1);
      expect(lcard.bindings.indexOf(0)).to.equal(0);
      yield bind(0, 1, timestamp('2015.07.30'), timestamp('2015.09.01'));
      lcard = yield r.table('lcard').get(0).run(conn);
      expect(lcard.free.getTime()/1000).to.equal(timestamp('2015.09.01')+2*86400);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(2);
      expect(lcard.bindings.indexOf(1)).to.equal(1);
    });
  });

});

describe('Test unbounding orders to lcards', function () {

  beforeEach(clean);
  after(clean);

  it('Unbound orders to an lcard', function () {
    var conn, lcard;
    lcard = {id: 0, free: r.epochTime(0), orders: {}, bindings: []};
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield bind(0, 1, timestamp('2015.07.10'), timestamp('2015.07.17'));
      yield bind(0, 2, timestamp('2015.08.10'), timestamp('2015.08.29'));
      yield bind(0, 3, timestamp('2015.09.10'), timestamp('2015.09.15'));
      lcard = yield r.table('lcard').get(0).run(conn);
      yield unbound(2);
      expect(lcard.bindings.length).to.equal(3);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(3);
      expect(lcard.free.getTime()/1000).to.equal(timestamp('2015.09.10')+16*86400);
      lcard = yield r.table('lcard').get(0).run(conn);
      expect(lcard.bindings.length).to.equal(2);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(2);
      expect(lcard.free.getTime()/1000).to.equal(timestamp('2015.09.10')+16*86400);
      yield unbound(3);
      lcard = yield r.table('lcard').get(0).run(conn);
      expect(lcard.bindings.length).to.equal(1);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(1);
      expect(lcard.free.getTime()/1000).to.equal(timestamp('2015.07.10')+16*86400);
    });
  });

});
