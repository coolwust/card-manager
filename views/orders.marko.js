function create(__helpers) {
  var str = __helpers.s,
      empty = __helpers.e,
      notEmpty = __helpers.ne,
      __loadTemplate = __helpers.l,
      __nav_marko = __loadTemplate(require.resolve("./nav.marko"));

  return function render(data, out) {
    out.w('<!doctype html> <html><head><title>Order List</title><script src="js/jquery-2.1.4.min.js"></script><script src="js/bootstrap.min.js"></script><link rel="stylesheet" type="text/css" href="css/bootstrap.min.css"><link rel="stylesheet" type="text/css" href="css/order-list.css"></head><body>');
    __helpers.i(out, __nav_marko, {"username": data.username, "location": "order-list", "body": __helpers.c(out, function() {
      out.w('<div id="main">hello world</div>');
    })});

    out.w('</body></html>');
  };
}
(module.exports = require("marko").c(__filename)).c(create);