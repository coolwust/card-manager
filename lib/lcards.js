'use strict';

var marko = require('marko');
var connect = require('./connect.js');
var r = require('rethinkdb');
var co = require('co');
var moment = require('moment-timezone');

module.exports = lcards;
lcards.cardsSearch = cardsSearch;

function lcards() {
  return function* (next) {
    var data = {
      username: this.session.username,
    };
    this.body = marko.load(__dirname + '/../views/lcards.marko').stream(data);
    this.type = 'text/html';
    yield next;
  }
}

lcards.listen = function (io) {
  io.of('lcards').on('connect', function (socket) {
    socket.on('upload', function (data) {
      var binary = /[^A-Za-z0-9\r\n_-]/.test(data.contents);
      if (binary) socket.emit('upload', { malformed: true });
      if (data.page * data.count > 90000) return;
      co(cardsInsert(data)).then(function (info) {
        info.region = data.region;
        socket.emit('uploaded', info);
      });
    });

    var cur;
    socket.on('search', function (data) {
      if (cur) {
        cur.close();
        cur = null;
      }
      co(cardsSearch(data)).then(function (cursor) {
        cur = cursor;
        cursor.on('data', function (message) {
          if (message.new_val) {
            var date = message.new_val.ctime;
            var format = 'YYYY/MM/DD HH:mm:ss Z';
            var zone = 'Asia/Shanghai';
            message.new_val.ctime = moment.tz(date, zone).format(format);
          }
          socket.emit('searched', message);
        });
        cursor.on('error', function (message) {
        });
      });
    });

    socket.on('disconnect', function () {
      if (cur) { 
        cur.close();
        cur = null;
      }
    });
  });
}

function* cardsInsert(data) {
  var conn = yield connect();
  var time = r.now();
  var documents = data.contents.split(/\r?\n/).map(function (value) {
    return value.trim();
  }).filter(function (value) {
    return value !== '';
  }).map(function (value) {
    return { id: value, region: data.region, timeline: [], ctime: time };
  });
  var option = { conflict: 'error' };
  return yield r.table('lcard').insert(documents, option).run(conn);;
}

function* cardsSearch(data, test) {
  var conn = yield connect();
  var query  = r.table('lcard').orderBy({ index: r.desc('ctime') })
    .filter(function (row) {
      if (data.ctime) {
        var time = r.time(data.ctime.year, data.ctime.month, data.ctime.day, '+08:00').date();
      }
      return row
        .and(data.id ? row('id').toJsonString().match(data.id) : true)
        .and(data.region !== 'All' ? row('region').eq(data.region) : true)
        .and(data.ctime ? row('ctime').inTimezone('+08:00').date().eq(time) : true);
  }).limit(data.page * data.count + 1);
  if (!test) query = query.changes();
  query = query.skip((data.page - 1) * data.count);
  try {
    return yield query.run(conn);
  } catch (e) {
    console.log(e);
  }
}
