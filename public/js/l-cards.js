'use strict';

function LCardsComponent() {
}

LCardsComponent.annotations = [
  new angular.ComponentAnnotation({
    selector: 'l-cards'
  }),
  new angular.ViewAnnotation({
    template: '<l-cards-panel></l-cards-panel><l-cards-result></l-cards-result>',
    directives: [LCardsPanelComponent]
  })
];

document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(LCardsComponent);
});
