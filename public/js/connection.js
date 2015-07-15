'use strict';

function ConnectionComponent(bag) {
  this.dots = '';
  var socket = io(config.host + ':' + config.port);
  var num;
  Object.defineProperty(this, 'message', {
    get: function () {
      var message = 'The connection to the server has been lost. The server is ';
      message += 'not found or may be down. Trying to reconnect #' + num + ' ' + this.dots;
      return message;
    }
  });
  this.status = 'connected';
  var id = null;
  socket.on('connect', function () {
    if (id !== null) {
      window.clearInterval(id);
      id = null;
    }
    this.status = 'connected';
    window.onwheel = null;
    document.body.style.overflow = 'visible';
  }.bind(this));
  socket.on('reconnecting', function (count) {
    if (id === null) id = this.runDots();
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

ConnectionComponent.prototype.runDots = function () {
  var i = 0;
  return window.setInterval(function () {
    console.log('hehe');
    if (++i === 4) i = 0;
    if (i === 0) this.dots = '';
    if (i === 1) this.dots = '.';
    if (i === 2) this.dots = '..';
    if (i === 3) this.dots = '...';
  }.bind(this), 450);
}
