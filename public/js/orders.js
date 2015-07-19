'use strict';

document.addEventListener('DOMContentLoaded', function () {
  ng.bootstrap(OrdersComponent);
});

function OrdersComponent(bag) {
  var self = this;
  this.bag = bag;
  this.groups = {
    bars: [
      {name: '',         text: 'Any',           disabled: 1, placeholder: ''                                          },
      {name: 'start',    text: 'Starting Date', disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      {name: 'end',      text: 'Ending Date',   disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      {name: 'ctime',    text: 'Creation Date', disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      {name: 'name',     text: 'Customer',      disabled: 0, placeholder: ''          , validator: validators.date    },
      {name: 'id',       text: 'Order ID',      disabled: 0, placeholder: ''          , validator: validators.order   },
      {name: 'phone',    text: 'Phone Number',  disabled: 0, placeholder: ''          , validator: validators.phone   },
      {name: 'passport', text: 'Passport ID',   disabled: 0, placeholder: ''          , validator: validators.passport},
      {name: 'lcard',    text: 'LCard ID',      disabled: 0, placeholder: ''          , validator: validators.lcard   },
      {name: 'bcard',    text: 'BCard ID',      disabled: 0, placeholder: ''          , validator: validators.bcard   }
    ],
    switches: [
      {name: 'category', options: ['Active', 'Legacy']},
      {name: 'shipping', options: ['', 'Pending', 'Shipped']},
      {name: 'health',   options: ['', 'Normal', 'Error']}
    ]
  };
  this.trackings = {bar: self.groups.bars[0], category: 'Active'};
  this.form = new ng.ControlGroup({bar: new ng.Control('')});
  this.state = 'searched';
  this.message = '';
  this.socket = bag.sockets.orders = io(config.host + ':' + config.port + '/orders');
  this.regions = config.regions;
  this.snapshot = null;
  this.page = 1; 
  this.count = 20;
  this.results = [];
  Object.defineProperty(this, 'valid', {
    get: function () {
      if (self.trackings.bar.vl) {
        return self.trackings.bar.vl(self.form.controls.bar) === null;
      }
      return true;
    }
  });
  Object.defineProperty(this, 'filter', {
    get: function () {
      var filter = '';
      filter += this.snapshot.barName? ', ' + this.snapshot.barName : '';
      filter += this.snapshot.barName ? '=' + this.snapshot.barValue : '';
      filter += ', ' + this.snapshot.category;
      filter += this.snapshot.shipping ? ', ' + this.snapshot.shipping : '';
      filter += this.snapshot.health ? ', ' + this.snapshot.health : '';
      return filter ? filter.substr(1).toLowerCase() : '';
    }
  });
  bag.navigation.location = 'orders';
  this.onSearch();
}

OrdersComponent.annotations = [
  new ng.ComponentAnnotation({
    selector: 'orders',
    viewInjector: [Bag]
  }),
  new ng.ViewAnnotation({
    templateUrl: '../tp/orders.html',
    directives: [
      ng.NgFor, ng.NgIf, ng.CSSClass, ng.formDirectives, 
      ConnectionComponent, NavigationComponent, OrderComponent
    ]
  })
];

OrdersComponent.parameters = [
  [Bag]
];

OrdersComponent.prototype.onBar = function (i) {
  this.trackings.bar = this.groups.bars[i];
  this.form.controls.bar.updateValue('');
}

OrdersComponent.prototype.onSwitch = function (name, value) {
  this.trackings[name] = value;
}

OrdersComponent.prototype.onInsert = function () {
  this.bag.order.state = 'insert';
}

OrdersComponent.prototype.onSearch = function (action) {
  var data = {};
  switch (action) {
    case 'newer':
      if (this.page === 1) return;
      data.page = --this.page;
      break;
    case 'older':
      if (this.results.length <= this.count) return;
      data.page = ++this.page;
      break;
    default:
      if (!this.valid) return;
      if (!this.trackings.bar.disabled && this.form.controls.bar.value === '') return;
      if (this.trackings.shipping) data.shipping = this.trackings.shipping;
      if (this.trackings.health) data.health = this.trackings.health;
      if (this.trackings.bar.name !== '') {
        data.barName = this.trackings.bar.name
        data.barValue = this.form.controls.bar.value;
      }
      data.category = this.trackings.category;
      data.page = this.page = 1;
      data.count = this.count;
      this.snapshot = data;
      break;
  }
  this.state = 'standby';
  this.results = [];
  this.socket.removeAllListeners();
  this.socket.emit('search', data);
  this.socket.on('searched', function (data) {
    this.state = 'searched';
    this.total = data.total;
    function findIndex(id, results) {
      for (var i = 0; i < results.length; i++) {
        if (results[i].id === id) return i;
      }
    }
    if (data.new_val && !data.old_val) {
      this.results.push(data.new_val);
    }
    if (data.new_val && data.old_val) {
      var key = findIndex(data.old_val.id, this.results);
      this.results[key] = data.new_val;
    }
    if (!data.new_val && data.old_val) {
      var key = findIndex(data.old_val.id, this.results);
      if (typeof key !== 'number') return;
      this.results.splice(key, 1);
    }
  }.bind(this));
  this.socket.on('reconnect', function () {
    this.state = 'standby';
    this.results = [];
    this.socket.emit('search', data);
  }.bind(this));
  this.socket.on('failed', function (message) {
    this.state = 'failed';
    this.message = message;
  }.bind(this));
}
