(function () {
  'use strict';
  function rub(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }
  function span(a,b) { return a === b ? rub(a) : rub(a) + ' — ' + rub(b); }
  document.querySelectorAll('[data-wedding-offer]').forEach(function (box) {
    var config = JSON.parse(box.querySelector('[data-offer-config]').textContent);
    var model = window.NSGWeddingBudget, form = box.querySelector('[data-growth-form]');
    var guests = box.querySelector('[data-offer-guests]'), period = box.querySelector('[data-offer-period]');
    var chosen = box.querySelector('[data-offer-budget]'), result = box.querySelector('[data-offer-result]');
    var formGuests = form.querySelector('[name="guests"]'), formBudget = form.querySelector('[name="budget"]');
    var context = form.querySelector('[name="calculation_context"]');
    var q = new URLSearchParams(location.search);
    if (Array.from(period.options).some(function(o){return o.value === q.get('period');})) period.value = q.get('period');
    if (['1500000','2000000','3000000','5000000'].indexOf(q.get('budget')) !== -1) chosen.value = q.get('budget');
    function render() {
      var n = Number(guests.value), limit = Number(chosen.value);
      if (!Number.isInteger(n) || n < 1 || n > 5000) {
        result.textContent = 'Укажи целое число гостей от 1 до 5 000.'; context.value = 'Число гостей требует уточнения'; return;
      }
      formGuests.value = n; formBudget.value = String(limit);
      var rate = (config.rates || []).find(function(r){return r.key === period.value;});
      var calc = model.estimate(rate,n), state = model.budgetState(calc,limit,config.capacity,n);
      result.replaceChildren();
      function p(text, cls) { var el=document.createElement('p');el.textContent=text;if(cls)el.className=cls;result.appendChild(el); }
      if (state === 'capacity') p('В подборке указано до '+config.capacity+' гостей. Сценарий на '+n+' гостей превышает эту вместимость: нужен другой зал или подтверждённая новая схема.','wo-alert');
      if (!rate) p('Для этого зала и периода нет подтверждённого расчёта на дату 2027. Лимит '+rub(limit)+' — цель запроса. Стоимость площадки и обязательные услуги ещё нужно уточнить.');
      else if (!calc || calc.high === 0) p('Недостаточно подтверждённых чисел даже для частичного ориентира. Неизвестные услуги не считаем бесплатными — запросим действующие условия.');
      else {
        p('Известные позиции площадки на '+n+' гостей: '+span(calc.low,calc.high)+'.','wo-total');
        p('Это часть расходов площадки по выбранным условиям, не стоимость всей свадьбы. '+rate.label+'.');
        var table=document.createElement('table'),body=document.createElement('tbody');
        calc.rows.forEach(function(row){var tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.scope='row';th.textContent=row.label;td.textContent=row.low===null?'Нужно уточнить':span(row.low,row.high);tr.append(th,td);body.appendChild(tr);});
        table.appendChild(body);result.appendChild(table);
        if (calc.refundable!==null) p('Отдельно нужен возвратный обеспечительный платёж '+rub(calc.refundable)+'. В сумму расходов выше он не включён.');
        if (state === 'exceeded') p('Даже известные расходы превышают выбранный лимит '+rub(limit)+'. Такой бюджет для этого сценария не предлагаем: подберём другой зал или пересмотрим формат.','wo-alert');
        else if (state === 'boundary') p('Известные позиции уже достигают лимита. Ведущий, декор, съёмка, организация и остальные расходы ещё не учтены. Попадание в бюджет не подтверждено.','wo-alert');
        else if (state !== 'capacity') p('Разница между лимитом и известными строками: '+span(limit-calc.high,limit-calc.low)+'. Из неё ещё оплачиваются неуточнённые услуги площадки и остальные части свадьбы. Это не свободный остаток подтверждённой сметы.');
        var unknown=Array.from(new Set((config.unknown||[]).concat(calc.unknown)));
        p('До полной сметы нужно уточнить: '+unknown.join('; ')+'.');
      }
      context.value='Зал: '+config.name+'; гостей: '+n+'; целевой общий бюджет: '+rub(limit)+'; период: '+(rate?rate.label:'не выбран / по запросу')+'; статус: '+state+'; '+(calc?'известные позиции площадки '+span(calc.low,calc.high):'тариф не подтверждён')+'; полный бюджет свадьбы не подтверждён.';
      box.querySelectorAll('[data-budget-card]').forEach(function(card){card.setAttribute('data-selected',card.dataset.budgetCard===String(limit)?'true':'false');});
    }
    guests.addEventListener('input',render);period.addEventListener('change',render);chosen.addEventListener('change',render);
    formGuests.addEventListener('input',function(){guests.value=formGuests.value;render();});
    formBudget.addEventListener('change',function(){chosen.value=formBudget.value;render();});
    box.querySelectorAll('[data-choose-budget]').forEach(function(button){button.addEventListener('click',function(){chosen.value=button.dataset.chooseBudget;render();});});
    form.addEventListener('submit',function(){render();},true);
    render();
  });
})();
