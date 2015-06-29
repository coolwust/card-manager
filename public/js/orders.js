'use strict';

function OrdersComponent() {
}

OrdersComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders'
  }),
  new angular.ViewAnnotation({
    template: '<orders-filter>' +
      '<orders-list></orders-list>',
    directives: [OrdersFilterComponent]
  })
];

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(OrdersComponent);
});

function OrdersFilterComponent() {
  this.barFilters = [
    'Any',
    'Date Starting',
    'Date Ending',
    'Date Ordering',
    'Customer Name',
    'Order ID',
    'Phone Number',
    'Passport ID',
    'L-Card Number',
    'B-Card Number'
  ];
  this.barFilter = 'Any';
  this.barDisabled = true;
  this.barPlaceholder = '';
  //this.credentials = new angular.ControlGroup({
  //    username: new angular.Control('', angular.Validators.required),
  //    password: new angular.Control('', angular.Validators.required)
  //});
  //var socket = io('192.168.56.102:3000');
  //socket.emit('login');
}

OrdersFilterComponent.prototype.onSelectFilter = function (filter) {
  this.barFilter = filter;
  switch (filter) {
    case 'Date Starting':
    case 'Date Ending':
    case 'Date Ordering':
      this.barPlaceholder = 'MM-DD-YYYY';
      this.barDisabled = false;
      break;
    case 'Any':
      this.barDisabled = true;
      this.barPlaceholder = '';
      break;
    default:
    this.barDisabled = false;
      this.barPlaceholder = '';
  }
}

OrdersFilterComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders-filter'
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/orders-filter.html',
    directives: [angular.NgFor]
  })
];
