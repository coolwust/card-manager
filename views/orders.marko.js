function create(__helpers) {
  var str = __helpers.s,
      empty = __helpers.e,
      notEmpty = __helpers.ne,
      __loadTemplate = __helpers.l,
      __nav_marko = __loadTemplate(require.resolve("./nav.marko"));

  return function render(data, out) {
    out.w('<!doctype html> <html><head><title>Orders</title><script src="js/config.js"></script><script src="js/bag.js"></script><script src="js/socket.io-1.3.5.js"></script><script src="js/jquery-2.1.4.min.js"></script><script src="js/bootstrap.min.js"></script><script src="js/angular2.sfx.dev.js"></script><script src="js/server-status.js"></script><script src="js/order.js"></script><script src="js/orders.js"></script><link rel="stylesheet" type="text/css" href="css/bootstrap.min.css"><link rel="stylesheet" type="text/css" href="css/orders.css"><link rel="stylesheet" type="text/css" href="css/main.css"><link rel="stylesheet" type="text/css" href="css/animate.css"><link rel="stylesheet" type="text/css" href="css/font-awesome.min.css"></head><body>');
    __helpers.i(out, __nav_marko, {"username": data.username, "location": "orders"});

    out.w('<main class="container"><orders></orders></main></body></html>');
  };
}
(module.exports = require("marko").c(__filename)).c(create);