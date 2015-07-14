'use strict';

var connect = require('./connect.js');
var marko   = require('marko');
var r       = require('rethinkdb');
var co      = require('co');
var moment  = require('moment-timezone');

module.exports = lcards;

function lcards() {
  return function* (next) {
    this.body = marko.load(__dirname + '/../views/lcards.marko').stream();
    this.type = 'text/html';
    yield next;
  }
}

lcards.listen = function (io) {
  io.of('lcards').on('connect', function (socket) {
    var c;
    socket.on('insert', function (data) {
      var binary = /[^A-Za-z0-9\r\n_-]/.test(data.contents);
      if (binary === true) socket.emit('inserted', { malformed: true });
      co(function* (){
        return yield lcards.insert(data.contents, data.region);
      }).then(function (info) {
        socket.emit('inserted', info);
      }).catch(function (err) { 
        socket.emit('error', err);
      });
    });
    socket.on('search', function (data) {
      if (c) {
        c.removeAllListeners();
        c.close;
      }
      var id, ctime, region, page, count, date, format, zone;
      id = data.id === '' ? null : data.id;
      ctime = data.ctime === '' ? null : lcards.timestamp(data.ctime);
      region = data.region === '' ? null : data.region;
      page = data.page;
      count = data.count;
      co(function* () {
        return yield lcards.search(id, ctime, region, page, count);
      }).then(function (cursor) {
        c = cursor;
        cursor.on('data', function (data) {
          if (data.new_val) {
            date = data.new_val.ctime;
            format = 'YYYY.MM.DD';
            zone = 'Asia/Shanghai';
            data.new_val.ctime = moment.tz(date, zone).format(format);
          }
          socket.emit('searched', data);
        });
      }).catch(function (err) { 
          socket.emit('warning', err.message);
      });
    });
    socket.on('disconnect', function () {
      if (!c) return;
      c.removeAllListeners();
      c.close();
      c = null;
    });
  });
}


lcards.insert = function* (contents, region) {
  var conn, lcards;
  conn = yield connect();
  lcards = contents.split(/\r?\n/).map(function (line) {
    return line.trim();
  }).filter(function (line) {
    return line !== '';
  }).map(function (id) {
    return {
      id: id, region: region,
      ctime: r.now().inTimezone('+08:00').date(),
      orders: {}, bindings: [], free: r.epochTime(0)
    };
  });
  return yield r.table('lcard').insert(lcards).run(conn);
}

lcards.search = function* (id, ctime, region, page, count) {
  var conn, orderBy, filter, start, end, lcards, ids = [], limit;
  conn = yield connect();
  orderBy = {index: r.desc('ctime')};
  filter = function (row) {
    return row
      .and(typeof id === 'string' ? row('id').eq(id) : true)
      .and(typeof ctime === 'number' ? row('ctime').eq(r.epochTime(ctime)) : true)
      .and(typeof region === 'string' ? row('region').eq(region) : true);
  }
  start = (page-1)*count;
  end = page*count+1;
  lcards = yield r.table('lcard').orderBy(orderBy).filter(filter).slice(start, end).run(conn);
  lcards = yield lcards.toArray();
  if (lcards.length === 0) throw new Error('No lcard match your criteria!');
  lcards.forEach(function (lcard) {
    ids.push(lcard.id);
  });
  limit = count+1;
  filter = function (row) {
    return r.expr(ids).contains(row('id'));
  }
  return yield r.table('lcard').orderBy(orderBy).limit(limit).filter(filter).changes().run(conn);
}

lcards.timestamp = function (str) {
  return parseInt(moment(str.replace(/\./g, '-') + ' +0800').format('X'), 10);
}
