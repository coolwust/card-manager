'use strict';

var connect = require('./connect.js');
var config  = require('../config/app.js');
var marko   = require('marko');
var co      = require('co');
var r       = require('rethinkdb');
var moment  = require('moment-timezone');
var events  = require('events');

module.exports = orders;

// start                 end     stop   free
//   |      |      |      |        |action|      |      |
// --+------+------+------+---//---+------+------+------+---->
//   |<--------- 15 days --------->|

function orders() {
  return function* (next) {
    var data = {
      username: this.session.username
    };
    this.body = marko.load(__dirname + '/../views/orders.marko').stream(data);
    this.type = 'text/html';
    yield next;
  }
}

orders.listen = function (io) {
  io.of('orders').on('connect', function (socket) {
    var cursor, order, id;
    socket.on('insert', function (data) {
      co(function* () {
        order = yield orders.doWrite(data, 'insert');
        socket.emit('inserted', {order: order});
      }).catch(function (err) {
        socket.emit('inserted', {error: err.message});
      });
    });
    socket.on('update', function (data) {
      co(function* () {
        order = yield orders.doWrite(data, 'update');
        socket.emit('updated', {order: order});
      }).catch(function (err) {
        socket.emit('updated', {error: err.message});
      });
    });
    socket.on('delete', function (id) {
      co(function* () {
        id = yield orders.doDel(id);
        socket.emit('deleted', {id: id});
      }).catch(function (err) {
        socket.emit('deleted', {error: err.message});
      });
    });
    socket.on('search', function (data) {
      co(function* () {
        if (cursor) cursor.close();
        cursor = yield orders.doSearch(data);
        cursor.on('data', function (data) {
          socket.emit('searched', data);
        });
      }).catch(function (err) {
        socket.emit('searched', {error: err.message});
      });
    });
    socket.on('get', function (data) {
      co(function* () {
        order = yield orders.doGet(data);
        socket.emit('got', {order: order});
        //socket.emit('got', {error: 'hehe'});
      }).catch(function (err) {
        socket.emit('got', {error: err.message});
      });
    });
    socket.on('disconnect', function () {
      if (cursor) cursor.close();
    });
  });
}

orders.doWrite = function* (data, action) {
  var regex, oldId, id, name, passport, phone, start, end, region, warning;
  var address, note, shipped, carrier, tracking, bcard, table, order;
  if (typeof data !== 'object' || data === null) {
    throw new Error('数据传输错误');
  }
  if (action === 'update' && ['order', 'legacy'].indexOf(table = data.table) === -1) {
    throw new Error('订单种类选择错误!');
  }
  if (action === 'update' && (typeof (oldId = data.oldId) !== 'string' || oldId.length === 0)) {
  console.log(data.oldId);
    throw new Error('旧订单号错误');
  }
  if (typeof (id = data.id) !== 'string' || id.length === 0) {
    throw new Error('订单号错误');
  }
  if (typeof (name = data.name) !== 'string' || name.length === 0) {
    throw new Error('客户姓名错误');
  }
  if (typeof (passport = data.passport) !== 'string' || passport.length !== 9) {
    throw new Error('护照号错误');
  }
  if (typeof (phone = data.phone) !== 'string' || phone.length < 7) {
    throw new Error('电话号码错误');
  }
  regex = /^(19|20)\d\d[ .](0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])$/;
  if (typeof (start = data.start) !== 'string' || regex.test(start) === false) {
    throw new Error('开始日期错误');
  }
  if (typeof (end = data.end) !== 'string' || regex.test(end) === false) {
    throw new Error('结束日期错误');
  }
  if (+(start = orders.toDate(start)) > +(end = orders.toDate(end))) {
    throw new Error('结束日期怎么在开始日期之前？');
  }
  if (typeof (region = data.region) !== 'string' || config.regions.indexOf(region) === -1) {
    throw new Error('地区错误');
  }
  if (typeof (warning = data.warning) !== 'boolean') {
    throw new Error('异常订单选项错误');
  }
  if (typeof (address = data.address) !== 'string' || address.length < 10) {
    throw new Error('地址错误');
  }
  if (typeof (note = data.note) !== 'string' && note !== null && typeof (note) !== 'undefined') {
    throw new Error('注释错误');
  } else if (typeof note === 'string') {
    note = note.length === 0 ? null : note;
  } else {
    note = null;
  }
  if (typeof (shipped = data.shipped) !== 'boolean') {
    throw new Error('邮寄选项错误');
  } else if (shipped === true) {
    if (typeof (carrier = data.carrier) !== 'string' || carrier.length < 2) {
      throw new Error('快递公司名称错误');
    }
    if (typeof (tracking = data.tracking) !== 'string' || tracking.length < 2) {
      throw new Error('快递号错误');
    }
    if (typeof (bcard = data.bcard) !== 'string' || bcard.length < 2) {
      throw new Error('B卡的卡号错误');
    }
  } else if (shipped === false) {
    carrier = tracking = bcard = null;
  }
  if (action === 'update') {
    order = yield orders.update(
      oldId, table, id, name, passport, phone, start, end, region,
      warning, address, note, shipped, carrier, tracking, bcard
    );
  }
  if (action === 'insert') {
    order = yield orders.insert(
      id, name, passport, phone, start, end, region, warning,
      address, note, shipped, carrier, tracking, bcard
    );
  }
  orders.formatTime(order);
  return order;
}

orders.doDel = function* (id) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('订单号错误');
  }
  return yield orders.del(id);
}

orders.doGet = function* (data) {
  var table, order;
  table = data.table === 'legacy' ? 'legacy' : 'order';
  order = yield orders.get(table, data.id);
  orders.formatTime(order);
  order.table = table;
  return order;
}

orders.doSearch = function* (data) {
  var table, index, sorting, orderBy, filter, startIndex, endIndex, cursor,
      total, criterias = '过滤', emitter;
  table = data.table === 'legacy' ? 'legacy' : 'order';
  index = ['id', 'ctime', 'start', 'end'].indexOf(data.index) === -1 ? 'ctime' : data.index;
  sorting = data.sorting;
  orderBy = sorting === 'asc' ? {index: r.asc(index)} : {index: r.desc(index)};
  filter = function (row) {
    var bool = r.and(true);
    if (data.domain.name === 'start') {
      bool = bool.and(row(data.domain.name).le(orders.toDate(data.domain.value)));
    } else if (data.domain.name === 'end') {
      bool = bool.and(row(data.domain.name).le(r.epochTime(orders.toDate(data.domain.value)/1000+24*60*60)));
    } else if (data.domain.name === 'ctime') {
      bool = bool.and(row('ctime').during(
        orders.toDate(data.domain.value), 
        r.epochTime(orders.toDate(data.domain.value).getTime()/1000+24*60*60)
      ));
    } else if (['name', 'id', 'phone', 'passport', 'lcard', 'bcard'].indexOf(data.domain.name) !== -1) {
      bool = bool.and(row(data.domain.name).eq(data.domain.value));
    }
    if (typeof data.warning === 'boolean') {
      bool = bool.and(row('warning').eq(data.warning));
    }
    if (typeof data.shipped === 'boolean') {
      bool = bool.and(row('shipped').eq(data.shipped));
    }
    return bool;
  }
  startIndex = typeof data.startIndex === 'number' ? data.startIndex : 0;
  endIndex = typeof data.endIndex === 'number' ? data.endIndex : 21;
  cursor = yield orders.search(table, orderBy, filter, startIndex, endIndex);
  total = yield orders.count(table, filter);
  emitter = new events.EventEmitter();
  switch (index) {
    case 'id':    index = '以订单号';   break;
    case 'ctime': index = '以订单日期'; break;
    case 'start': index = '以开始日期'; break;
    case 'end':   index = '以解释日期'; break;
  }
  sorting = sorting === 'asc' ? '从小到大排列' : '从大到小排列';
  orderBy = index + sorting;
  switch (data.domain.name) {
    case 'start':    criterias += '开始日期'+data.domain.value+'以及之前的，'; break;
    case 'end':      criterias += '结束日期'+data.domain.value+'以及之前的，'; break;
    case 'ctime':    criterias += '创建日期为'+data.domain.value+'的，'; break;
    case 'value':    criterias += '客户姓名为'+data.domain.value+'的，'; break;
    case 'id':       criterias += '订单号为'+data.domain.value+'的，';   break;
    case 'phone':    criterias += '电话为为'+data.domain.value+'的，';   break;
    case 'start':    criterias += '开始日期为'+data.domain.value+'的，'; break;
    case 'passport': criterias += '护照号为'+data.domain.value+'的，';   break;
    case 'lcard':    criterias += '逻辑卡为'+data.domain.value+'的，';   break;
    case 'bcard':    criterias += '白卡为'+data.domain.value+'的，';     break;
  }
  if (typeof data.warning === 'boolean') {
    criterias += data.warning === true ? '异常的，' : '正常的，';
  }
  if (typeof data.shipped === 'boolean') {
    criterias += data.shipped === true ? '已发货的，' : '未发货的，';
  }
  criterias += table === 'order' ? '有效订单' : '历史订单';
  cursor.on('data', function (data) {
    if (data.new_val !== null) orders.formatTime(data.new_val);
    emitter.emit('data', {order: data, total: total, orderBy: orderBy, criterias: criterias});
  });
  emitter.close = function () {
    cursor.close();
  }
  return emitter;
}

orders.match = function* (start, region, exclude) {
  var conn, filter, orderBy, cursor, lcards;
  conn = yield connect();
  filter = r.row('free').le(start).and(r.row('region').eq(region));
  if (typeof exclude !== 'undefined') filter = filter.and(r.row('id').ne(exclude));
  orderBy = {index: r.desc('free')};
  cursor = yield r.table('lcard').orderBy(orderBy).filter(filter).limit(1).run(conn);
  lcards = yield cursor.toArray();
  if (lcards.length === 0) throw new Error('暂时没有可用的L卡');
  return lcards[0].id;
}

orders.bind = function* (lcardId, orderId, start, end) {
  var conn, lcard;
  conn = yield connect();
  lcard = yield r.table('lcard').get(lcardId).run(conn);
  lcard.orders[orderId] = {start: start, end: end};
  if ((end.getTime()-start.getTime())/86400000 < 14) {
    lcard.free = r.epochTime(start.getTime()/1000+16*86400);
  } else {
    lcard.free = r.epochTime(end.getTime()/1000+2*86400);
  }
  lcard.bindings.push(orderId);
  yield r.table('lcard').get(lcardId).replace(lcard).run(conn);
}

orders.rebind = function* (oldId, newId) {
  var conn, filter, cursor, lcards, lcard, order;
  conn = yield connect();
  filter = r.row('bindings').contains(oldId);
  cursor = yield r.table('lcard').filter(filter).run(conn);
  lcards = yield cursor.toArray();
  lcard = lcards[0];
  lcard.bindings.splice(lcard.bindings.indexOf(oldId), 1);
  lcard.bindings.push(newId);
  order = lcard.orders[oldId];
  delete lcard.orders[oldId];
  lcard.orders[newId] = order;
  yield r.table('lcard').get(lcard.id).replace(lcard).run(conn);
}

orders.unbound = function* (orderId) {
  var conn, filter, cursor, lcards, lcard, max = 0, maxId, start, end;
  conn = yield connect();
  filter = r.row('bindings').contains(orderId);
  cursor = yield r.table('lcard').filter(filter).run(conn);
  lcards = yield cursor.toArray();
  lcard = lcards[0];
  lcard.bindings.splice(lcard.bindings.indexOf(orderId), 1);
  delete lcard.orders[orderId];
  if (lcard.bindings.length === 0) {
    lcard.free = r.epochTime(0);
  } else {
    for (var i in lcard.orders) {
      if (lcard.orders[i].end.getTime() > max) {
        max = lcard.orders[i].end.getTime();
        maxId = i;
      }
    }
    start = lcard.orders[maxId].start.getTime()/1000;
    end = lcard.orders[maxId].end.getTime()/1000;
    lcard.free = r.epochTime((end-start)/86400 < 14 ? start+16*86400 : end+2*86400);
  }
  yield r.table('lcard').get(lcard.id).replace(lcard).run(conn);
}

orders.insert = function* (
  id, name, passport, phone, start, end, region, warning,
  address, note, shipped, carrier, tracking, bcard
) {
  var conn, lcard, ctime, order;
  conn = yield connect();
  yield orders.exist(id);
  lcard = yield orders.match(start, region);
  ctime = r.now();
  yield orders.bind(lcard, id, start, end);
  order = {
    id: id, name: name, passport: passport, phone: phone, start: start,
    end: end, region: region, warning: warning, address: address, note: note,
    shipped: shipped, carrier: carrier, tracking: tracking, bcard: bcard,
    ctime: ctime, lcard: lcard
  };
  yield r.table('order').insert(order).run(conn);
  return r.table('order').get(id).run(conn);
}

orders.del = function* (id) {
  var conn;
  conn = yield connect();
  if ((yield r.table('order').get(id).run(conn)) !== null) {
    yield r.table('order').get(id).delete().run(conn)
    yield orders.unbound(id);
  } else {
    yield r.table('legacy').get(id).delete().run(conn);
  }
  return id;
}

orders.update = function* (
  oldId, table, id, name, passport, phone, start, end, region,
  warning, address, note, shipped, carrier, tracking, bcard
) {
  var conn, oldOrder, oldTable, oldStart, oldEnd, oldRegion, order, lcard;
  conn = yield connect();
  if ((oldOrder = yield r.table('order').get(oldId).run(conn)) !== null) {
    oldTable = 'order';
  } else if ((oldOrder = yield r.table('legacy').get(oldId).run(conn)) !== null) {
    oldTable = 'legacy';
  } else {
    throw new Error('无法更新订单，因为订单号'+oldId+'根本就不存在！');
  }
  order = {
    id: id, name: name, passport: passport, phone: phone, start: start,
    end: end, region: region, warning: warning, address: address, note: note,
    shipped: shipped, carrier: carrier, tracking: tracking, bcard: bcard,
    ctime: oldOrder.ctime
  };
  oldStart = oldOrder.start;
  oldEnd = oldOrder.end;
  oldRegion = oldOrder.region;
  if (table === 'order' && oldTable === 'order') {
    if (+oldStart === +start && +oldEnd === +end && oldRegion === region && oldId === id) {
      // normal update, neither duration, region nor id has changed
      order.lcard = oldOrder.lcard;
      yield r.table('order').get(oldId).replace(order).run(conn);
    } else if ((+oldStart !== +start || +oldEnd !== +end || oldRegion !== region) && oldId === id) {
      // only duration or region is changed
      lcard = yield orders.match(start, region);
      yield orders.unbound(oldId);
      yield orders.bind(lcard, id, start, end);
      order.lcard = lcard;
      yield r.table('order').get(oldId).replace(order).run(conn);
    } else if (+oldStart === +start && +oldEnd === +end && oldRegion === region && oldId !== id) {
      // only id is changed
      yield orders.exist(id);
      yield orders.rebind(oldId, id);
      order.lcard = oldOrder.lcard;
      yield r.table('order').get(oldId).delete().run(conn);
      yield r.table('order').insert(order).run(conn);
    } else if ((+oldStart !== +start || +oldEnd !== +end || oldRegion !== region) && oldId !== id) {
      // both duration, region and id have changed
      yield orders.exist(id);
      lcard = yield orders.match(start, region);
      yield orders.unbound(oldId);
      yield r.table('order').get(oldId).delete().run(conn);
      order.lcard = oldOrder.lcard;
      yield orders.bind(lcard, id, start, end);
      yield r.table('order').insert(order).run(conn);
    }
    return r.table('order').get(id).run(conn);
  } else if (table === 'legacy' && oldTable === 'order') {
    if (oldId !== id) yield orders.exist(id);
    yield orders.unbound(oldId);
    yield r.table('order').get(oldId).delete().run(conn);
    lcard = oldOrder.lcard;
    order.lcard = lcard;
    yield r.table('legacy').insert(order).run(conn);
    return r.table('legacy').get(id).run(conn);
  } else if (table === 'legacy' && oldTable === 'legacy') {
    if (oldId !== id) yield orders.exist(id);
    yield r.table('legacy').get(oldId).delete().run(conn);
    yield r.table('legacy').insert(order).run(conn);
    return r.table('legacy').get(id).run(conn);
  } else {
    throw new Error('不能重新激活历史订单！');
  }
}

orders.get = function* (table, id) {
  var conn, order;
  conn = yield connect();
  order = yield r.table(table).get(id).run(conn);
  if (order === null) throw new Error('Order ' + id + ' is not found!');
  return order;
}

orders.search = function* (table, orderBy, filter, startIndex, endIndex) {
  var conn, cursor, options, orders, ids = [];
  conn = yield connect();
  options = {leftBound:'closed', rightBound:'closed'};
  cursor = yield r.table(table).orderBy(orderBy).filter(filter).slice(startIndex, endIndex, options).run(conn);
  orders = yield cursor.toArray();
  if (orders.length === 0) throw new Error('没有找到任何订单！');
  orders.forEach(function (order) {
    ids.push(order.id);
  });
  filter = function (row) {
    return r.expr(ids).contains(row('id'));
  }
  return yield r.table(table).orderBy(orderBy).limit(ids.length).filter(filter).changes().run(conn);
}

orders.exist = function* (id) {
  var conn;
  conn = yield connect();
  if ((yield r.table('order').get(id).run(conn)) !== null) throw new Error('订单号'+id+'已存在！');
  if ((yield r.table('legacy').get(id).run(conn)) !== null) throw new Error('订单号'+id+'已存在！');
}

orders.count = function* (table, filter) {
  var conn;
  conn = yield connect();
  return yield r.table(table).filter(filter).count().run(conn);
}

orders.toDate = function (str) {
  return new Date(parseInt(moment(str.replace(/\./g, '-') + ' +0800').format('x'), 10));
}

orders.formatTime = function (order) {
  var format, zone;
  format = 'YYYY.MM.DD';
  zone = 'Asia/Shanghai';
  order.start = moment.tz(order.start, zone).format(format);
  order.end = moment.tz(order.end, zone).format(format);
  format = 'YYYY.MM.DD, H:ss';
  order.ctime = moment.tz(order.ctime, zone).format(format);
}
