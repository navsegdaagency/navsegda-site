/* НАВСЕГДА · «Путь к вашему дню» — один Three.js-холст, камера летит между 10 сценами при прокрутке.
 * Секция закреплена (position: sticky). Рендер идёт только пока секция на экране.
 * Если не получилось (нет WebGL2, reduce-motion, ошибка) — остаётся статичная вёрстка из 10 карточек. */
import { THREE, clamp, lerp, smooth, easeInOut } from '/assets/js/wedding-journey/core.js?v=wj1';
import { RoomEnvironment } from '/assets/vendor/addons/RoomEnvironment.js';
import { sceneIntro, sceneProposal, sceneTeam, sceneMeeting, sceneRoute } from '/assets/js/wedding-journey/scenes-a.js?v=wj1';
import { sceneHall, sceneCards } from '/assets/js/wedding-journey/scenes-b.js?v=wj1';
import { sceneEvent, sceneCouple, sceneFinale } from '/assets/js/wedding-journey/scenes-c.js?v=wj1';

const root = document.getElementById('nsg-journey');

function fallback(why) {
  if (window.console && why) console.warn('[nsg-journey]', why);
  if (root) { if (root.__jrAnc) root.__jrAnc.style.removeProperty('overflow'); root.classList.remove('jr--3d'); root.classList.add('jr--static'); const t = root.querySelector('.jr__track'); if (t) t.style.height = ''; }
}

(function main() {
  if (!root || !root.classList.contains('jr--3d')) return;
  const track = root.querySelector('.jr__track'), stick = root.querySelector('.jr__stick'), canvas = root.querySelector('.jr__gl');
  const steps = [...root.querySelectorAll('.jr__step')], bars = [...root.querySelectorAll('.jr__pbtn')];
  const glowEl = root.querySelector('.jr__glow'), flashEl = root.querySelector('.jr__flash'), hintEl = root.querySelector('.jr__hint');
  const counter = root.querySelector('.jr__count'), cta = root.querySelector('.jr__cta');
  const subs = [...root.querySelectorAll('.jr__sub li')];
  if (!track || !stick || !canvas || steps.length !== 10) return fallback('markup');

  const mobile = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  const E = { mobile };
  const LENS = [1, 1, 1, 1, 1, 1, 1, 2.2, 1, 1.25], TRAVEL = 0.45; // единица шкалы = 0.85 экрана прокрутки (см. --jr-k в CSS)
  const STARTS = []; let TOTAL = 0; LENS.forEach((l) => { STARTS.push(TOTAL); TOTAL += l; });
  const HOLD_END = LENS.map((l, i) => STARTS[i] + l - (i < 9 ? TRAVEL : 0));
  const GAP = 52;

  // высота дорожки задана в CSS: --jr-k = TOTAL * PER_UNIT + 1 (в экранах)

  let renderer, scene, camera, envTex, scenes = [], built = 0, running = false, inView = false, raf = 0, destroyed = false;
  let sS = 0, sInit = false, force = null, tTime = 0, last = 0, w = 0, h = 0, dpr = 1;
  const pLights = {};
  const state = { cur: 0 };

  function setup() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!renderer.capabilities.isWebGL2) throw new Error('webgl2');
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    const env = new RoomEnvironment(); envTex = pm.fromScene(env, 0.04).texture; scene.environment = envTex; pm.dispose();
    camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 220);
    const hemi = new THREE.HemisphereLight(0xffe7c6, 0x4e0002, 0.85); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0dc, 1.7); key.position.set(3, 6, 5); scene.add(key);
    const warm = new THREE.PointLight(0xffd9a0, 30, 40, 2); scene.add(warm);
    pLights.warm = warm; pLights.key = key;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); fallback('contextlost'); }, false);

    const builders = [sceneIntro, sceneProposal, sceneTeam, sceneMeeting, sceneRoute, sceneHall, sceneCards, sceneEvent, sceneCouple, sceneFinale];
    // сцены строим по одной за кадр, чтобы не вешать страницу
    let i = 0;
    const buildNext = () => {
      if (destroyed) return;
      if (i >= builders.length) return;
      try {
        const sc = builders[i](E);
        applyEnv(sc.group);
        sc.group.position.x = i * GAP; sc.group.visible = false; scene.add(sc.group); scenes[i] = sc;
        // прогреваем шейдеры сцены
        sc.group.visible = true; resize(true);
        try { sc.update(0.5, 0.5, 0.016); } catch (e) {}
        renderer.compile(scene, camera);
        sc.group.visible = false;
      } catch (e) { return fallback(e && e.message ? e.message : e); }
      built = ++i;
      (window.requestIdleCallback || ((f) => setTimeout(f, 30)))(buildNext, { timeout: 200 });
    };
    buildNext();
  }

  // В three r163+ envMapIntensity работает только у материала с собственным envMap — задаём явно.
  const ENV_K = 0.5;
  function applyEnv(group) {
    group.traverse((o) => {
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach((m) => { if (m.isMeshStandardMaterial && !m.userData.envSet) { m.userData.envSet = 1; m.envMap = envTex; m.envMapIntensity = (m.envMapIntensity == null ? 1 : m.envMapIntensity) * ENV_K; } });
    });
  }

  function resize(force2) {
    const W = stick.clientWidth, H = stick.clientHeight;
    if (!W || !H || !renderer) return;
    if (!force2 && W === w && H === h) return;
    w = W; h = H;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // сдвигаем кадр: на телефоне сцена выше текста, на десктопе — правее от подписи
    if (W >= 1000) camera.setViewOffset(W, H, -W * 0.1, 0, W, H);
    else if (W < 768) camera.setViewOffset(W, H, 0, H * 0.13, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _pos = new THREE.Vector3(), _tgt = new THREE.Vector3(), _lc = new THREE.Color(), _lc2 = new THREE.Color();
  function poseOf(i, p, t) { const c = scenes[i].cam(p, t); return { pos: c.pos, tgt: c.tgt, ox: i * GAP }; }

  function readS() {
    if (force !== null) return force;
    const r = track.getBoundingClientRect(), total = r.height - stick.clientHeight;
    return total > 0 ? clamp(-r.top / total) * TOTAL : 0;
  }

  /* ───── один кадр: s — позиция на шкале этапов 0..TOTAL ───── */
  function update(s, dt) {
    let cur = 0;
    for (let i = 0; i < 10; i++) if (s >= STARTS[i]) cur = i;
    cur = Math.min(cur, Math.max(0, built - 1));
    const tr = cur < 9 ? clamp((s - HOLD_END[cur]) / TRAVEL) : 0;
    const nextReady = cur < 9 && built > cur + 1;
    const showNext = tr > 0 && nextReady;
    state.cur = cur;
    scenes.forEach((sc, i) => { sc.group.visible = i === cur || (i === cur + 1 && showNext); });
    const pOf = (i) => clamp((s - STARTS[i]) / (HOLD_END[i] - STARTS[i]));
    const p = pOf(cur);
    scenes[cur].update(p, tTime, dt);
    if (showNext) scenes[cur + 1].update(0, tTime, dt);

    // камера
    const A = poseOf(cur, p, tTime);
    let pos = A.pos, tgt = A.tgt, ox = A.ox;
    if (showNext || tr > 0) {
      const e = easeInOut(tr);
      const Bp = nextReady ? poseOf(cur + 1, 0, tTime) : A;
      const PA = _a.set(A.pos[0] + A.ox, A.pos[1], A.pos[2]), PB = _b.set(Bp.pos[0] + Bp.ox, Bp.pos[1], Bp.pos[2]);
      _pos.copy(PA).lerp(PB, e);
      _tgt.set(lerp(A.tgt[0] + A.ox, Bp.tgt[0] + Bp.ox, e), lerp(A.tgt[1], Bp.tgt[1], e), lerp(A.tgt[2], Bp.tgt[2], e));
      const arc = Math.sin(Math.PI * e);
      _pos.y += arc * 1.4; _pos.z += arc * 3.2;
      pos = [_pos.x - 0, _pos.y, _pos.z]; tgt = [_tgt.x, _tgt.y, _tgt.z]; ox = 0;
    }
    // подгонка под узкие экраны: отодвигаем камеру
    const asp = w / Math.max(1, h);
    const fit = asp < 1.35 ? clamp(Math.pow(1.35 / asp, 0.92), 1, 2.5) : 1;
    _tgt.set(tgt[0] + ox, tgt[1], tgt[2]);
    _pos.set(pos[0] + ox, pos[1], pos[2]);
    if (fit !== 1) _pos.sub(_tgt).multiplyScalar(fit).add(_tgt);
    camera.position.copy(_pos); camera.lookAt(_tgt);

    // свет
    const m0 = scenes[cur].mood, m1 = showNext ? scenes[cur + 1].mood : m0, e1 = showNext ? easeInOut(tr) : 0;
    _lc.set(m0.lc); _lc2.set(m1.lc); _lc.lerp(_lc2, e1);
    pLights.warm.color.copy(_lc); pLights.warm.intensity = lerp(m0.li, m1.li, e1) * (fit > 1 ? 1 + (fit - 1) * 1.2 : 1);
    pLights.warm.position.set(_tgt.x + 1.8, _tgt.y + 3.2, _tgt.z + 4.2);
    pLights.key.position.set(_tgt.x + 3, _tgt.y + 6, _tgt.z + 5); pLights.key.target.position.copy(_tgt); pLights.key.target.updateMatrixWorld();

    // DOM: подписи, шкала, фон
    const g = lerp(m0.glow, m1.glow, e1);
    if (glowEl) glowEl.style.opacity = g.toFixed(3);
    if (flashEl) { const f = scenes[9] && cur === 9 ? scenes[9].flash || 0 : 0; flashEl.style.opacity = (f * 0.55).toFixed(3); }
    steps.forEach((el, i) => {
      const fi = i === 0 ? 1 : smooth(STARTS[i] - 0.02, STARTS[i] + 0.12, s);
      const fo = i === 9 ? 0 : smooth(HOLD_END[i] - 0.04, HOLD_END[i] + 0.1, s);
      const v = clamp(fi * (1 - fo));
      const q = Math.round(v * 100) / 100;
      if (el._v !== q) { el._v = q; el.style.opacity = q; el.style.transform = 'translate3d(0,' + ((1 - q) * 18).toFixed(1) + 'px,0)'; el.classList.toggle('is-on', q > 0.5); }
    });
    if (cta) { const on = cur === 9 && p > 0.45; if (cta._on !== on) { cta._on = on; cta.style.visibility = on ? 'visible' : 'hidden'; cta.tabIndex = on ? 0 : -1; } }
    if (scenes[7] && subs.length) { const ph = cur === 7 ? scenes[7].phase(p) : -1; subs.forEach((li, k) => { const on = ph === k; if (li._on !== on) { li._on = on; li.classList.toggle('is-on', on); } }); }
    bars.forEach((b, i) => {
      const f = clamp((s - STARTS[i]) / LENS[i]);
      const q = Math.round(f * 200) / 200;
      if (b._f !== q) { b._f = q; b.firstElementChild.firstElementChild.style.transform = 'scaleX(' + q + ')'; }
      const on = i === cur; if (b._on !== on) { b._on = on; b.classList.toggle('is-on', on); if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }
    });
    if (counter && counter._c !== cur) { counter._c = cur; counter.textContent = String(cur + 1).padStart(2, '0') + ' / 10'; }
    if (hintEl) { const o = s < 0.25 ? 1 : 0; if (hintEl._o !== o) { hintEl._o = o; hintEl.style.opacity = o; } }
  }

  /* ───── цикл ───── */
  let accN = 0, accT = 0, warm = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dtMs = last ? Math.min(100, now - last) : 16.7; last = now;
    step(dtMs / 1000);
    // адаптивное качество: если кадр долгий — снижаем плотность пикселей
    if (warm < 40) warm++; else { accT += dtMs; accN++; if (accN >= 45) { const avg = accT / accN; accN = 0; accT = 0; if (avg > 24 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); resize(true); } } }
  }
  function step(dt) {
    if (!built || !scenes[0]) return;
    tTime += dt;
    const target = readS();
    if (!sInit || force !== null) { sS = target; sInit = true; } else sS += (target - sS) * (1 - Math.exp(-dt * 7));
    resize();
    update(sS, dt);
    renderer.render(scene, camera);
  }
  function start() { if (running || destroyed) return; running = true; last = 0; warm = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const sync = () => (inView && !document.hidden && built ? start() : stop());

  // навигация по шкале
  bars.forEach((b, i) => b.addEventListener('click', () => {
    const r = track.getBoundingClientRect(), total = r.height - stick.clientHeight;
    const s = STARTS[i] + 0.92 * (HOLD_END[i] - STARTS[i]);
    window.scrollTo({ top: window.scrollY + r.top + (s / TOTAL) * total, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));

  new ResizeObserver(() => resize()).observe(stick);
  try { setup(); } catch (e) { return fallback(e && e.message ? e.message : e); }
  // «видимость» по реальному экрану для паузы рендера (узкая зона)
  new IntersectionObserver((en) => { inView = en[en.length - 1].isIntersecting; sync(); }, { rootMargin: '10% 0px 10% 0px' }).observe(track);
  document.addEventListener('visibilitychange', sync);
  // если сцены достроились уже после входа в зону
  const poll = setInterval(() => { if (destroyed) return clearInterval(poll); if (built >= 2) { sync(); if (built >= 10) clearInterval(poll); } }, 300);

  /*JRTEST*/
})();
