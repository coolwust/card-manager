'use strict';

function OrderComponent(bag) {

  var self = this;

  this.state = null;
  this.socket = bag.socket;
  this.query = false;
  this.message = { state: null, text: ''};
  this.groups = [
    { na: 'ctime',    ip: 1, rd: 1, re: 0, vl: null,       ph: 'Date Created',    fa: 'clock-o'                                 },
    { na: 'lcard',    ip: 1, rd: 1, re: 0, vl: null,       ph: 'LCard ID',        fc: 'L'                                       },
    { na: 'id',       ip: 1, rd: 0, re: 1, vl: 'order',    ph: 'Order ID',        fa: 'key'                                     },
    { na: 'name',     ip: 1, rd: 0, re: 1, vl: 'trim',     ph: 'Customer Name',   fa: 'user'                                    },
    { na: 'passport', ip: 1, rd: 0, re: 1, vl: 'passport', ph: 'Passport ID',     fa: 'credit-card'                             },
    { na: 'phone',    ip: 1, rd: 0, re: 1, vl: 'phone',    ph: 'Phone Number',    fa: 'phone'                                   },
    { na: 'start',    ip: 1, rd: 0, re: 1, vl: 'date',     ph: 'Date Starting',   fa: 'play'                                    },
    { na: 'end',      ip: 1, rd: 0, re: 1, vl: 'date',     ph: 'Date Ending',     fa: 'stop'                                    },
    { na: 'region',   sl: 1, rd: 0, re: 1, vl: null,       ph: 'Select a Region', fa: 'globe',      op: config.regions          },
    { na: 'health',   sl: 1, rd: 0, re: 1, vl: null,       va: 'Normal',          fa: 'heartbeat',  op: ['Normal', 'Error']     },
    { na: 'address',  ta: 1, rd: 0, re: 1, vl: 'trim',     ph: 'Address'                                                        },
    { na: 'note',     ta: 1, rd: 0, re: 0, vl: 'trim',     ph: 'Note'                                                           },
    { na: 'category', sl: 1, rd: 0, re: 1, vl: null,       va: 'New',             fa: 'diamond',    op: ['New', 'Legacy']       },
    { na: 'shipping', sl: 1, rd: 0, re: 1, vl: null,       va: 'Pending',         fa: 'cube',       op: ['Pending', 'Shipped']  },
    { na: 'carrier',  ip: 1, rd: 0, re: 1, vl: 'trim',     ph: 'Carrier',         fa: 'truck',      dp: ['shipping', 'Shipped'] },
    { na: 'tracking', ip: 1, rd: 0, re: 1, vl: 'tracking', ph: 'Tracking ID',     fa: 'barcode',    dp: ['shipping', 'Shipped'] },
    { na: 'bcard',    ip: 1, rd: 0, re: 1, vl: 'bcard',    ph: 'BCard ID',        fc: 'B',          dp: ['shipping', 'Shipped'] },
  ];

  for (var i = 0, obj = {}; i < this.groups.length; i++) {
    var group = this.groups[i];
    obj[group.na] = new ng.Control(group.va || '', group.vl ? validators[group.vl] : undefined);
    obj[group.na].registerOnChange(function (value) {
      console.log(value);
    });
    var dp = group.dp;
    if (dp) {
      Object.defineProperty(group, 'hd', {
        get: function() {
          return self.form.controls[dp[0]].value !== dp[1];
        }
      });
    }
    if (this.groups.length - 1 === i) this.form = new ng.ControlGroup(obj);
  }

  this.form.controls.shipping.valueChanges.observer({next: function (value) {console.log(value)}});



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
  new ng.ComponentAnnotation({
    selector: 'order'
  }),
  new ng.ViewAnnotation({
    templateUrl: '../tp/order.html',
    directives: [ng.NgFor, ng.NgIf, ng.CSSClass, ng.formDirectives]
  })
];

OrderComponent.parameters = [
  [Bag]
];

OrderComponent.prototype.onClose = function () {
  var form = document.getElementById('order-form');
  if (form) form.reset();
  this.reset();
  this.message = {};
  this.state = null;
}

OrderComponent.prototype.changeState = function (action) {
  if (action === 'insert') {
    this.state = 'insert';
  } else if (action === 'update') {
    this.state = 'wait';
    window.setTimeout(function () {
      this.state = 'update';
    }.bind(this));
  }
}

OrderComponent.prototype.onSubmit = function () {

  for (var i = 0, obj = {}; i < this.groups.length; i++) {
    var group = this.groups[i];
    if (group.re && this.form.controls[group.na].value === '') {
      this.message.state = 'warning';
      this.message.text = 'Please fill out all required field!';
      return;
    }
  }

  switch (this.state) {
    case 'insert':
      this.socket.emit('insert', {
        hehe: 'haah'
      });
      this.socket.on('insert', function (data) {
        this.querying = false;
        this.state = 'revise';
        this.message.text = 'Inserted on ' + new Date();
        this.message.state = 'success';
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
            this.message.text = 'Revised on ' + new Date();
            this.message.state = 'success';
            break;
          case 'update':
            this.message.text = 'Updated on ' + new Date();
            this.message.state = 'success';
        }
      }.bind(this));
      break;
  }
  this.querying = true;
  this.message = {};
}

OrderComponent.prototype.onAnother = function () {
  var form = document.getElementById('order-form');
  if (form) form.reset();
  this.reset();
  this.state = 'insert';
  this.message = {};
}

OrderComponent.prototype.reset = function () {
  for (var i = 0, obj = {}; i < this.groups.length; i++) {
    this.form.controls[this.groups[i].na].updateValue(this.groups[i].va || '');
  }
}
