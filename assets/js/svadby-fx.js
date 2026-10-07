/* НАВСЕГДА · /svadby/ — плавный скролл (Lenis) и визуальные эффекты.
   Не трогаем: #nsg-journey (3D «Путь к вашему дню»), .nsg-hero-video, #nsg-inf, первый экран (rec2127209471).
   prefers-reduced-motion — всё выключено. Тач-устройства — нативный скролл, эффекты облегчены. */
(function () {
  'use strict';
  if (window.__nsgFx) return;
  window.__nsgFx = 1;

  var W = window, D = document, R = D.documentElement;
  function mm(q) { try { return W.matchMedia(q).matches; } catch (e) { return false; } }
  if (mm('(prefers-reduced-motion: reduce)')) return;

  var FINE = mm('(hover: hover) and (pointer: fine)');
  var LITE = !FINE || mm('(max-width: 767px)');
  var HAS_IO = 'IntersectionObserver' in W;
  var lenis = null;
  var systems = [], loopOn = false, last = 0;
  var parSync = null;   // обновление параллакса, вызывается из цикла Lenis

  /* ───────────────────────── 1. Плавный скролл (Lenis) ───────────────────────── */
  var LENIS_CDN = 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js';
  var LENIS_LOCAL = '/assets/vendor/lenis.min.js';

  function loadScript(src, ok, fail) {
    var s = D.createElement('script'), done = false;
    s.src = src; s.async = true;
    s.onload = function () { if (!done) { done = true; ok(); } };
    s.onerror = function () { if (!done) { done = true; fail && fail(); } };
    D.head.appendChild(s);
    return function () { if (!done) { done = true; fail && fail(); } };
  }

  function bootLenis() {
    if (lenis || !W.Lenis) return;
    // virtualScroll: если обработчик элемента (боковая прокрутка Tilda-каруселей) уже вызвал preventDefault —
    // событие не отдаём Lenis, чтобы страница не ехала вместе с каруселью.
    lenis = new W.Lenis({
      lerp: 0.06,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      gestureOrientation: 'vertical',
      virtualScroll: function (e) { return !(e.event && e.event.defaultPrevented); }
    });
    W.__nsgLenis = lenis;
    R.classList.add('fx-lenis');
    lenis.on('scroll', function () { if (parSync) parSync(); });   // параллакс считаем в том же кадре, что и Lenis
    (function raf(t) { lenis.raf(t); W.requestAnimationFrame(raf); })(performance.now());
    lockWatch();
    anchors();
  }

  // Стоп/старт при открытии модалки сметы, popup'ов Tilda, меню, лайтбоксов
  function lockWatch() {
    var modal = D.getElementById('smeta-modal'), stopped = false;
    function mark() {
      [].forEach.call(D.querySelectorAll('.smeta-modal__box,.t-popup,.t450__menu__content,.t-menu__wrapper,.nsg-lb'), function (n) {
        if (!n.hasAttribute('data-lenis-prevent')) n.setAttribute('data-lenis-prevent', '');
      });
    }
    function locked() {
      var b = D.body;
      return (modal && !modal.hidden) ||
        b.style.overflow === 'hidden' || R.style.overflow === 'hidden' ||
        /(t-body_popupshowed|t450__body_menushowed|t-body_scroll-locked|t-body_menushowed)/.test(b.className) ||
        !!D.querySelector('.nsg-lb.on');
    }
    function sync() {
      if (!lenis) return;
      var l = locked();
      if (l && !stopped) { stopped = true; mark(); lenis.stop(); }
      else if (!l && stopped) { stopped = false; lenis.start(); }
    }
    var mo = new MutationObserver(sync);
    mo.observe(D.body, { attributes: true, attributeFilter: ['class', 'style'] });
    mo.observe(R, { attributes: true, attributeFilter: ['style'] });
    if (modal) mo.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
    // лайтбоксы создаются позже — следим за добавлением узлов в body
    new MutationObserver(function (m) { mark(); sync(); }).observe(D.body, { childList: true });
    mark(); sync();
  }

  // Якоря: меню Tilda и наши ссылки идут через lenis.scrollTo с отступом под шапку
  var SKIP_HASH = /^#(popup|zeropopup|menuopen|smeta|price|submenu|order|prodpopup|closepopup|closeallpopup|!)/;
  function headerOffset() {
    var h = D.querySelector('#rec907624708 .t396__artboard');
    if (h) {
      var r = h.getBoundingClientRect();
      if (r.height > 0 && r.height < 140 && r.top < 40) return Math.round(Math.max(0, r.bottom)) + 6;
    }
    return 76;
  }
  function findTarget(hash) {
    var id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (e) { id = hash.slice(1); }
    if (!id) return null;
    return D.getElementById(id) || D.querySelector('a[name="' + id.replace(/"/g, '\\"') + '"]');
  }
  function anchors() {
    function norm(p) { return p.replace(/index\.html$/, '').replace(/\/+$/, '') || '/'; }
    D.addEventListener('click', function (e) {
      if (!lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.smeta === '1') return;
      if (a.closest('.t450,.t-popup,#smeta-modal')) return;         // мобильное меню/попапы — штатно, через Tilda
      var u;
      try { u = new URL(a.getAttribute('href'), location.href); } catch (_) { return; }
      if (u.origin !== location.origin || !u.hash || u.hash === '#' || SKIP_HASH.test(u.hash)) return;
      if (norm(u.pathname) !== norm(location.pathname)) return;
      var t = findTarget(u.hash);
      if (!t || t.closest('#smeta-modal')) return;
      e.preventDefault();
      e.stopImmediatePropagation();                                    // не даём Tilda (t270_scroll) крутить параллельно
      lenis.scrollTo(t, { offset: -headerOffset(), duration: 1.7, easing: function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } });
      try { history.pushState(null, '', u.hash); } catch (_) {}
    }, true);
  }

  if (FINE) {
    if (W.Lenis) bootLenis();
    else {
      var fallbackDone = false;
      var toLocal = function () {
        if (fallbackDone) return; fallbackDone = true;
        loadScript(LENIS_LOCAL, bootLenis, function () { /* нативный скролл */ });
      };
      loadScript(LENIS_CDN, bootLenis, toLocal);
      setTimeout(function () { if (!W.Lenis) toLocal(); }, 3500);
    }
  }

  /* ───────────────────────── 2. Визуальные эффекты ───────────────────────── */
  if (!HAS_IO) return;

  function onReady(fn) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  onReady(function () {
    try { fxInit(); } catch (err) {
      R.classList.remove('fx-on');
      if (W.console) console.warn('[svadby-fx]', err);
    }
  });

  function fxInit() {
    var HERO = 'rec2127209471';
    // записи, где нельзя трогать элементы: шапка/меню/подвал-меню, форма во всплывающем окне
    var SKIP_REC = { rec907624708: 1, rec2142286391: 1, rec2133056391: 1, rec907410820: 1, rec2136629561: 1, rec907410832: 1, rec2142325701: 1, rec907410823: 1 };
    // записи с горизонтальной прокруткой (Voron): их элементы не двигаем
    var HSCROLL = { rec2127292811: 1, rec2136616941: 1, rec2136523771: 1 };
    R.classList.toggle('fx-lite', LITE);

    var recs = [].slice.call(D.querySelectorAll('#allrecords .t-rec[data-record-type="396"], #t-footer .t-rec[data-record-type="396"]'));
    function inJourney(el) { return !!el.closest('#nsg-journey'); }

    /* ── появление: каскад по пачкам, попавшим в экран одновременно ── */
    var rvIO = new IntersectionObserver(function (entries) {
      var vis = entries.filter(function (en) { return en.isIntersecting; }).sort(function (a, b) {
        var ra = a.boundingClientRect, rb = b.boundingClientRect;
        return (Math.round(ra.top / 40) - Math.round(rb.top / 40)) || (ra.left - rb.left);
      });
      vis.forEach(function (en, i) {
        var el = en.target;
        rvIO.unobserve(el);
        var d = Math.min(i, 9) * (LITE ? 45 : 70);
        el.style.setProperty('--fx-d', d + 'ms');
        W.requestAnimationFrame(function () { el.classList.add('fx-in'); });
        setTimeout(function () { el.classList.remove('fx-rv', 'fx-in'); el.style.removeProperty('--fx-d'); }, d + 1700);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
    function reveal(el) { if (el.__fxRv) return; el.__fxRv = 1; el.classList.add('fx-rv'); rvIO.observe(el); }

    var shineEls = [], btnEls = [], parEls = [];

    recs.forEach(function (rec) {
      if (SKIP_REC[rec.id]) return;
      var isHero = rec.id === HERO, hs = !!HSCROLL[rec.id];
      [].forEach.call(rec.querySelectorAll('.t396__elem'), function (el) {
        var type = el.getAttribute('data-elem-type'), atom = el.querySelector('.tn-atom');
        if (!atom || inJourney(el)) return;
        // кнопки: свечение + блик + магнит (в т.ч. на первом экране — это не видео)
        if (type === 'button' && atom.tagName === 'A' && atom.textContent.trim()) { el.classList.add('fx-btn'); btnEls.push({ host: el, atom: atom }); }
        if (isHero) return;                                           // первый экран больше не трогаем
        if (hs) { if (type === 'text') maybeShine(el, atom); return; }
        if (type === 'html' || type === 'form' || type === 'gallery' || type === 'video' || type === 'tooltip') return;
        if (!el.classList.contains('t-animate')) reveal(el);          // у t-animate своя анимация Tilda
        if (type === 'text') maybeShine(el, atom);
        // параллакс фото
        if (!LITE) {
          var isBg = atom.classList.contains('t-bgimg'), isImg = type === 'image';
          var r = el.getBoundingClientRect();
          if ((isBg || isImg) && r.width >= 150 && r.height >= 150) parEls.push({ host: el, atom: atom, amp: Math.min(26, Math.max(10, r.height * 0.05)) });
        }
      });
    });

    /* ── карточки «Наши пары» и кнопки блока ── */
    var pairs = D.getElementById('nsg-pairs');
    if (pairs) {
      [].forEach.call(pairs.querySelectorAll('.np-card'), reveal);
      [].forEach.call(pairs.querySelectorAll('.np-btn'), function (b) { b.classList.add('fx-btn'); btnEls.push({ host: b, atom: b, free: true }); });
    }

    /* ── золотой блик по крупным заголовкам ── */
    function maybeShine(el, atom) {
      if (LITE && !FINE) { /* на тач — тоже, но без лишнего: оставляем, эффект лёгкий */ }
      var fs = parseFloat(W.getComputedStyle(atom).fontSize) || 0;
      var txt = (atom.textContent || '').trim();
      if (fs < 44 || txt.length < 6 || atom.children.length || !/[A-Za-zА-Яа-яЁё]{4}/.test(txt)) return;
      if (el.__fxSh) return; el.__fxSh = 1;
      var sh = D.createElement('span'), t = D.createElement('span');
      sh.className = 'fx-sh'; sh.setAttribute('aria-hidden', 'true');
      t.className = 'fx-sh-t'; t.setAttribute('data-t', atom.textContent);
      sh.appendChild(t);
      atom.classList.add('fx-shine-host');
      atom.appendChild(sh);
      shineEls.push(atom);
    }
    var shIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var a = en.target; shIO.unobserve(a);
        setTimeout(function () {
          a.classList.add('fx-shine-go');
          setTimeout(function () { a.classList.remove('fx-shine-go'); }, 2200);
        }, 450);
      });
    }, { threshold: 0.55 });
    shineEls.forEach(function (a) { shIO.observe(a); });

    /* ── разделители на стыках блоков ── */
    var SEAM_ORN = '<svg viewBox="0 0 96 28" fill="none" stroke="#BA8A48" stroke-width="1" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M48 6 L54 14 L48 22 L42 14 Z" fill="rgba(186,138,72,.18)"/>' +
      '<path d="M39 14 C34 8 26 7 17 11 C25 17 33 18 39 14 Z" fill="rgba(186,138,72,.12)"/>' +
      '<path d="M57 14 C62 8 70 7 79 11 C71 17 63 18 57 14 Z" fill="rgba(186,138,72,.12)"/>' +
      '<path d="M17 11 L8 12.5"/><path d="M79 11 L88 12.5"/><circle cx="4.5" cy="13" r="1.1" fill="#BA8A48" stroke="none"/><circle cx="91.5" cy="13" r="1.1" fill="#BA8A48" stroke="none"/></svg>';
    var seamIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('fx-draw'); seamIO.unobserve(en.target); } });
    }, { threshold: 0.01, rootMargin: '0px 0px -12% 0px' });
    ['rec2127279761', 'rec2132891811', 'rec2127292671', 'rec2127225221'].forEach(function (id) {
      var rec = D.getElementById(id); if (!rec || !rec.parentNode) return;
      var s = D.createElement('div');
      s.className = 'fx-seam'; s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<div class="fx-seam__in"><i></i>' + SEAM_ORN + '<i></i></div>';
      rec.parentNode.insertBefore(s, rec);
      seamIO.observe(s);
    });

    /* ── параллакс (только transform), десктоп ── */
    if (parEls.length) {
      var visPar = [], parIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.__fxVis = en.isIntersecting; });
        visPar = parEls.filter(function (p) { return p.host.__fxVis; });
        kick();
      }, { rootMargin: '20% 0px 20% 0px' });
      parEls.forEach(function (p) { p.atom.classList.add('fx-par'); parIO.observe(p.host); });
      var ticking = false;
      function kick() { if (!ticking) { ticking = true; W.requestAnimationFrame(parFrame); } }
      function parFrame() {
        ticking = false;
        var vh = W.innerHeight;
        visPar.forEach(function (p) {
          var r = p.host.getBoundingClientRect();
          var k = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2);
          k = Math.max(-1, Math.min(1, k));
          p.atom.style.transform = 'translate3d(0,' + (-k * p.amp).toFixed(1) + 'px,0)';
        });
      }
      parSync = function () { ticking = false; parFrame(); };
      W.addEventListener('scroll', function () { if (!lenis) kick(); }, { passive: true });   // без Lenis — нативный скролл
      W.addEventListener('resize', kick, { passive: true });
    }

    /* ── кнопки: магнитный эффект (десктоп) ── */
    if (FINE && btnEls.length) {
      var visBtn = [], btnIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.__fxBv = en.isIntersecting; });
        visBtn = btnEls.filter(function (b) { return b.host.__fxBv; });
      });
      btnEls.forEach(function (b) { b.atom.classList.add('fx-mag'); btnIO.observe(b.host); });
      var mx = 0, my = 0, mt = false;
      W.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        mx = e.clientX; my = e.clientY;
        if (!mt) { mt = true; W.requestAnimationFrame(magFrame); }
      }, { passive: true });
      var magFrame = function () {
        mt = false;
        visBtn.forEach(function (b) {
          var r = b.host.getBoundingClientRect(), pad = 38;
          var inside = mx > r.left - pad && mx < r.right + pad && my > r.top - pad && my < r.bottom + pad;
          if (inside) {
            var dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
            var ax = Math.max(-9, Math.min(9, dx * 0.2)), ay = Math.max(-7, Math.min(7, dy * 0.3));
            b.atom.style.translate = ax.toFixed(1) + 'px ' + ay.toFixed(1) + 'px';
            b.on = true;
          } else if (b.on) { b.atom.style.translate = ''; b.on = false; }
        });
      };
    }

    /* ── парящие лепестки / золотые искры (canvas 2D) ── */
    particles('rec2132891811', 'petal');   // анкета (крем)

    // включаем только когда всё подготовлено
    R.classList.add('fx-on');
  }

  /* ───────────────────────── 3. Частицы ───────────────────────── */
  function particles(recId, kind) {
    var rec = D.getElementById(recId); if (!rec) return;
    var host = rec.querySelector('.t396__artboard'); if (!host) return;
    var cv = D.createElement('canvas');
    cv.className = 'fx-cv'; cv.setAttribute('aria-hidden', 'true');
    host.insertBefore(cv, host.firstChild);
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var dpr = Math.min(W.devicePixelRatio || 1, LITE ? 1 : 1.5);
    var sys = { cv: cv, ctx: ctx, kind: kind, p: [], w: 0, h: 0, on: false, host: host, sprite: null };
    var count = kind === 'petal' ? (LITE ? 4 : 9) : (LITE ? 9 : 22);

    function size() {
      var r = host.getBoundingClientRect();
      sys.w = Math.max(1, Math.round(r.width)); sys.h = Math.max(1, Math.round(r.height));
      cv.width = Math.round(sys.w * dpr); cv.height = Math.round(sys.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(p, first) {
      var rnd = Math.random;
      if (kind === 'petal') {
        p.s = 7 + rnd() * 8; p.x = rnd() * sys.w; p.y = first ? rnd() * sys.h : -20 - rnd() * 80;
        p.vy = 16 + rnd() * 20; p.vx = -6 + rnd() * 14; p.ph = rnd() * 6.28; p.sw = 0.5 + rnd() * 0.9;
        p.rot = rnd() * 6.28; p.vr = (rnd() - .5) * 0.9; p.c = rnd() < .45 ? 'rgba(122,28,34,' : (rnd() < .5 ? 'rgba(186,138,72,' : 'rgba(201,120,125,');
        p.a = 0.16 + rnd() * 0.16;
      } else {
        p.s = 1.6 + rnd() * 2.6; p.x = rnd() * sys.w; p.y = first ? rnd() * sys.h : sys.h + 10 + rnd() * 60;
        p.vy = -(8 + rnd() * 16); p.vx = (rnd() - .5) * 8; p.ph = rnd() * 6.28; p.sw = 0.8 + rnd() * 1.6; p.a = 0.55 + rnd() * 0.45;
      }
    }
    function makeSprite() {
      var c = D.createElement('canvas'); c.width = c.height = 32;
      var g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(.25, 'rgba(232,185,105,.8)'); gr.addColorStop(1, 'rgba(186,138,72,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c;
    }
    if (kind === 'spark') sys.sprite = makeSprite();
    for (var i = 0; i < count; i++) { var p = {}; spawn(p, true); sys.p.push(p); }
    sys.spawn = spawn;
    sys.resize = size;
    size();
    if ('ResizeObserver' in W) new ResizeObserver(size).observe(host); else W.addEventListener('resize', size);

    new IntersectionObserver(function (en) {
      sys.on = en[0].isIntersecting;
      cv.classList.toggle('on', sys.on);
      if (sys.on) startLoop();
    }, { rootMargin: '10% 0px 10% 0px' }).observe(host);
    systems.push(sys);
  }

  function startLoop() { if (!loopOn) { loopOn = true; last = performance.now(); W.requestAnimationFrame(loop); } }
  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    var any = false;
    if (!D.hidden) {
      systems.forEach(function (s) { if (s.on) { any = true; step(s, dt, t / 1000); } });
    } else { any = systems.some(function (s) { return s.on; }); }
    if (any) W.requestAnimationFrame(loop); else loopOn = false;
  }
  function step(s, dt, now) {
    var c = s.ctx; c.clearRect(0, 0, s.w, s.h);
    for (var i = 0; i < s.p.length; i++) {
      var p = s.p[i];
      if (s.kind === 'petal') {
        p.ph += dt * p.sw; p.rot += dt * p.vr;
        p.x += (p.vx + Math.sin(p.ph) * 22) * dt; p.y += p.vy * dt;
        if (p.y > s.h + 30 || p.x < -40 || p.x > s.w + 40) s.spawn(p, false);
        var sx = Math.abs(Math.cos(p.ph * 1.3)) * 0.8 + 0.2;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(sx, 1);
        c.fillStyle = p.c + p.a + ')';
        c.beginPath(); c.moveTo(0, -p.s);
        c.bezierCurveTo(p.s * .9, -p.s * .6, p.s * .75, p.s * .55, 0, p.s);
        c.bezierCurveTo(-p.s * .75, p.s * .55, -p.s * .9, -p.s * .6, 0, -p.s);
        c.fill(); c.restore();
      } else {
        p.ph += dt * p.sw;
        p.x += (p.vx + Math.sin(p.ph) * 6) * dt; p.y += p.vy * dt;
        if (p.y < -20) s.spawn(p, false);
        var tw = 0.5 + 0.5 * Math.sin(now * p.sw * 2 + p.ph);
        c.globalAlpha = p.a * (0.35 + 0.65 * tw);
        var r = p.s * 5.5;
        c.drawImage(s.sprite, p.x - r, p.y - r, r * 2, r * 2);
      }
    }
    c.globalAlpha = 1;
  }
})();
