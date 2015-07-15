'use strict';

var connect = require('./connect.js');
var r       = require('rethinkdb');
var co      = require('co');

module.exports = session;

function session() {
  return function* (next) {
    var conn = yield connect();
    var sid = this.cookies.get('sid', { signed: true });
    if (sid) {
      this.session = yield r.table('session').get(sid).run(conn) || {};
    } else {
      this.session = {};
    }
    yield next;
    var isEmpty = (Object.getOwnPropertyNames(this.session).length === 0);
    if (isEmpty && sid) { // delete
      yield r.table('session').get(sid).delete().run(conn);
      this.cookies.set('sid');
    } else if (!isEmpty && sid) { // update
      this.session.expire = Date.now() + 1000 * 60 * 60 * 24 * 30;
      var info = yield r.table('session').get(sid).update(this.session).run(conn);
      var options = {
        signed: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
        overwrite: true,
        httpOnly: false
      }
      this.cookies.set('sid', sid, options);
    } else if (!isEmpty && !sid) { // insert
      this.session.expire = Date.now() + 1000 * 60 * 60 * 24 * 30;
      var info = yield r.table('session').insert(this.session).run(conn);
      var options = {
        signed: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
        overwrite: true,
        httpOnly: false
      }
      this.cookies.set('sid', info.generated_keys[0], options);
    }
  }
}

session.listen = function (io) {
  io.of('session').on('connect', function (socket) {
    socket.on('whoami', function (cookie) {
      cookie.split('; ').forEach(function (cookie) {
        if (/^sid=/.test(cookie) !== true) return;
        co(function* () {
          var conn, session;
          conn = yield connect();
          session = yield r.table('session').get(cookie.substr(4)).run(conn);
          socket.emit('youare', session.username);
        });
      });
    });
  });
}
