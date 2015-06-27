'use strict';

module.exports = auth;

function auth() {
  return function* (next) {
  console.log(this.request.path);
    if (this.request.path !== '/login' && !this.session.moderator) {
      this.session = {};
      this.response.redirect('/login');
      this.response.body = 'You havn\'t logged in yet.';
    }
    yield next;
  }
}
