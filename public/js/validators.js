'use strict';

var validators = {
  dateValidator: function (control) {
    var regexp = /^(19|20)\d\d[ .](0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])$/;
    if (control.value === '' || regexp.test(control.value)) return null;
    return { error: true };
  }

  contentValidator: function (control) {
    if (control.value && control.value.trim().length === control.value.length) return null;
    return { error: true };
  }
}
