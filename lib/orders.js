'use strict';

var marko = require('marko');

module.exports = orders;

function orders() {
  return function* (next) {
    var data = {
      username: this.session.username
    };
    this.body = marko.load(__dirname + '/../views/orders.marko').stream(data);
    this.type = 'text/html';
    yield next;
  }
}

orders.listen = function (io) {
  io.of('orders').on('connect', function (socket) {

    socket.on('insert', function (data) {
    data.lcard = '123456';
    data.ctime = new Date();
      setTimeout(function() {
        socket.emit('inserted', data);
      }, 1000);
    });

    socket.on('get', function (data) {
      setTimeout(function() {
        socket.emit('got', { id: 274502745, ctime: '1988.12.25', lcard: 720740572 });
      }, 2000);
    });

    socket.on('update', function (data) {
      setTimeout(function() {
        socket.emit('update', {
          finish: 'hehe'
        });
      }, 2000);
    });

    socket.on('disconnect', function () {
    });
  });
}
