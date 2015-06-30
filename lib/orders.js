'use strict';

var marko = require('marko');

module.exports = orders;

function orders() {
  return function* (next) {
    var data = {
      username: this.session.username,
      serverStatus: true
    };
    this.body = marko.load(__dirname + '/../views/orders.marko').stream(data);
    this.type = 'text/html';
    yield next;
  }
}
