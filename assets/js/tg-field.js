/* Поле «Ник в Telegram» во всех формах заявок navseg-da.agency (Денис, 26.10.2026: «чтобы мы сразу могли им писать в ТГ»).
   1) В каждую форму с полем контакта/телефона добавляет поле tg (копия поля контакта — тот же стиль).
   2) Перехватывает отправку на /site-lead: кладёт tg в заявку и дописывает «Telegram: @ник» в сообщение —
      оно попадает в примечание сделки amoCRM и в уведомление в Telegram (там @ник кликабельный). */
/* 28.10.2026: плашка «Откуда вы о нас узнали?» (Threads, Instagram, Авито…) → поле «Источник» в amoCRM.
   Первый заход по ссылке (utm_source или сайт-источник, например threads.net) запоминается на 90 дней и выбирает плашку сам. */
(function () {
  if (window.__nsgTg) return; window.__nsgTg = 1;
  var lastTg = '', lastAt = 0, lastHeard = '';
  var HEARD = ['Threads', 'Instagram', 'Авито', 'Яндекс / Google', 'Рекомендация', 'Другое'];

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch (x) {} return ''; }
  // откуда пришли впервые: utm_source или чужой сайт в referrer
  (function firstTouch() {
    var src = '';
    try { src = new URLSearchParams(location.search).get('utm_source') || ''; } catch (x) {}
    if (!src && document.referrer) {
      try { var h = new URL(document.referrer).hostname.replace(/^www\./, ''); if (!/navseg-da\.agency$/.test(h)) src = h; } catch (x) {}
    }
    var old = ls('nsg-first-src'), at = +ls('nsg-first-src-at') || 0;
    if (src && (!old || Date.now() - at > 90 * 864e5)) { ls('nsg-first-src', src.slice(0, 60)); ls('nsg-first-src-at', String(Date.now())); }
  })();
  function firstSrc() { return ls('nsg-first-src'); }
  function guess() {
    var s = firstSrc().toLowerCase();
    if (/threads/.test(s)) return 'Threads';
    if (/instagram/.test(s)) return 'Instagram';
    if (/avito/.test(s)) return 'Авито';
    if (/yandex|google|bing/.test(s)) return 'Яндекс / Google';
    return '';
  }

  function heardBox(form, after) {
    if (form.querySelector('.nsg-heard') || form.querySelector('[name="heard"],[name="how_found"]')) return;
    var box = document.createElement('div');
    box.className = 'nsg-heard';
    box.style.cssText = 'margin:10px 0 12px;text-align:left';
    var ref = after.tagName === 'INPUT' ? after : after.querySelector && after.querySelector('input');
    if (ref) { var cs = getComputedStyle(ref); box.style.fontFamily = cs.fontFamily; box.style.color = cs.color; }
    var cur = guess();
    box.innerHTML = '<div style="font-size:13px;opacity:.75;margin-bottom:6px">Откуда вы о нас узнали?</div><input type="hidden" name="heard" value="' + cur + '"><div style="display:flex;flex-wrap:wrap;gap:6px">' +
      HEARD.map(function (h) { return '<button type="button" data-heard="' + h + '" aria-pressed="' + (h === cur) + '" style="font:inherit;font-size:13px;line-height:1;padding:7px 11px;border-radius:999px;cursor:pointer;border:1px solid currentColor;background:' + (h === cur ? 'rgba(186,138,72,.35)' : 'transparent') + ';color:inherit;opacity:' + (h === cur ? '1' : '.7') + '">' + h + '</button>'; }).join('') + '</div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-heard]'); if (!b) return;
      e.preventDefault();
      box.querySelector('[name="heard"]').value = b.getAttribute('data-heard');
      [].forEach.call(box.querySelectorAll('[data-heard]'), function (x) { var on = x === b; x.setAttribute('aria-pressed', on); x.style.background = on ? 'rgba(186,138,72,.35)' : 'transparent'; x.style.opacity = on ? '1' : '.7'; });
    });
    after.parentNode.insertBefore(box, after.nextSibling);
  }

  function norm(v) {
    v = String(v || '').trim();
    if (!v) return '';
    v = v.replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, '').replace(/^@+/, '').replace(/[^A-Za-z0-9_]/g, '');
    return v.length >= 3 ? '@' + v : '';
  }

  function enhance(form) {
    if (!form || form.__nsgTg || form.querySelector('[name="tg"],[name="telegram"]')) return;
    var c = form.querySelector('input[name="contact"],input[name="phone"],input[type="tel"]');
    if (!c) return;
    form.__nsgTg = 1;
    var src = c, wrap = c.parentElement;
    if (wrap && wrap !== form && wrap.querySelectorAll('input,textarea,select').length === 1) src = wrap;
    var clone = src.cloneNode(true);
    var inp = clone.tagName === 'INPUT' ? clone : clone.querySelector('input');
    if (!inp) return;
    ['required', 'pattern', 'minlength', 'maxlength', 'id', 'value', 'data-mask'].forEach(function (a) { inp.removeAttribute(a); });
    inp.name = 'tg'; inp.type = 'text'; inp.value = '';
    inp.setAttribute('inputmode', 'text'); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('spellcheck', 'false'); inp.setAttribute('maxlength', '64');
    inp.placeholder = '@ник в Telegram — необязательно';
    inp.setAttribute('aria-label', 'Ник в Telegram (необязательно)');
    [].forEach.call(clone.querySelectorAll('label'), function (l) { l.removeAttribute('for'); });
    [].forEach.call(clone.querySelectorAll('label,span,.label,legend,p,b'), function (l) {
      if (l.children.length) return;
      if (l.tagName === 'LABEL' || /телефон|контакт|мессендж|whatsapp|номер|связ/i.test(l.textContent)) l.textContent = 'Ник в Telegram';
    });
    [].forEach.call(clone.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
    [].forEach.call(clone.querySelectorAll('.error,.err,.hint,small'), function (el) { if (el !== inp) el.textContent = ''; });
    src.parentNode.insertBefore(clone, src.nextSibling);
    heardBox(form, clone);
  }

  // Tilda Zero-блок: у формы фиксированная высота, а соседние тексты стоят по координатам.
  // Наши поля делают форму выше - сдвигаем то, на что она наезжает, ниже формы и растим блок.
  function fixZero() {
    [].forEach.call(document.querySelectorAll('.t396__artboard form'), function (form) {
      var el = form.closest('.t396__elem'), ab = form.closest('.t396__artboard');
      if (!el || !ab || !form.offsetParent) return;
      var f = form.getBoundingClientRect(), fb = f.bottom;   // у формы Tilda высота фиксированная - низ считаем по содержимому
      [].forEach.call(form.querySelectorAll('input,button,textarea,select,label,.t-submit,.nsg-heard'), function (c) { var cr = c.getBoundingClientRect(); if (cr.height) fb = Math.max(fb, cr.bottom); });
      var blocks = [{top: f.top + 40, bottom: fb, left: f.left, right: f.right}];
      var els = [].filter.call(ab.querySelectorAll('.t396__elem'), function (x) { return x !== el && !x.contains(form) && !el.contains(x) && x.offsetHeight; })
        .map(function (x) { return {x: x, r: x.getBoundingClientRect()}; }).sort(function (a, b) { return a.r.top - b.r.top; });
      els.forEach(function (o) {   // по цепочке: что сдвинули, то тоже сдвигает нижних соседей
        var r = {top: o.r.top, bottom: o.r.bottom, left: o.r.left, right: o.r.right}, shift = 0;
        blocks.forEach(function (bl) {
          if (r.left < bl.right && r.right > bl.left && r.top + shift < bl.bottom && r.bottom + shift > bl.top) shift = bl.bottom - r.top + 14;
        });
        if (shift > 0) { o.x.style.top = (o.x.offsetTop + shift) + 'px'; blocks.push({top: r.top + shift, bottom: r.bottom + shift, left: r.left, right: r.right}); }
      });
      var maxB = 0;
      [].forEach.call(ab.querySelectorAll('.t396__elem'), function (x) { if (x.offsetHeight) maxB = Math.max(maxB, x.offsetTop + Math.max(x.offsetHeight, x === el ? form.offsetHeight : 0)); });
      if (maxB + 24 > ab.offsetHeight) {
        var h = (maxB + 24) + 'px';
        ab.style.height = h;
        [].forEach.call(ab.querySelectorAll('.t396__carrier,.t396__filter'), function (c) { c.style.height = h; });
      }
    });
  }
  var fzT;
  function fixZeroSoon() { clearTimeout(fzT); fzT = setTimeout(fixZero, 350); }
  window.addEventListener('resize', fixZeroSoon);
  window.addEventListener('load', function () { fixZeroSoon(); setTimeout(fixZero, 1500); setTimeout(fixZero, 3500); });

  function scan(root) { [].forEach.call((root || document).querySelectorAll('form'), enhance); fixZeroSoon(); }

  function remember(form) {
    if (!form) return;
    var t = form.querySelector('[name="tg"]'), h = form.querySelector('[name="heard"]');
    if (t) lastTg = norm(t.value);
    lastHeard = h ? h.value : '';
    lastAt = Date.now();
  }
  document.addEventListener('submit', function (e) { remember(e.target); }, true);
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button,[type="submit"]');
    if (b && b.form) remember(b.form); else if (b) remember(b.closest('form'));
  }, true);

  var of = window.fetch;
  if (of) window.fetch = function (u, o) {
    try {
      if (String(u).indexOf('site-lead') > -1 && o && typeof o.body === 'string') {
        var b = JSON.parse(o.body), fresh = Date.now() - lastAt < 60000;
        if (b && typeof b === 'object') {
          if (lastTg && fresh) {
            b.tg = lastTg;
            if (String(b.message || '').indexOf(lastTg) < 0) b.message = (b.message ? b.message + '\n' : '') + 'Telegram: ' + lastTg;
            if (!b.contact && !b.phone) b.contact = lastTg;
          }
          if (lastHeard && fresh && !b.heard) b.heard = lastHeard;
          if (firstSrc() && !b.first_src) b.first_src = firstSrc();
          if (!b.utm_source) { try { var us = new URLSearchParams(location.search).get('utm_source'); if (us) b.utm_source = us; } catch (x) {} }
          o = Object.assign({}, o, { body: JSON.stringify(b) });
        }
      }
    } catch (x) {}
    return of.call(this, u, o);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); }); else scan();
  // формы, которые появляются позже (модальные окна, шторки)
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) { if (n.tagName === 'FORM') enhance(n); else if (n.querySelector) scan(n); } }); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
