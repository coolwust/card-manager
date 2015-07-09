'use strict';

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(OrdersComponent);
});

function OrdersComponent(bag) {
  this.bag = bag;
  this.socket = io(config.host + ':' + config.port + '/orders');
  this.bag.socket = this.socket;
  this.regions = config.regions;
  this.order = order;
  this.inputBar = {
    filters: [
      'Any', 'Date Starting', 'Date Ending', 'Date Ordering', 'Customer Name',
      'Order ID', 'Phone Number', 'Passport ID', 'L-Card Number', 'B-Card Number'
    ],
    filter: 'Any', disabled: true, placeholder: '', init: false
  };
  this.btnActive = { values: [ 'Active', 'Legacy' ], value: 'Active' };
  this.btnShip = { values: [ 'All', 'Preparing', 'Shipped' ], value: 'All' };
  this.btnError = { values: [ 'All', 'Normal', 'Error' ], value: 'All' };
  this.info = { filter: 'active', orderBy: 'date ordering' };
}

OrdersComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'orders',
    appInjector: [Bag]
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/orders.html',
    directives: [
      angular.NgFor, angular.NgIf, angular.CSSClass, angular.formDirectives,
      ServerStatusComponent, OrderComponent]
  })
];

OrdersComponent.parameters = [
  [Bag]
];

OrdersComponent.prototype.onOrderInsert = function () {
  if (this.bag.order.state) return;
  this.bag.order.state = 'insert';
}

OrdersComponent.prototype.onOrderIdInsert = function ($event) {
  if ($event.target.value === '4') {
    this.order.exists = true;
  } else {
    this.order.exists = false;
  }
}

OrdersComponent.prototype.onSubmitOrder = function () {
  switch (this.order.state) {
    case 'insert':
      console.log('hehe');
    break;
  }
}

OrdersComponent.prototype.onSelectInputBarFilter = function (filter) {
  document.getElementById('filter-bar-input').value = '';
  this.inputBar.filter = filter;
  this.inputBar.init = false;
  this.inputBar.valid = true;
  switch (filter) {
    case 'Date Starting':
    case 'Date Ending':
    case 'Date Ordering':
      this.inputBar.placeholder = 'YYYY.MM.DD';
      this.inputBar.disabled = false;
      break;
    case 'Any':
      this.inputBar.disabled = true;
      this.inputBar.placeholder = '';
      break;
    default:
      this.inputBar.disabled = false;
      this.inputBar.placeholder = '';
  }
}

OrdersComponent.prototype.onInputBarKeyUp = function ($event) {
  this.inputBar.init = true;
  this.inputBar.value = $event.target.value;
  switch (this.inputBar.filter) {
    case 'Date Starting':
    case 'Date Ending':
    case 'Date Ordering':
      var regexp = /^(19|20)\d\d[ .](0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])$/;
      this.inputBar.valid = regexp.test(this.inputBar.value);
      break;
    default:
      this.inputBar.valid = (this.inputBar.value.length > 0);
  }
}

OrdersComponent.prototype.onBtnActiveMouseUp = function (value) {
  this.btnActive.value = value;
}

OrdersComponent.prototype.onBtnShipMouseUp = function (value) {
  this.btnShip.value = value;
}

OrdersComponent.prototype.onBtnErrorMouseUp = function (value) {
  this.btnError.value = value;
}

OrdersComponent.prototype.onBtnSearchMouseUp = function () {
  if (this.inputBar.filter !== 'Any' && !this.inputBar.init) {
    this.inputBar.init = true;
    this.inputBar.valid = false;
    return;
  } else if (this.inputBar.init && !this.inputBar.valid) {
    return;
  }
}
