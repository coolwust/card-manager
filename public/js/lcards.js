'use strict';

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(LCardsComponent);
});

function LCardsComponent() {
  this.regions = ['USA', 'Europe'];
  this.upload = {
    region: '',
    form: new angular.ControlGroup({
      region: new angular.Control('', angular.Validators.required)
    }),
    info: {}
  };
}

LCardsComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'lcards'
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/lcards.html',
    directives: [
      ServerStatusComponent, angular.formDirectives,
      angular.NgFor, angular.NgIf
    ]
  })
];

LCardsComponent.prototype.onUploadFileChange = function ($event) {
  this.upload.file = $event.target.files[0];
}

LCardsComponent.prototype.onUploadFileSubmit = function () {
  this.upload.state = null;
  if (!this.upload.file) return;
  if (!this.upload.region) return;
  if (this.upload.file.name.split('.')[0].toUpperCase() !== this.upload.region.toUpperCase()) {
    return this.upload.state = 'unmatch';
  }
  this.upload.state = 'wait';
  var socket = io(config.host + ':' + config.port + '/lcards');
  var reader = new FileReader();
  reader.onload = function ($event) {
    socket.emit('upload', { region: this.upload.region.toLowerCase(), num: $event.target.result });
  }.bind(this);
  reader.readAsText(this.upload.file, 'UTF-8');

  socket.on('upload', function (info) {
    if (info.malformed) {
      this.upload.state = 'malformed';
    } else {
      this.upload.state = 'database';
      this.upload.info = info;
    }
  }.bind(this));
}
