'use strict';

var marko = require('marko');
var connect = require('./connect.js');
var r = require('rethinkdb');
var co = require('co');

module.exports = lcards;

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
      var binary = /[^A-Za-z0-9\r\n_-]/.test(data.num);
      //console.log(binary);
      if (binary) socket.emit('upload', { malformed: true });
      co(insertCards(data)).then(function (info) {
        info.region = data.region;
        socket.emit('upload', info);
      });
    });
  });
}

function* insertCards(data) {
  var conn = yield connect();
  var time = r.now();
  var documents = data.num.split(/\r?\n/).filter(function (value) {
    return value !== '';
  }).map(function (value) {
    return { id: value, region: data.region, timeline: [], time_added: time };
  });
  var option = { conflict: 'error' };
  return yield r.table('lcard').insert(documents, option).run(conn);;
}
