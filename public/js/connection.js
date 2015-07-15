'use strict';

function ConnectionComponent(bag) {
  var socket = io(config.host + ':' + config.port);
  var num;
  var dots;
  var i = 0;
  window.setInterval(function () {
    if (++i === 4) i = 0;
    if (i === 0) dots = '';
    if (i === 1) dots = '.';
    if (i === 2) dots = '..';
    if (i === 3) dots = '...';
  }, 450);
  Object.defineProperty(this, 'message', {
    get: function () {
      var message = 'The connection to the server has been lost. The server is ';
      message += 'not found or may be down. Trying to reconnect (' + num + ') ' + dots;
      return message;
    }
  });
  this.status = 'connected';
  socket.on('connect', function () {
    this.status = 'connected';
    window.onwheel = null;
    document.body.style.overflow = 'visible';
  }.bind(this));
  socket.on('reconnecting', function (count) {
    num = count;
    this.status = 'reconnecting';
    document.body.style.overflow = 'hidden';
  }.bind(this));
}

ConnectionComponent.annotations = [
  new ng.ComponentAnnotation({
    selector: 'connection'
  }),
  new ng.ViewAnnotation({
    templateUrl: '../tp/connection.html',
    directives: [ng.NgIf]
    
  })
];

ConnectionComponent.parameters = [
];