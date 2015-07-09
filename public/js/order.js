'use strict';

function OrderComponent(bag) {


  function dateValidator(control) {
    var regexp = /^(19|20)\d\d[ .](0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])$/;
    if (control.value === '' || regexp.test(control.value)) return null;
    return { error: true };
  }

  function contentValidator(control) {
    if (control.value && control.value.trim().length === control.value.length) return null;
    return { error: true };
  }
  this.bag = bag;
  this.bag.order = {};

  var state;
  Object.defineProperty(bag.order, 'state', {
    set: function (value) {
      switch (value) {
        case 'insert':
          window.setTimeout(function () {
            state = 'insert';
          }, 200);
          break;
        case 'update':
          state = 'wait';
          window.setTimeout(function () {
            state = 'update';
          }, 2000);
          break;
      }
    },
    get: function () {
      return state;
    }
  });
  Object.defineProperty(bag.order, 'title', {
    get: function () {
      switch (bag.order.state) {
        case 'insert':
          return 'New Order';
          break;
        case 'update':
          return 'Order Edit';
          break;
        case 'wait':
          return 'Please Wait';
          break;
      }
    }
  });
  //function shipped() {
  //  for (var i = 0; i < this.groups.length; i++) {
  //    if (this.groups[i].name === 'shipping
  //  }
  //}
  this.groups = [
    { name: 'dateCreated',  input:    true, read: true,  fa: 'fa-clock-o',     placeholder: 'Date Created' },
    { name: 'lcard',        input:    true, read: true,  fc: 'L',              placeholder: 'LCard ID' },
    { name: 'orderId',      input:    true, read: false, fa: 'fa-cube',        placeholder: 'Order ID' },
    { name: 'customerName', input:    true, read: false, fa: 'fa-user',        placeholder: 'Customer Name' },
    { name: 'passportId',   input:    true, read: false, fa: 'fa-credit-card', placeholder: 'Passport ID' },
    { name: 'phoneNumber',  input:    true, read: false, fa: 'fa-phone',       placeholder: 'Phone Number' },
    { name: 'dateStarting', input:    true, read: false, fa: 'fa-play',        placeholder: 'Date Starting' },
    { name: 'dateEnding',   input:    true, read: false, fa: 'fa-stop',        placeholder: 'Date Ending' },
    { name: 'region',       select:   true, read: false, fa: 'fa-globe',       placeholder: 'Select a Region', options: config.regions },
    { name: 'state',        select:   true, read: false, fa: 'fa-heartbeat',                                   options: ['Normal', 'Error'] },
    { name: 'address',      textarea: true, read: false,                       placeholder: 'Address' },
    { name: 'note',         textarea: true, read: false,                       placeholder: 'Note' },
    { name: 'shipping',     select:   true, read: false, fa: 'fa-inbox',                                       options: ['Pending', 'Shipped'] },
    { name: 'carrier',      input:    true, read: false, fa: 'fa-truck',       placeholder: 'Carrier' },
    { name: 'trackingId',   input:    true, read: false, fa: 'fa-barcode',     placeholder: 'Tracking ID' },
    { name: 'bcard',        input:    true, read: false, fc: 'B',              placeholder: 'BCard ID' },
  ];
  var obj = {};
  for (var i = 0; i < this.groups.length; i++) {
    obj[this.groups[i].name] = new angular.Control();
  }
  this.form = new angular.ControlGroup(obj);
  this.state = '';
  this.title = '';
  this.exists = null;
}

OrderComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'order'
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/order.html',
    directives: [angular.NgFor, angular.NgIf, angular.CSSClass, angular.formDirectives]
  })
];

OrderComponent.parameters = [
  [Bag]
];

OrderComponent.prototype.onClose = function () {
  var form = document.getElementById('order-form');
  if (form) form.reset();
}
