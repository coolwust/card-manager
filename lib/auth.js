'use strict';

var r = require('rethinkdb');

module.exports = auth;

function auth() {
  return function* (next) {
    if (this.request.path !== '/login' && (this.session === null || typeof this.session !== 'object' || Object.getOwnPropertyNames(this.session).length <= 1 || !this.session.username)) {
      this.session = {};
      this.request.path = '/login';
    }
    yield next;
  }
}
