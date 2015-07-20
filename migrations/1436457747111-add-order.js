'use strict'

var r = require('rethinkdb');
var config = require('../config/db_connect.js');

// fields:
//   ctime:
//   lcard:
//   id:
//   name:    
//   passport:
//   phone:   
//   start:   
//   end:     
//   region:  
//   warning:  
//   address: 
//   note:    
//   shipped:
//   carrier: 
//   tracking:
//   bcard:   
exports.up = function(next) {
  r
    .connect(config)
    .then(function (conn) {
      return r.tableCreate('order').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('order').indexCreate('ctime').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('order').indexCreate('start').run(conn).then(function () { return conn });
    })
    .then(function (conn) {
      return r.table('order').indexCreate('end').run(conn).then(function () { return conn });
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
