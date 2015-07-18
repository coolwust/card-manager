'use strict';

document.addEventListener('DOMContentLoaded', function () {
  ng.bootstrap(LCardsComponent);
});

function LCardsSearch() {
  return {
    form: new ng.ControlGroup({
      id:     new ng.Control('', validators.lcard),
      ctime:  new ng.Control('', validators.date),
      region: new ng.Control('')
    }),
    page: 1, 
    snapshot: {region: '', id: '', ctime: ''},
    count: 20, 
    results: [],
    get filter() {
      var filter = '';
      filter += this.snapshot.region ? ', region=' + this.snapshot.region : '';
      filter += this.snapshot.id ? ', id=' + this.snapshot.id : '';
      filter += this.snapshot.ctime ? ', date=' + this.snapshot.ctime : '';
      return filter ? filter.substr(1).toLowerCase() : '';
    }
  };
}

function LCardsInsert() {
  return {
    form: new ng.ControlGroup({
      region: new ng.Control('')
    }),
    query: { file: null, region: '' }, 
    info: {}
  };
}

function LCardsComponent(bag, search, insert) {
  if (!bag.sockets.lcards) bag.sockets.lcards = io(config.host + ':' + config.port + '/lcards');
  bag.navigation.location = 'lcards';
  this.sockets = bag.sockets;
  this.regions = config.regions;
  this.state = null;
  this.message = '';
  this.insert = insert;
  this.search = search;
  this.onSearch();
}

LCardsComponent.annotations = [
  new ng.ComponentAnnotation({
    selector: 'lcards', 
    viewInjector: [Bag, LCardsSearch, LCardsInsert]
  }),
  new ng.ViewAnnotation({
    templateUrl: '../tp/lcards.html',
    directives: [ng.formDirectives, ng.NgFor, ng.NgIf, ConnectionComponent, NavigationComponent]
  })
];

LCardsComponent.parameters = [
  [Bag], [LCardsSearch], [LCardsInsert]
];

LCardsComponent.prototype.onSearch = function (action) {
  var data = {
    region: this.search.form.controls.region.value,
    id:     this.search.form.controls.id.value,
    ctime:  this.search.form.controls.ctime.value,
    count:  this.search.count
  };
  switch (action) {
    case 'newer':
      if (this.search.page === 1) return;
      data.page = --this.search.page;
      break;
    case 'older':
      if (this.search.results.length <= this.search.count) return;
      data.page = ++this.search.page;
      break;
    default:
      if (!this.search.form.valid) return;
      data.page = this.search.page = 1;
      break;
  }
  this.search.snapshot = data;
  this.state = 'standby';
  this.search.results = [];
  this.sockets.lcards.removeAllListeners();
  this.sockets.lcards.emit('search', data);
  this.sockets.lcards.on('searched', function (data) {
    this.state = 'searched';
    this.search.total = data.total;
    function findIndex(id, results) {
      for (var i = 0; i < results.length; i++) {
        if (results[i].id === id) return i;
      }
    }
    if (data.new_val && !data.old_val) {
      this.search.results.push(data.new_val);
    }
    if (data.new_val && data.old_val) {
      var key = findIndex(data.old_val.id, this.search.results);
      this.search.results[key] = data.new_val;
    }
    if (!data.new_val && data.old_val) {
      var key = findIndex(data.old_val.id, this.search.results);
      if (typeof key !== 'number') return;
      this.search.results.splice(key, 1);
    }
  }.bind(this));
  this.sockets.lcards.on('reconnect', function () {
    this.state = 'standby';
    this.search.results = [];
    this.sockets.lcards.emit('search', data);
  }.bind(this));
  this.sockets.lcards.on('failed', function (message) {
    this.state = 'failed';
    this.message = message;
  }.bind(this));
}

LCardsComponent.prototype.onScan = function ($event) {
  this.insert.query.file = $event.target.files[0];
}

LCardsComponent.prototype.onInsert = function () {
  var fileRegion, queryRegion, reader;
  this.state = 'standby';
  fileRegion = this.insert.query.file.name.split('.')[0];
  queryRegion = this.insert.query.region;
  if (fileRegion.toUpperCase() !== queryRegion.toUpperCase()) {
    return this.state = 'unmatch';
  }
  this.sockets.lcards.removeAllListeners();
  reader = new FileReader();
  reader.onload = function ($event) {
    if (/[^A-Za-z0-9\r\n_-]/.test($event.target.result) === true) {
      return this.state = 'malformed';
    }
    this.sockets.lcards.emit('insert', { 
      region: this.insert.query.region, 
      contents: $event.target.result 
    });
  }.bind(this);
  reader.readAsText(this.insert.query.file, 'UTF-8');
  this.sockets.lcards.on('inserted', function (info) {
    this.state = 'inserted';
    this.insert.info = info;
    this.insert.info.region = queryRegion;
  }.bind(this));
}
