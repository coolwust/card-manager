'use strict';

document.addEventListener('DOMContentLoaded', function () {
  ng.bootstrap(OrdersComponent);
});

function OrdersSearch() {
  var groups;
  groups = {
    bars: [
      {na: '',         se: 'Any',           di: 1, pl: ''                                   },
      {na: 'start',    se: 'Starting Date', di: 0, pl: 'YYYY.MM.DD', vl: validators.date    },
      {na: 'end',      se: 'Ending Date',   di: 0, pl: 'YYYY.MM.DD', vl: validators.date    },
      {na: 'ctime',    se: 'Creation Date', di: 0, pl: 'YYYY.MM.DD', vl: validators.date    },
      {na: 'name',     se: 'Customer',      di: 0, pl: 'YYYY.MM.DD', vl: validators.date    },
      {na: 'id',       se: 'Order ID',      di: 0, pl: ''          , vl: validators.order   },
      {na: 'phone',    se: 'Phone Number',  di: 0, pl: ''          , vl: validators.phone   },
      {na: 'passport', se: 'Passport ID',   di: 0, pl: ''          , vl: validators.passport},
      {na: 'lcard',    se: 'LCard ID',      di: 0, pl: ''          , vl: validators.lcard   },
      {na: 'bcard',    se: 'BCard ID',      di: 0, pl: ''          , vl: validators.bcard   }
    ],
    combinations: [
      {na: 'category', bs: ['Active', 'Legacy']},
      {na: 'shipping', bs: ['', 'Pending', 'Shipped']},
      {na: 'health',   bs: ['', 'Normal', 'Error']}
    ]
  };
  return {
    groups: groups,
    trackings: {
      bar: groups.bars[0],
      category: 'Active',
      shipping: '',
      health: ''
    },
    form: new ng.ControlGroup({
      bar: new ng.Control('')
    }),
    get valid() {
      if (this.trackings.bar.vl) return (this.trackings.bar.vl(this.form.controls.bar) === null);
      return true;
    }
    state: null,
    snapshot: null,
    page: 1, 
    count: 20
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

function OrdersComponent(bag, search) {
  this.bag = bag;
  this.search = search;
  this.socket = io(config.host + ':' + config.port + '/orders');
  this.regions = config.regions;
  bag.socket = this.socket;
  bag.navigation.location = 'orders';
}

OrdersComponent.annotations = [
  new ng.ComponentAnnotation({
    selector: 'orders',
    viewInjector: [Bag, OrdersSearch]
  }),
  new ng.ViewAnnotation({
    templateUrl: '../tp/orders.html',
    directives: [
      ng.NgFor, ng.NgIf, ng.CSSClass, ng.formDirectives, 
      ConnectionComponent, NavigationComponent, OrderComponent
    ]
  })
];

OrdersComponent.parameters = [
  [Bag], [OrdersSearch]
];

OrdersComponent.prototype.onInsert = function () {
  this.bag.order.state = 'insert';
}

OrdersComponent.prototype.onBarSwitch = function (i) {
  this.search.trackings.bar = this.search.groups.bars[i];
  this.search.form.controls.bar.updateValue('');
}

OrdersComponent.prototype.onSearch = function (action) {
  var data = {};
  if (!this.search.valid) return;
  if (!this.search.trackings.bar.di && this.search.form.controls.bar.value === '') return;
  data.category = this.search.trackings.category;
  if (this.search.trackings.shipping !== '') data.shipping = this.search.trackings.shipping;
  if (this.search.trackings.health !== '') data.health = this.search.trackings.health;
  if (this.search.trackings.bar.na !== '') data[this.search.trackings.bar.na] = this.search.form.controls.bar.value;
}

OrdersComponent.prototype.onCombinationSwitch = function (name, value) {
  this.search.trackings[name] = value;
}
