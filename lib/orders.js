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
    socket.on('insert', function (data) {
      co(function* () {
        return yield orders.insert(data);
      }).then(function (data) {
        socket.emit('inserted', data);
      }).catch(function (err) {
        socket.emit('inserted', {error: err.message});
      });
    });
    socket.on('get', function (data) {
      setTimeout(function() {
        socket.emit('got', { id: 274502745, ctime: '1988.12.25', lcard: 720740572 });
      }, 2000);
    });
    socket.on('update', function (data) {
      setTimeout(function() {
        socket.emit('update', {
          finish: 'hehe'
        });
      }, 2000);
    });
    socket.on('disconnect', function () {
    });
  });

}

orders.insert = function* (data) {
  var conn, order;
  conn = yield connect();
  if (yield r.table('order').get(data.id).run(conn)) throw new Error('Order ID exists!');
  data.lcard = yield orders.match(orders.timestamp(data.start), data.region);
  data.ctime = r.now();
  yield orders.bind(data.lcard, data.id, orders.timestamp(data.start), orders.timestamp(data.end));
  yield r.table('order').insert(data).run(conn);
  order = yield r.table('order').get(data.id).run(conn);
  order.ctime = moment.tz(order.ctime, 'Asia/Shanghai').format('YYYY.MM.DD h:ss');
  return order;
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

orders.timestamp = function (str) {
  return parseInt(moment(str.replace(/\./g, '-') + ' +0800').format('X'), 10);
}
