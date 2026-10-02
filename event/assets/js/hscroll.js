// II · Кейсы на главной: вертикальный скролл закреплённой секции двигает ленту карточек вбок,
// фон - кадры AI-видео на canvas. Число кадров и версия кэша приходят из data-атрибутов (media.json -> build.py).
(function () {
  'use strict';
  var sec = document.querySelector('section.hs');
  if (!sec) return;
  var d = document;
  var st = sec.querySelector('.hs-st'), vp = sec.querySelector('.hs-vp'), track = sec.querySelector('.hs-track');
  var cards = [].slice.call(sec.querySelectorAll('.hc')), n = cards.length;
  if (!st || !vp || !track || !n) return;
  var links = cards.map(function (c) { return c.querySelector('h3 a'); });
  var dims = cards.map(function (c) { return c.querySelector('.dim'); });
  var photos = [].slice.call(sec.querySelectorAll('.hc-media img'));
  var cur = sec.querySelector('.hs-cur'), fill = sec.querySelector('.hs-fill'), ticks = [].slice.call(sec.querySelectorAll('.hs-bar s'));
  var cv = sec.querySelector('.hs-cv'), ctx = cv && cv.getContext ? cv.getContext('2d') : null;
  var ND = +sec.dataset.nd || 0, NM = +sec.dataset.nm || 0, VER = sec.dataset.v || '1';
  var hasFrames = !!(ctx && ND && NM);
  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  var MAG = .15;           // магнит: лента притормаживает, когда карточка в центре (на телефоне слабее, см. render)
  var on = false, near = false, active = -1, eager = false;
  var M = { secH: 0, W: 0, H: 0 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------- метрики и высота секции ---------------- */
  function measure() {
    var W = innerWidth, H = innerHeight;
    M.mob = W < 1000;
    M.vpW = track.clientWidth || W;
    M.centers = cards.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; });
    M.cw = cards[0].offsetWidth;
    M.step = n > 1 ? (M.centers[n - 1] - M.centers[0]) / (n - 1) : M.cw;
    if (on) {
      M.stH = st.offsetHeight || H;
      // путь прокрутки на одну карточку: короче = лента едет быстрее
      var per = M.mob ? clamp(M.step * 1.5, H * .56, H * .72) : clamp(M.step * 1.25, H * .5, H * .68);
      M.hold = H * (M.mob ? .08 : .1);
      // на телефоне следующая секция (.flight) наезжает на хвост на TAIL (CSS margin-top) - удлиняем секцию на столько же
      var total = Math.round(M.stH + M.hold * 2 + per * (n - 1) + (M.mob ? H * .3 : 0));
      // мобильная адресная строка меняет innerHeight на ходу - не дёргаем высоту из-за мелочей
      if (!M.secH || W !== M.W || Math.abs(total - M.secH) > 90) { sec.style.height = total + 'px'; M.secH = total; }
      M.range = Math.max(1, sec.offsetHeight - M.stH);
      M.range -= M.mob ? Math.round(H * .3) : 0;
      M.run = Math.max(1, M.range - M.hold * 2);
      M.top = sec.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
    }
    M.W = W; M.H = H;
  }

  /* ---------------- кадры фона ---------------- */
  var FR = { n: 0, dir: '', imgs: [], queue: [], qi: 0, inflight: 0, gen: 0, want: 0, drawn: -1, src: -1, started: false };
  function frameSet() {
    if (!hasFrames) return;
    var portrait = innerHeight > innerWidth * 1.05;
    var cnt = portrait ? NM : ND, dir = portrait ? sec.dataset.pm : sec.dataset.pd;
    if (dir === FR.dir && cnt === FR.n) return;
    FR.gen++; FR.dir = dir; FR.n = cnt; FR.imgs = new Array(cnt); FR.inflight = 0; FR.drawn = -1; FR.src = -1;
    FR.want = clamp(FR.want, 0, cnt - 1);
    // от грубого к точному: первый и последний, затем каждый 8-й, 4-й, 2-й, все
    var order = [0, cnt - 1], seen = {}, step = 1;
    seen[0] = seen[cnt - 1] = 1;
    while (step * 2 <= cnt / 6) step *= 2;
    for (; step >= 1; step /= 2) for (var i = 0; i < cnt; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
    FR.queue = order; FR.qi = 0;
    pump();
  }
  function url(i) { return FR.dir + ('00' + (i + 1)).slice(-3) + '.webp?v=' + encodeURIComponent(VER); }
  function load(i) {
    if (i < 0 || i >= FR.n || FR.imgs[i]) return;
    var im = new Image(), gen = FR.gen, fin = false;
    FR.imgs[i] = im; FR.inflight++;
    function done(ok) {
      if (fin) return; fin = true;
      if (gen !== FR.gen) return;
      FR.inflight--; im._ok = ok && im.naturalWidth > 0;
      if (im._ok && (FR.src < 0 || Math.abs(i - FR.want) < Math.abs(FR.src - FR.want))) draw(FR.want, true);
      pump();
    }
    im.decoding = 'async';
    im.onload = function () { if (im.decode) im.decode().then(function () { done(true); }, function () { done(true); }); else done(true); };
    im.onerror = function () { done(false); };
    im.src = url(i);
  }
  function pump() {
    if (!hasFrames || !FR.started || !near) return;           // далеко от секции - не качаем
    if (FR.inflight < 4) load(FR.want);                         // сначала кадр, который нужен прямо сейчас
    while (FR.inflight < 4 && FR.qi < FR.queue.length) load(FR.queue[FR.qi++]);
  }
  function ok(im) { return im && im._ok; }
  function draw(i, force) {
    if (!hasFrames || !FR.n) return;
    i = clamp(i, 0, FR.n - 1); FR.want = i;
    if (i === FR.drawn && !force) return;
    var idx = -1;
    for (var k = 0; k < FR.n; k++) {
      if (ok(FR.imgs[i - k])) { idx = i - k; break; }
      if (ok(FR.imgs[i + k])) { idx = i + k; break; }
    }
    if (idx < 0) return;
    FR.drawn = i;
    if (idx === FR.src && !force) return;
    FR.src = idx;
    var im = FR.imgs[idx], W = cv.width, H = cv.height;
    if (!W || !H) return;
    var s = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    if (!sec.classList.contains('fr')) sec.classList.add('fr');
  }
  function sizeCanvas() {
    if (!hasFrames || !on) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (w && h && (w !== cv.width || h !== cv.height)) { cv.width = w; cv.height = h; FR.src = -1; FR.drawn = -1; draw(FR.want, true); }
  }

  /* ---------------- счётчик 01 / 05 ---------------- */
  function pad2(k) { return (k < 10 ? '0' : '') + k; }
  function setActive(k) {
    k = clamp(k, 0, n - 1);
    if (k === active) return;
    var prev = active; active = k;
    cards.forEach(function (c, j) { c.classList.toggle('is-c', j === k); });
    ticks.forEach(function (t, j) { t.classList.toggle('on', j <= k); t.classList.toggle('cur', j === k); });
    if (!cur) return;
    if (prev < 0 || rmq.matches) { cur.innerHTML = '<i>' + pad2(k + 1) + '</i>'; return; }
    var up = k > prev, items = cur.querySelectorAll('i');
    for (var j = 0; j < items.length - 1; j++) cur.removeChild(items[j]);
    var old = cur.lastElementChild, ni = d.createElement('i');
    if (old) { old.className = up ? 'out-up' : 'out-dn'; setTimeout(function () { if (old.parentNode === cur && cur.lastElementChild !== old) cur.removeChild(old); }, 450); }
    ni.className = up ? 'in-up' : 'in-dn'; ni.textContent = pad2(k + 1); cur.appendChild(ni);
  }

  /* ---------------- кадр анимации ---------------- */
  function render(s) {
    var pRaw = clamp(s / M.range, 0, 1);
    var t = clamp((s - M.hold) / M.run, 0, 1);
    var u = t * (n - 1), i0 = Math.min(Math.max(n - 2, 0), Math.floor(u)), f = u - i0;
    var mag = M.mob ? .05 : MAG;
    var pos = n > 1 ? i0 + f - mag * Math.sin(2 * Math.PI * f) / (2 * Math.PI) : 0;
    var e = clamp(-s / M.stH, 0, 1);                             // до закрепления лента чуть въезжает справа
    var X = M.vpW / 2 - (M.centers[0] + pos * M.step) + e * e * M.vpW * .16;
    track.style.transform = 'translate3d(' + X.toFixed(1) + 'px,0,0)';
    var R = M.mob ? 10 : 22, S = M.mob ? .06 : .1, P = M.mob ? .8 : .5, persp = M.mob ? 1100 : 1300;
    for (var k = 0; k < n; k++) {
      var c = cards[k], dist = (M.centers[k] + X - M.vpW / 2) / M.step, ad = Math.abs(dist);
      if (ad > 3.5) { if (c._far) continue; c._far = true; } else c._far = false;
      var a1 = Math.min(ad, 1), sc = 1 - a1 * S - Math.max(0, Math.min(ad, 2) - 1) * S * .5;
      var ry = clamp(-dist * R, -R * 1.7, R * 1.7);
      var pull = -(dist > 0 ? 1 : -1) * Math.min(ad, 2) * M.cw * (1 - sc) * P;
      var tr = 'perspective(' + persp + 'px) translate3d(' + pull.toFixed(1) + 'px,0,0) rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      if (tr !== c._tr) { c.style.transform = tr; c._tr = tr; }
      var z = String(20 - Math.round(ad * 4));
      if (z !== c._z) { c.style.zIndex = z; c._z = z; }
      var op = (Math.min(ad, 1.5) * (M.mob ? .34 : .4)).toFixed(3);
      if (dims[k] && op !== dims[k]._op) { dims[k].style.opacity = op; dims[k]._op = op; }
    }
    setActive(Math.round(pos));
    if (fill) fill.style.transform = 'scaleX(' + t.toFixed(4) + ')';
    if (hasFrames) {
      draw(Math.round(pRaw * (FR.n - 1)));
      cv.style.transform = 'translate3d(' + ((.5 - pRaw) * M.vpW * .03).toFixed(1) + 'px,0,0) scale(1.08)';
    }
  }

  var sm = null, raf = 0, lastT = 0;
  function tick(now) {
    raf = 0;
    if (!on) return;
    var tg = -sec.getBoundingClientRect().top;
    var dt = lastT ? Math.min(64, now - lastT) : 16;
    if (sm === null || Math.abs(tg - sm) > M.H * 1.5) sm = tg;
    else sm += (tg - sm) * (1 - Math.exp(-dt / (M.mob ? 230 : (window.__lenis ? 55 : 150))));   // инерция: на телефоне мягче; с Lenis ввод уже сглажен
    if (Math.abs(tg - sm) < .1) sm = tg;
    render(sm);
    if (sm !== tg) { lastT = now; raf = requestAnimationFrame(tick); } else lastT = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  function onScroll() {
    if (!on && eager) return;
    var r = sec.getBoundingClientRect(), H = innerHeight;
    // фото карточек лежат за краем экрана по горизонтали - нативный lazy их не увидит, грузим заранее (в обоих режимах)
    if (!eager && r.top < H * 3.2) { eager = true; photos.forEach(function (im) { if (im.loading === 'lazy') im.loading = 'eager'; }); }
    if (!on) return;
    near = r.top < H * 2 && r.bottom > -H * 1.2;
    if (!near) return;                                           // вне зоны - никакой работы
    if (hasFrames && !FR.started) { FR.started = true; sizeCanvas(); frameSet(); }
    pump(); kick();
  }

  /* ---------------- ряд со scroll-snap (reduced motion) ---------------- */
  function staticUpdate() {
    if (on) return;
    var pos = (track.scrollLeft + M.vpW / 2 - M.centers[0]) / M.step;
    setActive(Math.round(pos));
    if (fill) fill.style.transform = 'scaleX(' + clamp(n > 1 ? pos / (n - 1) : 0, 0, 1).toFixed(4) + ')';
  }

  /* ---------------- фокус и клавиатура ---------------- */
  function go(k) {
    k = clamp(k, 0, n - 1);
    if (on) {
      st.scrollLeft = 0; vp.scrollLeft = 0; track.scrollLeft = 0;
      measure();
      var y = M.top + M.hold + (n > 1 ? k / (n - 1) : 0) * M.run;
      window.scrollTo({ top: Math.round(y), behavior: 'smooth' });
    } else {
      track.scrollTo({ left: M.centers[k] - M.vpW / 2, behavior: rmq.matches ? 'auto' : 'smooth' });
    }
  }
  links.forEach(function (a, k) {
    if (!a) return;
    a.addEventListener('focus', function () {
      var kb = true;
      try { kb = a.matches(':focus-visible'); } catch (err) {}
      if (kb) requestAnimationFrame(function () { go(k); });
    });
  });
  track.addEventListener('keydown', function (ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    var k = links.indexOf(d.activeElement); if (k < 0) return;
    var nk = clamp(k + (ev.key === 'ArrowRight' ? 1 : -1), 0, n - 1);
    ev.preventDefault();
    if (nk !== k) links[nk].focus();
  });

  /* ---------------- режимы ---------------- */
  function wantPin() { return !rmq.matches && innerHeight >= 520; }   // низкий экран (телефон лёжа) - обычный ряд
  function setMode() {
    on = wantPin();
    sec.classList.toggle('on', on);
    // 5 фото карточек: в обоих режимах они за краем по горизонтали, lazy их не подгрузит вовремя
    photos.forEach(function (im) { if (im.loading === 'lazy') im.loading = 'eager'; });
    if (!on) {
      sec.style.height = ''; track.style.transform = '';
      cards.forEach(function (c) { c.style.transform = ''; c.style.zIndex = ''; c._tr = c._z = ''; c._far = false; });
      dims.forEach(function (x) { if (x) { x.style.opacity = ''; x._op = ''; } });
      if (cv) cv.style.transform = '';
      ensurePoster();
    }
    M.secH = 0; sm = null;
    measure();
    if (on) { sizeCanvas(); onScroll(); kick(); } else { staticUpdate(); onScroll(); }
  }
  // статичный фон нужен только ряду без анимации: достаём его из <noscript>, чтобы закреплённый режим его не качал
  function ensurePoster() {
    if (sec.querySelector('.hs-poster')) return;
    var ns = st.querySelector('noscript'); if (!ns) return;
    var box = d.createElement('div'); box.innerHTML = ns.textContent || '';
    var pic = box.querySelector('.hs-poster'); if (pic) st.insertBefore(pic, ns);
  }

  addEventListener('scroll', onScroll, { passive: true });
  track.addEventListener('scroll', function () { if (!on) requestAnimationFrame(staticUpdate); }, { passive: true });
  var rz = 0;
  addEventListener('resize', function () {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(function () {
      if (wantPin() !== on) { setMode(); return; }
      // адресная строка телефона меняет высоту на ходу: при той же ширине не сбрасываем сглаживание, иначе лента дёргается
      var wChanged = innerWidth !== M.W;
      measure();
      if (on) { sizeCanvas(); if (FR.started) frameSet(); if (wChanged) sm = null; onScroll(); kick(); } else staticUpdate();
    });
  });
  if (rmq.addEventListener) rmq.addEventListener('change', setMode); else if (rmq.addListener) rmq.addListener(setMode);
  function remeasure() { measure(); if (on) { sm = null; kick(); } else staticUpdate(); }
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(remeasure);
  addEventListener('load', remeasure);
  setMode();
})();
