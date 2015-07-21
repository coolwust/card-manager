'use strict';

var connect = require('./connect.js');
var marko   = require('marko');
var co      = require('co');
var r       = require('rethinkdb');
var moment  = require('moment-timezone');
var events  = require('events');

module.exports = orders;

// start                 end     stop   free
//   |      |      |      |        |action|      |      |
// --+------+------+------+---//---+------+------+------+---->
//   |<--------- 15 days --------->|

function orders() {
  return function* (next) {
    var data = {
      username: this.session.username
    };
    this.body = marko.load(__dirname + '/../views/orders.marko').stream(data);
    this.type = 'text/html';
    yield next;
  }
}

orders.listen = function (io) {
  io.of('orders').on('connect', function (socket) {
    var result, cursor, order;
    socket.on('insert', orders.onInsert.bind(socket));
    socket.on('update', orders.onUpdate.bind(socket));
    socket.on('delete', orders.onDelete.bind(socket));
    socket.on('search', function (data) {
      co(function* () {
        cursor = yield orders.doSearch(data);
        cursor.on('data', function (data) {
          socket.emit('searched', data);
        });
      }).catch(function (err) {
        socket.emit('searched', {error: err.message});
      });
    });
    socket.on('get', function (data) {
      co(function* () {
        order = yield orders.doGet(data);
        socket.emit('got', order);
      }).catch(function (err) {
        socket.emit('got', {error: err.message});
      });
    });
    //socket.on('disconnect', orders.onDisconnect.bind(socket));
  });

}

orders.onDelete = function (orderId) {
  co(function* () {
    var conn, order;
    conn = yield connect();
    r.table('order').get(orderId).delete().run(conn);
    yield orders.unbound(orderId);
    return {orderId: orderId};
  }).then(function (data) {
    this.emit('deleted', data);
  }.bind(this)).catch(function (err) {
    this.emit('deleted', {error: err.message});
  }.bind(this));
}

orders.onInsert = function (data) {
  co(function* () {
    var conn, order;
    conn = yield connect();
    if (yield r.table('order').get(data.id).run(conn)) throw new Error('Order ID exists!');
    data.lcard = yield orders.match(orders.timestamp(data.start), data.region);
    data.ctime = r.now();
    yield orders.bind(data.lcard, data.id, orders.timestamp(data.start), orders.timestamp(data.end));
    data.start = r.epochTime(orders.timestamp(data.start));
    data.end = r.epochTime(orders.timestamp(data.end));
    yield r.table('order').insert(data).run(conn);
    order = yield r.table('order').get(data.id).run(conn);
    order.ctime = moment.tz(order.ctime, 'Asia/Shanghai').format('YYYY.MM.DD h:ss');
    order.start = moment.tz(order.start, 'Asia/Shanghai').format('YYYY.MM.DD');
    order.end = moment.tz(order.end, 'Asia/Shanghai').format('YYYY.MM.DD');
    return order;
  }).then(function (data) {
    this.emit('inserted', data);
  }.bind(this)).catch(function (err) {
    this.emit('inserted', {error: err.message});
  }.bind(this));
}

orders.onUpdate = function (id, data) {
  // id cannot be replaced!
  var id = data.id;
  co(function* () {
    var conn, order, region, start, end;
    conn = yield connect();
    order = yield r.table('order').get(id).run(conn);
    start = orders.timestamp(data.start);
    end = orders.timestamp(data.end);
    if (
      data.region === order.region && 
      order.start.getTime()/1000 === start && 
      order.end.getTime()/1000 === end
    ) {
      data.lcard = order.lcard;
    } else {
      data.lcard = yield orders.match(start, data.region);
      yield orders.unbound(id);
      yield orders.bind(data.lcard, data.id, start, end);
    }
    data.ctime = order.ctime;
    data.start = r.epochTime(start);
    data.end = r.epochTime(end);
    yield r.table('order').get(id).replace(data).run(conn);
    order = yield r.table('order').get(id).run(conn);
    order.ctime = moment.tz(order.ctime, 'Asia/Shanghai').format('YYYY.MM.DD h:ss');
    order.start = moment.tz(order.start, 'Asia/Shanghai').format('YYYY.MM.DD');
    order.end = moment.tz(order.end, 'Asia/Shanghai').format('YYYY.MM.DD');
    return order;
  }).then(function (data) {
    this.emit('updated', data);
  }.bind(this)).catch(function (err) {
    this.emit('updated', {error: err.stack});
  }.bind(this));
}

orders.doGet = function* (data) {
  var table, order;
  table = data.table === 'legacy' ? 'legacy' : 'order';
  order = yield orders.get(table, data.id);
  orders.formatTime(order);
  return order;
}

//orders.doSearch = function* (data) {
//  var table, index, orderBy, filter, startIndex, endIndex, cursor, total, emitter;
//  table = data.table === 'legacy' ? 'legacy' : 'order';
//  index = ['id', 'ctime', 'start', 'end'].indexOf(data.index) === -1 ? 'ctime' : data.index;
//  orderBy = data.sorting === 'asc' ? {index: r.asc(index)} : {index: r.desc(index)};
//  filter = function (row) {
//    var bool = r.and(true);
//    if (data.domain.name === 'start') {
//      bool = bool.and(row(data.domain.name).le(toDate(data.domain.value)));
//    } else if (data.domain.name === 'end') {
//      bool = bool.and(row(data.domain.name).le(r.epochTime(orders.timestamp(data.domain.value)+24*60*60)));
//    } else if (data.domain.name === 'ctime') {
//      bool = bool.and(row(data.domain.name).eq(r.epochTime(orders.timestamp(data.domain.value))));
//    } else if (['name', 'id', 'phone', 'passport', 'lcard', 'bcard'].indexOf(data.domain.name) !== -1) {
//      bool = bool.and(row(data.domain.name).eq(data.domain.value));
//    }
//    if (['Error', 'Normal'].indexOf(data.health) !== -1) {
//      bool = bool.and(row('health').eq(data.health));
//    }
//    if (['Pending', 'Shipped'].indexOf(data.shipping) !== -1) {
//      bool = bool.and(row('shipping').eq(data.shipping));
//    }
//    return bool;
//  }
//  startIndex = typeof data.startIndex === 'number' ? data.startIndex : 0;
//  endIndex = typeof data.endIndex === 'number' ? data.endIndex : 21;
//  cursor = yield orders.search(table, orderBy, filter, startIndex, endIndex); // close cursor?
//  total = yield orders.count(table, filter);
//  emitter = new events.EventEmitter();
//  cursor.on('data', function (data) {
//    if (data.new_val !== null) orders.formatTime(data.new_val);
//    emitter.emit('data', {order: data, total: total});
//  });
//  return emitter;
//}

orders.match = function* (start, region, exclude) {
  var conn, filter, orderBy, cursor, lcards;
  conn = yield connect();
  filter = r.row('free').le(start).and(r.row('region').eq(region));
  if (typeof exclude !== 'undefined') filter = filter.and(r.row('id').ne(exclude));
  orderBy = {index: r.desc('free')};
  cursor = yield r.table('lcard').orderBy(orderBy).filter(filter).limit(1).run(conn);
  lcards = yield cursor.toArray();
  if (lcards.length === 0) throw new Error('暂时没有可用的L卡');
  return lcards[0].id;
}

orders.bind = function* (lcardId, orderId, start, end) {
  var conn, lcard;
  conn = yield connect();
  lcard = yield r.table('lcard').get(lcardId).run(conn);
  lcard.orders[orderId] = {start: start, end: end};
  if ((end.getTime()-start.getTime())/86400000 < 14) {
    lcard.free = r.epochTime(start.getTime()/1000+16*86400);
  } else {
    lcard.free = r.epochTime(end.getTime()/1000+2*86400);
  }
  lcard.bindings.push(orderId);
  yield r.table('lcard').get(lcardId).replace(lcard).run(conn);
}

orders.rebind = function* (oldId, newId) {
  var conn, filter, cursor, lcards, lcard, order;
  conn = yield connect();
  filter = r.row('bindings').contains(oldId);
  cursor = yield r.table('lcard').filter(filter).run(conn);
  lcards = yield cursor.toArray();
  lcard = lcards[0];
  lcard.bindings.splice(lcard.bindings.indexOf(oldId), 1);
  lcard.bindings.push(newId);
  order = lcard.orders[oldId];
  delete lcard.orders[oldId];
  lcard.orders[newId] = order;
  yield r.table('lcard').get(lcard.id).replace(lcard).run(conn);
}

orders.unbound = function* (orderId) {
  var conn, filter, cursor, lcards, lcard, max = 0, maxId, start, end;
  conn = yield connect();
  filter = r.row('bindings').contains(orderId);
  cursor = yield r.table('lcard').filter(filter).run(conn);
  lcards = yield cursor.toArray();
  lcard = lcards[0];
  lcard.bindings.splice(lcard.bindings.indexOf(orderId), 1);
  delete lcard.orders[orderId];
  if (lcard.bindings.length === 0) {
    lcard.free = r.epochTime(0);
  } else {
    for (var i in lcard.orders) {
      if (lcard.orders[i].end.getTime() > max) {
        max = lcard.orders[i].end.getTime();
        maxId = i;
      }
    }
    start = lcard.orders[maxId].start.getTime()/1000;
    end = lcard.orders[maxId].end.getTime()/1000;
    lcard.free = r.epochTime((end-start)/86400 < 14 ? start+16*86400 : end+2*86400);
  }
  yield r.table('lcard').get(lcard.id).replace(lcard).run(conn);
}

orders.insert = function* (
  table, id, name, passport, phone, start, end, region, warning,
  address, note, shipped, carrier, tracking, bcard
) {
  var conn, lcard, ctime, order;
  conn = yield connect();
  yield orders.exist(id);
  lcard = yield orders.match(start, region);
  ctime = r.now();
  yield orders.bind(lcard, id, start, end);
  order = {
    id: id, name: name, passport: passport, phone: phone, start: start,
    end: end, region: region, warning: warning, address: address, note: note,
    shipped: shipped, carrier: carrier, tracking: tracking, bcard: bcard,
    ctime: ctime, lcard: lcard
  };
  yield r.table(table).insert(order).run(conn);
}

orders.del = function* (id) {
  var conn;
  conn = yield connect();
  if ((yield r.table('order').get(id).run(conn)) !== null) {
    yield r.table('order').get(id).delete().run(conn)
    yield orders.unbound(id);
  } else {
    yield r.table('legacy').get(id).delete().run(conn);
  }
  return id;
}

orders.update = function* (
  oldId, table, id, name, passport, phone, start, end, region,
  warning, address, note, shipped, carrier, tracking, bcard
) {
  var conn, oldOrder, oldTable, oldStart, oldEnd, order;
  conn = yield connect();
  if (oldOrder = yield r.table('order').get(oldId).run(conn) !== null) {
    oldTable = 'order';
  } else if (oldOrder = yield r.table('legacy').get(oldId).run(conn) !== null) {
    oldTable = 'legacy';
  } else {
    throw new Error('无法更新订单，因为订单号'+oldId+'根本就不存在！');
  }
  order = {
    id: id, name: name, passport: passport, phone: phone, start: start,
    end: end, region: region, warning: warning, address: address, note: note,
    shipped: shipped, carrier: carrier, tracking: tracking, bcard: bcard,
    ctime: oldOrder.ctime
  };
  oldStart = olderOrder.start;
  oldEnd = oldOrder.end;
  if (table === 'order' && oldTable === 'order') {
    if (oldStart.getTime() === start.getTime() && oldEnd.getTime() === end.getTime() && oldId === id) {
      // normal update, neither duration nor id has changed
      order.lcard = oldOrder.lcard;
      r.table('order').get(oldId).replace(order).run(conn);
    } else if ((oldStart.getTime() !== start.getTime() || oldEnd.getTime() !== end.getTime()) && oldId === id) {
      // only duration is changed
      lcard = yield orders.match(start, region);
      yield orders.unbound(oldId);
      orders.bind(lcard, id, start, end);
      order.lcard = lcard;
      r.table('order').get(ordId).replace(order).run(conn);
    } else if (oldStart.getTime() === start.getTime() && oldEnd.getTime() === end.getTime() && oldId !== id) {
      // only id is changed
      yield orders.exist();
      yield orders.rebind(oldId, id);
      order.lcard = oldOrder.lcard;
      yield r.table('order').get(oldId).delete().run(conn);
      yield r.table('order').insert(order).run(conn);
    } else if ((oldStart.getTime() !== start.getTime() || oldEnd.getTime() !== end.getTime()) && oldId !== id) {
      // both duration and id have changed
      yield orders.exist();
      lcard = yield orders.match(start, region);
      yield orders.unbound(oldId);
      yield r.table('order').get(oldId).delete().run(conn);
      order.lcard = oldOrder.lcard;
      yield orders.bind(lcard, id, start, end);
      yield r.table('order').insert(order).run(conn);
    }
  }
}

orders.get = function* (table, id) {
  var conn, order;
  conn = yield connect();
  order = yield r.table(table).get(id).run(conn);
  if (order === null) throw new Error('Order ' + id + ' is not found!');
  return order;
}

orders.search = function* (table, orderBy, filter, startIndex, endIndex) {
  var conn, cursor, options, orders, ids = [];
  conn = yield connect();
  options = {leftBound:'closed', rightBound:'closed'};
  cursor = yield r.table(table).orderBy(orderBy).filter(filter).slice(startIndex, endIndex, options).run(conn);
  orders = yield cursor.toArray();
  if (orders.length === 0) throw new Error('没有找到任何订单！');
  orders.forEach(function (order) {
    ids.push(order.id);
  });
  filter = function (row) {
    return r.expr(ids).contains(row('id'));
  }
  return yield r.table(table).orderBy(orderBy).limit(ids.length).filter(filter).changes().run(conn);
}

orders.exist = function* (id) {
  var conn;
  conn = yield connect();
  if ((yield r.table('order').get(id).run(conn)) !== null) throw new Error('订单号'+id+'已存在！');
  if ((yield r.table('legacy').get(id).run(conn)) !== null) throw new Error('订单号'+id+'已存在！');
}

orders.count = function* (table, filter) {
  var conn;
  conn = yield connect();
  return yield r.table(table).filter(filter).count().run(conn);
}

orders.toDate = function (str) {
  return new Date(parseInt(moment(str.replace(/\./g, '-') + ' +0800').format('x'), 10));
}

orders.formatTime = function (order) {
  var format, zone;
  format = 'YYYY.MM.DD';
  zone = 'Asia/Shanghai';
  order.start = moment.tz(order.start, zone).format(format);
  order.end = moment.tz(order.end, zone).format(format);
  format = 'YYYY.MM.DD, H:ss';
  order.ctime = moment.tz(order.ctime, zone).format(format);
}
