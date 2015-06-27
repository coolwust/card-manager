'use strict'

var config = require('../config/db_connect.js');
var r = require('rethinkdb');

exports.up = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableCreate('session').run(conn);
    })
    .then(next.bind(null, null), next);
};

exports.down = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableDrop('session').run(conn);
    })
    .then(next.bind(null, null), next);
};
