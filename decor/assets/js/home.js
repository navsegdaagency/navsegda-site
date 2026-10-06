// Главная: ленивое подключение трёх 3D-сцен.
// Three.js и модули сцен грузятся динамически, поэтому, если CDN недоступен
// или нет WebGL, страница остаётся рабочей и показывает CSS-фолбэк.

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

// 3. Столы — закреплённая секция
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
