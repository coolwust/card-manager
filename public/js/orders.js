'use strict';

function OrdersComponent() {
}

OrdersComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders'
  }),
  new angular.ViewAnnotation({
    template: '<orders-filter>' +
      '<orders-list></orders-list>{{ barFilter }}',
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
  this.init = false;
  //var socket = io('192.168.56.102:3000');
  //socket.emit('login');
}

OrdersFilterComponent.prototype.onSelectFilter = function (filter) {
  document.getElementById('filterBar').value = '';
  this.barFilter = filter;
  this.init = false;
  switch (filter) {
    case 'Date Starting':
    case 'Date Ending':
    case 'Date Ordering':
      this.barPlaceholder = 'MM-DD-YY';
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
OrdersFilterComponent.prototype.onBarKeyUp = function ($event) {
  this.init = true;
  var value = $event.target.value;
  switch (this.barFilter) {
    case 'Date Starting':
    case 'Date Ending':
    case 'Date Ordering':
      var regexp = /^(?:(?:(?:0?[13578]|1[02])(\/|-|\.)31)\1|(?:(?:0?[1,3-9]|1[0-2])(\/|-|\.)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:0?2(\/|-|\.)29\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0?[1-9])|(?:1[0-2]))(\/|-|\.)(?:0?[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;
      this.barValid = regexp.test(value);
      break;
    default:
      this.barValid = (value.length > 0);
      
  }
}

OrdersFilterComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders-filter'
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/orders-filter.html',
    directives: [angular.NgFor, angular.NgIf]
  })
];
