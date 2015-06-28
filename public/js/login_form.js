'use strict';

function LoginFormComponent() {
  this.status = 'You havn\'t logged in yet. Please login.';
  this.credentials = new angular.ControlGroup({
      username: new angular.Control('', angular.Validators.required),
      password: new angular.Control('', angular.Validators.required)
  });
  var socket = io('192.168.56.102:3000');
  socket.emit('login');
}

LoginFormComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'login-form'
  }),
  new angular.ViewAnnotation({
    templateUrl: "../login_form.html",
    directives: [angular.formDirectives]
  })
];

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(LoginFormComponent);
});
