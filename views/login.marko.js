function create(__helpers) {
  var str = __helpers.s,
      empty = __helpers.e,
      notEmpty = __helpers.ne,
      escapeXml = __helpers.x;

  return function render(data, out) {
    out.w('<!doctype html> <html><head><title>Moderator Login</title><script src="js/jquery-2.1.4.min.js"></script><script src="js/bootstrap.min.js"></script><link rel="stylesheet" type="text/css" href="css/bootstrap.min.css"><link rel="stylesheet" type="text/css" href="css/login.css"></head><body><div id="box" class="panel panel-default"><div class="panel-heading">' +
      escapeXml(data.state) +
      '</div><div class="panel-body" id="box-body"><form class="form-inline" action="/login" method="post" enctype="application-x-www-form-urlencoded"><div class="form-group"><label class="sr-only" for="username">Username</label><input class="form-control" id="username" name="username" placeholder="Username"></div><div class="form-group"><label class="sr-only" for="password">Password</label><input type="password" id="password" class="form-control" name="password" placeholder="Password"></div><button type="submit" class="btn btn-default">Sign in</button></form><div></div></div></div></body></html>');
  };
}
(module.exports = require("marko").c(__filename)).c(create);