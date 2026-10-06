// Главная: ленивое подключение 3D-сцен.
// Three.js и модули сцен грузятся динамически, поэтому, если CDN недоступен
// или нет WebGL2, страница остаётся рабочей и показывает CSS-фолбэк.

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const pad = (n) => String(n).padStart(2, '0');

const fallback = (host, section) => {
  if (host) host.classList.add('is-fallback');
  if (section) section.classList.add('no-3d');
};

function whenNear(el, cb, margin = '120% 0px') {
  if (!('IntersectionObserver' in window)) { cb(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
  }, { rootMargin: margin });
  io.observe(el);
}

function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    return true;
  } catch (e) { return false; }
}
// Класс fx3d ставит инлайн-скрипт в <head> (до первой отрисовки, чтобы не прыгала
// вёрстка). Здесь подтверждаем, что WebGL2 действительно есть.
if (root.classList.contains('fx3d') && (reduced || !hasWebGL2())) root.classList.remove('fx3d');

// 1. Hero — пион
const heroHost = document.querySelector('[data-scene="bloom"]');
if (heroHost) {
  import('./scenes/hero-bloom.js')
    .then((m) => { if (!m.mount(heroHost)) fallback(heroHost); })
    .catch(() => fallback(heroHost));
}

// 2. Свадьбы — шлейфы
const veilHost = document.querySelector('[data-scene="veils"]');
if (veilHost) {
  const section = veilHost.closest('section');
  whenNear(section, () => {
    import('./scenes/veils.js')
      .then((m) => { if (!m.mount(veilHost, section)) fallback(veilHost, section); })
      .catch(() => fallback(veilHost, section));
  });
}

// 3. Проекты — расцветающие цветы (закреплённая секция).
// Без WebGL2 / при reduced-motion остаётся обычная сетка карточек.
const SPECIES = { peony: 'пион', rose: 'роза', ranunculus: 'ранункулюс', anemone: 'анемон' };
function initProjects() {
  const wrap = document.querySelector('.pbloom');
  const host = wrap && wrap.querySelector('[data-scene="projects"]');
  if (!host) return;
  const section = wrap.closest('section');
  const cards = Array.from(wrap.querySelectorAll('.pcard'));
  const hud = wrap.querySelector('.pbloom__hud');
  const numEl = hud.querySelector('.pbloom__count b');
  const totalEl = hud.querySelector('.pbloom__count span');
  const flowerEl = hud.querySelector('.pbloom__flower');
  const rail = hud.querySelector('.pbloom__rail');
  let list = [];
  let idx = -1;
  const on = () => root.classList.contains('fx3d');

  const progress = () => {
    const r = wrap.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  };
  // Карточки: появляются, когда цветок почти раскрылся, уходят перед следующим.
  const update = () => {
    if (!on() || !list.length) return;
    const N = list.length;
    const x = progress() * N;
    list.forEach((c, k) => {
      const l = x - k;
      const a = smooth(0.4, 0.6, l);
      const o = k < N - 1 ? smooth(0.84, 0.97, l) : 0;
      c.style.setProperty('--a', a.toFixed(3));
      c.style.setProperty('--o', o.toFixed(3));
      c.classList.toggle('is-active', a > 0.5 && o < 0.5);
    });
    rail.style.setProperty('--p', (x / N).toFixed(4));
    const i = Math.min(N - 1, Math.floor(x));
    if (i !== idx) {
      idx = i;
      numEl.textContent = pad(i + 1);
      flowerEl.textContent = SPECIES[list[i].dataset.flower] || '';
    }
  };
  const refresh = () => {
    list = cards.filter((c) => !c.hidden);
    wrap.style.setProperty('--n', String(Math.max(1, list.length)));
    totalEl.textContent = pad(list.length);
    idx = -1;
    update();
  };
  const disable = () => {
    root.classList.remove('fx3d');
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    cards.forEach((c) => { c.style.removeProperty('--a'); c.style.removeProperty('--o'); c.classList.remove('is-active'); });
  };

  if (!on()) return;
  refresh();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  document.addEventListener('ffp:filter', refresh);
  // Клавиатура: фокус на скрытой карточке прокручивает к её цветку.
  wrap.addEventListener('focusin', (e) => {
    const c = e.target.closest('.pcard');
    if (!on() || !c || !e.target.matches(':focus-visible')) return;
    const k = list.indexOf(c);
    if (k < 0) return;
    const r = wrap.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    window.scrollTo({ top: window.scrollY + r.top + total * ((k + 0.72) / list.length), behavior: 'auto' });
  });

  const ctrl = { wrap, cards, list: () => list, progress };
  whenNear(section, () => {
    import('./scenes/projects-bloom.js')
      .then((m) => { if (!m.mount(host, ctrl)) disable(); })
      .catch(disable);
  });
}
initProjects();

// 4. Столы — закреплённая секция
const tableHost = document.querySelector('[data-scene="table"]');
if (tableHost) {
  const section = tableHost.closest('section');
  const steps = Array.from(section.querySelectorAll('.tables__step'));
  const caption = section.querySelector('.tables__caption');
  const onStep = (i) => {
    section.dataset.step = String(i);
    const p = steps[i] && steps[i].querySelector('p');
    if (caption && p) caption.textContent = p.textContent;
    steps.forEach((s, k) => {
      s.classList.toggle('is-on', k === i);
      s.classList.toggle('is-done', k < i);
      if (k === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    });
  };
  onStep(0);
  whenNear(section, () => {
    import('./scenes/table.js')
      .then((m) => { if (!m.mount(tableHost, section, onStep)) fallback(tableHost, section); })
      .catch(() => fallback(tableHost, section));
  });
}
