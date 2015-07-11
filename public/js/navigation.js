'use strict';

function NavigationComponent(bag) {
  this.notification = '';
  Object.defineProperty(this, 'location', {
    get: function () {
      return bag.navigation.location;
    }
  });
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
