'use strict';

module.exports = logout;

function logout() {
  return function* (next) {
    this.session = {};
    this.response.redirect('/login?state=logout');
    yield next;
  }
}
