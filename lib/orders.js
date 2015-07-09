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
      setTimeout(function() {
        socket.emit('insert', {
          finish: 'hehe'
        });
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
