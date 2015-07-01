function create(__helpers) {
  var str = __helpers.s,
      empty = __helpers.e,
      notEmpty = __helpers.ne,
      attr = __helpers.a,
      escapeXml = __helpers.x;

  return function render(data, out) {
    out.w('<nav class="navbar navbar-default navbar-fixed-top"><div class="container"><div class="navbar-header"><a class="navbar-brand" href="/">Shi Jie Bang</a></div><div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1"><ul class="nav navbar-nav"><li' +
      attr("class", (data.location=='orders' ? "active" : '')) +
      '><a href="/orders">Orders</a></li><li' +
      attr("class", (data.location=='new-order' ? "active" : '')) +
      '><a href="#">Add Order</a></li><li' +
      attr("class", (data.location=='l-cards' ? "active" : '')) +
      '><a href="/l-cards">L-Cards</a></li><li' +
      attr("class", (data.location=='customers' ? "active" : '')) +
      '><a href="#">Customers</a></li></ul><ul class="nav navbar-nav navbar-right"><li class="dropdown"><a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">' +
      escapeXml(data.username) +
      ' <span class="caret"></span></a><ul class="dropdown-menu"><li><a href="#">Moderators</a></li><li role="separator" class="divider"></li><li><a href="/logout">Logout</a></li></ul></li></ul></div></div></nav>');
  };
}
(module.exports = require("marko").c(__filename)).c(create);