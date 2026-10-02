// Пролёт по AI-видео: кадры меняются при прокрутке секции .flight
(function () {
  var sec = document.querySelector('.flight');
  if (!sec) return;
  var cv = sec.querySelector('canvas'), ctx = cv.getContext('2d');
  var mobile = innerWidth < 768;
  var n = +(mobile ? sec.dataset.nm : sec.dataset.nd);
  var dir = mobile ? sec.dataset.pm : sec.dataset.pd;
  var imgs = new Array(n), cur = -1, want = 0, started = false;
  var caps = [].slice.call(sec.querySelectorAll('.cap'));

  var FV = sec.dataset.fv || '2k';
  function name(i) { return dir + ('00' + (i + 1)).slice(-3) + '.webp?v=' + FV; }
  function load(i) {
    if (imgs[i]) return;
    var im = new Image(); im.decoding = 'async'; im.src = name(i);
    // кадр считается готовым только после decode() — без подвисаний при первой отрисовке
    im.onload = function () {
      var fin = function () { im._ok = true; if (Math.abs(i - want) < 4) draw(want, true); };
      if (im.decode) im.decode().then(fin, fin); else fin();
    };
    imgs[i] = im;
  }
  function start() {
    if (started) return; started = true;
    var order = [], seen = {};
    [12, 6, 3, 1].forEach(function (step) { for (var i = 0; i < n; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); } });
    var k = 0;
    (function pump() {
      for (var j = 0; j < 6 && k < order.length; j++, k++) load(order[k]);
      if (k < order.length) setTimeout(pump, 50);
    })();
  }
  function ready(im) { return im && im._ok && im.naturalWidth; }
  function nearest(i) {
    for (var d = 0; d < n; d++) {
      if (ready(imgs[i - d])) return imgs[i - d];
      if (ready(imgs[i + d])) return imgs[i + d];
    }
  }
  function draw(i, force) {
    if (i === cur && !force) return;
    var im = nearest(i); if (!im) return;
    cur = i;
    var s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
  }
  function size() {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
    cur = -1; draw(want, true);
  }
  function onScroll() {
    var r = sec.getBoundingClientRect();
    // грузим заранее, пока гость смотрит кейсы — иначе при быстрой прокрутке кадры «прыгают»
    if (r.top < innerHeight * 7) start();
    var p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
    tgt = p * (n - 1); want = Math.round(tgt); glide();
    caps.forEach(function (c, idx) {
      var a = idx / caps.length, b = (idx + 1) / caps.length;
      c.classList.toggle('on', p >= a + 0.03 && p < b - 0.03);
    });
    sec.style.setProperty('--p', p.toFixed(4));
  }
  // Плавный переход между кадрами: позиция догоняет цель, а не прыгает по шагам колеса
  var tgt = 0, pos = null, gRaf = 0, gT = 0;
  function glide() { if (!gRaf) gRaf = requestAnimationFrame(gstep); }
  function gstep(now) {
    gRaf = 0;
    var dt = gT ? Math.min(64, now - gT) : 16;
    if (pos === null || Math.abs(tgt - pos) > n * 0.5) pos = tgt;
    else pos += (tgt - pos) * (1 - Math.exp(-dt / 90));
    if (Math.abs(tgt - pos) < 0.05) pos = tgt;
    draw(Math.round(pos));
    if (pos !== tgt) { gT = now; gRaf = requestAnimationFrame(gstep); } else gT = 0;
  }

  var ticking = false;
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }, { passive: true });
  addEventListener('resize', size);
  load(0); size(); onScroll();
})();
