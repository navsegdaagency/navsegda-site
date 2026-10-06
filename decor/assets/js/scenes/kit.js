// FFP — общий каркас для 3D-сцен.
// Отвечает за: проверку WebGL, рендерер с DPR ≤ 1.75, запуск/паузу по
// IntersectionObserver и видимости вкладки, prefers-reduced-motion (один
// статичный кадр), адаптивное снижение качества и полную очистку ресурсов.
import * as THREE from 'three';

export { THREE };

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
export const DPR_CAP = 1.75;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);

let glOk = null;
export function webglAvailable() {
  if (glOk !== null) return glOk;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    glOk = !!gl;
    if (gl) { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
  } catch (e) { glOk = false; }
  return glOk;
}

// Прогресс секции: 0 — верх секции у нижнего края экрана, 1 — низ секции ушёл за верх.
export function passProgress(el) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return clamp((vh - r.top) / (r.height + vh));
}
// Прогресс закреплённой секции: 0 — секция прилипла, 1 — закрепление закончилось.
export function pinProgress(el) {
  const r = el.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  return total > 0 ? clamp(-r.top / total) : 0;
}

/**
 * Монтирует сцену в host.
 * setup(ctx) → { scene, camera, update(t, dt), resize(w, h), staticFrame?(), dispose?() }
 * opts: { observe, alpha, clearColor, antialias, dprCap }
 */
export function mountScene(host, setup, opts = {}) {
  if (!host || !webglAvailable()) { host && host.classList.add('is-fallback'); return null; }

  const canvas = document.createElement('canvas');
  canvas.className = 'scene__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: opts.alpha !== false,
      antialias: opts.antialias !== false,
      powerPreference: 'high-performance',
      stencil: false,
    });
  } catch (e) {
    canvas.remove();
    host.classList.add('is-fallback');
    return null;
  }
  const cap = Math.min(opts.dprCap || DPR_CAP, DPR_CAP);
  let pr = Math.min(window.devicePixelRatio || 1, cap);
  renderer.setPixelRatio(pr);
  if (opts.alpha === false && opts.clearColor !== undefined) renderer.setClearColor(opts.clearColor, 1);
  else renderer.setClearColor(0x000000, 0);

  const api = setup({ renderer, canvas, host, THREE, mobile: isMobile, reduced: reducedMotion });

  let w = 0, h = 0;
  let running = false, inView = false, raf = 0, last = 0, time = 0, destroyed = false;
  let frames = 0, acc = 0, slowStreak = 0;

  const renderOnce = () => {
    if (destroyed) return;
    // reduced-motion — статичный кадр; иначе текущее состояние без анимации (dt=1 → сразу к цели)
    if (reducedMotion && api.staticFrame) api.staticFrame();
    else api.update(time, 1);
    renderer.render(api.scene, api.camera);
  };

  const resize = () => {
    const r = host.getBoundingClientRect();
    const nw = Math.max(1, Math.round(r.width));
    const nh = Math.max(1, Math.round(r.height));
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    api.resize(w, h);
    if (!running) renderOnce();
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dtMs = last ? now - last : 16.7;
    last = now;
    const dt = Math.min(0.05, dtMs / 1000);
    time += dt;
    api.update(time, dt);
    renderer.render(api.scene, api.camera);

    // Адаптивное качество: если долго держится < ~40 fps — снижаем плотность пикселей.
    acc += dtMs; frames++;
    if (frames >= 60) {
      const avg = acc / frames;
      slowStreak = avg > 25 ? slowStreak + 1 : 0;
      if (slowStreak >= 2 && pr > 1) {
        pr = Math.max(1, pr - 0.25);
        renderer.setPixelRatio(pr);
        renderer.setSize(w, h, false);
        slowStreak = 0;
      }
      frames = 0; acc = 0;
    }
  };

  const start = () => {
    if (running || destroyed || reducedMotion) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const sync = () => (inView && !document.hidden ? start() : stop());

  const io = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    if (inView && reducedMotion) renderOnce();
    sync();
  }, { rootMargin: '80px 0px' });
  io.observe(opts.observe || host);

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);

  const onLost = (e) => { e.preventDefault(); stop(); host.classList.add('is-fallback'); };
  const onRestored = () => { host.classList.remove('is-fallback'); w = h = 0; resize(); sync(); };
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    stop();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', onHide);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (api.dispose) api.dispose();
    disposeScene(api.scene);
    renderer.dispose();
    canvas.remove();
  };
  const onHide = (e) => { if (!e.persisted) destroy(); else stop(); };
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', (e) => { if (e.persisted && !destroyed) sync(); });

  resize();
  requestAnimationFrame(() => host.classList.add('is-ready'));
  return { destroy, renderer };
}

export function disposeScene(scene) {
  if (!scene) return;
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
      for (const k in mm) { const v = mm[k]; if (v && v.isTexture) v.dispose(); }
      if (mm.uniforms) for (const k in mm.uniforms) { const v = mm.uniforms[k].value; if (v && v.isTexture) v.dispose(); }
      mm.dispose();
    });
  });
}

// Детерминированный ГПСЧ, чтобы цветок/гирлянда выглядели одинаково при каждой загрузке.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Мягкая точка для частиц (общий GLSL)
export const GLSL_SOFT_POINT = /* glsl */`
  float softPoint(vec2 pc){ float d = length(pc - 0.5); return smoothstep(0.5, 0.0, d); }
`;
