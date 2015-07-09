'use strict'

var r = require('rethinkdb');
var config = require('../config/db_connect.js');

exports.up = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableCreate('order').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('order').indexCreate('phone').run(conn);
    })
    .then(next.bind(null, null), next);
};

exports.down = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableDrop('order').run(conn);
    })
    .then(next.bind(null, null), next);
};
