'use strict';

function OrderComponent(bag) {

  var self = this;

  this.state = null;
  this.socket = bag.socket;
  this.query = false;
  this.message = { state: null, text: ''};
  this.querying = false;
  this.snapshot = null;

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
    if (group.dp) {
      Object.defineProperty(group, 'hd', {
        get: function() {
          return self.form.controls[group.dp[0]].value !== group.dp[1];
        }
      });
    }
    if (this.groups.length - 1 === i) this.form = new ng.ControlGroup(obj);
  }

  Object.defineProperty(bag.order, 'state', {
    set: function (value) {
      if (value === 'insert') {
        self.state = 'insert';
      } else if (value === 'update') {
        self.state = 'wait';
        self.socket.emit('get', { id: '123' });
        self.socket.on('got', function (data) {
          self.snapshot = data;
          self.state = 'update';
          self.fill(data);
        });
      }
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
    directives: [ng.NgFor, ng.NgIf, ng.CSSClass, ng.formDirectives, ng.NgStyle]
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
  this.snapshot = null;
}

OrderComponent.prototype.onSubmit = function () {
  var data = this.collect();
  if (!data) return;
  switch (this.state) {
    case 'insert':
      this.insert(data);
      break;
      this.update(data);
    default:
      break;
  }
}

OrderComponent.prototype.onAnother = function () {
  var form = document.getElementById('order-form');
  if (form) form.reset();
  this.reset();
  this.state = 'insert';
  this.message = {};
  this.snapshot = null;
}

OrderComponent.prototype.reset = function () {
  for (var i = 0; i < this.groups.length; i++) {
    this.form.controls[this.groups[i].na].updateValue(this.groups[i].va || '');
  }
}

OrderComponent.prototype.fill = function (data) {
  for (var i = 0; i < this.groups.length; i++) {
    var group = this.groups[i];
    if (data[group.na]) this.form.controls[group.na].updateValue(data[group.na]);
  }
}

OrderComponent.prototype.collect = function () {
  var data = {};
  for (var i = 0; i < this.groups.length; i++) {
    var group = this.groups[i];
    if (group.rd) continue;
    var value = this.form.controls[group.na].value;
    if (group.dp && this.form.controls[group.dp[0]].value !== group.dp[1]) {
      continue;
    }
    if (group.re && value === '') {
      this.message.state = 'warning';
      this.message.text = 'Please fill out all the required fields.';
      return;
    }
    if (value === '') continue;
    data[group.na] = value;
  }
  return data;
}

OrderComponent.prototype.insert = function (data) {
  this.querying = true;
  this.message = {};
  this.socket.emit('insert', data);
  this.socket.on('inserted', function (data) {
    this.querying = false;
    if (data.errors) {
      this.message.state = 'error';
      this.message.text = data.first_error;
    } else {
      this.fill(data);
      this.state = 'revise';
      this.message.state = 'success';
      this.message.text = 'Successfully added an order on ' + new Date();
      this.snapshot = data;
    }
  }.bind(this));
}

OrderComponent.prototype.update = function (data) {
  this.querying = true;
  this.message = {};
  this.socket.emit('update', data);
  this.socket.on('updated', function (data) {
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
}
