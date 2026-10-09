// FFP — общий UI: навигация, бургер, появление блоков, счётчики, фильтр
// и лайтбокс проектов, отзывы, формы заявки, cookie-уведомление.

// ── Куда уходят заявки ──
const LEAD_ENDPOINT = 'https://109-68-213-160.sslip.io/site-lead';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* приватный режим */ } },
};

// ─── Навигация ───
function initNav() {
  const nav = $('.nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const btn = $('.nav__burger');
  const menu = $('#site-menu');
  if (!btn || !menu) return;
  const set = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.documentElement.classList.toggle('menu-open', open);
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) set(false); });
}

// ─── Появление при скролле ───
function initReveal() {
  const els = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach((e) => io.observe(e));
}

// ─── Счётчики ───
function initCounters() {
  const els = $$('[data-count]');
  if (!els.length) return;
  const run = (el) => {
    const to = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = to + suffix; return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 1600);
      el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3))) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.5 });
  els.forEach((e) => io.observe(e));
}

// ─── Проекты: фильтр ───
function initFilter() {
  const bar = $('.pfilter');
  if (!bar) return;
  const cards = $$('.pcard');
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    const cat = b.dataset.cat;
    $$('button', bar).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    cards.forEach((c) => { c.hidden = !(cat === 'all' || c.dataset.cat === cat); });
    // 3D-режим проектов (home.js) пересобирает набор цветков
    document.dispatchEvent(new CustomEvent('ffp:filter', { detail: { cat } }));
  });
}

// ─── Проекты: лайтбокс (зоны проекта, пока плейсхолдеры) ───
const ZONES = [
  ['Церемония', 'общий план · арка и проход'],
  ['Гостевые столы', 'сервировка · вечерний свет'],
  ['Президиум', 'стол пары · флористика'],
  ['Велком-зона', 'входная группа · детали'],
];
function initLightbox() {
  const cards = $$('.pcard[data-project], [data-lb]');
  if (!cards.length) return;
  let dlg = null, zone = 0, lastFocus = null, slides = ZONES;

  const build = () => {
    dlg = document.createElement('div');
    dlg.className = 'lb';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', 'lb-title');
    dlg.innerHTML = `
      <div class="lb__head">
        <span class="lb__idx"></span>
        <h3 class="lb__name" id="lb-title"></h3>
        <button class="lb__close" type="button">Закрыть</button>
      </div>
      <div class="lb__stage">
        <button class="lb__nav lb__nav--prev" type="button" aria-label="Предыдущее фото">←</button>
        <div class="lb__media"></div>
        <button class="lb__nav lb__nav--next" type="button" aria-label="Следующее фото">→</button>
      </div>
      <div class="lb__caption"><span class="lb__num"></span><span class="lb__zone"></span><span class="lb__dots"></span></div>`;
    document.body.appendChild(dlg);
    $('.lb__close', dlg).addEventListener('click', close);
    $('.lb__nav--prev', dlg).addEventListener('click', () => go(zone - 1));
    $('.lb__nav--next', dlg).addEventListener('click', () => go(zone + 1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    let sx = null;
    dlg.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) go(zone + (dx < 0 ? 1 : -1));
      sx = null;
    });
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(zone + 1);
    else if (e.key === 'ArrowLeft') go(zone - 1);
  };
  const go = (i) => {
    zone = (i + slides.length) % slides.length;
    $$('.lb__slide', dlg).forEach((s, k) => s.classList.toggle('is-active', k === zone));
    $$('.lb__dots i', dlg).forEach((d, k) => d.classList.toggle('is-on', k === zone));
    $('.lb__num', dlg).textContent = `${String(zone + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    $('.lb__zone', dlg).textContent = slides[zone][0];
  };
  const open = (card) => {
    if (!dlg) build();
    lastFocus = document.activeElement;
    // на странице кейса фото лежат в общем контейнере [data-photos], кнопка хранит номер кадра
    const d = (card.closest('[data-photos]') || card).dataset;
    const start = +card.dataset.start || 0;
    $('.lb__idx', dlg).textContent = `${d.no} · ${d.where}`;
    $('.lb__name', dlg).textContent = d.project;
    let photos = null;
    try { photos = d.photos ? JSON.parse(d.photos) : null; } catch (e) { photos = null; }
    if (photos && photos.length) {
      // реальные фото декора пары: [[подпись, путь], …]
      slides = photos.map(([label, src]) => [label, src]);
      $('.lb__media', dlg).innerHTML = slides.map(([label, src], k) => `
      <div class="lb__slide${k === 0 ? ' is-active' : ''}">
        <img src="${src}" alt="${d.project}: ${label.toLowerCase()}" loading="${Math.abs(k - start) < 2 ? 'eager' : 'lazy'}" decoding="async" style="width:100%;height:100%;object-fit:contain">
      </div>`).join('');
    } else {
      slides = ZONES;
      $('.lb__media', dlg).innerHTML = ZONES.map(([label, note], k) => `
      <div class="lb__slide${k === 0 ? ' is-active' : ''}">
        <div class="ph ph--${['sand', 'sage', 'clay', 'linen'][k]}" role="img" aria-label="Фото проекта ${d.project}: ${label.toLowerCase()} (будет добавлено)">
          <span class="ph__cap">ФОТО · ${d.project} · ${note}</span>
        </div>
      </div>`).join('');
    }
    $('.lb__dots', dlg).innerHTML = slides.map(() => '<i></i>').join('');
    go(start);
    dlg.classList.add('is-open');
    document.documentElement.classList.add('lb-open');
    document.addEventListener('keydown', onKey);
    $('.lb__close', dlg).focus();
  };
  function close() {
    if (!dlg || !dlg.classList.contains('is-open')) return;
    dlg.classList.remove('is-open');
    document.documentElement.classList.remove('lb-open');
    document.removeEventListener('keydown', onKey);
    if (lastFocus) lastFocus.focus();
  }
  cards.forEach((c) => {
    const b = $('.pcard__open', c);
    if (b && b.tagName === 'A') return;   // карточка ведёт на страницу кейса
    (b || c).addEventListener('click', (e) => { e.preventDefault(); open(c); });
  });
}

// ─── Кастомный курсор-кружок на фото проектов (только мышь) ───
function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || reduced) return;
  const targets = $$('[data-cursor]');
  if (!targets.length) return;
  const cur = document.createElement('div');
  cur.className = 'cursor';
  cur.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cur);
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = false;
  const tick = () => {
    x += (tx - x) * 0.25; y += (ty - y) * 0.25;
    cur.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    if (active || Math.abs(tx - x) > 0.5) raf = requestAnimationFrame(tick); else raf = 0;
  };
  const move = (e) => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(tick); };
  targets.forEach((t) => {
    t.addEventListener('pointerenter', (e) => {
      active = true; x = tx = e.clientX; y = ty = e.clientY;
      cur.textContent = t.dataset.cursor; cur.classList.add('is-on');
      window.addEventListener('pointermove', move, { passive: true });
      if (!raf) raf = requestAnimationFrame(tick);
    });
    t.addEventListener('pointerleave', () => {
      active = false; cur.classList.remove('is-on');
      window.removeEventListener('pointermove', move);
    });
  });
}

// ─── Отзывы ───
function initTestimonials() {
  const root = $('.testi');
  if (!root) return;
  const items = $$('.testi__item', root);
  const dots = $$('.testi__dots button', root);
  if (items.length < 2) return;
  let i = 0, timer = 0;
  const show = (k) => {
    i = (k + items.length) % items.length;
    items.forEach((el, n) => { el.hidden = n !== i; });
    dots.forEach((d, n) => d.setAttribute('aria-current', n === i ? 'true' : 'false'));
  };
  const auto = () => { if (reduced) return; clearInterval(timer); timer = setInterval(() => show(i + 1), 9000); };
  dots.forEach((d, n) => d.addEventListener('click', () => { show(n); auto(); }));
  root.addEventListener('pointerenter', () => clearInterval(timer));
  root.addEventListener('pointerleave', auto);
  let sx = null;
  root.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); auto(); }
    sx = null;
  });
  show(0); auto();
}

// ─── Формы заявки ───
function initForms() {
  $$('form.lead:not([data-cform])').forEach((form) => {
    const status = $('.lead__status', form);
    const btn = $('button[type="submit"]', form);
    const consent = form.elements.consent;
    const setErr = (field, msg) => {
      const wrap = field.closest('.field, .consent');
      if (!wrap) return;
      wrap.classList.toggle('is-error', !!msg);
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      const e = $('.field__err', wrap);
      if (e) e.textContent = msg || '';
    };
    ['name', 'contact'].forEach((n) => form.elements[n].addEventListener('input', () => setErr(form.elements[n], '')));
    consent.addEventListener('change', () => { setErr(consent, ''); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.dataset.busy) return;
      const name = form.elements.name.value.trim();
      const contact = form.elements.contact.value.trim();
      let ok = true;
      if (name.length < 2) { setErr(form.elements.name, 'Как к вам обращаться?'); ok = false; }
      if (contact.replace(/[^\p{L}\p{N}]/gu, '').length < 4) { setErr(form.elements.contact, 'Оставьте Telegram (@username) или телефон'); ok = false; }
      if (!consent.checked) { setErr(consent, 'Без согласия на обработку данных мы не сможем принять заявку'); ok = false; }
      if (!ok) { status.textContent = 'Проверьте отмеченные поля.'; const bad = $('[aria-invalid="true"]', form); if (bad) bad.focus(); return; }

      // ловушка для ботов: настоящий человек это поле не видит
      if (form.elements.website && form.elements.website.value) { done(); return; }

      const payload = {
        form: form.dataset.form,
        name,
        contact,
        date: form.elements.date.value || '',
        message: form.elements.message.value.trim(),
        page: location.href,
      };
      form.dataset.busy = '1';
      btn.disabled = true;
      status.textContent = 'Отправляем…';
      try {
        await fetch(LEAD_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        done();
      } catch (err) {
        status.textContent = 'Не получилось отправить — проверьте интернет и попробуйте ещё раз или напишите нам в Telegram.';
        btn.disabled = false;
        delete form.dataset.busy;
      }
    });

    function done() {
      form.classList.add('is-sent');
      const ok = document.createElement('div');
      ok.className = 'lead__ok';
      ok.setAttribute('role', 'status');
      ok.setAttribute('tabindex', '-1');
      ok.innerHTML = '<p class="lead__ok-h">Спасибо, заявка у нас.</p><p>Мы свяжемся с вами в ближайшее время, чтобы обсудить детали.</p>';
      form.replaceChildren(ok);
      ok.focus();
    }
  });
}

// ─── Cookie ───
function initCookie() {
  if (store.get('ffp_cookie_ok')) return;
  const bar = $('.cookie');
  if (!bar) return;
  bar.hidden = false;
  requestAnimationFrame(() => bar.classList.add('is-on'));
  $('button', bar).addEventListener('click', () => {
    store.set('ffp_cookie_ok', String(Date.now()));
    bar.classList.remove('is-on');
    setTimeout(() => { bar.hidden = true; }, 400);
  });
}

initNav();
initReveal();
initCounters();
initFilter();
initLightbox();
initCursor();
initTestimonials();
initForms();
initCookie();
