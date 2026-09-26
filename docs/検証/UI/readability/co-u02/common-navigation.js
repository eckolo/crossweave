/* Shared positions and labels for loaded-game surfaces. */
(function(api){'use strict';
 api.commonNavigationHTML=function(attribute='data-j',menuAction='menu'){
  return '<nav class="cw-common-nav" aria-label="共通">'+
   '<button type="button" class="cursor-interaction" '+attribute+'="records" data-common-control="records" aria-label="調査記録"><i data-lucide="book-open" aria-hidden="true"></i><span>調査記録</span></button>'+
   '<button type="button" class="cursor-interaction" '+attribute+'="'+menuAction+'" data-common-control="menu" aria-label="メニュー" data-tooltip="メニュー"><i data-lucide="menu" aria-hidden="true"></i></button></nav>';
 };
})(globalThis.CrossweaveUI);
