'use strict';

function LCardsPanelComponent() {
  this.upload = {};
}

LCardsPanelComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'l-cards-panel'
  }),
  new angular.ViewAnnotation({
    templateUrl: '../tp/l-cards-panel.html',
    directives: [ServerStatusComponent]
  })
];

LCardsPanelComponent.prototype.cardsFileChosen = function ($event) {
  this.upload.selectedFile = $event.target.files[0];
  console.log($event.target.files[0]);
}

LCardsPanelComponent.prototype.cardsFileUpload = function () {
  var name = this.upload.selectedFile.name.split('.')[0];
  if (this.upload.region !== name) {
    console.log(this.upload.region + ' does not match ' + name);
    return;
  } else {
    console.log('they match!');
  }
  var reader = new FileReader();
  var socket = io(config.host + ':' + config.port)
  //socket.emit('lcards-upload', { region: this.upload.region, this.upload.size: this.upload.size });
}

LCardsPanelComponent.prototype.cardsRegionSelected = function ($event) {
  this.upload.region = $event.target.value;
}
