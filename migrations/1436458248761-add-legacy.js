'use strict'

var r = require('rethinkdb');
var config = require('../config/db_connect.js');

exports.up = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableCreate('legacy').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('legacy').indexCreate('ctime').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('legacy').indexCreate('start').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('legacy').indexCreate('end').run(conn).then(function () { return conn });
    })
    .then(next.bind(null, null), next);
};

exports.down = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableDrop('legacy').run(conn);
    })
    .then(next.bind(null, null), next);
};
