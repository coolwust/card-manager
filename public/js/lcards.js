'use strict';

document.addEventListener('DOMContentLoaded', function () {
  ng.bootstrap(LCardsComponent);
});

function LCardsComponent(bag, search, insert) {

  this.socket = io(config.host + ':' + config.port + '/lcards');
  this.regions = config.regions;
  this.state = null;
  this.insert = insert;
  this.search = search;

  bag.navigation.location = 'lcards';
  bag.navigation.socket = this.socket;

  this.onFetch('search');
}

LCardsComponent.annotations = [
  new ng.ComponentAnnotation({
    selector: 'lcards', 
    viewInjector: [Bag, LCardsSearch, LCardsInsert]
  }),
  new ng.ViewAnnotation({
    templateUrl: '../tp/lcards.html',
    directives: [ng.formDirectives, ng.NgFor, ng.NgIf, NavigationComponent]
  })
];

LCardsComponent.parameters = [
  [Bag], [LCardsSearch], [LCardsInsert]
];

function LCardsSearch() {
  return {
    form: new ng.ControlGroup({
      id:     new ng.Control('', validators.lcard),
      ctime:  new ng.Control('', validators.date),
      region: new ng.Control('')
    }),
    page: 1, 
    count: 20, 
    results: [],
    filter: ''
  };
}

LCardsComponent.prototype.onFetch = function (action) {
  this.socket.removeAllListeners();
  var data;
  data = {
    region: this.search.form.controls.region.value,
    id:     this.search.form.controls.id.value,
    ctime:  this.search.form.controls.ctime.value,
    count:  this.search.count
  };
  switch (action) {
    case 'search':
      if (!this.search.form.valid) return;
      data.page = this.search.page = 1;
      this.search.filter = 'region=' + data.region;
      this.search.filter += data.id ? ', id=' + data.id : '';
      this.search.filter += data.ctime ? ', date=' + data.ctime : '';
      break;
    case 'newer':
      if (this.search.page === 1) return;
      data.page = --this.search.page;
      break;
    case 'older':
      if (this.search.results.length <= this.search.count) return;
      data.page = ++this.search.page;
      break;
  }
  this.state = 'standby';
  this.search.results = [];
  this.socket.emit('search', data);
  this.socket.on('searched', function (data) {
    this.state = 'searched';
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
      console.log(key);
      this.search.results.splice(key, 1);
    }
  }.bind(this));
  this.socket.on('reconnect', function () {
    this.state = 'standby';
    this.search.results = [];
    this.socket.emit('search', data);
  }.bind(this));
  this.socket.on('warning', function (err) {
    this.state = 'warning';
  }.bind(this));
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
  this.socket.removeAllListeners();
  reader = new FileReader();
  reader.onload = function ($event) {
    this.socket.emit('insert', { 
      region: this.insert.query.region, 
      contents: $event.target.result 
    });
  }.bind(this);
  reader.readAsText(this.insert.query.file, 'UTF-8');
  this.socket.on('inserted', function (info) {
    if (info.malformed) return this.state = 'malformed';
    this.state = 'inserted';
    this.insert.info = info;
    this.insert.info.region = queryRegion;
  }.bind(this));
}
