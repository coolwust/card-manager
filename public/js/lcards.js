'use strict';

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(LCardsComponent);
});

function SearchModel() {

  function dateValidator(control) {
    var regexp = /^(19|20)\d\d[ .](0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])$/;
    if (control.value === '' || regexp.test(control.value)) return null;
    return { error: true };
  }

  function idValidator(control) {
    if (control.value === '' || !/[^A-Za-z0-9.-]/.test(control.value)) return null;
    return { error: true };
  }

  return {
    form: new angular.ControlGroup({
      id: new angular.Control('', idValidator),
      date: new angular.Control('', dateValidator),
      region: new angular.Control('')
    }),
    query: { id: '', date: '', region: 'all' },
    snapshot: '', page: 1, count: 20, results: []
  };
}

function UploadModel() {
  return {
    form: new angular.ControlGroup({
      region: new angular.Control('')
    }),
    query: { file: null, region: '' }, info: {}
  };
}

function LCardsComponent(search, upload) {
  this.regions = [['usa', 'USA'], ['europe', 'Europe']];
  this.cases = { 'usa': 'USA', 'europe': 'Europe' };
  this.state = null;
  this.socket = io(config.host + ':' + config.port + '/lcards');
  this.upload = upload;
  this.search = search;
  this.onSearch('search');
}

LCardsComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'lcards', appInjector: [SearchModel, UploadModel]
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/lcards.html',
    directives: [
      ServerStatusComponent, angular.formDirectives, angular.NgFor, angular.NgIf
    ]
  })
];

LCardsComponent.parameters = [[SearchModel], [UploadModel]];

LCardsComponent.prototype.onFileChange = function ($event) {
  this.upload.query.file = $event.target.files[0];
}

LCardsComponent.prototype.onUpload = function () {
  this.search.snapshot = '';
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
  this.socket.on('upload', function (result) {
    if (result.malformed) return this.state = 'malformed';
    this.state = 'inserted';
    this.upload.info = result;
  }.bind(this));
}

LCardsComponent.prototype.onSearch = function (action) {
  switch (action) {
    case 'search':
      if (!this.search.form.valid) return;
      var str = JSON.stringify(this.search.query);
      if (str === this.search.snapshot && this.search.page === 1) return;
      this.search.snapshot = str;
      this.search.filter = 'region=' + this.search.query.region;
      this.search.filter += this.search.query.id ? ', id=' + this.search.query.id : '';
      this.search.filter += this.search.query.date ? ', date=' + this.search.query.date : '';
      var data = JSON.parse(this.search.snapshot);
      data.page = this.search.page = 1;
      break;
    case 'newer':
      if (this.search.page === 1) return;
      var data = JSON.parse(this.search.snapshot);
      data.page = --this.search.page;
      break;
    case 'older':
      if (this.search.results.length <= this.search.count) return;
      var data = JSON.parse(this.search.snapshot);
      data.page = ++this.search.page;
      break;
  }
  data.count = this.search.count;
  this.state = 'searching';
  this.socket.removeAllListeners();
  this.search.results = [];
  if (data.date) {
    var arr = data.date.split(/[.]/).map(function (value) {
      return parseInt(value);
    });
    data.date = { year: arr[0], month: arr[1], day: arr[2] };
  }
  this.socket.emit('search', data);
  this.socket.on('reconnect', function () {
    this.state = 'searching';
    this.search.results = [];
    this.socket.emit('search', data);
  }.bind(this));
  this.socket.on('search', function (data) {
    function findIndex(id, results) {
      for (var i = 0; i < results.length; i++) {
        if (results[i].id === id) return i;
      }
    }
    this.state = 'found';
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
