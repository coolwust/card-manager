'use strict';

var r = require('rethinkdb');
var config = require('../config/db_connect.js');

module.exports = connect;

var store;
function connect() {
  return store || (store = r.connect(config));
}
