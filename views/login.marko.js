function create(__helpers) {
  var str = __helpers.s,
      empty = __helpers.e,
      notEmpty = __helpers.ne,
      escapeXml = __helpers.x;

  return function render(data, out) {
    out.w('<!doctype html> <html><head><title>Moderator Login</title><script src="js/jquery-2.1.4.min.js"></script><script src="js/bootstrap.min.js"></script><link rel="stylesheet" type="text/css" href="css/bootstrap.min.css"><link rel="stylesheet" type="text/css" href="css/login.css"></head><body><div id="box" class="panel panel-default"><div class="panel-heading">' +
      escapeXml(data.state) +
      '</div><div class="panel-body" id="box-body"><form class="form-inline" action="/login" method="post" enctype="application-x-www-form-urlencoded"><div class="form-group"><label class="sr-only" for="username">\u7528\u6237\u540d</label><input class="form-control" id="username" name="username" placeholder="\u7528\u6237\u540d"></div><div class="form-group"><label class="sr-only" for="password">\u5bc6\u7801</label><input type="password" id="password" class="form-control" name="password" placeholder="\u5bc6\u7801"></div><button type="submit" class="btn btn-default">\u767b\u5f55</button></form><div></div></div></div></body></html>');
  };
}
(module.exports = require("marko").c(__filename)).c(create);