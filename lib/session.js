'use strict';

var r = require('rethinkdb');
var connect = require('./connect.js');

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
        overwrite: true
      }
      this.cookies.set('sid', sid, options);
    } else if (!isEmpty && !sid) { // insert
      this.session.expire = Date.now() + 1000 * 60 * 60 * 24 * 30;
      var info = yield r.table('session').insert(this.session).run(conn);
      var options = {
        signed: true,
        maxAge: 1000 * 60 * 60 * 24 * 30,
        overwrite: true
      }
      this.cookies.set('sid', info.generated_keys[0], options);
    }
  }
}
