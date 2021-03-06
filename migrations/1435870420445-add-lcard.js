'use strict'

var r = require('rethinkdb');
var config = require('../config/db_connect.js');

// fields: 
//   id: 
//   ctime: 
//   region: 
//   orders: 
//   bindings: 
//   free: 
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
