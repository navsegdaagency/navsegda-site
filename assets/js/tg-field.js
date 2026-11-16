/* Поле «Ник в Telegram» во всех формах заявок navseg-da.agency (Денис, 26.10.2026: «чтобы мы сразу могли им писать в ТГ»).
   1) В каждую форму с полем контакта/телефона добавляет поле tg (копия поля контакта — тот же стиль).
   2) Перехватывает отправку на /site-lead: кладёт tg в заявку и дописывает «Telegram: @ник» в сообщение —
      оно попадает в примечание сделки amoCRM и в уведомление в Telegram (там @ник кликабельный). */
/* 28.10.2026: плашка «Откуда вы о нас узнали?» (Threads, Instagram, Авито…) → поле «Источник» в amoCRM.
   Первый заход по ссылке (utm_source или сайт-источник, например threads.net) запоминается на 90 дней и выбирает плашку сам. */
(function () {
  if (window.__nsgTg) return; window.__nsgTg = 1;
  var lastTg = '', lastAt = 0, lastHeard = '';
  var HEARD = ['ChatGPT / нейросеть', 'Яндекс / Google', 'Threads', 'Instagram', 'Авито', 'Рекомендация', 'Другое'];

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch (x) {} return ''; }
  // откуда пришли впервые: utm_source или чужой сайт в referrer
  var attribution = null, attributionKey = 'nsg-attribution-v1', attributionTtl = 90 * 864e5;
  function shortValue(value) { return String(value || '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 160); }
  function publicPage() {
    var robots = document.querySelector('meta[name="robots"]');
    if ((robots && /noindex/i.test(robots.content)) || /^\/(?:event\/kp|prezentaciya|para|brief|proekty|moy-kabinet|komanda)(?:\/|$)/.test(location.pathname)) return '';
    return location.origin + location.pathname;
  }
  (function firstTouch() {
    var now = Date.now(), params = new URLSearchParams(location.search), source = shortValue(params.get('utm_source')), referrer = '';
    try {
      var referring = new URL(document.referrer), hostname = referring.hostname.toLowerCase();
      if (hostname !== 'navseg-da.agency' && !hostname.endsWith('.navseg-da.agency')) {
        referrer = referring.origin;
        if (!source) source = hostname.replace(/^www\./, '');
      }
    } catch (error) {}
    try { attribution = JSON.parse(ls(attributionKey)); } catch (error) {}
    if (!attribution || typeof attribution !== 'object' || !attribution.at || now - attribution.at >= attributionTtl || attribution.at > now) attribution = null;
    var page = publicPage();
    if (!attribution && page) {
      attribution = { at: now, page: page, source: source || 'direct', referrer: referrer };
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (field) { attribution[field] = shortValue(params.get(field)); });
      ls(attributionKey, JSON.stringify(attribution));
    }
    var old = ls('nsg-first-src'), at = +ls('nsg-first-src-at') || 0;
    if (old && now - at >= attributionTtl) { ls('nsg-first-src', ''); ls('nsg-first-src-at', ''); old = ''; }
    if (source && !old) { ls('nsg-first-src', source); ls('nsg-first-src-at', String(now)); }
  })();
  function firstSrc() { return attribution ? attribution.source : ls('nsg-first-src'); }
  function guess() {
    var s = firstSrc().toLowerCase();
    if (/threads/.test(s)) return 'Threads';
    if (/instagram/.test(s)) return 'Instagram';
    if (/avito/.test(s)) return 'Авито';
    if (/chatgpt|openai|perplexity|gemini|copilot|deepseek|claude/.test(s)) return 'ChatGPT / нейросеть';
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

  // 10.11.2026: одна заявка уходила дважды (Валуево 06.11 — два POST с разницей 3,7 с, две сделки).
  // Пока та же заявка в пути или уже принята (2 минуты) — повторно не шлём, отдаём форме «ок».
  // Если отправка не удалась, метку снимаем, чтобы человек мог отправить ещё раз.
  var inflight = {};
  function dupKey(b) { var s = String(b || ''), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 'nsg-lead-' + h; }
  function sentResponse(key) {
    try {
      var cached = JSON.parse(sessionStorage.getItem(key));
      if (cached && cached.lead_id && Date.now() - cached.at < 120000) return cached;
    } catch (error) {}
    return null;
  }
  function markSent(key, data) { try { sessionStorage.setItem(key, JSON.stringify({at: Date.now(), lead_id: data.lead_id})); } catch (error) {} }
  function confirmedResponse(data) { return new Response(JSON.stringify({ok: true, lead_id: data.lead_id, dup: true}), {status: 200, headers: {'Content-Type': 'application/json'}}); }
  function isLeadRequest(url) {
    try { return new URL(typeof url === 'string' ? url : url.url, location.href).href === 'https://109-68-213-160.sslip.io/site-lead'; } catch (error) { return false; }
  }

  var of = window.fetch;
  if (of) window.fetch = function (u, o) {
    var lead = isLeadRequest(u) && o && typeof o.body === 'string' && window.Response;
    if (lead) {
      var dk = dupKey(o.body), cached = sentResponse(dk);
      if (cached) return Promise.resolve(confirmedResponse(cached));
      if (inflight[dk]) return inflight[dk].then(function (response) { return response.clone(); });
      var pending = send(u, o).then(function (response) {
        if (!response || !response.ok) throw new Error('Заявка не подтверждена сервером');
        return response.clone().json().then(function (data) {
          if (!data || data.ok !== true || !data.lead_id) throw new Error('Сохранение заявки не подтверждено');
          markSent(dk, data);
          var test = false;
          try { var payload = JSON.parse(o.body); test = /codex[_-]?test|technical_test/i.test([payload.form, payload.utm_source, payload.utm_medium].join(' ')); } catch (error) {}
          if (!test && window.ym) {
            try { window.ym(112491690, 'reachGoal', 'lead_confirmed', {page: location.pathname, source: firstSrc()}); } catch (error) {}
          }
          return response;
        });
      });
      inflight[dk] = pending;
      return pending.then(function (response) { delete inflight[dk]; return response; }, function (error) { delete inflight[dk]; throw error; });
    }
    return send(u, o);
  };

  function send(u, o) {
    try {
      if (isLeadRequest(u) && o && typeof o.body === 'string') {
        var b = JSON.parse(o.body), fresh = Date.now() - lastAt < 60000;
        if (b && typeof b === 'object') {
          if (lastTg && fresh) {
            b.tg = lastTg;
            if (String(b.message || '').indexOf(lastTg) < 0) b.message = (b.message ? b.message + '\n' : '') + 'Telegram: ' + lastTg;
            if (!b.contact && !b.phone) b.contact = lastTg;
          }
          if (lastHeard && fresh && !b.heard) b.heard = lastHeard;
          if (firstSrc() && !b.first_src) b.first_src = firstSrc();
          if (attribution) {
            b.g_first_page = attribution.page;
            b.g_first_source = attribution.source;
            b.g_first_referrer = attribution.referrer;
            b.g_first_at = new Date(attribution.at).toISOString();
            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (field) {
              if (attribution[field]) b['g_first_' + field] = attribution[field];
            });
            if (attribution.source !== 'direct' && (!b.utm_source || /^(?:catalog|blog|site|glavnaya)$/.test(b.utm_source))) {
              if (b.utm_source) b.g_form_source = b.utm_source;
              b.utm_source = attribution.source;
            }
            var attributionText = 'Первый вход: ' + attribution.page + '\nПервый источник: ' + attribution.source;
            if (String(b.message || '').indexOf('Первый вход: ') < 0) b.message = (b.message ? b.message + '\n' : '') + attributionText;
          }
          var currentParams = new URLSearchParams(location.search);
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (field) {
            var currentValue = shortValue(currentParams.get(field));
            if (currentValue && (!b[field] || field === 'utm_source')) b[field] = currentValue;
          });
          o = Object.assign({}, o, { mode: 'cors', body: JSON.stringify(b) });
        }
      }
    } catch (x) {}
    return of.call(window, u, o);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); }); else scan();
  // формы, которые появляются позже (модальные окна, шторки)
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) { if (n.tagName === 'FORM') enhance(n); else if (n.querySelector) scan(n); } }); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
