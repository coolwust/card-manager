'use strict';

var validators = {

  date: function (control) {
    var regexp = /^(19|20)\d\d[ .](0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])$/;
    if (control.value === '' || regexp.test(control.value)) return null;
    return { error: true };
  },

  trim: function (control) {
    if (control.value === '' || control.value && control.value.trim().length === control.value.length) return null;
    return { error: true };
  },

  lcard: function (control) {
    if (control.value === '' || !/[^A-Za-z0-9.-]/.test(control.value)) return null;
    return { error: true };
  },

  bcard: function (control) {
    if (control.value === '' || !/[^A-Za-z0-9.-]/.test(control.value)) return null;
    return { error: true };
  },

  order: function (control) {
    if (control.value === '' || !/[^A-Za-z0-9.-]/.test(control.value)) return null;
    return { error: true };
  },

  passport: function (control) {
    if (control.value === '' || !/[^A-Za-z0-9.-]/.test(control.value)) return null;
    return { error: true };
  },

  phone: function (control) {
    if (control.value === '' || !/[^0-9-]/.test(control.value)) return null;
    return { error: true };
  },

  tracking: function (control) {
    if (control.value === '' || !/[^A-Za-z0-9.-]/.test(control.value)) return null;
    return { error: true };
  }
}
