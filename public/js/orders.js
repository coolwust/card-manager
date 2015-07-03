'use strict';

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(OrdersComponent);
});

function OrdersComponent() {
  this.inputBar = {
    filters: [ 'Any', 'Date Starting', 'Date Ending', 'Date Ordering',
      'Customer Name', 'Order ID', 'Phone Number', 'Passport ID',
      'L-Card Number', 'B-Card Number'
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
    selector: 'orders'
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/orders.html',
    directives: [angular.NgFor, angular.NgIf, ServerStatusComponent]
  })
];

OrdersComponent.prototype.onSelectInputBarFilter = function (filter) {
  document.getElementById('filter-bar-input').value = '';
  this.inputBar.filter = filter;
  this.inputBar.init = false;
  this.inputBar.valid = true;
  switch (filter) {
    case 'Date Starting':
    case 'Date Ending':
    case 'Date Ordering':
      this.inputBar.placeholder = 'MM-DD-YY';
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
      var regexp = /^(?:(?:(?:0?[13578]|1[02])(\/|-|\.)31)\1|(?:(?:0?[1,3-9]|1[0-2])(\/|-|\.)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:0?2(\/|-|\.)29\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0?[1-9])|(?:1[0-2]))(\/|-|\.)(?:0?[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;
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
