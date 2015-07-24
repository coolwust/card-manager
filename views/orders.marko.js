function create(__helpers) {
  var str = __helpers.s,
      empty = __helpers.e,
      notEmpty = __helpers.ne;

  return function render(data, out) {
    out.w('<!doctype html> <html><head><title>\u7535\u8bdd\u5361\u8ba2\u5355 - \u4e16\u754c\u90a6</title><script src="js/socket.io-1.3.5.js"></script><script src="js/jquery-2.1.4.min.js"></script><script src="js/bootstrap.min.js"></script><script src="js/angular2.sfx.dev.js"></script><script src="js/config.js"></script><script src="js/bag.js"></script><script src="js/validators.js"></script><script src="js/connection.js"></script><script src="js/navigation.js"></script><script src="js/order.js"></script><script src="js/orders.js"></script><link rel="stylesheet" type="text/css" href="css/bootstrap.min.css"><link rel="stylesheet" type="text/css" href="css/animate.css"><link rel="stylesheet" type="text/css" href="css/font-awesome.min.css"><link rel="stylesheet" type="text/css" href="css/main.css"><link rel="stylesheet" type="text/css" href="css/connection.css"><link rel="stylesheet" type="text/css" href="css/navigation.css"><link rel="stylesheet" type="text/css" href="css/orders.css"><link rel="stylesheet" type="text/css" href="css/order.css"></head><body><orders></orders></body></html>');
  };
}
(module.exports = require("marko").c(__filename)).c(create);