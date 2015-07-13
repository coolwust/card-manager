'use strict'

var connect   = require('../lib/connect.js');
var orders    = require('../lib/orders.js');
var insert    = orders.insert;
var match     = orders.match;
var unmatch   = orders.unmatch;
var rematch   = orders.rematch;
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

describe('test match order to lcard', function () {

  beforeEach(clean);
  after(clean);

  it('match an order to usable lcard', function () {
    var free, lcard, conn, id;
    free = r.epochTime(timestamp('2015.07.09'));
    lcard = {id: 0, region: 'America', free: free};
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      id = yield match(timestamp('2015.07.09'), 'America');
      expect(id).to.equal(0);
      id = yield match(timestamp('2015.08.20'), 'America');
      expect(id).to.equal(0);
    })
  });

  it('match an order to an non-free lcard', function () {
    var free = r.epochTime(timestamp('2015.07.10'));
    var lcard = {id: 0, region: 'America', free: free};
    return expect(co(function* () {
      var conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield match(timestamp('2015.07.09'), 'America');
    })).to.eventually.be.rejectedWith(Error);
  });

  it('match an order to an free lcard with wrong region', function () {
    var free = r.epochTime(timestamp('2015.07.10'));
    var lcard = {id: 0, region: 'Europe', free: free};
    return expect(co(function* () {
      var conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield match(timestamp('2015.08.20'), 'America');
    })).to.eventually.be.rejectedWith(Error);
  });

});

  //it('match order to no lcard', function (done) {
  //  var timestamp = parseInt(moment('2015-07-10 +0800').format('X'), 10);
  //  var lcard = { 
  //    id: 0, ctime: r.now(), region: 'America',
  //    ready: r.epochTime(timestamp), orders: {}, matches: []
  //  };
  //  co(function* () {
  //    var conn = yield connect();
  //    yield r.table('lcard').insert(lcard).run(conn);
  //    var start = parseInt(moment('2015-07-09 +0800').format('X'), 10);
  //    var end = parseInt(moment('2015-07-15 +0800').format('X'), 10);
  //    yield match(1, 'America', start, end);
  //  }).then(null, function (err) {
  //    expect(err).to.be.an('error');
  //    done();
  //  });
  //});

  //it('match order to lcard', function (done) {
  //  var timestamp0 = parseInt(moment('2015-07-10 +0800').format('X'), 10);
  //  var timestamp1 = parseInt(moment('2015-07-01 +0800').format('X'), 10);
  //  var timestamp2 = parseInt(moment('2015-06-25 +0800').format('X'), 10);
  //  var timestamp3 = parseInt(moment('2015-06-21 +0800').format('X'), 10);
  //  var lcards = [
  //    { id: 0, ctime: r.now(), region: 'America', ready: r.epochTime(timestamp0), orders: {}, matches: [] },
  //    { id: 1, ctime: r.now(), region: 'America', ready: r.epochTime(timestamp1), orders: {}, matches: [] },
  //    { id: 2, ctime: r.now(), region: 'America', ready: r.epochTime(timestamp2), orders: {}, matches: [] },
  //    { id: 3, ctime: r.now(), region: 'Europe',  ready: r.epochTime(timestamp3), orders: {}, matches: [] }
  //  ]
  //  co(function* () {
  //    var conn = yield connect();
  //    yield r.table('lcard').insert(lcards).run(conn);
  //    var start = parseInt(moment('2015-07-09 +0800').format('X'), 10);
  //    var end = parseInt(moment('2015-07-15 +0800').format('X'), 10);
  //    yield match(1, 'America', start, end);
  //    var lcard0 = yield r.table('lcard').get(0).run(conn);
  //    var lcard1 = yield r.table('lcard').get(1).run(conn);
  //    var lcard2 = yield r.table('lcard').get(2).run(conn);
  //    var lcard3 = yield r.table('lcard').get(3).run(conn);
  //    expect(Object.getOwnPropertyNames(lcard0.orders).length).to.equal(0);
  //    expect(Object.getOwnPropertyNames(lcard1.orders).length).to.equal(0);
  //    expect(Object.getOwnPropertyNames(lcard3.orders).length).to.equal(0);
  //    expect(Object.getOwnPropertyNames(lcard2.orders).length).to.equal(1);
  //    expect(lcard2.ready.getTime()/1000).to.equal(end + 2 * 24 * 60 * 60);
  //    expect(lcard2.matches[0]).to.equal(1);
  //  }).then(done, done);
  //});

//describe('test unmatch order to lcard', function () {

  //beforeEach(function (done) {
  //  co(function* () {
  //    var conn = yield connect();
  //    yield r.table('lcard').delete().run(conn);
  //  }).then(done);
  //});
  //afterEach(function (done) {
  //  co(function* () {
  //    var conn = yield connect();
  //    yield r.table('lcard').delete().run(conn);
  //  }).then(done);
  //});

  //it('unmatch order to multiple lcards', function (done) {
  //  var lcards = [
  //    { id: 0, matches: [0, 1] },
  //    { id: 1, matches: [2, 1] }
  //  ];
  //  co(function* () {
  //    var conn = yield connect();
  //    yield r.table('lcard').insert(lcards).run(conn);
  //    yield unmatch(1);
  //  }).then(null, function (err) {
  //    expect(err).to.be.an('error');
  //    done();
  //  });
  //});

  //it('unmatch order to a lcard', function (done) {
  //  var lcard = {
  //    id: 0, 
  //    orders: { 
  //      0: { start: r.epochTime(1000), end: r.epochTime(2000) },
  //      1: { start: r.epochTime(10000), end: r.epochTime(20000) },
  //      2: { start: r.epochTime(100000), end: r.epochTime(200000) },
  //      3: { start: r.epochTime(1000000), end: r.epochTime(2000000) }
  //    },
  //    matches: [0, 1, 2, 3],
  //    ready: r.epochTime(2000000 + 2 * 24 * 60 * 60) 
  //  };
  //  co(function* () {
  //    var conn = yield connect();
  //    yield r.table('lcard').insert(lcard).run(conn);
  //    yield unmatch(1);
  //    var result = yield r.table('lcard').get(0).run(conn);
  //    expect(Object.getOwnPropertyNames(result.orders).length).to.equal(3);
  //    expect(result.ready.getTime()/1000).to.equal(2000000+2*24*60*60);
  //    yield unmatch(3);
  //    var result = yield r.table('lcard').get(0).run(conn);
  //    expect(Object.getOwnPropertyNames(result.orders).length).to.equal(2);
  //    expect(result.ready.getTime()/1000).to.equal(200000+2*24*60*60);
  //  }).then(done, done);
  //});
//});

//describe('test unmatch order to lcard', function () {
//
//  beforeEach(function (done) {
//    co(function* () {
//      var conn = yield connect();
//      yield r.table('lcard').delete().run(conn);
//    }).then(done);
//  });
//  afterEach(function (done) {
//    co(function* () {
//      var conn = yield connect();
//      yield r.table('lcard').delete().run(conn);
//    }).then(done);
//  });
//
//  it('unmatch unchanged order to a lcard', function (done) {
//    var lcard = { id: 0, region: 'America', orders: {}, matches: [], ready: r.epochTime(0) };
//    co(function* () {
//      var conn = yield connect();
//      yield r.table('lcard').insert(lcard).run(conn);
//      yield match(0, 'America', 100000, 200000);
//      var result1 = yield r.table('lcard').get(0).run(conn);
//      yield rematch(0, 'America', 100000, 200000);
//      var result2 = yield r.table('lcard').get(0).run(conn);
//      expect(JSON.stringify(result1)).to.equal(JSON.stringify(result2));
//    }).then(done, done);
//  });
//
//});
