/* Mobile toolbar/keyboard height changes must not resize ten screens of content. */
(function () {
  'use strict';
  var root = document.documentElement;
  var width = innerWidth;
  var media = matchMedia('(max-width:767px), (pointer:coarse)');
  function update() {
    if (media.matches) {
      root.setAttribute('data-wedding-scroll-stable', '');
      root.style.setProperty('--nsg-wedding-screen-height', innerHeight + 'px');
    } else {
      root.removeAttribute('data-wedding-scroll-stable');
      root.style.removeProperty('--nsg-wedding-screen-height');
    }
  }
  // Head bootstrap already reserves geometry before first paint.
  if (!root.hasAttribute('data-wedding-scroll-stable') && media.matches) update();
  window.addEventListener('resize', function () {
    if (innerWidth === width) return;
    width = innerWidth;
    update();
  }, { passive: true });
  if (media.addEventListener) media.addEventListener('change', update);
})();
