'use strict';

function NavigationComponent(bag) {
  if (!bag.sockets.session) bag.sockets.session = io(config.host + ':' + config.port + '/session');
  this.notification = '';
  this.sockets = bag.sockets;
  this.username = '';
  Object.defineProperty(this, 'location', {
    get: function () {
      return bag.navigation.location;
    }
  });
  this.sockets.session.on('connect', function () {
    this.sockets.session.emit('whoami', document.cookie);
  }.bind(this));
  this.sockets.session.on('youare', function (username) {
    this.username = username;
  }.bind(this));
}

NavigationComponent.annotations = [
  new ng.ComponentAnnotation({
    selector: 'navigation'
  }),
  new ng.ViewAnnotation({
    templateUrl: '../tp/navigation.html',
    directives: [ng.NgFor, ng.NgIf]
  })
];

NavigationComponent.parameters = [
  [Bag]
];
