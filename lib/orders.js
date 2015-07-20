'use strict';

var marko = require('marko');
var connect = require('./connect.js');
var co = require('co');
var r = require('rethinkdb');
var moment = require('moment-timezone');

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
    var data, result;
    socket.on('insert', orders.onInsert.bind(socket));
    socket.on('update', orders.onUpdate.bind(socket));
    socket.on('delete', orders.onDelete.bind(socket));
    socket.on('search', function (data) {
      co(function* () {
        result = yield orders.doSearch(data);
        result.cursor.on('data', function (data) {
          if (data.new_val !== null) {
            var format = 'YYYY.MM.DD';
            var zone = 'Asia/Shanghai';
            data.new_val.start = moment.tz(data.new_val.start, zone).format(format);
            data.new_val.end = moment.tz(data.new_val.end, zone).format(format);
            format = 'YYYY.MM.DD, H:ss';
            data.new_val.ctime = moment.tz(data.new_val.ctime, zone).format(format);
          }
          socket.emit('searched', {order: data, total: result.total});
        });
      }).catch(function (err) {
        socket.emit('searched', {error: err.message});
      });
    });
    socket.on('get', function (data) {
      var order;
      co(function* () {
        order = yield orders.doGet(data);
        var format = 'YYYY.MM.DD';
        var zone = 'Asia/Shanghai';
        order.end = moment.tz(data.end, zone).format(format);
        order.start = moment.tz(data.start, zone).format(format);
        socket.emit('got', order);
      }).catch(function (err) {
      console.log(err);
        socket.emit('got', {error: err});
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
  return order;
}

orders.doSearch = function* (data) {
  var table, index, orderBy, filter, startIndex, endIndex, cursor, total;
  table = data.table === 'legacy' ? 'legacy' : 'order';
  index = ['id', 'ctime', 'start', 'end'].indexOf(data.index) === -1 ? 'ctime' : data.index;
  orderBy = data.sorting === 'asc' ? {index: r.asc(index)} : {index: r.desc(index)};
  filter = function (row) {
    var bool = r.and(true);
    if (data.domain.name === 'start') {
      bool = bool.and(row(data.domain.name).le(r.epochTime(orders.timestamp(data.domain.value))));
    } else if (data.domain.name === 'end') {
      bool = bool.and(row(data.domain.name).le(r.epochTime(orders.timestamp(data.domain.value)+24*60*60)));
    } else if (data.domain.name === 'ctime') {
      bool = bool.and(row(data.domain.name).eq(r.epochTime(orders.timestamp(data.domain.value))));
    } else if (['name', 'id', 'phone', 'passport', 'lcard', 'bcard'].indexOf(data.domain.name) !== -1) {
      bool = bool.and(row(data.domain.name).eq(data.domain.value));
    }
    if (['Error', 'Normal'].indexOf(data.health) !== -1) {
      bool = bool.and(row('health').eq(data.health));
    }
    if (['Pending', 'Shipped'].indexOf(data.shipping) !== -1) {
      bool = bool.and(row('shipping').eq(data.shipping));
    }
    return bool;
  }
  startIndex = typeof data.startIndex === 'number' ? data.startIndex : 0;
  endIndex = typeof data.endIndex === 'number' ? data.endIndex : 21;
  cursor = yield orders.search(table, orderBy, filter, startIndex, endIndex);
  total = yield orders.count(table, filter);
  return {cursor: cursor, total: total};
}

orders.match = function* (start, region, exclude) {
  var conn, filter, orderBy, cursor, lcard;
  conn = yield connect();
  filter = r.row('free').le(r.epochTime(start));
  filter = filter.and(r.row('region').eq(region));
  if (typeof exclude !== 'undefined') filter = filter.and(r.row('id').ne(exclude));
  orderBy = {index: r.desc('free')};
  cursor = yield r.table('lcard').orderBy(orderBy).filter(filter).limit(1).run(conn);
  lcard = yield cursor.toArray();
  if (lcard.length === 0) throw new Error('Sorry, no lcard is free for the order.');
  return lcard[0].id;
}

orders.bind = function* (lcardId, orderId, start, end) {
  var conn, lcard;
  conn = yield connect();
  lcard = yield r.table('lcard').get(lcardId).run(conn);
  lcard.orders[orderId] = {start: r.epochTime(start), end: r.epochTime(end)};
  lcard.free = r.epochTime((end-start)/86400 < 14 ? start+16*86400 : end+2*86400);
  lcard.bindings.push(orderId);
  yield r.table('lcard').get(lcardId).replace(lcard).run(conn);
}

orders.unbound = function* (orderId) {
  var conn, filter, cursor, lcard, max = 0, maxId, start, end;
  conn = yield connect();
  filter = r.row('bindings').contains(orderId);
  cursor = yield r.table('lcard').filter(filter).run(conn);
  lcard = yield cursor.toArray();
  lcard = lcard[0];
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

orders.search = function* (table, orderBy, filter, startIndex, endIndex) {
  var conn, cursor, options, orders, ids = [];
  conn = yield connect();
  options = {leftBound:'closed', rightBound:'closed'};
  cursor = yield r.table(table).orderBy(orderBy).filter(filter).slice(startIndex, endIndex, options).run(conn);
  orders = yield cursor.toArray();
  if (orders.length === 0) throw new Error('No order matches your criterias!');
  orders.forEach(function (order) {
    ids.push(order.id);
  });
  filter = function (row) {
    return r.expr(ids).contains(row('id'));
  }
  return yield r.table(table).orderBy(orderBy).limit(ids.length).filter(filter).changes().run(conn);
}

orders.get = function* (table, id) {
  var conn, order;
  conn = yield connect();
  order = yield r.table(table).get(id).run(conn);
  if (order === null) throw new Error('Order ' + id + ' is not found!');
  return order;
}

orders.count = function* (table, filter) {
  var conn;
  conn = yield connect();
  return yield r.table(table).filter(filter).count().run(conn);
}

orders.timestamp = function (str) {
  return parseInt(moment(str.replace(/\./g, '-') + ' +0800').format('X'), 10);
}
