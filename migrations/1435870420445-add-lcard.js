'use strict'

var r = require('rethinkdb');
var config = require('../config/db_connect.js');

// fields: 
//   id: the lcard id
//   ctime: lcard creation time
//   region: lcard region
//   orders: an object containing mapping of order id and order duration
//   bindings: an array containing order ids
//   free: the time that the lcard will be free to use
exports.up = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableCreate('lcard').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('lcard').indexCreate('ctime').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('lcard').indexCreate('free').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('lcard').indexCreate('bindings', {multi: true}).run(conn);
    })
    .then(next.bind(null, null), next);
};

exports.down = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableDrop('lcard').run(conn);
    })
    .then(next.bind(null, null), next);
};
