(function (root) {
  'use strict';
  function amount(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
  function estimate(rate, guests) {
    if (!rate || !Number.isInteger(guests) || guests < 1 || guests > 5000) return null;
    var rows = [], unknown = [], low = 0, high = 0;
    function add(label, a, b) {
      if (!amount(a)) { unknown.push(label); rows.push({label:label, low:null, high:null}); return; }
      b = amount(b) ? b : a;
      rows.push({label:label, low:a, high:b}); low += a; high += b;
    }
    var menu = amount(rate.menu) ? rate.menu * guests : null;
    var food = menu;
    if (amount(rate.deposit) && amount(menu)) food = Math.max(menu, rate.deposit);
    add(amount(rate.deposit) ? 'Банкет и добор до минимального заказа по меню' : 'Банкет по минимальному меню; минимальный заказ не подтверждён', food);
    if (!amount(rate.deposit)) unknown.push('Минимальный заказ и правило его зачёта');
    if (amount(rate.source_deposit) && rate.source_deposit > 0) {
      rows.push({label:'Депозит в исходной базе: '+rate.source_deposit.toLocaleString('ru-RU')+' ₽; назначение и зачёт уточняются',low:null,high:null});
      unknown.push('Депозит из базы не учтён в расходах до подтверждения назначения');
    }
    if (rate.service_included) rows.push({label:'Сервис уже включён в меню', low:0, high:0});
    else if (amount(menu) && amount(rate.service)) {
      add('Сервисный сбор' + (rate.service ? ' '+rate.service+'%' : ''), menu * rate.service / 100, food * rate.service / 100);
      if (food > menu && rate.service > 0) unknown.push('База сервиса при доборе до минимального заказа');
    } else add('Сервисный сбор', null);
    add('Аренда выбранного периода', rate.rent);
    if (amount(rate.tech)) add('Обязательный технический пакет', rate.tech);
    else unknown.push('Обязательная техника и работа технических специалистов');
    if (amount(rate.corkage)) add('Пробковый сбор', rate.corkage * guests);
    else add('Пробковый сбор и условия алкоголя', null);
    if (amount(rate.welcome)) add('Welcome из сценария', rate.welcome * guests);
    if (amount(rate.cleaning)) add('Обязательная уборка', rate.cleaning);
    return {low:Math.round(low), high:Math.round(high), rows:rows, unknown:unknown,
      refundable:amount(rate.refundable) ? rate.refundable : null, complete:false};
  }
  function budgetState(result, limit, capacity, guests) {
    if (amount(capacity) && guests > capacity) return 'capacity';
    if (!result) return 'unknown';
    if (result.low > limit) return 'exceeded';
    if (result.high >= limit) return 'boundary';
    return 'partial';
  }
  var api = {estimate:estimate, budgetState:budgetState};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NSGWeddingBudget = api;
})(typeof window !== 'undefined' ? window : this);
