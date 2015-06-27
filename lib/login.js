'use strict';

module.exports = login;

function login() {
  return function* () {
    this.response.body = 'login page.';
  }
}
