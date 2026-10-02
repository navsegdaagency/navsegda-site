// Лид-магнит: чек-лист подготовки к свадьбе в обмен на контакт → amoCRM (/site-lead)
(function () {
  var box = document.querySelector('.nsg-lm'); if (!box) return;
  var f = box.querySelector('form'), err = box.querySelector('.nsg-lm__err'), shown = Date.now();
  var done = function () { box.classList.add('done'); box.querySelector('.nsg-lm__ok').hidden = false; };
  try { if (localStorage.getItem('nsg-lm-checklist')) done(); } catch (e) {}
  f.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    var d = new FormData(f), name = (d.get('name') || '').trim(), contact = (d.get('contact') || '').trim();
    if ((d.get('_website') || '').trim()) return;                       // honeypot
    if (Date.now() - shown < 1500) { err.textContent = 'Слишком быстро — попробуйте ещё раз.'; return; }
    if (!name || contact.replace(/[^\d@a-z_]/gi, '').length < 5) { err.textContent = 'Укажите имя и телефон или Telegram.'; return; }
    if (!d.get('_consent')) { err.textContent = 'Нужно согласие с политикой конфиденциальности.'; return; }
    var btn = f.querySelector('button'); btn.disabled = true;
    var body = { form: 'lead-magnet-checklist', name: name, contact: contact, page: location.href,
      message: 'Взял(а) чек-лист подготовки к свадьбе со страницы ' + location.origin + location.pathname };
    try { fetch('https://109-68-213-160.sslip.io/site-lead', { method: 'POST', mode: 'no-cors', keepalive: true, body: JSON.stringify(body) }).catch(function () {}); } catch (x) {}
    try { typeof ym === 'function' && ym(112491690, 'reachGoal', 'lead_magnet'); } catch (x) {}
    try { localStorage.setItem('nsg-lm-checklist', '1'); } catch (x) {}
    done();
  });
})();
