'use strict';

document.addEventListener('DOMContentLoaded', function () {
  ng.bootstrap(OrdersComponent);
});

function OrdersComponent(bag) {
  var self = this;
  this.groups = {
    bars: [
      {name: 'any',      text: '搜索过滤', disabled: 1, placeholder: ''                                          },
      {name: 'ctime',    text: '创建日期', disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      {name: 'id',       text: '订单号',   disabled: 0, placeholder: ''          , validator: validators.order   },
      {name: 'start',    text: '开始日期', disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      {name: 'end',      text: '结束日期', disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      {name: 'name',     text: '姓名',     disabled: 0, placeholder: ''          , validator: validators.date    },
      {name: 'phone',    text: '电话',     disabled: 0, placeholder: ''          , validator: validators.phone   },
      {name: 'passport', text: '护照号',   disabled: 0, placeholder: ''          , validator: validators.passport},
      {name: 'bcard',    text: '白卡',     disabled: 0, placeholder: ''          , validator: validators.bcard   },
      {name: 'lcard',    text: '逻辑卡',   disabled: 0, placeholder: ''          , validator: validators.lcard   }
    ],
    switches: [
      {name: 'table',    options: [['order', '有效订单'], ['legacy', '历史订单']]},
      {name: 'shipped',  options: [['null', '所有'], ['true', '已发货'], ['false', '未发货']]},
      {name: 'warning',  options: [['null', '所有'], ['false', '正常订单'], ['true', '异常订单']]}
    ]
  };
  this.bag = bag;
  this.form = new ng.ControlGroup({bar: new ng.Control('')});
  this.socket = bag.sockets.orders = io(config.host + ':' + config.port + '/orders');
  this.regions = config.regions;
  this.bar = this.groups.bars[0];
  this.table = 'order';
  this.shipped = null;
  this.warning = null;
  this.state = null;
  this.message = null;
  this.snapshot = null;
  this.page = null; 
  this.results = [];
  this.count = 13;
  Object.defineProperty(this, 'valid', {
    get: function () {
      if (self.bar.vl) return self.bar.vl(self.form.controls.bar) === null;
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

OrdersComponent.parameters = [[Bag]];

OrdersComponent.prototype.onBar = function (i) {
  this.bar = this.groups.bars[i];
  this.form.controls.bar.updateValue('');
}

OrdersComponent.prototype.onSwitch = function (name, value) {
  if (value === 'true') value = true;
  if (value === 'false') value = false;
  if (value === 'null') value = null;
  this[name] = value;
}

OrdersComponent.prototype.onInsert = function () {
  this.bag.order.state = 'insert';
}

OrdersComponent.prototype.onUpdate = function (id) {
  this.bag.order.id = id;
  this.bag.order.table = this.snapshot.table;
  this.bag.order.state = 'update';
}

OrdersComponent.prototype.onSearch = function (action) {
  var data = {}, self = this;
  if (action === 'newer') {
    if (this.page === 1) return;
    data = this.snapshot;
    this.page--;
  } else if (action === 'older') {
    if (this.results.length <= this.count) return;
    data = this.snapshot;
    this.page++;
  } else {
    if (!this.valid || (this.bar.name !== 'any' && this.form.controls.bar.value === '')) return;
    data.shipped = this.shipped;
    data.warning = this.warning;
    data.domain = {name: self.bar.name, value: self.form.controls.bar.value};
    data.table = this.table;
    if (this.bar.name === 'end') {
      data.sorting = 'asc';
      data.index = 'end';
    } else if (this.bar.name === 'start') {
      data.sorting = 'asc';
      data.index = 'start';
    } else {
      data.sorting = 'desc';
      data.index = 'ctime';
    }
    this.page = 1;
    this.snapshot = data;
  }
  data.startIndex = (this.page-1)*this.count;
  data.endIndex = (this.page)*this.count+1;
  this.state = 'standby';
  this.results = [];
  this.socket.removeAllListeners();
  console.log(data);
  this.socket.emit('search', data);
  this.socket.on('searched', function (data) {
    if (data.error) {
      this.state = 'failed';
      this.message = data.error;
      return;
    }
    this.state = 'searched';
    this.total = data.total;
    function findIndex(id, results) {
      for (var i = 0; i < results.length; i++) {
        if (results[i].id === id) return i;
      }
    }
    if (data.order.new_val && !data.order.old_val) {
      this.results.push(data.order.new_val);
    }
    if (data.order.new_val && data.order.old_val) {
      var key = findIndex(data.order.old_val.id, this.results);
      this.results[key] = data.order.new_val;
    }
    if (!data.order.new_val && data.order.old_val) {
      var key = findIndex(data.order.old_val.id, this.results);
      if (typeof key !== 'number') return;
      this.results.splice(key, 1);
    }
  }.bind(this));
  this.socket.on('reconnect', function () {
    this.state = 'standby';
    this.results = [];
    this.socket.emit('search', data);
  }.bind(this));
}
