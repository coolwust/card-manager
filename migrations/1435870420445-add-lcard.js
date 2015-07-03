'use strict'

var r = require('rethinkdb');
var config = require('../config/db_connect.js');

exports.up = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableCreate('lcard').run(conn);
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
