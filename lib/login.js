'use strict';

var marko = require('marko');
var r = require('rethinkdb');
var connect = require('./connect.js');
var co = require('co');
var querystring = require('querystring');
var bcrypt = require('bcrypt');

module.exports = login;

function login() {
  return function* (next) {

    function post(request) {
      return new Promise(function (resolve, reject) {
        request.on('data', function (data) {
          resolve(querystring.parse(data.toString()));
        });
        request.on('end', function () {
          reject();
        });
      });
    }

    function compare(data, encrypted) {
      return new Promise(function (resolve, reject) {
        bcrypt.compare(data, encrypted, function (err, same) {
          if (err) return reject(err);
          resolve(same);
        });
      });
    }

    var data = {};
    if (this.request.method === 'POST') {
      var credentials = yield post(this.req);
      if (!credentials.username || !credentials.password) {
        data.state = 'Username or passowrd cannot be empty.';
        this.response.body = marko.load(__dirname + '/../views/login.marko').stream(data);
        this.response.type = 'text/html';
      } else {
        var conn = yield connect();
        var record = yield r.table('moderator').get(credentials.username).run(conn);
        if (record) {
          var same = yield compare(credentials.password, record.password);
        }
        if (!record || !same) {
          data.state = 'Password incorrect. Your activity has been logged.';
          this.response.body = marko.load(__dirname + '/../views/login.marko').stream(data);
          this.response.type = 'text/html';
        } else {
          this.session.username = credentials.username;
          this.response.redirect('/');
        }
      }
    } else {
      if (this.session.username) {
        this.response.redirect('/');
      } else {
        if (this.request.query.state === 'logout') {
          data.state = 'You have successfully logged out.'
        } else {
          data.state = 'You have not logged in yet.'
        }
        this.response.body = marko.load(__dirname + '/../views/login.marko').stream(data);
        this.response.type = 'text/html';
      }
    }

    yield next;
  }
}
