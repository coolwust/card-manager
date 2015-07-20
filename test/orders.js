'use strict'

var connect   = require('../lib/connect.js');
var orders    = require('../lib/orders.js');
var insert    = orders.insert;
var match     = orders.match;
var bind      = orders.bind;
var unbound   = orders.unbound;
var search    = orders.search;
var count     = orders.count;
var get       = orders.get;
var doSearch  = orders.doSearch;
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
    yield r.table('order').delete().run(conn);
  });
}

describe('Test orders to lcards matches', function () {

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

describe('Test orders to lcards bindings', function () {

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

describe('Test orders to lcards unbounds', function () {

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

describe('Test orders search', function () {

  beforeEach(clean);
  after(clean);

  it('Search orders', function (done) {
    var conn, orders, filter, cursor, i = 0;
    orders = [
      {id: 0, ctime: r.epochTime(timestamp('2015.06.05')), start: r.epochTime(timestamp('2015.07.10'))},
      {id: 1, ctime: r.epochTime(timestamp('2015.06.04')), start: r.epochTime(timestamp('2015.07.11'))},
      {id: 2, ctime: r.epochTime(timestamp('2015.06.03')), start: r.epochTime(timestamp('2015.07.10'))},
      {id: 3, ctime: r.epochTime(timestamp('2015.06.02')), start: r.epochTime(timestamp('2015.07.10'))},
      {id: 4, ctime: r.epochTime(timestamp('2015.06.01')), start: r.epochTime(timestamp('2015.07.10'))}
    ];
    co(function* () {
      conn = yield connect();
      r.table('order').insert(orders).run(conn);
      filter = {start: r.epochTime(timestamp('2015.07.10'))};
      cursor = yield search('order', {index: r.asc('ctime')}, filter, 1, 3);
      cursor.on('data', function (order) {
        i++;
        if (i === 1) expect(order.new_val.id).to.equal(3);
        if (i === 2) expect(order.new_val.id).to.equal(2);
        if (i === 2) done();
      });
    }).catch(done);
  });

});

describe('Test orders count', function () {

  beforeEach(clean);
  after(clean);

  it('Count results', function () {
    var conn, orders, filter;
    orders = [
      {id: 0, start: r.epochTime(timestamp('2015.07.10'))},
      {id: 1, start: r.epochTime(timestamp('2015.07.11'))},
      {id: 2, start: r.epochTime(timestamp('2015.07.10'))},
      {id: 3, start: r.epochTime(timestamp('2015.07.10'))},
      {id: 4, start: r.epochTime(timestamp('2015.07.10'))}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('order').insert(orders).run(conn);
      filter = {start: r.epochTime(timestamp('2015.07.10'))};
      expect(yield count('order', filter)).to.equal(4);
    });
  });

});

describe('Test orders search upon data received', function () {

  beforeEach(clean);
  after(clean);

  it('Search orders', function (done) {
    var conn, orders, data, i = 0;
    orders = [
      {id: 0, start: r.epochTime(timestamp('2015.07.10')), shipping: 'Shipped', health: 'Normal'},
      {id: 1, start: r.epochTime(timestamp('2015.07.11')), shipping: 'Shipped', health: 'Normal'},
      {id: 2, start: r.epochTime(timestamp('2015.07.09')), shipping: 'Pending', health: 'Normal'},
      {id: 3, start: r.epochTime(timestamp('2015.07.08')), shipping: 'Shipped', health: 'Normal'},
      {id: 4, start: r.epochTime(timestamp('2015.07.07')), shipping: 'Shipped', health: 'Normal'}
    ];
    data = {
      table: 'order',
      index: 'start',
      sorting: 'asc',
      startIndex: 1,
      endIndex: 2,
      shipping: 'Shipped',
      health: 'Normal',
      domain: {name: 'start', value: '2015.07.10'}
    };
    co(function* () {
      conn = yield connect();
      yield r.table('order').insert(orders).run(conn);
      data = yield doSearch(data);
      expect(data.total).to.equal(3);
      data.cursor.on('data', function (order) {
        i++;
        if (i === 1) expect(order.new_val.id).to.equal(3);
        if (i === 2) expect(order.new_val.id).to.equal(0);
        if (i === 2) done();
      });
    }).catch(done);
  });
});

describe('Test order get', function () {

  beforeEach(clean);
  after(clean);

  it('Get an order', function () {
    var conn, orders, order;
    orders = [
      {id: 0, name: 'foo'},
      {id: 1, name: 'bar'}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('order').insert(orders).run(conn);
      order = yield get('order', 1);
      expect(order).to.be.an('Object');
      expect(order.name).to.equal('bar');
    });
  });

});
