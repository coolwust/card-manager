'use strict';

document.addEventListener('DOMContentLoaded', function () {
  ng.bootstrap(LCardsComponent);
});

function LCardsComponent(bag, search, upload) {

  this.socket = io(config.host + ':' + config.port + '/lcards');
  this.regions = config.regions;
  this.state = null;
  this.upload = upload;
  this.search = search;

  bag.navigation.location = 'lcards';
  bag.navigation.socket = this.socket;

  this.onFetch('search');
  console.log(this.search.form.controls.id.registerOnChange);
}

LCardsComponent.annotations = [
  new ng.ComponentAnnotation({
    selector: 'lcards', 
    viewInjector: [Bag, LCardsSearch, LCardsUpload]
  }),
  new ng.ViewAnnotation({
    templateUrl: '../tp/lcards.html',
    directives: [ng.formDirectives, ng.NgFor, ng.NgIf, NavigationComponent]
  })
];

LCardsComponent.parameters = [
  [Bag], [LCardsSearch], [LCardsUpload]
];

function LCardsSearch() {
  return {
    form: new ng.ControlGroup({
      id:     new ng.Control('', validators.lcard),
      ctime:  new ng.Control('', validators.date),
      region: new ng.Control('All')
    }),
    page: 1, 
    count: 20, 
    results: [],
    filter: ''
  };
}

LCardsComponent.prototype.onFetch = function (action) {
  var data = {
    region: this.search.form.controls.region.value,
    id:     this.search.form.controls.id.value,
    ctime:  this.search.form.controls.ctime.value
  };
  switch (action) {
    case 'search':
      if (!this.search.form.valid) return;
      this.search.filter = 'region=' + data.region;
      this.search.filter += data.id ? ', id=' + data.id : '';
      this.search.filter += data.ctime ? ', date=' + data.ctime : '';
      data.page = this.search.page = 1;
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
  data.count = this.search.count;
  this.state = 'searching';
  this.socket.removeAllListeners();
  this.search.results = [];
  if (data.ctime) {
    var arr = data.ctime.split(/[.]/).map(function (value) {
      return parseInt(value);
    });
    data.ctime = { year: arr[0], month: arr[1], day: arr[2] };
  }
  this.socket.emit('search', data);
  this.socket.on('reconnect', function () {
    this.state = 'searching';
    this.search.results = [];
    this.socket.emit('search', data);
  }.bind(this));
  this.socket.on('searched', function (data) {
    function findIndex(id, results) {
      for (var i = 0; i < results.length; i++) {
        if (results[i].id === id) return i;
      }
    }
    this.state = 'searched';
    console.log(data);
    if (data.new_val && !data.old_val) {
      this.search.results.push(data.new_val);
    }
    if (data.new_val && data.old_val) {
      var key = findIndex(data.old_val.id, this.search.results);
      this.search.results[key] = data.new_val;
    }
    if (!data.new_val && data.old_val) {
      var key = findIndex(data.old_val.id, this.search.results);
      this.search.results.splice(key, 1);
    }
  }.bind(this));
}

function LCardsUpload() {
  return {
    form: new ng.ControlGroup({
      region: new ng.Control('')
    }),
    query: { file: null, region: '' }, 
    info: {}
  };
}

LCardsComponent.prototype.onScan = function ($event) {
  this.upload.query.file = $event.target.files[0];
}

LCardsComponent.prototype.onUpload = function () {
  this.state = 'standby';
  var fileRegion = this.upload.query.file.name.split('.')[0].toUpperCase();
  var queryRegion = this.upload.query.region.toUpperCase();
  if (fileRegion !== queryRegion) return this.state = 'unmatch';
  this.socket.removeAllListeners();
  var reader = new FileReader();
  reader.onload = function ($event) {
    this.socket.emit('upload', { region: this.upload.query.region, contents: $event.target.result });
  }.bind(this);
  reader.readAsText(this.upload.query.file, 'UTF-8');
  this.socket.on('uploaded', function (result) {
    if (result.malformed) return this.state = 'malformed';
    this.state = 'inserted';
    this.upload.info = result;
  }.bind(this));
}
