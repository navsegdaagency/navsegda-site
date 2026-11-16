(function () {
  if (window.__nsgGrowth) return;
  window.__nsgGrowth = true;
  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-growth-cta]');
    if (link && window.ym) window.ym(112491690, 'reachGoal', 'quote_request', {page: location.pathname});
  });
  document.querySelectorAll('[data-growth-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (form.dataset.busy || !form.reportValidity()) return;
      var fields = new FormData(form), button = form.querySelector('[type=submit]'), status = form.querySelector('[role=status]');
      if (fields.get('_hp')) return;
      var payload = {form: 'growth-quote', page: location.origin + location.pathname, message: 'Расчёт по материалу: ' + document.title};
      fields.forEach(function (value, key) {
        if (key === 'message') { if (String(value).trim()) payload.message += '\nПожелания: ' + String(value).trim(); }
        else if (key !== '_consent' && key !== '_hp') payload[key] = String(value).trim();
      });
      form.dataset.busy = '1';
      button.disabled = true;
      status.textContent = 'Отправляем заявку…';
      fetch('https://109-68-213-160.sslip.io/site-lead', {method: 'POST', mode: 'cors', headers: {'Content-Type': 'text/plain;charset=UTF-8'}, body: JSON.stringify(payload)})
        .then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
        .then(function (data) {
          if (!data || data.ok !== true || !data.lead_id) throw new Error('Заявка не сохранена');
          status.textContent = 'Заявка принята. Менеджер свяжется с вами, чтобы уточнить детали расчёта.';
          form.reset();
        })
        .catch(function () { status.textContent = 'Не получили подтверждение сохранения. Перед повторной отправкой уточните получение в Telegram @navsegda_agency или по телефону +7 958 541-00-41.'; })
        .finally(function () { delete form.dataset.busy; button.disabled = false; });
    });
  });
})();
