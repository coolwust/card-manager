'use strict';

function OrderComponent(bag) {

  var self = this;

  this.state = null;
  this.socket = bag.socket;
  this.query = false;
  this.message = null;
  this.groups = [
    { na: 'dateCreated',  ip: 1, rd: 1, ph: 'Date Created',    fa: 'clock-o'                                 },
    { na: 'lcard',        ip: 1, rd: 1, ph: 'LCard ID',        fc: 'L'                                       },
    { na: 'orderId',      ip: 1, rd: 0, ph: 'Order ID',        fa: 'key'                                     },
    { na: 'customerName', ip: 1, rd: 0, ph: 'Customer Name',   fa: 'user'                                    },
    { na: 'passportId',   ip: 1, rd: 0, ph: 'Passport ID',     fa: 'credit-card'                             },
    { na: 'phoneNumber',  ip: 1, rd: 0, ph: 'Phone Number',    fa: 'phone'                                   },
    { na: 'dateStarting', ip: 1, rd: 0, ph: 'Date Starting',   fa: 'play'                                    },
    { na: 'dateEnding',   ip: 1, rd: 0, ph: 'Date Ending',     fa: 'stop'                                    },
    { na: 'region',       sl: 1, rd: 0, ph: 'Select a Region', fa: 'globe',      op: config.regions          },
    { na: 'state',        sl: 1, rd: 0, va: 'Normal',          fa: 'heartbeat',  op: ['Normal', 'Error']     },
    { na: 'address',      ta: 1, rd: 0, ph: 'Address'                                                        },
    { na: 'note',         ta: 1, rd: 0, ph: 'Note'                                                           },
    { na: 'category',     sl: 1, rd: 0, va: 'New',         fa: 'graduation-cap',       op: ['New', 'Legacy']  },
    { na: 'shipping',     sl: 1, rd: 0, va: 'Pending',         fa: 'cube',       op: ['Pending', 'Shipped']  },
    { na: 'carrier',      ip: 1, rd: 0, ph: 'Carrier',         fa: 'truck',      dp: ['shipping', 'Shipped'] },
    { na: 'trackingId',   ip: 1, rd: 0, ph: 'Tracking ID',     fa: 'barcode',    dp: ['shipping', 'Shipped'] },
    { na: 'bcard',        ip: 1, rd: 0, ph: 'BCard ID',        fc: 'B',          dp: ['shipping', 'Shipped'] },
  ];

  for (var i = 0, obj = {}; i < this.groups.length; i++) {
    obj[this.groups[i].na] = new angular.Control(this.groups[i].va || '');
    var dp = this.groups[i].dp;
    if (dp) {
      Object.defineProperty(this.groups[i], 'hd', {
        get: function() {
          return self.form.controls[dp[0]].value !== dp[1];
        }
      });
    }
    if (this.groups.length - 1 === i) this.form = new angular.ControlGroup(obj);
  }

  Object.defineProperty(bag.order, 'state', {
    set: function (value) {
      self.changeState(value);
    }
  });

  Object.defineProperty(this, 'title', {
    get: function () {
      switch (self.state) {
        case 'insert':
          return 'Add Order';
          break;
        case 'revise':
          return 'Revise Order';
          break;
        case 'update':
          return 'Update Order';
          break;
        default:
          return 'Loading...';
      }
    }
  });
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
  this.state = null;
  this.message = null;
  this.reset();
}

OrderComponent.prototype.changeState = function (action) {
  if (action === 'insert') {
    window.setTimeout(function () {
      this.state = 'insert';
    }.bind(this), 500);
  } else if (action === 'update') {
    this.state = 'wait';
    window.setTimeout(function () {
      this.state = 'update';
    }.bind(this));
  }
}

OrderComponent.prototype.onSubmit = function () {
  switch (this.state) {
    case 'insert':
      this.socket.emit('insert', {
        hehe: 'haah'
      });
      this.socket.on('insert', function (data) {
        this.querying = false;
        this.state = 'revise';
        this.message = 'Inserted on ' + new Date();
      }.bind(this));
      break;
    default:
      this.socket.emit('update', {
        hehe: 'haah'
      });
      this.socket.on('update', function (data) {
        this.querying = false;
        switch (this.state) {
          case 'revise':
            this.message = 'Revised on ' + new Date();
            break;
          case 'update':
            this.message = 'Updated on ' + new Date();
        }
      }.bind(this));
      break;
  }
  this.querying = true;
  this.message = null;
}

OrderComponent.prototype.onAnother = function () {
  var form = document.getElementById('order-form');
  if (form) form.reset();
  this.reset();
  this.state = 'insert';
  this.message = null;
}

OrderComponent.prototype.reset = function () {
  for (var i = 0, obj = {}; i < this.groups.length; i++) {
    this.form.controls[this.groups[i].na].updateValue(this.groups[i].va || '');
  }
}
