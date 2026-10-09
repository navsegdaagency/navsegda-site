// FFP — каталог: фильтр категорий, заявка-корзина (localStorage), галерея позиции, отправка заявки.
const LEAD_ENDPOINT = 'https://109-68-213-160.sslip.io/site-lead';
const KEY = 'ffp_cart';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const DATA = JSON.parse($('#cat-data')?.textContent || '{}');

const load = () => { try { return (JSON.parse(localStorage.getItem(KEY)) || []).filter((s) => DATA[s]); } catch (e) { return []; } };
const save = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* приватный режим */ } };
let cart = load();
let wish = '';   // «хочу подборку» по категории без позиций

const fmt = (n) => n ? 'от ' + n.toLocaleString('ru-RU') + ' ₽' : 'цена по запросу';

function render() {
  $$('[data-cadd]').forEach((b) => b.setAttribute('aria-pressed', String(cart.includes(b.dataset.cadd))));
  const bar = $('[data-cbar]');
  document.documentElement.classList.toggle('has-cbar', cart.length > 0);
  if (bar) { bar.hidden = cart.length === 0; $('[data-ccount]', bar).textContent = cart.length; }
  const box = $('[data-citems]');
  if (!box) return;
  if (!cart.length) {
    box.innerHTML = wish ? `<p class="cdrawer__empty">Подборка: <b>${wish}</b></p>` : '<p class="cdrawer__empty">Пока ничего не выбрано — можно просто описать задачу в комментарии.</p>';
    return;
  }
  box.innerHTML = cart.map((s) => `<div class="citem-row"><img src="${DATA[s].img}" alt=""><div><b>${DATA[s].name}</b><span>${DATA[s].cat} · ${fmt(DATA[s].price)}</span></div><button type="button" data-cdel="${s}" aria-label="Убрать ${DATA[s].name}">×</button></div>`).join('');
}

function toggle(slug, force) {
  const has = cart.includes(slug);
  if (force === true && has) return;
  cart = has && force !== true ? cart.filter((s) => s !== slug) : [...cart, slug];
  save(cart); render();
}

const drawer = $('[data-cdrawer]');
let lastFocus = null;
function openDrawer() {
  if (!drawer) return;
  lastFocus = document.activeElement;
  render();
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  document.documentElement.classList.add('lb-open');
  $('#cf-name', drawer)?.focus();
}
function closeDrawer() {
  drawer.classList.remove('is-open');
  document.documentElement.classList.remove('lb-open');
  setTimeout(() => { drawer.hidden = true; }, 300);
  lastFocus?.focus();
}

document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-cadd]');
  if (add) { toggle(add.dataset.cadd); return; }
  const del = e.target.closest('[data-cdel]');
  if (del) { toggle(del.dataset.cdel); return; }
  const op = e.target.closest('[data-copen]');
  if (op) { if (op.dataset.cwith) toggle(op.dataset.cwith, true); openDrawer(); return; }
  const empty = e.target.closest('[data-copen-empty]');
  if (empty) { wish = empty.dataset.copenEmpty; openDrawer(); return; }
  if (e.target.closest('[data-cclose]') || e.target === drawer) { closeDrawer(); return; }
  const chip = e.target.closest('[data-cchip]');
  if (chip) {
    const c = chip.dataset.cchip;
    $$('[data-cchip]').forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
    $$('.ccard').forEach((k) => {
      const soon = k.classList.contains('ccard--soon');
      k.hidden = soon ? c !== k.dataset.cat : !(c === 'all' || k.dataset.cat === c);
      if (!k.hidden) k.classList.add('is-in');
    });
    return;
  }
  const th = e.target.closest('[data-cthumb]');
  if (th) {
    $('[data-cmain]').src = th.dataset.cthumb;
    $$('[data-cthumb]').forEach((b) => b.classList.toggle('is-on', b === th));
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer && !drawer.hidden) closeDrawer(); });

// отправка заявки
const form = $('[data-cform]');
if (form) {
  const status = $('.lead__status', form);
  const btn = $('button[type="submit"]', form);
  const err = (el, msg) => { const w = el.closest('.field, .consent'); w?.classList.toggle('is-error', !!msg); const x = w && $('.field__err', w); if (x) x.textContent = msg || ''; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.busy) return;
    const f = form.elements;
    const name = f.name.value.trim(), contact = f.contact.value.trim();
    let ok = true;
    err(f.name, ''); err(f.contact, ''); err(f.consent, '');
    if (name.length < 2) { err(f.name, 'Как к вам обращаться?'); ok = false; }
    if (contact.replace(/[^\p{L}\p{N}]/gu, '').length < 4) { err(f.contact, 'Оставьте Telegram (@username) или телефон'); ok = false; }
    if (!f.consent.checked) { err(f.consent, 'Без согласия мы не сможем принять заявку'); ok = false; }
    if (!ok) { status.textContent = 'Проверьте отмеченные поля.'; return; }
    if (f.website.value) return;
    const items = cart.map((s) => `• ${DATA[s].name} (${DATA[s].cat}, ${fmt(DATA[s].price)})`).join('\n');
    const message = ['Заявка из каталога декора', items || (wish ? `Хочет подборку: ${wish}` : ''), f.place.value.trim() && `Площадка/адрес: ${f.place.value.trim()}`, f.message.value.trim()].filter(Boolean).join('\n');
    form.dataset.busy = '1'; btn.disabled = true; status.textContent = 'Отправляем…';
    try {
      await fetch(LEAD_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ form: 'ffp-catalog', name, contact, date: f.date.value || '', message, page: location.href }), keepalive: true });
      cart = []; save(cart); wish = '';
      form.innerHTML = '<div class="lead__ok" role="status" tabindex="-1"><p class="lead__ok-h">Спасибо, заявка у нас.</p><p>Посчитаем стоимость и свяжемся с вами в ближайшее время.</p></div>';
      render();
    } catch (x) {
      status.textContent = 'Не получилось отправить — попробуйте ещё раз или позвоните +7 985 691-61-00.';
      btn.disabled = false; delete form.dataset.busy;
    }
  });
}
render();
