'use strict';

var marko = require('marko');
var connect = require('./connect.js');
var co = require('co');
var r = require('rethinkdb');
var moment = require('moment-timezone');

module.exports = orders;

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

// start                 end   stop   free
//   |      |      |      |      |      |      |      |
// --+------+------+------+------+------+------+------+---->
orders.match = function* (start, region, exclude) {
  var conn, filter, orderBy, cursor, results;
  conn = yield connect();
  filter = r.row('free').le(r.epochTime(start));
  filter = filter.and(r.row('region').eq(region));
  if (exclude) filter = filter.and(r.row('id').ne(exclude));
  orderBy = {index: r.asc('free')};
  cursor = yield r.table('lcard').orderBy(orderBy).filter(filter).limit(1).run(conn);
  results = yield cursor.toArray();
  if (results.length === 0) throw new Error('Sorry, no lcard is free for the order.');
  return results[0].id;
}

//orders.match = function* (id, region, start, end) {
//
//  // start                 end   stop   ready
//  //   |      |      |      |      |      |      |      |
//  // --+------+------+------+------+------+------+------+---->
//
//  //start = parseInt(moment(start.replace(/\./g, '-') + ' +0800').format('X'), 10);
//  //end = parseInt(moment(end.replace(/\./g, '-') + ' +0800').format('X'), 10);
//
//  var conn = yield connect();
//  var filter = r.row('ready').le(r.epochTime(start)).and(r.row('region').eq(region));
//  var orderBy = { index: r.asc('ready') };
//  var cursor = yield r.table('lcard').orderBy(orderBy).filter(filter).limit(1).run(conn);
//  var results = yield cursor.toArray();
//  if (results.length === 0) throw new Error('Sorry, currently no lcard is avaiable.');
//  var result = results[0];
//  result.orders[id] = { start: r.epochTime(start), end: r.epochTime(end) };
//  result.ready = r.epochTime(end + 2*24*60*60);
//  result.matches.push(id);
//  yield r.table('lcard').get(result.id).replace(result).run(conn);
//}
//
//orders.unmatch = function* (id) {
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
//  var index = result.matches.indexOf(id);
//  result.matches.splice(index, 1);
//  delete result.orders[id];
//  var m = 0;
//  for (var i in result.orders) {
//    if (result.orders[i].end.getTime()/1000 > m) m = result.orders[i].end.getTime()/1000;
//  }
//  result.ready = r.epochTime(m+2*24*60*60);
//  yield r.table('lcard').get(result.id).replace(result).run(conn);
//}
//
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
