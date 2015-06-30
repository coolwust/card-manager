'use strict';

function Connection() {
  this.bag = {};

  var socket = io(config.host + ':' + config.port);
  this.bag.message = 'connecting to server...';
  this.bag.status = 'default';
  socket.on('connect', function () {
    this.bag.status = 'success';
    this.bag.message = 'connection to server is established'
  }.bind(this));
  socket.on('reconnecting', function (num) {
    this.bag.message = 'connection to server is lost, number of failed reconnection attempts: ' + num
    this.bag.status = 'danger';
  }.bind(this));
}

function ServerStatusComponent(conn) {
  this.conn = conn.bag;
}

ServerStatusComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'server-status',
    appInjector: [Connection]
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/server-status.html'
    
  })
];

ServerStatusComponent.parameters = [
  [Connection]
];

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(ServerStatusComponent);
});
