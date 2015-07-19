'use strict';

function OrderComponent(bag) {
  var self = this, obj = {};
  this.socket = bag.sockets.orders;
  this.state = null;
  this.message = { state: null, text: ''};
  this.querying = false;
  this.deleting = false;
  this.id = null;
  this.groups = [
    { na: 'ctime',    sk: 1, ip: 1, re: 0, vl: null,       ph: 'Date Created',    fx: 1,                       fa: 'clock-o'                                 },
    { na: 'lcard',    sk: 1, ip: 1, re: 0, vl: null,       ph: 'LCard ID',        fx: 1,                       fc: 'L'                                       },
    { na: 'id',       sk: 0, ip: 1, re: 1, vl: 'order',    ph: 'Order ID',        fx: { state: 'insert' },     fa: 'key'                                     },
    { na: 'name',     sk: 0, ip: 1, re: 1, vl: 'trim',     ph: 'Customer Name',   fx: 0,                       fa: 'user'                                    },
    { na: 'passport', sk: 0, ip: 1, re: 1, vl: 'passport', ph: 'Passport ID',     fx: 0,                       fa: 'credit-card'                             },
    { na: 'phone',    sk: 0, ip: 1, re: 1, vl: 'phone',    ph: 'Phone Number',    fx: 0,                       fa: 'phone'                                   },
    { na: 'start',    sk: 0, ip: 1, re: 1, vl: 'date',     ph: 'Date Starting',   fx: ['shipping', 'Shipped'], fa: 'play'                                    },
    { na: 'end',      sk: 0, ip: 1, re: 1, vl: 'date',     ph: 'Date Ending',     fx: ['shipping', 'Shipped'], fa: 'stop'                                    },
    { na: 'region',   sk: 0, sl: 1, re: 1, vl: null,       ph: 'Select a Region', fx: ['shipping', 'Shipped'], fa: 'globe',      op: config.regions          },
    { na: 'health',   sk: 0, sl: 1, re: 1, vl: null,       va: 'Normal',          fx: 0,                       fa: 'heartbeat',  op: ['Normal', 'Error']     },
    { na: 'address',  sk: 0, ta: 1, re: 1, vl: 'trim',     ph: 'Address',         fx: ['shipping', 'Shipped']                                                },
    { na: 'note',     sk: 0, ta: 1, re: 0, vl: 'trim',     ph: 'Note',            fx: 0                                                                      },
    { na: 'category', sk: 0, sl: 1, re: 1, vl: null,       va: 'New',             fx: { state: 'update' },     fa: 'diamond',    op: ['New', 'Legacy']       },
    { na: 'shipping', sk: 0, sl: 1, re: 1, vl: null,       va: 'Pending',         fx: 0,                       fa: 'cube',       op: ['Pending', 'Shipped']  },
    { na: 'carrier',  sk: 0, ip: 1, re: 1, vl: 'trim',     ph: 'Carrier',         fx: 0,                       fa: 'truck',      dp: ['shipping', 'Shipped'] },
    { na: 'tracking', sk: 0, ip: 1, re: 1, vl: 'tracking', ph: 'Tracking ID',     fx: 0,                       fa: 'barcode',    dp: ['shipping', 'Shipped'] },
    { na: 'bcard',    sk: 0, ip: 1, re: 1, vl: 'bcard',    ph: 'BCard ID',        fx: 0,                       fc: 'B',          dp: ['shipping', 'Shipped'] },
  ];
  this.groups.forEach(function (group) {
    obj[group.na] = new ng.Control(group.va || '', group.vl ? validators[group.vl] : undefined);
    if (group.dp) {
      Object.defineProperty(group, 'hd', {
        get: function () {
          return self.form.controls[group.dp[0]].value !== group.dp[1];
        }
      });
    }
    Object.defineProperty(group, 'rd', {
      get: function () {
        if (group.fx instanceof Array) {
          return self.form.controls[group.fx[0]].value === group.fx[1];
        }
        if (group.fx instanceof Object) {
          var n = Object.getOwnPropertyNames(group.fx)[0];
          return self[n] !== group.fx[n];
        }
        return group.fx;
      }
    });
  });
  this.form = new ng.ControlGroup(obj);
  Object.defineProperty(bag.order, 'state', {
    set: function (value) {
      if (value === 'insert') {
        self.state = 'insert';
      } else if (value === 'update') {
        self.state = 'wait';
        self.socket.emit('get', { id: '123' });
        self.socket.on('got', function (data) {
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
  this.reset();
  this.state = null;
}

OrderComponent.prototype.onSubmit = function () {
  var data = this.collect();
  if (typeof data !== 'object') return;
  this.querying = true;
  this.message = {};
  switch (this.state) {
    case 'insert':
      this.insert(data);
      break;
    case 'revise':
    case 'update':
      this.update(data);
      break;
  }
}

OrderComponent.prototype.onDelete = function () {
  this.deleting = true;
  this.delete();
}

OrderComponent.prototype.onAnother = function () {
  this.reset();
  this.state = 'insert';
}

OrderComponent.prototype.reset = function () {
  var form = document.getElementById('order-form');
  if (form) form.reset();
  for (var i = 0; i < this.groups.length; i++) {
    this.form.controls[this.groups[i].na].updateValue(this.groups[i].va || '');
  }
  this.message = {};
  this.id = null;
}

OrderComponent.prototype.fill = function (data) {
  for (var i = 0; i < this.groups.length; i++) {
    var group = this.groups[i];
    if (data[group.na]) this.form.controls[group.na].updateValue(data[group.na]);
  }
}

OrderComponent.prototype.collect = function () {
  if (this.form.valid === false) return;
  var data = {};
  for (var i = 0; i < this.groups.length; i++) {
    var group = this.groups[i];
    if (group.sk) continue;
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
  this.socket.emit('insert', data);
  this.socket.on('inserted', function (data) {
    this.querying = false;
    if (data.error) {
      this.message.state = 'error';
      this.message.text = data.error;
    } else {
      this.fill(data);
      this.state = 'revise';
      this.message.state = 'success';
      this.message.text = 'Successfully added an order on ' + (new Date()).toTimeString();
      this.id = data.id;
    }
  }.bind(this));
}

OrderComponent.prototype.update = function (data) {
  this.socket.emit('update', this.id, data);
  this.socket.on('updated', function (data) {
    this.querying = false;
    if (data.error) {
      this.message.state = 'error';
      this.message.text = data.error;
    } else {
      this.fill(data);
      this.message.state = 'success';
      switch (this.state) {
        case 'revise':
          this.message.text = 'Successfully revised on ' + new Date().toTimeString();
          break;
        case 'update':
          this.message.text = 'Successfully updated on ' + new Date().toTimeString();
          break;
      }
      this.id = data.id;
    }
  }.bind(this));
}

OrderComponent.prototype.delete = function () {
  this.socket.emit('delete', this.id);
  this.socket.on('deleted', function (data) {
    if (data.error) {
      this.message.state = 'error';
      this.message.text = data.error;
    } else {
      this.deleting = false;
      this.reset();
      this.state = 'insert';
      this.message.state = 'success';
      this.message.text = 'Successfully delete the order ' + data.orderId + ' on ' + new Date().toTimeString();
    }
  }.bind(this));
}
