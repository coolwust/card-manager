'use strict';

var marko = require('marko');

module.exports = orders;

function orders() {
  return function* (next) {
    var data = {
      username: this.session.username,
    };
    this.body = marko.load(__dirname + '/../views/l-cards.marko').stream(data);
    this.type = 'text/html';
    yield next;
  }
}
