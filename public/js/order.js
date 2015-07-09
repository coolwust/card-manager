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
    { na: 'dateCreated',  ip: 1, rd: 1, ph: 'Date Created',    fa: 'clock-o'                                 },
    { na: 'lcard',        ip: 1, rd: 1, ph: 'LCard ID',        fc: 'L'                                       },
    { na: 'orderId',      ip: 1, rd: 0, ph: 'Order ID',        fa: 'cube'                                    },
    { na: 'customerName', ip: 1, rd: 0, ph: 'Customer Name',   fa: 'user'                                    },
    { na: 'passportId',   ip: 1, rd: 0, ph: 'Passport ID',     fa: 'credit-card'                             },
    { na: 'phoneNumber',  ip: 1, rd: 0, ph: 'Phone Number',    fa: 'phone'                                   },
    { na: 'dateStarting', ip: 1, rd: 0, ph: 'Date Starting',   fa: 'play'                                    },
    { na: 'dateEnding',   ip: 1, rd: 0, ph: 'Date Ending',     fa: 'stop'                                    },
    { na: 'region',       sl: 1, rd: 0, ph: 'Select a Region', fa: 'globe',      op: config.regions          },
    { na: 'state',        sl: 1, rd: 0, va: 'Normal',          fa: 'heartbeat',  op: ['Normal', 'Error']     },
    { na: 'address',      ta: 1, rd: 0, ph: 'Address'                                                        },
    { na: 'note',         ta: 1, rd: 0, ph: 'Note'                                                           },
    { na: 'shipping',     sl: 1, rd: 0, va: 'Pending',         fa: 'inbox',      op: ['Pending', 'Shipped']  },
    { na: 'carrier',      ip: 1, rd: 0, ph: 'Carrier',         fa: 'truck',      dp: ['shipping', 'Shipped'] },
    { na: 'trackingId',   ip: 1, rd: 0, ph: 'Tracking ID',     fa: 'barcode',    dp: ['shipping', 'Shipped'] },
    { na: 'bcard',        ip: 1, rd: 0, ph: 'BCard ID',        fc: 'B',          dp: ['shipping', 'Shipped'] },
  ];
  var obj = {};
  for (var i = 0; i < this.groups.length; i++) {
  console.log(this.groups[i].na);
    obj[this.groups[i].na] = new angular.Control(this.groups[i].va || '');
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
