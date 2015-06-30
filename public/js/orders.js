'use strict';

function OrdersComponent() {
}

OrdersComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders'
  }),
  new angular.ViewAnnotation({
    template: '<orders-filter></orders-filter><orders-list></orders-list>',
    directives: [OrdersFilterComponent, OrdersListComponent]
  })
];

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(OrdersComponent);
});

function FilterBar() {
  this.bag = {};
  this.bag.filters = [
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
  this.bag.filter = 'Any';
  this.bag.disabled = true;
  this.bag.placeholder = '';
  this.bag.init = false;
}

function FilterActive() {
  this.bag = {};
  this.bag.buttons = [
    'Active',
    'Legacy'
  ];
  this.bag.button = 'Active';
}

function FilterShipped() {
  this.bag = {};
  this.bag.buttons = [
    'All',
    'Preparing',
    'Shipped'
  ];
  this.bag.button = 'All';
}

function FilterNormal() {
  this.bag = {};
  this.bag.buttons = [
    'All',
    'Normal',
    'Error'
  ];
  this.bag.button = 'All';
}

function OrdersFilterComponent(bar, active, shipped, normal) {
  this.bar = bar.bag;
  this.active = active.bag;
  this.shipped = shipped.bag;
  this.normal = normal.bag;
}

OrdersFilterComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders-filter',
    appInjector: [FilterBar, FilterActive, FilterShipped, FilterNormal]
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/orders-filter.html',
    directives: [angular.NgFor, angular.NgIf]
  })
];

OrdersFilterComponent.parameters = [
  [FilterBar], [FilterActive], [FilterShipped], [FilterNormal]
];

OrdersFilterComponent.prototype.onSelectFilter = function (filter) {
  document.getElementById('filter-bar-input').value = '';
  this.bar.filter = filter;
  this.bar.init = false;
  this.bar.valid = true;
  switch (filter) {
    case 'Date Starting':
    case 'Date Ending':
    case 'Date Ordering':
      this.bar.placeholder = 'MM-DD-YY';
      this.bar.disabled = false;
      break;
    case 'Any':
      this.bar.disabled = true;
      this.bar.placeholder = '';
      break;
    default:
    this.bar.disabled = false;
      this.bar.placeholder = '';
  }
}

OrdersFilterComponent.prototype.onBarKeyUp = function ($event) {
  this.bar.init = true;
  this.bar.value = $event.target.value;
  switch (this.bar.filter) {
    case 'Date Starting':
    case 'Date Ending':
    case 'Date Ordering':
      var regexp = /^(?:(?:(?:0?[13578]|1[02])(\/|-|\.)31)\1|(?:(?:0?[1,3-9]|1[0-2])(\/|-|\.)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:0?2(\/|-|\.)29\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0?[1-9])|(?:1[0-2]))(\/|-|\.)(?:0?[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;
      this.bar.valid = regexp.test(this.bar.value);
      break;
    default:
      this.bar.valid = (this.bar.value.length > 0);
  }
}

OrdersFilterComponent.prototype.onActiveMouseUp = function (button) {
  this.active.button = button;
}

OrdersFilterComponent.prototype.onShippedMouseUp = function (button) {
  this.shipped.button = button;
}

OrdersFilterComponent.prototype.onNormalMouseUp = function (button) {
  this.normal.button = button;
}

OrdersFilterComponent.prototype.onSearchMouseUp = function () {
  if (this.bar.filter !== 'Any' && !this.bar.init) {
    this.bar.init = true;
    this.bar.valid = false;
    return;
  } else if (this.bar.init && !this.bar.valid) {
    return;
  }
}

function OrdersListComponent() {
}

OrdersListComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders-list'
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/orders-list.html'
  })
];
