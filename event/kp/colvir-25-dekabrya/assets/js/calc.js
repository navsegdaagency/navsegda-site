// Калькулятор бюджета корпоратива (статьи, услуги). Модель — по нашим сметам 2025:
// (фикс + на гостя × N) × коэффициент дня; вилка ±10%. Результат уходит в заявку (поля budget и message).
(function () {
  var F = [[250000, 8000], [400000, 9500], [1500000, 18000]];
  var NF = ['Офис или лофт', 'На площадке', 'Гала и итоги года'];
  function m(n) { return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' млн' : Math.round(n / 1000) + ' тыс.'; }
  function r(n) { return Math.round(n / 10000) * 10000; }
  function hidden(form, name) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = name; form.appendChild(el); }
    return el;
  }
  [].slice.call(document.querySelectorAll('[data-calc]')).forEach(function (root) {
    var g = root.querySelector('input[type=range]'), out = root.querySelector('output');
    var sum = root.querySelector('.bc-sum'), pg = root.querySelector('.bc-pg'), go = root.querySelector('.bc-go');
    var fmt = +(root.dataset.fmt || 0), day = 0, K = [1, 1.15, 0.9], ND = root.dataset.ny ? ['будни декабря', 'пятница/суббота декабря', 'январь'] : ['будний день', 'пятница или суббота', 'январь'];
    function seg(sel, cb) {
      var b = [].slice.call(root.querySelectorAll(sel + ' button'));
      b.forEach(function (x) {
        x.addEventListener('click', function () {
          b.forEach(function (y) { y.setAttribute('aria-checked', y === x ? 'true' : 'false'); });
          cb(+x.dataset.i); calc();
        });
      });
    }
    seg('.bc-fmt', function (i) { fmt = i; });
    seg('.bc-day', function (i) { day = i; });
    function calc() {
      var n = +g.value; out.textContent = n;
      var t = (F[fmt][0] + F[fmt][1] * n) * K[day];
      var lo = r(t * 0.9), hi = r(t * 1.1);
      sum.textContent = m(lo) + ' – ' + m(hi) + ' ₽';
      pg.textContent = '≈ ' + (Math.round(t / n / 500) * 500).toLocaleString('ru-RU') + ' ₽ за гостя';
      root._lead = { budget: m(lo) + ' – ' + m(hi) + ' ₽ (калькулятор)', message: 'Калькулятор: ' + NF[fmt] + ', ' + ND[day] + ', ' + n + ' гостей', guests: n };
    }
    g.addEventListener('input', calc);
    go.addEventListener('click', function () {
      var f = document.querySelector('#zayavka form') || document.querySelector('form.form');
      if (f && root._lead) {
        hidden(f, 'budget').value = root._lead.budget;
        hidden(f, 'message').value = root._lead.message;
        var gi = f.querySelector('[name=guests]');
        if (gi && !gi.value) { gi.value = root._lead.guests; gi.dispatchEvent(new Event('input')); }
      }
      if (window.ym && window.YM_ID) ym(window.YM_ID, 'reachGoal', 'calc_blog');
    });
    calc();
  });
})();
