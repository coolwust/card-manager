'use strict';

function OrdersComponent() {
}

OrdersComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders'
  }),
  new angular.ViewAnnotation({
    template: '<orders-panel></orders-panel><orders-result></orders-result>',
    directives: [OrdersPanelComponent, OrdersListComponent]
  })
];

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(OrdersComponent);
});


