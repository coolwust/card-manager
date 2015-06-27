'use strict';

var koa = require('koa');
var serve = require('koa-static');
var compress = require('koa-compress');
var co = require('co');
var marko = require('marko');
var http = require('http');
var IO = require('socket.io');
var zlib = require('zlib');
var fs = require('fs');
var config = require('./config/app.js');
var session = require('./lib/session.js');
var auth = require('./lib/auth.js');
var Router = require('koa-router');
var login = require('./lib/login.js');

var app = koa();
app.keys = config.keys;
app.use(compress({ flush: zlib.Z_NO_FLUSH }));
app.use(serve(__dirname + '/public'));
app.use(session());
app.use(auth());

var router = new Router();
router.get('/login', login());
app.use(router.routes());

var server = http.createServer(app.callback());
var io = new IO(server);

server.listen(3000);