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
      co(insert(data)).then(function () {
      }, function (err) {
        socket.emit('inserted', { error: err });
      });
    });

    socket.on('get', function (data) {
      setTimeout(function() {

  //start = parseInt(moment(start.replace(/\./g, '-') + ' +0800').format('X'), 10);
  //end = parseInt(moment(end.replace(/\./g, '-') + ' +0800').format('X'), 10);
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
}

orders.match = function* (start, region, exclude) {
  var conn, filter, orderBy, cursor, lcard;
  conn = yield connect();
  filter = r.row('free').le(r.epochTime(start));
  filter = filter.and(r.row('region').eq(region));
  if (typeof exclude !== 'undefined') filter = filter.and(r.row('id').ne(exclude));
  orderBy = {index: r.asc('free')};
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
  for (var i in lcard.orders) {
    if (lcard.orders[i].end.getTime() > max) {
      max = lcard.orders[i].end.getTime();
      maxId = i;
    }
  }
  start = lcard.orders[maxId].start.getTime()/1000;
  end = lcard.orders[maxId].end.getTime()/1000;
  lcard.free = r.epochTime((end-start)/86400 < 14 ? start+16*86400 : end+2*86400);
  yield r.table('lcard').get(lcard.id).replace(lcard).run(conn);
}

//orders.rematch = function* (id, region, start, end, fresh) {
//  var conn = yield connect();
//  var filter = function (lcard) {
//    return lcard('matches').contains(id);
//  }
//  var cursor = yield r.table('lcard').filter(filter).run(conn);
//  var results = yield cursor.toArray();
//  if (results.length !== 1) { 
//    var message = 'Multiple lcards have linked to the same order, please report the issue to admin.';
//    throw new Error(message);
//  }
//  var result = results[0];
//  if (!fresh && region === result.region && 
//      result.orders[id].start.getTime()/1000 === start &&
//      result.orders[id].end.getTime()/1000 === end) {
//      return;
//  }
//  if (fresh) {
//    var filter = r.row('ready').le(r.epochTime(start)).and(r.row('region').eq(region).and(r.row('id'));
//    var orderBy = { index: r.asc('ready') };
//    var cursor = yield r.table('lcard').orderBy(orderBy).filter(filter).limit(1).run(conn);
//    var results = yield cursor.toArray();
//    if (results.length === 0) throw new Error('Sorry, currently no lcard is avaiable.');
//    var result = results[0];
//  }
//}

orders.timestamp = function (str) {
  return parseInt(moment(str.replace(/\./g, '-') + ' +0800').format('X'), 10);
}
