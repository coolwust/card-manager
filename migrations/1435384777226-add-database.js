'use strict'

var config = require('../config/db_connect.js');
var r = require('rethinkdb');

exports.up = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.dbCreate(config.db).run(conn);
    })
    .then(next.bind(null, null), next);
};

exports.down = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.dbDrop(config.db).run(conn);
    })
    .then(next.bind(null, null), next);

};
