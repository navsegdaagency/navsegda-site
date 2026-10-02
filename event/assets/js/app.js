/* НАВСЕГДА · interactions (vanilla, no deps) */
(function () {
  'use strict';
  var d = document, html = d.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  html.classList.remove('no-js'); html.classList.add('js');
  if (fine) html.classList.add('pf');
  if (window.chrome) html.classList.add('cr');
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function onFrame(fn) { var t = 0; return function () { if (!t) t = requestAnimationFrame(function () { t = 0; fn(); }); }; }
  function loaded() { html.classList.add('loaded'); }
  addEventListener('load', loaded); setTimeout(loaded, 1200);

  /* refraction map for Chromium liquid glass */
  var lm = d.getElementById('lg-map');
  if (lm && window.chrome) {
    try {
      var cv = d.createElement('canvas'); cv.width = cv.height = 64;
      var g = cv.getContext('2d'), im = g.createImageData(64, 64);
      for (var y = 0; y < 64; y++) for (var x = 0; x < 64; x++) {
        var u = x / 63 - .5, v = y / 63 - .5, ed = Math.max(0, Math.hypot(u, v) * 2 - .7) / .3, i = (y * 64 + x) * 4;
        im.data[i] = 128 + u * 255 * ed; im.data[i + 1] = 128 + v * 255 * ed; im.data[i + 2] = 128; im.data[i + 3] = 255;
      }
      g.putImageData(im, 0, 0); lm.setAttribute('href', cv.toDataURL());
    } catch (e) { html.classList.remove('cr'); }
  }

  /* header capsule + mobile tab bar */
  var hd = d.querySelector('.hd'), tab = d.querySelector('.tabbar'), tcta = d.querySelector('.tab-cta'), req = d.getElementById('zayavka'), hint = d.querySelector('.scrollhint'), lastY = scrollY;
  var railFt = $$('.rail-ft'), hsCtl = $$('.hs-ctl'), tabH = parseFloat(getComputedStyle(html).getPropertyValue('--tab-h')) || 62;
  function onScroll() {
    var y = scrollY;
    if (hd) hd.classList.toggle('s', y > 200);
    if (hint) hint.classList.toggle('gone', y > 60);
    if (!tab) return;
    var nearForm = false;
    if (req) { var rr = req.getBoundingClientRect(); nearForm = rr.top < innerHeight * .8 && rr.bottom > 80; }
    var nearCtl = railFt.some(function (f) { var r = f.getBoundingClientRect(); return r.bottom > innerHeight - 120 && r.top < innerHeight; });
    /* case strip: hide the tab bar only while the strip really crosses its full-height slot (offsetTop ignores the hide transform) */
    if (!nearCtl && hsCtl.length) {
      var slot = tab.offsetTop + tab.offsetHeight - tabH - 8;
      nearCtl = hsCtl.some(function (f) { var r = f.getBoundingClientRect(); return r.height > 0 && r.bottom > slot && r.top < innerHeight; });
    }
    /* низкий экран (телефон лёжа): ряд кейсов без закрепления занимает всю высоту - таб-бар прячем, пока ряд на экране */
    if (!nearCtl && innerHeight < 520) nearCtl = $$('.hs:not(.on) .hs-vp').some(function (f) { var r = f.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight - 40; });
    var show = y > innerHeight * .35 && !nearForm && !nearCtl;
    tab.classList.toggle('on', show); if (tcta) tcta.classList.toggle('on', show);
    if (Math.abs(y - lastY) > 8) {
      var mini = y > lastY && y > 300;
      tab.classList.toggle('mini', mini); if (tcta) tcta.classList.toggle('mini', mini); lastY = y;
      clearTimeout(tab._t); tab._t = setTimeout(function () { tab.classList.remove('mini'); if (tcta) tcta.classList.remove('mini'); }, 1100);
    }
  }
  addEventListener('scroll', onFrame(onScroll), { passive: true }); onScroll();

  var nav = d.querySelector('.nav'), ind = nav && nav.querySelector('.ind');
  if (ind) {
    var cur = nav.querySelector('[aria-current]');
    var moveTo = function (a) {
      if (!a) { ind.style.opacity = '0'; return; }
      ind.style.width = a.offsetWidth + 'px'; ind.style.transform = 'translateX(' + a.offsetLeft + 'px)'; ind.style.opacity = '1';
    };
    $$('a', nav).forEach(function (a) {
      a.addEventListener('mouseenter', function () { moveTo(a); }); a.addEventListener('focus', function () { moveTo(a); });
    });
    nav.addEventListener('mouseleave', function () { moveTo(cur); });
    moveTo(cur); if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { moveTo(cur); });
  }

  /* sheet menu */
  var sheet = d.getElementById('sheet'), scrim = d.querySelector('.scrim'), bg = d.querySelector('.burger');
  function menu(open) {
    html.classList.toggle('menu-open', open);
    if (bg) bg.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (sheet) { if (open) sheet.removeAttribute('inert'); else sheet.setAttribute('inert', ''); sheet.style.transform = ''; }
  }
  if (bg) bg.addEventListener('click', function () { menu(!html.classList.contains('menu-open')); });
  if (scrim) scrim.addEventListener('click', function () { menu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && html.classList.contains('menu-open')) menu(false); });
  if (sheet) {
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
    var sy = null, dy = 0;
    sheet.addEventListener('pointerdown', function (e) { sy = e.clientY; dy = 0; });
    addEventListener('pointermove', function (e) {
      if (sy === null) return; dy = Math.max(0, e.clientY - sy);
      if (dy > 4) { sheet.classList.add('drag'); sheet.style.transform = 'translateY(' + dy + 'px)'; }
    });
    var up = function () { if (sy === null) return; sy = null; sheet.classList.remove('drag'); if (dy > 80) menu(false); else sheet.style.transform = ''; };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }

  /* reveal + count-up (scroll check, periodic failsafe) */
  var rvs = $$('.rv'), counters = [];
  var RX = /^(\d[\d\s ]*\d|\d)(,\d+)?(.*)$/;
  function fmt(v, dec) { var s = v.toFixed(dec).split('.'); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (s[1] ? ',' + s[1] : ''); }
  $$('[data-count]').forEach(function (n) {
    var raw = n.getAttribute('data-count'), m = raw.match(RX);
    if (!m || reduce) return;
    n._c = { t: parseFloat(m[1].replace(/[\s ]/g, '') + (m[2] ? '.' + m[2].slice(1) : '')), dec: m[2] ? m[2].length - 1 : 0, suf: m[3], raw: raw.replace(/(\d) (?=\d)/g, '$1 '), hz: !!n.closest('.hs') };
    n.textContent = fmt(0, n._c.dec) + n._c.suf;
    counters.push(n);
  });
  function countUp(n) {
    var c = n._c, t0 = performance.now(), dur = c.t > 50 ? 1400 : 1000, fin = false;
    setTimeout(function () { fin = true; n.textContent = c.raw; }, dur + 250);
    (function f(t) {
      if (fin) return;
      var p = Math.min(1, Math.max(0, (t - t0) / dur)), ez = 1 - Math.pow(1 - p, 3); /* first rAF stamp can precede t0 */
      n.textContent = p < 1 ? fmt(c.t * ez, c.dec) + c.suf : c.raw;
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  function reveal(el) {
    el.classList.add('in');
    var i = parseFloat(el.style.getPropertyValue('--i')) || 0;
    setTimeout(function () { el.classList.add('done'); }, 1000 + i * 70);
  }
  function check() {
    var h = innerHeight;
    if (rvs.length) rvs = rvs.filter(function (el) { if (el.getBoundingClientRect().top < h * .9) { reveal(el); return false; } return true; });
    if (counters.length) counters = counters.filter(function (n) {
      var r = n.getBoundingClientRect();
      if (n._c.hz && (r.right < -innerWidth || r.left > innerWidth * 2)) return true; /* horizontal case track: count when the card slides in */
      if (r.top < h * .92) { countUp(n); return false; } return true;
    });
  }
  addEventListener('scroll', onFrame(check), { passive: true }); addEventListener('resize', onFrame(check));
  check();
  var iv = setInterval(function () { check(); if (!rvs.length && !counters.length) clearInterval(iv); }, 700);

  /* specular light, tilt, magnetic buttons (fine pointer only) */
  if (fine && !reduce) {
    var pev = null, last = null;
    var spec = onFrame(function () {
      var e = pev; if (!e || !e.target || !e.target.closest) return;
      var t = e.target.closest('[data-spec]');
      if (last && last !== t) { last.style.setProperty('--spec', '0'); last.style.removeProperty('--rx'); last.style.removeProperty('--ry'); }
      last = t; if (!t) return;
      var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      t.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); t.style.setProperty('--my', (y * 100).toFixed(1) + '%'); t.style.setProperty('--spec', '1');
      if (t.classList.contains('tilt') && t.classList.contains('done')) {
        t.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg'); t.style.setProperty('--rx', ((.5 - y) * 5).toFixed(2) + 'deg');
      }
    });
    addEventListener('pointermove', function (e) { pev = e; spec(); }, { passive: true });
    d.addEventListener('mouseleave', function () { if (last) { last.style.setProperty('--spec', '0'); last.style.removeProperty('--rx'); last.style.removeProperty('--ry'); last = null; } });

    var mags = $$('.mag'), mx = 0, my = 0;
    var mag = onFrame(function () {
      mags.forEach(function (b) {
        var r = b.getBoundingClientRect(); if (!r.width || r.bottom < -100 || r.top > innerHeight + 100) return;
        var gx = parseFloat(b.style.getPropertyValue('--gx')) || 0, gy = parseFloat(b.style.getPropertyValue('--gy')) || 0;
        var dx = mx - (r.left + r.width / 2 - gx), dy = my - (r.top + r.height / 2 - gy);
        var ox = Math.max(0, Math.abs(dx) - r.width / 2), oy = Math.max(0, Math.abs(dy) - r.height / 2);
        if (Math.hypot(ox, oy) < 70) {
          b.style.setProperty('--gx', clamp(dx * .22, -10, 10).toFixed(1) + 'px'); b.style.setProperty('--gy', clamp(dy * .3, -8, 8).toFixed(1) + 'px'); b._m = 1;
        } else if (b._m) { b._m = 0; b.style.setProperty('--gx', '0px'); b.style.setProperty('--gy', '0px'); }
      });
    });
    if (mags.length) addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; mag(); }, { passive: true });
  }

  /* cases coverflow rail */
  $$('.cases').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail'); if (!rail) return;
    var cards = $$('.cc', rail), sec = wrap.closest('section'), prev = sec && sec.previousElementSibling;
    var nav = (sec && sec.querySelector('.rail-nav')) || (prev && prev.querySelector('.rail-nav'));
    var cnt = nav && nav.querySelector('.cnt b'), dots = $$('.dots button', wrap), amb = $$('.amb i', wrap), ai = 0, active = null, inView = false;
    function center(c) { return c.offsetLeft + c.offsetWidth / 2 - rail.scrollLeft - rail.clientWidth / 2; }
    function play() {
      if (!active) return;
      var v = active.querySelector('video');
      $$('video', rail).forEach(function (o) { if (o !== v && !o.paused) o.pause(); });
      if (!v || reduce || (navigator.connection && navigator.connection.saveData)) return;
      if (inView) {
        if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else v.pause();
    }
    function setActive(c) {
      if (active === c) return;
      if (active) active.classList.remove('is-active');
      active = c; c.classList.add('is-active');
      var i = cards.indexOf(c);
      if (cnt) cnt.textContent = i + 1;
      dots.forEach(function (b, j) { if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      if (amb.length === 2) {
        ai = 1 - ai; var el = amb[ai];
        el.style.backgroundImage = c.dataset.amb ? 'url("' + c.dataset.amb + '")' : 'radial-gradient(closest-side,rgba(255,255,255,.8),rgba(255,255,255,0))';
        el.classList.add('on'); amb[1 - ai].classList.remove('on');
      }
      play();
    }
    function depth() {
      var step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : rail.clientWidth, best = null, bd = 1e9;
      cards.forEach(function (c) {
        var dist = center(c), dd = reduce ? 0 : clamp(dist / step, -1.6, 1.6);
        c.style.setProperty('--d', dd.toFixed(3)); c.style.setProperty('--ad', Math.min(1, Math.abs(dd)).toFixed(3));
        c.style.zIndex = String(100 - Math.round(Math.abs(dd) * 40));
        if (Math.abs(dist) < bd) { bd = Math.abs(dist); best = c; }
      });
      if (best) setActive(best);
    }
    function go(i) {
      var c = cards[clamp(i, 0, cards.length - 1)];
      rail.scrollTo({ left: rail.scrollLeft + center(c), behavior: reduce ? 'auto' : 'smooth' });
    }
    var st = cards[+wrap.dataset.start || 0];
    if (st) rail.scrollLeft = st.offsetLeft + st.offsetWidth / 2 - rail.clientWidth / 2;
    rail.addEventListener('scroll', onFrame(depth), { passive: true });
    addEventListener('resize', onFrame(depth));
    depth();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; play(); }, { threshold: .3 }).observe(rail);
    else { inView = true; play(); }

    var down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', function (e) {
      if (!down) return; var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; rail.classList.add('drag'); }
      if (moved) rail.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', function () {
      if (!down) return; down = false;
      if (moved) { go(cards.indexOf(active)); setTimeout(function () { rail.classList.remove('drag'); }, 480); }
    });
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    rail.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
      var c = e.target.closest('.cc'); if (c && c !== active) { e.preventDefault(); go(cards.indexOf(c)); }
    }, true);
    if (nav) $$('button', nav).forEach(function (b) { b.addEventListener('click', function () { go(cards.indexOf(active) + (b.dataset.dir === 'next' ? 1 : -1)); }); });
    dots.forEach(function (b, j) { b.addEventListener('click', function () { go(j); }); });
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(cards.indexOf(active) + (e.key === 'ArrowRight' ? 1 : -1)); }
    });
  });

  /* process timeline progress */
  $$('.proc').forEach(function (p) {
    var steps = $$('.ps', p), n = steps.length;
    var upd = function () {
      var r = p.getBoundingClientRect(), v = reduce ? 1 : clamp((innerHeight * .78 - r.top) / Math.max(r.height, innerHeight * .45), 0, 1);
      p.style.setProperty('--p', v.toFixed(3));
      steps.forEach(function (s, i) { s.classList.toggle('lit', v >= i / n + .03 || v > .995); });
    };
    addEventListener('scroll', onFrame(upd), { passive: true }); addEventListener('resize', onFrame(upd)); upd();
  });

  /* form: segmented format, stepper, floating labels, submit */
  $$('form.form').forEach(function (f) {
    var msg = f.querySelector('.form-msg'), sel = f.querySelector('select'), seg = f.querySelector('.seg');
    if (seg && sel) {
      var bs = $$('button', seg);
      var pick = function (b, smooth) {
        bs.forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        sel.value = b.dataset.v;
        seg.scrollTo({ left: b.offsetLeft - (seg.clientWidth - b.offsetWidth) / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' });
      };
      bs.forEach(function (b) {
        b.addEventListener('click', function () { pick(b, true); });
        if (b.getAttribute('aria-checked') === 'true') setTimeout(function () { pick(b, false); }, 60);
      });
      seg.addEventListener('keydown', function (e) {
        var i = bs.indexOf(d.activeElement); if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
        e.preventDefault(); var nb = bs[clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, bs.length - 1)]; nb.focus(); pick(nb, true);
      });
    }
    $$('.row input', f).forEach(function (inp) {
      var row = inp.closest('.row');
      var u = function () { row.classList.toggle('filled', !!inp.value); if (inp.value) row.classList.remove('err'); };
      inp.addEventListener('input', u); inp.addEventListener('change', u); u(); setTimeout(u, 800);
    });
    var guests = f.querySelector('[name=guests]');
    $$('.stp button', f).forEach(function (b) {
      var t1 = 0, t2 = 0;
      var step = function () {
        var v = parseInt((guests.value || '').replace(/\D/g, ''), 10) || 0;
        guests.value = Math.max(10, Math.round((v + +b.dataset.d) / 10) * 10); guests.dispatchEvent(new Event('input'));
      };
      var stop = function () { clearTimeout(t1); clearInterval(t2); };
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); step(); t1 = setTimeout(function () { t2 = setInterval(step, 110); }, 420); });
      b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
      b.addEventListener('click', function (e) { if (e.detail === 0) step(); });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var ok = true;
      $$('[required]', f).forEach(function (el) {
        var bad = !el.value.trim() || (el.name === 'contact' && el.value.replace(/[^\d@a-z_]/gi, '').length < 5), row = el.closest('.row');
        if (!row) return; row.classList.remove('err');
        if (bad) { void row.offsetWidth; row.classList.add('err'); ok = false; }
      });
      if (!ok) { msg.textContent = 'Заполните отмеченные поля'; return; }
      msg.textContent = '';
      var btn = f.querySelector('button[type=submit]'), lab = btn.querySelector('span');
      btn.disabled = true; lab.textContent = 'Отправляем';
      // Обработчик заявок: /lead.php этого сайта или внешний (window.NSG_LEAD_URL из config.js) — тогда JSON
      var url = window.NSG_LEAD_URL || f.action, opts = { method: 'POST', headers: { 'Accept': 'application/json' } };
      if (window.NSG_LEAD_URL) {
        var o = {}; new FormData(f).forEach(function (v, k) { o[k] = v; });
        o.form = o.form || 'corp-' + (location.pathname.split('/').filter(Boolean).join('-') || 'main');
        o.page = location.href;
        opts.body = JSON.stringify(o); opts.headers['Content-Type'] = 'application/json';
      } else opts.body = new FormData(f);
      fetch(url, opts)
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!(j && j.ok)) throw 0;
          f.classList.add('out'); setTimeout(function () { f.classList.add('sent'); }, reduce ? 0 : 280);
          if (window.ym && window.YM_ID) ym(window.YM_ID, 'reachGoal', 'lead');
        })
        .catch(function () { msg.innerHTML = 'Не получилось отправить. Напишите нам в <a href="https://t.me/navsegda_agency">Telegram</a> или позвоните <a href="tel:+79585410041">+7 (958) 541-00-41</a>'; })
        .finally(function () { btn.disabled = false; lab.textContent = 'Рассчитать мероприятие'; });
    });
  });

  /* gallery lightbox on native dialog */
  var lb = d.querySelector('.lb'), gal = d.querySelector('.gal');
  if (lb && gal && typeof lb.showModal === 'function') {
    var ims = $$('img', gal), li = lb.querySelector('img'), lc = lb.querySelector('.lb-c'), idx = 0, lsx = null;
    var show = function (i) { idx = (i + ims.length) % ims.length; var s = ims[idx]; li.src = s.currentSrc || s.src; li.alt = s.alt; if (lc) lc.textContent = (idx + 1) + ' / ' + ims.length; };
    var open = function (i) { show(i); lb.showModal(); requestAnimationFrame(function () { requestAnimationFrame(function () { lb.classList.add('in'); }); }); };
    var close = function () { lb.classList.remove('in'); setTimeout(function () { if (lb.open) lb.close(); }, reduce ? 0 : 220); };
    ims.forEach(function (im, i) {
      im.tabIndex = 0;
      im.addEventListener('click', function () { open(i); });
      im.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    lb.querySelector('.lb-x').addEventListener('click', close);
    $$('.lb-n button', lb).forEach(function (b) { b.addEventListener('click', function () { show(idx + +b.dataset.dir); }); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    lb.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1); });
    lb.addEventListener('pointerdown', function (e) { lsx = e.clientX; });
    lb.addEventListener('pointerup', function (e) { if (lsx === null) return; var dx = e.clientX - lsx; lsx = null; if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1)); });
  }

  /* case reel: play overlay */
  $$('.reel-wrap').forEach(function (w) {
    var v = w.querySelector('video'), b = w.querySelector('.play'); if (!v) return;
    if (b) b.addEventListener('click', function () { v.muted = false; var p = v.play(); if (p && p.catch) p.catch(function () {}); });
    v.addEventListener('play', function () { w.classList.add('playing'); });
  });

  /* цели Метрики: звонок и Telegram */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]'); if (!a || !window.ym || !window.YM_ID) return;
    var h = a.getAttribute('href');
    if (h.indexOf('tel:') === 0) ym(window.YM_ID, 'reachGoal', 'phone');
    else if (h.indexOf('t.me/') > -1) ym(window.YM_ID, 'reachGoal', 'telegram');
  });
})();

/* плавающие WhatsApp / Telegram: прячем у формы заявки и у подвала, где те же контакты уже на экране */
(function () {
  var fab = document.querySelector('.fab-stack');
  if (!fab || !('IntersectionObserver' in window)) return;
  var seen = new Set();
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
    fab.classList.toggle('off', seen.size > 0);
  }, { threshold: 0.15 });
  document.querySelectorAll('#zayavka, footer.ft').forEach(function (el) { io.observe(el); });
  fab.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"]');
    if (a && window.ym && window.YM_ID) ym(window.YM_ID, 'reachGoal', 'whatsapp');
  });
})();
