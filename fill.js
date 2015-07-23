'use strict';

var co = require('co');
var doWrite = require('./lib/orders.js').doWrite;


var orders = [
  {name: 
      name: 'any',      text: '搜索过滤', disabled: 1, placeholder: ''                                          },
      name: 'ctime',    text: '创建日期', disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      name: 'id',       text: '订单号',   disabled: 0, placeholder: ''          , validator: validators.order   },
      name: 'start',    text: '开始日期', disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      name: 'end',      text: '结束日期', disabled: 0, placeholder: 'YYYY.MM.DD', validator: validators.date    },
      name: 'name',     text: '姓名',     disabled: 0, placeholder: ''          , validator: validators.date    },
      name: 'phone',    text: '电话',     disabled: 0, placeholder: ''          , validator: validators.phone   },
      name: 'passport', text: '护照号',   disabled: 0, placeholder: ''          , validator: validators.passport},
      name: 'bcard',    text: '白卡',     disabled: 0, placeholder: ''          , validator: validators.bcard   },
      name: 'lcard',    text: '逻辑卡',   disabled: 0, placeholder: ''          , validator: validators.lcard   }
    ],
    switches: [
      {name: 'table',    options: [['order', '有效订单'], ['legacy', '历史订单']]},
      {name: 'shipped',  options: [['null', '所有'], ['true', '已发货'], ['false', '未发货']]},
      {name: 'warning',  options: [['null', '所有'], ['false', '正常订单'], ['true', '异常订单']]}
];
