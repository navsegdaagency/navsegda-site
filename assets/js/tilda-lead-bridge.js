/* Формы Tilda (t-form, zero-формы) на экспортированных страницах → заявка в amoCRM через /site-lead.
   26.10.2026: на GitHub Pages Tilda-формы ничего не отправляли (кнопка молчала) — перехватываем отправку сами
   и показываем «Спасибо». Поле Telegram (tg) подхватывается из tg-field.js. */
(function () {
  if (window.__nsgTildaBridge) return; window.__nsgTildaBridge = 1;
  var URL = 'https://109-68-213-160.sslip.io/site-lead';

  function val(f, names) {
    for (var i = 0; i < names.length; i++) {
      var el = f.querySelector('[name="' + names[i] + '"]');
      if (el && el.value && el.value.trim()) return el.value.trim();
    }
    return '';
  }
  function phoneOf(f) {
    var p = val(f, ['Phone', 'phone', 'Телефон', 'tel']);
    if (p) return p;
    var iso = f.querySelector('[name="tildaspec-phone-part[]-iso"]'), part = f.querySelector('[name="tildaspec-phone-part[]"]');
    if (part && part.value.trim()) return ((iso && iso.value) ? '+' + String(iso.value).replace(/\D/g, '') + ' ' : '') + part.value.trim();
    var t = f.querySelector('input[type="tel"]');
    return t && t.value.trim() ? t.value.trim() : '';
  }
  function tgOf(f) {
    var v = val(f, ['tg', 'telegram']);
    if (!v) return '';
    v = v.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, '').replace(/^@+/, '').replace(/[^A-Za-z0-9_]/g, '');
    return v.length >= 3 ? '@' + v : '';
  }
  function say(f, text, ok) {
    var box = f.__nsgMsg;
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('role', 'status');
      box.style.cssText = 'margin:14px 0 0;font:500 15px/1.45 TildaSans,Arial,sans-serif;';
      var btn = f.querySelector('.t-submit,[type="submit"]');
      (btn && btn.parentNode ? btn.parentNode : f).appendChild(box);
      f.__nsgMsg = box;
    }
    box.style.color = ok ? '#2e6b3a' : '#7A1C22';
    box.textContent = text;
  }

  function handle(f, e) {
    if (e) { e.preventDefault(); e.stopImmediatePropagation(); }
    if (f.__nsgBusy) return;
    var c = f.querySelector('[name="_consent"]');
    if (c && c.type === 'checkbox' && !c.checked) { say(f, 'Отметьте согласие на обработку персональных данных', false); return; }
    var name = val(f, ['name', 'Name', 'Имя']), phone = phoneOf(f), tg = tgOf(f);
    if (!phone && !tg) { say(f, 'Оставьте телефон или ник в Telegram — мы свяжемся с вами', false); return; }
    var extra = [];
    [].forEach.call(f.querySelectorAll('input,textarea,select'), function (i) {
      var n = i.name || '';
      if (!n || /^(tildaspec|form-spec|_|formservices)/.test(n) || /^(name|Name|Имя|Phone|phone|Телефон|tg|telegram)$/.test(n)) return;
      if ((i.type === 'checkbox' || i.type === 'radio') && !i.checked) return;
      if (i.value && i.value.trim()) extra.push(n + ': ' + i.value.trim());
    });
    var payload = {
      form: 'tilda-' + (location.pathname.split('/').filter(Boolean).join('-') || 'main') + '-' + (f.id || 'form'),
      name: name, contact: phone || tg, tg: tg,
      message: ['Заявка с формы на странице «' + document.title + '»'].concat(extra).concat(tg ? ['Telegram: ' + tg] : []).join('\n'),
      page: location.href
    };
    var d = val(f, ['Date', 'date', 'Дата']); if (d) payload.date = d;
    f.__nsgBusy = 1;
    say(f, 'Отправляем…', true);
    var done = function () {
      f.__nsgBusy = 0;
      try { typeof ym === 'function' && ym(112491690, 'reachGoal', 'lead'); } catch (x) {}
      var sb = f.querySelector('.js-successbox, .t-form__successbox');
      if (sb) { sb.style.display = 'block'; if (!sb.textContent.trim()) sb.textContent = 'Спасибо! Мы свяжемся с вами в ближайшее время.'; }
      say(f, 'Спасибо! Заявка отправлена — свяжемся с вами в ближайшее время.', true);
      [].forEach.call(f.querySelectorAll('input:not([type=hidden]):not([type=checkbox]),textarea'), function (i) { i.value = ''; });
    };
    try {
      fetch(URL, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload) })
        .then(done, function () { f.__nsgBusy = 0; say(f, 'Не получилось отправить. Напишите нам в Telegram @navsegda_agency или позвоните +7 958 541-00-41', false); });
    } catch (x) { f.__nsgBusy = 0; }
  }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.matches && f.matches('form.t-form, form.js-form-proccess')) handle(f, e);
  }, true);
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('.t-submit, form.t-form [type="submit"], form.js-form-proccess [type="submit"]');
    if (!b) return;
    var f = b.form || b.closest('form');
    if (f && f.matches('form.t-form, form.js-form-proccess')) handle(f, e);
  }, true);
})();
