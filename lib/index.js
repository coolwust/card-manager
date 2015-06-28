'use strict';

module.exports = index;

function index() {
  return function* (next) {
    this.response.redirect('/orders');
    yield next;
  }
}
