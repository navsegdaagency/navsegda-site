// Плавная прокрутка колесом с инерцией (Lenis). Тач и reduced-motion — нативно.
(function () {
  if (!window.Lenis) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(pointer: coarse)').matches) return;

  var lenis = new Lenis({
    lerp: 0.09,
    wheelMultiplier: 0.95,
    smoothWheel: true,
    syncTouch: false,
    anchors: { offset: -84 },
    autoRaf: true
  });
  window.__lenis = lenis;

  // Стоп прокрутки под открытым меню и нативным <dialog> (галерея)
  var html = document.documentElement;
  function sync() {
    var locked = html.classList.contains('menu-open') || !!document.querySelector('dialog[open]');
    if (locked) lenis.stop(); else lenis.start();
  }
  new MutationObserver(sync).observe(html, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

  // Внутренние вертикальные скроллеры прокручиваются сами
  document.querySelectorAll('.art-tbl, dialog').forEach(function (el) { el.setAttribute('data-lenis-prevent', ''); });
})();
