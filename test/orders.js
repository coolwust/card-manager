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
var doWrite   = orders.doWrite;
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
    var conn, order;
    order = {id: '0'};
    return expect(co(function* () {
      conn = yield connect();
      yield r.table('order').insert(order).run(conn);
      yield insert('0');
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
      order = yield insert(
        '1', 'coldume', 'G12345678', '13905200000', toDate('2015.07.10'),
        toDate('2015.07.20'), 'usa', null, 'moon street #1', null, false, null,
        null, null
      );
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
        '0', 'coldume', 'G12345678', '13905200000', toDate('2015.07.10'),
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

  it('Update an order without changing its ID and duration', function () {
    var order, conn;
    order = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: toDate('2015.07.10'), end: toDate('2015.07.30'), region: 'usa',
      warning: null, address: 'moon street #1', note: null, shipped: false,
      carrier: null, tracking: null, bcard: null, ctime: toDate('2015.07.01'),
      lcard: '0'
    };
    return co(function* () {
      conn = yield connect();
      yield r.table('order').insert(order).run(conn);
      order = yield update(
        '0', 'order', '0', 'coldume', 'G87654321', '13805200000',
        toDate('2015.07.10'), toDate('2015.07.30'), 'usa', null,
        'moon street #2', 'foo', true, 'ups', 'A123456', '111222333'
      );
      expect(order.passport).to.equal('G87654321');
      expect(order.phone).to.equal('13805200000');
      expect(+order.start).to.equal(+toDate('2015.07.10'));
      expect(+order.end).to.equal(+toDate('2015.07.30'));
      expect(+order.ctime).to.equal(+toDate('2015.07.01'));
      expect(order.region).to.equal('usa');
      expect(order.address).to.equal('moon street #2');
      expect(order.note).to.equal('foo');
      expect(order.shipped).to.be.true;
      expect(order.carrier).to.equal('ups');
      expect(order.tracking).to.equal('A123456');
      expect(order.bcard).to.equal('111222333');
      expect(order.lcard).to.equal('0');
    });
  });

  it('Update an order with its duration or region changes', function () {
    var order, conn, orders, free, lcards, lcard;
    order = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: toDate('2015.07.10'), end: toDate('2015.07.30'), region: 'usa',
      warning: null, address: 'moon street #1', note: null, shipped: false,
      carrier: null, tracking: null, bcard: null, ctime: toDate('2015.07.01'),
      lcard: '0'
    };
    orders = {'0': {start: toDate('2015.07.10'), end: toDate('2015.07.30')}};
    free = toDate('2015.07.30');
    lcards = [
      {id: '0', region: 'usa',    free: free, orders: orders, bindings: ['0']},
      {id: '1', region: 'usa',    free: r.epochTime(0), orders: {}, bindings: []},
      {id: '2', region: 'europe', free: r.epochTime(0), orders: {}, bindings: []}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      yield r.table('order').insert(order).run(conn);
      order = yield update(
        '0', 'order', '0', 'coldume', 'G87654321', '13805200000',
        toDate('2015.07.11'), toDate('2015.08.01'), 'usa', null,
        'moon street #2', 'foo', true, 'ups', 'A123456', '111222333'
      );
      expect(+order.start).to.equal(+toDate('2015.07.11'));
      expect(+order.end).to.equal(+toDate('2015.08.01'));
      expect(order.passport).to.equal('G87654321');
      expect(order.phone).to.equal('13805200000');
      expect(+order.ctime).to.equal(+toDate('2015.07.01'));
      expect(order.region).to.equal('usa');
      expect(order.address).to.equal('moon street #2');
      expect(order.note).to.equal('foo');
      expect(order.shipped).to.be.true;
      expect(order.carrier).to.equal('ups');
      expect(order.tracking).to.equal('A123456');
      expect(order.bcard).to.equal('111222333');
      expect(order.lcard).to.equal('1');
      lcard = yield r.table('lcard').get('0').run(conn);;
      expect(lcard.bindings).to.have.length(0);
      expect(lcard.orders).to.not.have.ownProperty('0');
      lcard = yield r.table('lcard').get('1').run(conn);;
      expect(lcard.bindings).to.have.length(1);
      expect(lcard.orders).to.have.ownProperty('0');
      expect(+lcard.orders['0'].start).to.equal(+toDate('2015.07.11'));
      expect(+lcard.orders['0'].end).to.equal(+toDate('2015.08.01'));
      order = yield update(
        '0', 'order', '0', 'coldume', 'G87654321', '13805200000',
        toDate('2015.07.11'), toDate('2015.08.01'), 'europe', null,
        'moon street #2', 'foo', true, 'ups', 'A123456', '111222333'
      );
      expect(+order.start).to.equal(+toDate('2015.07.11'));
      expect(+order.end).to.equal(+toDate('2015.08.01'));
      expect(order.passport).to.equal('G87654321');
      expect(order.phone).to.equal('13805200000');
      expect(+order.ctime).to.equal(+toDate('2015.07.01'));
      expect(order.region).to.equal('europe');
      expect(order.address).to.equal('moon street #2');
      expect(order.note).to.equal('foo');
      expect(order.shipped).to.be.true;
      expect(order.carrier).to.equal('ups');
      expect(order.tracking).to.equal('A123456');
      expect(order.bcard).to.equal('111222333');
      expect(order.lcard).to.equal('2');
      lcard = yield r.table('lcard').get('1').run(conn);;
      expect(lcard.bindings).to.have.length(0);
      expect(lcard.orders).to.not.have.ownProperty('0');
      lcard = yield r.table('lcard').get('2').run(conn);;
      expect(lcard.bindings).to.have.length(1);
      expect(lcard.orders).to.have.ownProperty('0');
      expect(+lcard.orders['0'].start).to.equal(+toDate('2015.07.11'));
      expect(+lcard.orders['0'].end).to.equal(+toDate('2015.08.01'));
    });
  });

  it('Update an order with an ID change', function () {
    var order, conn, orders, free, lcards, lcard;
    order = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: toDate('2015.07.10'), end: toDate('2015.07.30'), region: 'usa',
      warning: null, address: 'moon street #1', note: null, shipped: false,
      carrier: null, tracking: null, bcard: null, ctime: toDate('2015.07.01'),
      lcard: '0'
    };
    orders = {'0': {start: toDate('2015.07.10'), end: toDate('2015.07.30')}};
    free = toDate('2015.07.30');
    lcards = [
      {id: '0', region: 'usa',    free: free, orders: orders, bindings: ['0']},
      {id: '1', region: 'usa',    free: r.epochTime(0), orders: {}, bindings: []},
      {id: '2', region: 'europe', free: r.epochTime(0), orders: {}, bindings: []}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      yield r.table('order').insert(order).run(conn);
      order = yield update(
        '0', 'order', '1', 'coldume', 'G87654321', '13805200000',
        toDate('2015.07.10'), toDate('2015.07.30'), 'usa', null,
        'moon street #2', 'foo', true, 'ups', 'A123456', '111222333'
      );
      expect(order).to.not.be.null;
      expect(+order.start).to.equal(+toDate('2015.07.10'));
      expect(+order.end).to.equal(+toDate('2015.07.30'));
      expect(order.passport).to.equal('G87654321');
      expect(order.phone).to.equal('13805200000');
      expect(+order.ctime).to.equal(+toDate('2015.07.01'));
      expect(order.region).to.equal('usa');
      expect(order.address).to.equal('moon street #2');
      expect(order.note).to.equal('foo');
      expect(order.shipped).to.be.true;
      expect(order.carrier).to.equal('ups');
      expect(order.tracking).to.equal('A123456');
      expect(order.bcard).to.equal('111222333');
      expect(order.lcard).to.equal('0');
      lcard = yield r.table('lcard').get('0').run(conn);;
      expect(lcard.bindings).to.have.length(1);
      expect(lcard.bindings).to.contain('1');
      expect(lcard.orders).to.not.have.ownProperty('0');
      expect(lcard.orders).to.have.ownProperty('1');
      expect(+lcard.orders['1'].start).to.equal(+toDate('2015.07.10'));
      expect(+lcard.orders['1'].end).to.equal(+toDate('2015.07.30'));
      order = yield r.table('order').get('0').run(conn);
      expect(order).to.be.null;
    });
  });

  it('Update an order with an region, duration and ID change', function () {
    var order, conn, orders, free, lcards, lcard;
    order = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: toDate('2015.07.10'), end: toDate('2015.07.30'), region: 'usa',
      warning: null, address: 'moon street #1', note: null, shipped: false,
      carrier: null, tracking: null, bcard: null, ctime: toDate('2015.07.01'),
      lcard: '0'
    };
    orders = {'0': {start: toDate('2015.07.10'), end: toDate('2015.07.30')}};
    free = toDate('2015.07.30');
    lcards = [
      {id: '0', region: 'usa',    free: free, orders: orders, bindings: ['0']},
      {id: '1', region: 'usa',    free: r.epochTime(0), orders: {}, bindings: []},
      {id: '2', region: 'europe', free: r.epochTime(0), orders: {}, bindings: []}
    ];
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      yield r.table('order').insert(order).run(conn);
      order = yield update(
        '0', 'order', '1', 'coldume', 'G87654321', '13805200000',
        toDate('2015.07.11'), toDate('2015.08.01'), 'europe', null,
        'moon street #2', 'foo', true, 'ups', 'A123456', '111222333'
      );
      expect(order).to.not.be.null;
      expect(+order.start).to.equal(+toDate('2015.07.11'));
      expect(+order.end).to.equal(+toDate('2015.08.01'));
      expect(order.passport).to.equal('G87654321');
      expect(order.phone).to.equal('13805200000');
      expect(+order.ctime).to.equal(+toDate('2015.07.01'));
      expect(order.region).to.equal('europe');
      expect(order.address).to.equal('moon street #2');
      expect(order.note).to.equal('foo');
      expect(order.shipped).to.be.true;
      expect(order.carrier).to.equal('ups');
      expect(order.tracking).to.equal('A123456');
      expect(order.bcard).to.equal('111222333');
      expect(order.lcard).to.equal('0');
      lcard = yield r.table('lcard').get('0').run(conn);;
      expect(lcard.bindings).to.have.length(0);
      expect(lcard.orders).to.not.have.ownProperty('0');
      expect(lcard.orders).to.not.have.ownProperty('1');
      expect(+lcard.free).to.equal(0);
      lcard = yield r.table('lcard').get('2').run(conn);;
      expect(lcard.bindings).to.have.length(1);
      expect(lcard.bindings).to.contain('1');
      expect(lcard.orders).to.have.ownProperty('1');
      expect(+lcard.orders['1'].start).to.equal(+toDate('2015.07.11'));
      expect(+lcard.orders['1'].end).to.equal(+toDate('2015.08.01'));
      order = yield r.table('order').get('0').run(conn);
      expect(order).to.be.null;
    });
  });

  it('Update an order with an table order to legacy change', function () {
    var order, conn, orders, free, lcard;
    order = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: toDate('2015.07.10'), end: toDate('2015.07.30'), region: 'usa',
      warning: null, address: 'moon street #1', note: null, shipped: false,
      carrier: null, tracking: null, bcard: null, ctime: toDate('2015.07.01'),
      lcard: '0'
    };
    orders = {'0': {start: toDate('2015.07.10'), end: toDate('2015.07.30')}};
    free = toDate('2015.07.30');
    lcard = {id: '0', region: 'usa', free: free, orders: orders, bindings: ['0']};
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcard).run(conn);
      yield r.table('order').insert(order).run(conn);
      order = yield update(
        '0', 'legacy', '1', 'coldume', 'G87654321', '13805200000',
        toDate('2015.07.11'), toDate('2015.08.01'), 'europe', null,
        'moon street #2', 'foo', true, 'ups', 'A123456', '111222333'
      );
      expect(order).to.not.be.null;
      expect(+order.start).to.equal(+toDate('2015.07.11'));
      expect(+order.end).to.equal(+toDate('2015.08.01'));
      expect(order.passport).to.equal('G87654321');
      expect(order.phone).to.equal('13805200000');
      expect(+order.ctime).to.equal(+toDate('2015.07.01'));
      expect(order.region).to.equal('europe');
      expect(order.address).to.equal('moon street #2');
      expect(order.note).to.equal('foo');
      expect(order.shipped).to.be.true;
      expect(order.carrier).to.equal('ups');
      expect(order.tracking).to.equal('A123456');
      expect(order.bcard).to.equal('111222333');
      expect(order.lcard).to.equal('0');
      lcard = yield r.table('lcard').get('0').run(conn);;
      expect(lcard.bindings).to.have.length(0);
      expect(lcard.orders).to.not.have.ownProperty('0');
      expect(lcard.orders).to.not.have.ownProperty('1');
      expect(+lcard.free).to.equal(0);
      order = yield r.table('order').get('0').run(conn);
      expect(order).to.be.null;
    });
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

describe('Test orders search upon data received', function () {

  beforeEach(clean);
  after(clean);

  it('Search orders', function (done) {
    var conn, orders, data, cursor, i = 0;
    orders = [
      {id: '0', start: toDate('2015.07.10'), shipped: true,  warning: false},
      {id: '1', start: toDate('2015.07.11'), shipped: true,  warning: false},
      {id: '2', start: toDate('2015.07.09'), shipped: false, warning: false},
      {id: '3', start: toDate('2015.07.08'), shipped: true,  warning: false},
      {id: '4', start: toDate('2015.07.07'), shipped: true,  warning: false}
    ];
    data = {
      table: 'order', index: 'start', sorting: 'asc', startIndex: 1, endIndex: 2,
      shipped: true, warning: false, domain: {name: 'start', value: '2015.07.10'}
    };
    co(function* () {
      conn = yield connect();
      yield r.table('order').insert(orders).run(conn);
      cursor = yield doSearch(data);
      cursor.on('data', function (data) {
        i++;
        if (i === 1) {
          expect(data.total).to.equal(3);
          expect(data.order.new_val.id).to.equal('3');
          expect(data.order.new_val.start).to.equal('2015.07.08');
        }
        if (i === 2) {
          expect(data.total).to.equal(3);
          expect(data.order.new_val.id).to.equal('0');
          expect(data.order.new_val.start).to.equal('2015.07.10');
          cursor.close();
          done();
        }
      });
    }).catch(done);
  });
});

describe('Test order write upon data received', function () {

  beforeEach(clean);
  after(clean);

  it('Insert order', function () {
    var conn, lcards, data, order;
    lcards = [
      {id: '0', region: 'europe', free: r.epochTime(0), orders: {}, bindings: []},
      {id: '1', region: 'usa',    free: r.epochTime(0), orders: {}, bindings: []}
    ];
    data = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: '2015.07.10', end: '2015.07.20', region: 'usa', warning: false,
      address: 'moon street #1', note: null, shipped: false, carrier: null, 
      tracking: null, bcard: null
    };
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      order = yield doWrite(data, 'insert');
      expect(order.id).to.equal(data.id);
      expect(order.name).to.equal(data.name);
      expect(order.passport).to.equal(data.passport);
      expect(order.phone).to.equal(data.phone);
      expect(order.start).to.equal(data.start);
      expect(order.end).to.equal(data.end);
      expect(order.region).to.equal(data.region);
      expect(order.warning).to.equal(data.warning);
      expect(order.address).to.equal(data.address);
      expect(order.note).to.equal(data.note);
      expect(order.shipped).to.equal(data.shipped);
      expect(order.carrier).to.equal(data.carrier);
      expect(order.tracking).to.equal(data.tracking);
      expect(order.bcard).to.equal(data.bcard);
      expect(order.lcard).to.equal('1');
    });
  });

  it ('Insert an order with wrong start date', function () {
    var data;
    data = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: '2015-07-10', end: '2015.07.20', region: 'usa', warning: false,
      address: 'moon street #1', note: null, shipped: false, carrier: null, 
      tracking: null, bcard: null
    };
    return expect(co(function* () {
      yield doWrite(data, 'insert');
    })).to.eventually.be.rejectedWith(Error);
  });

  it ('Update an order with wrong carrier', function () {
    var data;
    data = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: '2015.07.11', end: '2015.07.22', region: 'europe', warning: false,
      address: 'moon street #1', note: null, shipped: true, carrier: null, 
      tracking: '123456', bcard: '111222333', oldId: '0', table: 'order'
    };
    return expect(co(function* () {
      yield doWrite(data, 'update');
    })).to.eventually.be.rejectedWith(Error);
  });

  it('Insert an order then update the order', function () {
    var conn, lcards, data1, data2, order;
    lcards = [
      {id: '0', region: 'europe', free: r.epochTime(0), orders: {}, bindings: []},
      {id: '1', region: 'usa',    free: r.epochTime(0), orders: {}, bindings: []}
    ];
    data1 = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: '2015.07.10', end: '2015.07.20', region: 'usa', warning: false,
      address: 'moon street #1', note: null, shipped: false, carrier: null, 
      tracking: null, bcard: null
    };
    data2 = {
      id: '0', name: 'coldume', passport: 'G12345678', phone: '13905200000',
      start: '2015.07.11', end: '2015.07.22', region: 'europe', warning: false,
      address: 'moon street #1', note: null, shipped: true, carrier: 'UPS', 
      tracking: '123456', bcard: '111222333', oldId: '0', table: 'order'
    };
    return co(function* () {
      conn = yield connect();
      yield r.table('lcard').insert(lcards).run(conn);
      yield doWrite(data1, 'insert');
      order = yield doWrite(data2, 'update');
      expect(order.id).to.equal(data2.id);
      expect(order.name).to.equal(data2.name);
      expect(order.passport).to.equal(data2.passport);
      expect(order.phone).to.equal(data2.phone);
      expect(order.start).to.equal(data2.start);
      expect(order.end).to.equal(data2.end);
      expect(order.region).to.equal(data2.region);
      expect(order.warning).to.equal(data2.warning);
      expect(order.address).to.equal(data2.address);
      expect(order.note).to.equal(data2.note);
      expect(order.shipped).to.equal(data2.shipped);
      expect(order.carrier).to.equal(data2.carrier);
      expect(order.tracking).to.equal(data2.tracking);
      expect(order.bcard).to.equal(data2.bcard);
      expect(order.lcard).to.equal('0');
    });
  });
});
