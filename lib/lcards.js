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
    socket.on('insert', lcards.onInsert.bind(socket));
    socket.on('search', lcards.onSearch.bind(socket));
    socket.on('disconnect', lcards.onDisconnect.bind(socket));
  });
}

lcards.onInsert = function (data) {
  co(function* (){
    return yield lcards.insert(data.contents, data.region);
  }).then(function (info) {
    this.emit('inserted', info);
  }.bind(this)).catch(function (err) { 
    this.emit('failed', err.message);
  }.bind(this));
}

lcards.onSearch = function (data) {
  var id, ctime, region, page, count, date, format, zone;
  lcards.unregister(this);
  id = data.id === '' ? null : data.id;
  ctime = data.ctime === '' ? null : lcards.timestamp(data.ctime);
  region = data.region === '' ? null : data.region;
  page = data.page;
  count = data.count;
  co(function* () {
    return yield lcards.search(id, ctime, region, page, count);
  }).then(function (cursor) {
    this.cursor = cursor;
    cursor.on('data', function (data) {
      if (data.new_val) {
        date = data.new_val.ctime;
        format = 'YYYY.MM.DD, H:ss';
        zone = 'Asia/Shanghai';
        data.new_val.ctime = moment.tz(date, zone).format(format);
        date = data.new_val.free.getTime() === 0 ? Date.now() : data.new_val.free;
        format = 'YYYY.MM.DD';
        data.new_val.free = moment.tz(date, zone).format(format);
        data.total = cursor.total;
      }
      this.emit('searched', data);
    }.bind(this));
  }.bind(this)).catch(function (err) { 
      this.emit('failed', err.message);
  }.bind(this));
}

lcards.onDisconnect = function () {
  lcards.unregister(this);
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
      ctime: r.now(),
      orders: {}, bindings: [], free: r.epochTime(0)
    };
  });
  return yield r.table('lcard').insert(lcards).run(conn);
}

lcards.search = function* (id, ctime, region, page, count) {
  var conn, orderBy, filter, total, during = [], start, end, lcards, ids = [], limit, cursor;
  conn = yield connect();
  orderBy = {index: r.desc('ctime')};
  filter = function (row) {
    if (typeof ctime === 'number') {
      during[0] = (r.epochTime(ctime));
      during[1] = r.epochTime(ctime+24*60*60);
    }
    return row
      .and(typeof id === 'string' ? row('id').eq(id) : true)
      .and(typeof ctime === 'number' ? row('ctime').during(during[0], during[1]) : true)
      .and(typeof region === 'string' ? row('region').eq(region) : true);
  }
  total = yield r.table('lcard').count(filter).run(conn);
  start = (page-1)*count;
  end = page*count+1;
  lcards = yield r.table('lcard').orderBy(orderBy).filter(filter).slice(start, end).run(conn);
  lcards = yield lcards.toArray();
  if (lcards.length === 0) throw new Error('No lcard matches your criteria!');
  lcards.forEach(function (lcard) {
    ids.push(lcard.id);
  });
  limit = count+1;
  filter = function (row) {
    return r.expr(ids).contains(row('id'));
  }
  cursor = yield r.table('lcard').orderBy(orderBy).limit(limit).filter(filter).changes().run(conn);
  cursor.total = total;
  return cursor;
}

lcards.timestamp = function (str) {
  return parseInt(moment(str.replace(/\./g, '-') + ' +0800').format('X'), 10);
}

lcards.unregister = function (socket) {
  if (socket.cursor) {
    socket.cursor.removeAllListeners();
    socket.cursor = null;
  }
}
