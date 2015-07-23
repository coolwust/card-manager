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
    { na: 'ctime',    sk: 1, ip: 1, re: 0, vl: null,       ph: '创建日期', fx: 1,                   fa: 'clock-o'                                                        },
    { na: 'lcard',    sk: 1, ip: 1, re: 0, vl: null,       ph: '逻辑卡',   fx: 1,                   fc: 'L'                                                              },
    { na: 'id',       sk: 0, ip: 1, re: 1, vl: 'order',    ph: '订单号',   fx: 0,                   fa: 'key'                                                            },
    { na: 'name',     sk: 0, ip: 1, re: 1, vl: 'trim',     ph: '客户姓名', fx: 0,                   fa: 'user'                                                           },
    { na: 'passport', sk: 0, ip: 1, re: 1, vl: 'passport', ph: '护照号',   fx: 0,                   fa: 'credit-card'                                                    },
    { na: 'phone',    sk: 0, ip: 1, re: 1, vl: 'phone',    ph: '电话',     fx: 0,                   fa: 'phone'                                                          },
    { na: 'start',    sk: 0, ip: 1, re: 1, vl: 'date',     ph: '开始日期', fx: ['shipped', 'true'], fa: 'play'                                                           },
    { na: 'end',      sk: 0, ip: 1, re: 1, vl: 'date',     ph: '结束日期', fx: ['shipped', 'true'], fa: 'stop'                                                           },
    { na: 'region',   sk: 0, sl: 1, re: 1, vl: null,       ph: '选择地区', fx: ['shipped', 'true'], fa: 'globe',      op: config.regions                                 },
    { na: 'warning',  sk: 0, sl: 1, re: 1, vl: null,       va: 'false',    fx: 0,                   fa: 'heartbeat',  op: [['false', '正常'], ['true', '异常']]          },
    { na: 'address',  sk: 0, ta: 1, re: 1, vl: 'trim',     ph: '地址',     fx: ['shipped', 'true']                                                                       },
    { na: 'note',     sk: 0, ta: 1, re: 0, vl: 'trim',     ph: '备注',     fx: 0                                                                                         },
    { na: 'table',    sk: 0, sl: 1, re: 1, vl: null,       va: 'order',    fx: {state: 'update'},   fa: 'diamond',    op: [['order', '有效订单'], ['legacy', '历史订单']]},
    { na: 'shipped',  sk: 0, sl: 1, re: 1, vl: null,       va: 'false',    fx: 0,                   fa: 'cube',       op: [['false', '未发货'], ['true', '已发货']]      },
    { na: 'carrier',  sk: 0, ip: 1, re: 1, vl: 'trim',     ph: '快递公司', fx: 0,                   fa: 'truck',      dp: ['shipped', 'true']                            },
    { na: 'tracking', sk: 0, ip: 1, re: 1, vl: 'tracking', ph: '快递单号', fx: 0,                   fa: 'barcode',    dp: ['shipped', 'true']                            },
    { na: 'bcard',    sk: 0, ip: 1, re: 1, vl: 'bcard',    ph: '白卡',     fx: 0,                   fc: 'B',          dp: ['shipped', 'true']                            },
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
        self.socket.emit('get', {id: bag.order.id, table: bag.order.table});
        self.socket.on('got', function (data) {
          if (data.error) {
            //self.state = 'insert';
          } else {
            self.state = 'update';
            self.id = data.order.id;
            self.fill(data.order);
          }
        });
      }
    }
  });
  Object.defineProperty(this, 'title', {
    get: function () {
      switch (self.state) {
        case 'insert':
          return '添加订单';
          break;
        case 'revise':
          return '回顾订单';
          break;
        case 'update':
          return '更新订单';
          break;
        default:
          return '请稍后 ...';
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
  if (data === null || typeof data !== 'object') return;
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
    if (data[group.na]) {
      var value = data[group.na];
      if (value === true && group.sl) value = 'true';
      if (value === false && group.sl) value = 'false';
      this.form.controls[group.na].updateValue(value);
    }
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
      this.message.text = '请完成表格的必填项！';
      return;
    }
    if (value === '') continue;
    if (value === 'true' && group.sl) value = true;
    if (value === 'false' && group.sl) value = false;
    data[group.na] = value;
  }
  if (typeof this.id === 'string') data.oldId = this.id;
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
      this.fill(data.order);
      this.state = 'revise';
      this.message.state = 'success';
      this.message.text = '成功于 ' + (new Date()).toTimeString() + ' 添加了一条新的订单。';
      this.id = data.order.id;
    }
  }.bind(this));
}

OrderComponent.prototype.update = function (data) {
  this.socket.emit('update', data);
  this.socket.on('updated', function (data) {
    this.querying = false;
    if (data.error) {
      this.message.state = 'error';
      this.message.text = data.error;
    } else {
      this.fill(data.order);
      this.message.state = 'success';
      switch (this.state) {
        case 'revise':
          this.message.text = '成功于 ' + new Date().toTimeString() + ' 修改了刚刚添加的订单。';
          break;
        case 'update':
          this.message.text = '成功于 ' + new Date().toTimeString() + ' 更新了订单。';
          break;
      }
      this.id = data.order.id;
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
      this.message.text = '成功于 ' + new Date().toTimeString() + ' 删除了订单 ' + data.id + ' 。';
    }
  }.bind(this));
}
