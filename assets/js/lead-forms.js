/* Shared repair for exported article forms. No success before CRM confirmation. */
(function () {
  if (window.__nsgLeadForms) return;
  window.__nsgLeadForms = true;
  var endpoint = 'https://109-68-213-160.sslip.io/site-lead';
  var selector = '#smeta-form,form.nsg-lm__f,form.nsg-lm2__f';
  var readyAt = Date.now();
  var offers = {
    '/blog/svadba-ceremoniya-nabor-slov/': ['Нужна церемония с вашей историей?', 'Готовый текст поможет подготовиться самостоятельно. Если нужна организация свадьбы с личной церемонией, обсудим вашу историю, дату и состав команды.', 'Обсудить церемонию и свадьбу', '/blog/vyezdnaya-registraciya-braka/', 'Как устроена выездная церемония'],
    '/blog/shutochnaya-registraciya-braka-scenariy/': ['Сценарий есть. Кто проведёт ваш вечер?', 'Обсудим ведущего, тайминг церемонии и организацию свадьбы. Дату, число гостей и бюджет можно уточнить в разговоре.', 'Обсудить организацию свадьбы', '/svadby/', 'Посмотреть услуги агентства'],
    '/event/blog/viktorina-dlya-medikov-na-korporativ/': ['Нужен готовый вечер для команды клиники?', 'Можем провести игру с ведущим в вашем офисе или собрать корпоратив на площадке. Напишите число гостей и бюджет — обсудим подходящий состав программы.', 'Рассчитать вечер для команды', '/event/igry/', 'Игры с ведущим: варианты'],
    '/event/blog/nominacii-dlya-sotrudnikov/': ['Превратим список номинаций в вечер команды', 'Обсудим сценарий вручения, ведущего, музыку и организацию корпоратива. Можно начать с программы для вашего офиса, без аренды внешнего зала.', 'Обсудить программу и бюджет', '/event/uslugi/korporativy/', 'Что входит в организацию'],
    '/event/blog/ceremoniya-nagrazhdeniya-scenariy/': ['Нужен не только сценарий, но и команда?', 'Подготовим церемонию под вашу задачу: порядок награждения, ведущий, техника и координация. Состав и стоимость согласуем после брифа.', 'Обсудить церемонию награждения', '/event/uslugi/gala-uzhiny-i-premii/', 'Гала-ужины и премии']
  };
  var offer = offers[location.pathname], anchor = document.querySelector('article.art-body') || document.querySelector('.nsg-mag .lead,.wrap > .lead');
  if (offer && anchor && !document.getElementById('nsg-context-offer')) {
    var style = document.createElement('style');
    style.textContent = '.nsg-context-offer{padding:24px;margin:24px 0;border:1px solid #ba8a4866;border-radius:18px;background:#ba8a4814;font:16px/1.6 system-ui,sans-serif;color:inherit;max-width:100%}.nsg-context-offer h2{font:600 23px/1.25 system-ui,sans-serif!important;margin:0 0 12px!important}.nsg-context-offer p{margin:0 0 16px!important}.nsg-context-offer div{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.nsg-context-offer a{font:600 14px/1.4 system-ui,sans-serif!important;text-decoration:underline;display:inline-block}.nsg-context-offer a:first-child{background:#7a1c22;color:#ffe7c6!important;padding:12px 16px;border-radius:9px;text-decoration:none}.nsg-context-offer a:focus-visible{outline:3px solid #ba8a48;outline-offset:3px}@media(max-width:600px){.nsg-context-offer{padding:19px}.nsg-context-offer a:first-child{width:100%;text-align:center}}';
    document.head.appendChild(style);
    var card = document.createElement('aside'); card.id = 'nsg-context-offer'; card.className = 'nsg-context-offer'; card.style.scrollMarginTop = '160px';
    var corporate = location.pathname.indexOf('/event/') === 0;
    card.innerHTML = '<h2>' + offer[0] + '</h2><p>' + offer[1] + '</p><div><a href="' + (corporate ? '#zayavka' : '#smeta') + '"' + (corporate ? '' : ' data-smeta="1"') + '>' + offer[2] + '</a><a href="' + offer[3] + '">' + offer[4] + '</a></div>';
    if (anchor.matches('article')) anchor.insertBefore(card, anchor.firstChild); else anchor.parentNode.insertBefore(card, anchor.nextSibling);
  }
  function goal(name) {
    try { if (window.ym) window.ym(112491690, 'reachGoal', name, {page: location.pathname}); } catch (e) {}
  }
  // Only confirm responses from the existing lead endpoint. No new storage or attribution.
  if (window.fetch && !window.__nsgTg) {
    var originalFetch = window.fetch;
    window.fetch = function (url, options) {
      var isLead = false;
      try { isLead = new URL(typeof url === 'string' ? url : url.url, location.href).href === endpoint && options && typeof options.body === 'string'; } catch (e) {}
      if (!isLead) return originalFetch.apply(this, arguments);
      return originalFetch.call(this, url, Object.assign({}, options, {mode:'cors'})).then(function (response) {
        if (!response.ok) throw new Error('HTTP');
        return response.clone().json().then(function (data) {
          if (!data || data.ok !== true || !data.lead_id) throw new Error('Unconfirmed');
          var payload = {}; try { payload = JSON.parse(options.body); } catch (e) {}
          var tests = /codex[_-]?test|technical_test/i.test([payload.form,payload.utm_source,payload.utm_medium].join(' '));
          var ids = window.__nsgLeadGoalIds = window.__nsgLeadGoalIds || {};
          if (!tests && !ids[data.lead_id]) { ids[data.lead_id] = true; goal('lead_confirmed'); }
          return response;
        });
      });
    };
  }
  document.addEventListener('click', function (event) {
    var a = event.target.closest && event.target.closest('a');
    if (!a || a.hasAttribute('data-growth-cta')) return; // growth.js already tracks this
    var href = a.getAttribute('href') || '', target = null;
    if (href.charAt(0) === '#' && href.length > 1) {
      try { target = document.getElementById(decodeURIComponent(href.slice(1))); } catch (e) {}
    }
    if (a.hasAttribute('data-smeta') || /#(?:smeta|zeropopup)/.test(href) ||
      (target && (target.matches('form') || target.querySelector('form')))) goal('quote_request');
  }, true);
  function status(form) {
    var el = form.querySelector('[data-lead-status]');
    if (!el) {
      el = document.createElement('p'); el.setAttribute('data-lead-status', '');
      el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'font:14px/1.5 system-ui,sans-serif;margin:12px 0;grid-column:1/-1;white-space:normal';
      form.appendChild(el);
    }
    return el;
  }
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form.matches || !form.matches(selector)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (form.__nsgSending) return;
    var out = status(form), consent = form.querySelector('[name="_consent"]');
    if (!form.reportValidity()) return;
    if (!consent || !consent.checked) { out.textContent = 'Отметьте согласие на обработку персональных данных.'; return; }
    var fields = new FormData(form);
    if (String(fields.get('_website') || fields.get('_hp') || '').trim()) return;
    if (Date.now() - readyAt < 1500) { out.textContent = 'Проверьте данные и повторите отправку через пару секунд.'; return; }
    var name = String(fields.get('name') || '').trim(), contact = String(fields.get('contact') || '').trim();
    if (!name || contact.replace(/[^\d@a-z_]/gi, '').length < 5) { out.textContent = 'Укажите имя и телефон или Telegram для ответа.'; return; }
    var magnet = form.closest('.nsg-lm2,.nsg-lm');
    var kind = magnet ? ('lead-magnet-' + (magnet.getAttribute('data-lm') || 'checklist')) : 'blog-smeta';
    var payload = {form: kind, name: name, contact: contact, page: location.origin + location.pathname,
      message: (magnet ? 'Запрос материала: ' : 'Запрос расчёта: ') + document.title, _consent: true};
    ['when', 'guests', 'budget', 'tg', 'heard'].forEach(function (key) {
      var value = String(fields.get(key) || '').trim(); if (value) payload[key === 'when' ? 'date' : key] = value;
    });
    var button = form.querySelector('[type="submit"],button');
    form.__nsgSending = true; if (button) button.disabled = true;
    out.textContent = 'Отправляем заявку…';
    fetch(endpoint, {method: 'POST', mode: 'cors', headers: {'Content-Type': 'text/plain;charset=UTF-8'}, body: JSON.stringify(payload)})
      .then(function (response) { if (!response.ok) throw new Error('HTTP'); return response.json(); })
      .then(function (data) {
        if (!data || data.ok !== true || !data.lead_id) throw new Error('Unconfirmed');
        // tg-field.js emits the confirmed goal; do not count it twice here.
        var success = magnet ? magnet.querySelector('.nsg-lm2__ok,.nsg-lm__ok') : document.getElementById('smeta-ok');
        if (success) { form.hidden = true; success.hidden = false; if (magnet) magnet.classList.add('done'); }
        else out.textContent = 'Заявка принята. Свяжемся с вами, чтобы уточнить детали.';
      })
      .catch(function () {
        out.textContent = 'Не получили подтверждение сохранения. Данные остались в форме. Уточните получение: ';
        var a = document.createElement('a'); a.href = 'https://t.me/navsegda_agency'; a.textContent = 'Telegram'; out.appendChild(a);
        out.appendChild(document.createTextNode(' или +7 958 541-00-41.'));
      })
      .finally(function () { form.__nsgSending = false; if (button) button.disabled = false; });
  }, true);
})();
