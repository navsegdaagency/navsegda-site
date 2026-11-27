/* Native document scrolling: no wheel/touch interception, clones or startup jumps. */
(function () {
  'use strict';
  var header = document.querySelector('.mh');
  var pages = document.querySelectorAll('#mag > .pg');
  if (!header || !pages.length || !('IntersectionObserver' in window)) return;
  var observer, resizeFrame = 0;
  function observeHeaderLine() {
    if (observer) observer.disconnect();
    var bottom = Math.max(0, document.documentElement.clientHeight - 88);
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) header.dataset.theme = entry.target.dataset.theme || 'paper';
      });
    }, { rootMargin: '-72px 0px -' + bottom + 'px 0px', threshold: 0 });
    pages.forEach(function (page) { observer.observe(page); });
  }
  observeHeaderLine();
  window.addEventListener('resize', function () {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(function () { resizeFrame = 0; observeHeaderLine(); });
  }, { passive: true });
})();
