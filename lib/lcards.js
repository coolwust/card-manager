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
        socket.emit('upload', info);
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
            var date = message.new_val.date_added;
            var format = 'YYYY/MM/DD HH:mm:ss Z';
            var zone = 'Asia/Shanghai';
            message.new_val.date_added = moment.tz(date, zone).format(format);
          }
          socket.emit('search', message);
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
    return { id: value, region: data.region, timeline: [], date_added: time };
  });
  var option = { conflict: 'error' };
  return yield r.table('lcard').insert(documents, option).run(conn);;
}

function* cardsSearch(data, test) {
  var conn = yield connect();
  var query  = r.table('lcard').orderBy({ index: r.desc('date_added') })
    .filter(function (row) {
      if (data.date) {
        var time = r.time(data.date.year, data.date.month, data.date.day, '+08:00').date();
      }
      return row
        .and(data.id ? row('id').toJsonString().match(data.id) : true)
        .and(data.region !== 'all' ? row('region').eq(data.region) : true)
        .and(data.date ? row('date_added').inTimezone('+08:00').date().eq(time) : true);
        //.and(data.date ? row('date_added').date().eq(r.now.date()) : true);
  }).limit(data.page * data.count + 1);
  if (!test) query = query.changes();
  query = query.skip((data.page - 1) * data.count);
  try {
    return yield query.run(conn);
  } catch (e) {
    console.log(e);
  }
}
