/* Поле «Ник в Telegram» во всех формах заявок navseg-da.agency (Денис, 26.10.2026: «чтобы мы сразу могли им писать в ТГ»).
   1) В каждую форму с полем контакта/телефона добавляет поле tg (копия поля контакта — тот же стиль).
   2) Перехватывает отправку на /site-lead: кладёт tg в заявку и дописывает «Telegram: @ник» в сообщение —
      оно попадает в примечание сделки amoCRM и в уведомление в Telegram (там @ник кликабельный). */
(function () {
  if (window.__nsgTg) return; window.__nsgTg = 1;
  var lastTg = '', lastAt = 0;

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
  }

  function scan(root) { [].forEach.call((root || document).querySelectorAll('form'), enhance); }

  function remember(form) {
    if (!form) return;
    var t = form.querySelector('[name="tg"]');
    if (t) { lastTg = norm(t.value); lastAt = Date.now(); }
  }
  document.addEventListener('submit', function (e) { remember(e.target); }, true);
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button,[type="submit"]');
    if (b && b.form) remember(b.form); else if (b) remember(b.closest('form'));
  }, true);

  var of = window.fetch;
  if (of) window.fetch = function (u, o) {
    try {
      if (String(u).indexOf('site-lead') > -1 && o && typeof o.body === 'string' && lastTg && Date.now() - lastAt < 60000) {
        var b = JSON.parse(o.body);
        if (b && typeof b === 'object') {
          b.tg = lastTg;
          if (String(b.message || '').indexOf(lastTg) < 0) b.message = (b.message ? b.message + '\n' : '') + 'Telegram: ' + lastTg;
          if (!b.contact && !b.phone) b.contact = lastTg;
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
