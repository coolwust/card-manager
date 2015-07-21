'use strict'

var connect   = require('../lib/connect.js');
var orders    = require('../lib/orders.js');
var match     = orders.match;
var bind      = orders.bind;
var rebind    = orders.rebind;
var unbound   = orders.unbound;
var insert    = orders.insert;
var del       = orders.del;
var update    = orders.update;
var get       = orders.get;
var search    = orders.search;
var count     = orders.count;
var doSearch  = orders.doSearch;
var toDate    = orders.toDate;
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
    yield r.table('legacy').delete().run(conn);
  });
}

describe('Test orders to lcards matches', function () {

  beforeEach(clean);
  after(clean);

  it('Match an order to an free lcard', function () {
    var lcards, conn, id;
    lcards = [
      {id: '0', region: 'America', free: toDate('2015.07.10')},
      {id: '1', region: 'America', free: toDate('2015.07.01')},
      {id: '2', region: 'America', free: toDate('2015.07.01')},
      {id: '3', region: 'Europe',  free: toDate('2015.06.05')}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      id = yield match(toDate('2015.07.09'), 'America', '1');
      expect(id).to.equal('2');
      id = yield match(toDate('2015.06.05'), 'Europe');
      expect(id).to.equal('3');
    })
  });

  it('Match an order to a non-free lcard', function () {
    var lcards, conn;
    lcards = [
      {id: '0', region: 'America', free: toDate('2015.07.10')},
      {id: '1', region: 'America', free: toDate('2015.07.01')},
      {id: '3', region: 'Europe',  free: toDate('2015.06.05')},
    ];
    return expect(co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield match(toDate('2015.07.09'), 'America', '1');
    })).to.eventually.be.rejectedWith(Error);
  });

});

describe('Test orders to lcards bindings', function () {

  beforeEach(clean);
  after(clean);

  it('Bind orders to an lcard', function () {
    var lcard, conn;
    lcard = {id: '0', free: r.epochTime(0), orders: {}, bindings: []};
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield bind('0', '0', toDate('2015.07.10'), toDate('2015.07.17'));
      lcard = yield r.table('lcard').get('0').run(conn);
      expect(lcard.free.getTime()).to.equal(toDate('2015.07.10').getTime()+16*86400000);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(1);
      expect(lcard.bindings.indexOf('0')).to.equal(0);
      yield bind('0', '1', toDate('2015.07.30'), toDate('2015.09.01'));
      lcard = yield r.table('lcard').get('0').run(conn);
      expect(lcard.free.getTime()).to.equal(toDate('2015.09.01').getTime()+2*86400000);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(2);
      expect(lcard.bindings.indexOf('1')).to.equal(1);
    });
  });

});

describe('Test orders to lcards rebind', function () {

  beforeEach(clean);
  after(clean);

  it('Rebind an order to an lcard', function () {
    var conn, lcards, free, orders, lcard;
    free = toDate('2015.07.30');
    orders = {'0': {start: toDate('2015.07.10'), end: toDate('2015.07.30')}};
    lcards = [
      {id: '0', bindings: [],    free: r.epochTime(0), orders: {}    },
      {id: '1', bindings: ['0'], free: free,           orders: orders}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      yield rebind('0', '99');
      lcard = yield r.table('lcard').get('1').run(conn);
      expect(lcard.bindings).to.have.length(1);
      expect(lcard.bindings).to.contain('99');
      expect(lcard.orders).to.not.have.ownProperty('0');
      expect(lcard.orders).to.have.ownProperty('99');
      expect(lcard.orders['99'].start.getTime()).to.equal(toDate('2015.07.10').getTime());
      expect(lcard.orders['99'].end.getTime()).to.equal(toDate('2015.07.30').getTime());
      expect(lcard.free.getTime()).to.equal(toDate('2015.07.30').getTime());
    });
  });
});

describe('Test orders to lcards unbounds', function () {

  beforeEach(clean);
  after(clean);

  it('Unbound an order to an lcard', function () {
    var conn, lcard;
    lcard = {id: '0', free: r.epochTime(0), orders: {}, bindings: []};
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield bind('0', '1', toDate('2015.07.10'), toDate('2015.07.17'));
      yield bind('0', '2', toDate('2015.08.10'), toDate('2015.08.29'));
      yield bind('0', '3', toDate('2015.09.10'), toDate('2015.09.15'));
      lcard = yield r.table('lcard').get('0').run(conn);
      expect(lcard.bindings.length).to.equal(3);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(3);
      expect(lcard.free.getTime()).to.equal(toDate('2015.09.10').getTime()+16*86400000);
      yield unbound('2');
      lcard = yield r.table('lcard').get('0').run(conn);
      expect(lcard.bindings.length).to.equal(2);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(2);
      expect(lcard.free.getTime()).to.equal(toDate('2015.09.10').getTime()+16*86400000);
      yield unbound('3');
      lcard = yield r.table('lcard').get('0').run(conn);
      expect(lcard.bindings.length).to.equal(1);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(1);
      expect(lcard.free.getTime()).to.equal(toDate('2015.07.10').getTime()+16*86400000);
      yield unbound('1');
      lcard = yield r.table('lcard').get('0').run(conn);
      expect(lcard.bindings.length).to.equal(0);
      expect(Object.getOwnPropertyNames(lcard.orders).length).to.equal(0);
      expect(lcard.free.getTime()).to.equal(0);
    });
  });

});

describe('Test order insert', function () {

  beforeEach(clean);
  after(clean);

  it('Insert an order with existing id', function () {
    var conn;
    return expect(co(function* () {
      conn = yield connect();
      yield r.table('order').insert(order).run(conn);
      yield insert('order', '0');
    })).to.eventually.be.rejectedWith(Error);
  });

  it('Insert an order', function () {
    var conn, lcards, order;
    lcards = [
      {id: '0', region: 'europe', free: r.epochTime(0), orders: {}, bindings: []},
      {id: '1', region: 'usa',    free: r.epochTime(0), orders: {}, bindings: []}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      yield insert(
        'order', '1', 'coldume', 'G12345678', '13905200000', toDate('2015.07.10'),
        toDate('2015.07.20'), 'usa', null, 'moon street #1', null, false, null,
        null, null
      );
      order = yield r.table('order').get('1').run(conn);
      expect(order.lcard).to.equal('1');
    });
  });

});

describe('Test order delete', function () {

  beforeEach(clean);
  after(clean);

  it('Delete an order from order table', function () {
    var conn, lcard, order, id;
    lcard = {id: '0', region: 'usa', free: r.epochTime(0), orders: {}, bindings: []};
    return co(function* () {
      var conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield insert(
        'order', '0', 'coldume', 'G12345678', '13905200000', toDate('2015.07.10'),
        toDate('2015.07.20'), 'usa', null, 'moon street #1', null, false, null,
        null, null
      );
      lcard = yield r.table('lcard').get('0').run(conn);
      expect(lcard.bindings.length).to.equal(1);
      id = yield del('0');
      expect(id).to.equal('0');
      order = yield r.table('order').get('0').run(conn);
      expect(order).to.equal(null);
      lcard = yield r.table('lcard').get('0').run(conn);
      expect(lcard.bindings.length).to.equal(0);
    });
  });
});

describe('Test order update', function () {

  beforeEach(clean);
  after(clean);

  it('Update an non-existing order', function () {
    return expect(co(function* () {
      yield update('0', 'order');
    })).to.eventually.be.rejectedWith(Error);
  });

});

describe('Test order get', function () {

  beforeEach(clean);
  after(clean);

  it('Get an order', function () {
    var conn, orders, order;
    orders = [
      {id: '0', name: 'foo'},
      {id: '1', name: 'bar'}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('order').insert(orders).run(conn);
      order = yield get('order', '1');
      expect(order).to.be.an('Object');
      expect(order.name).to.equal('bar');
    });
  });

});

describe('Test orders search', function () {

  beforeEach(clean);
  after(clean);

  it('Search orders', function (done) {
    var conn, orders, filter, cursor, i = 0;
    orders = [
      {id: '0', ctime: toDate('2015.06.05'), start: toDate('2015.07.10')},
      {id: '1', ctime: toDate('2015.06.04'), start: toDate('2015.07.11')},
      {id: '2', ctime: toDate('2015.06.03'), start: toDate('2015.07.10')},
      {id: '3', ctime: toDate('2015.06.02'), start: toDate('2015.07.10')},
      {id: '4', ctime: toDate('2015.06.01'), start: toDate('2015.07.10')}
    ];
    co(function* () {
      conn = yield connect();
      yield r.table('order').insert(orders).run(conn);
      filter = {start: toDate('2015.07.10')};
      cursor = yield search('order', {index: r.asc('ctime')}, filter, 1, 3);
      cursor.on('data', function (order) {
        i++;
        if (i === 1) expect(order.new_val.id).to.equal('3');
        if (i === 2) expect(order.new_val.id).to.equal('2');
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
      {id: '0', start: toDate('2015.07.10')},
      {id: '1', start: toDate('2015.07.11')},
      {id: '2', start: toDate('2015.07.10')},
      {id: '3', start: toDate('2015.07.10')},
      {id: '4', start: toDate('2015.07.10')}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('order').insert(orders).run(conn);
      filter = {start: toDate('2015.07.10')};
      expect(yield count('order', filter)).to.equal(4);
    });
  });

});

//describe('Test orders search upon data received', function () {
//
//  beforeEach(clean);
//  after(clean);
//
//  it('Search orders', function (done) {
//    var conn, orders, data, cursor, i = 0;
//    orders = [
//      {id: '0', start: toDate('2015.07.10'), shipped: true,  warning: false},
//      {id: '1', start: toDate('2015.07.11'), shipped: true,  warning: false},
//      {id: '2', start: toDate('2015.07.09'), shipped: false, warning: false},
//      {id: '3', start: toDate('2015.07.08'), shipped: true,  warning: false},
//      {id: '4', start: toDate('2015.07.07'), shipped: true,  warning: false}
//    ];
//    data = {
//      table: 'order',
//      index: 'start',
//      sorting: 'asc',
//      startIndex: 1,
//      endIndex: 2,
//      shipping: 'Shipped',
//      health: 'Normal',
//      domain: {name: 'start', value: '2015.07.10'}
//    };
//    co(function* () {
//      conn = yield connect();
//      yield r.table('order').insert(orders).run(conn);
//      cursor = yield doSearch(data);
//      cursor.on('data', function (data) {
//        i++;
//        if (i === 1) {
//          expect(data.total).to.equal(3);
//          expect(data.order.new_val.id).to.equal(3);
//          expect(data.order.new_val.start).to.equal('2015.07.08');
//        }
//        if (i === 2) {
//          expect(data.total).to.equal(3);
//          expect(data.order.new_val.id).to.equal(0);
//          expect(data.order.new_val.start).to.equal('2015.07.10');
//          done();
//        }
//      });
//    }).catch(done);
//  });
//});
