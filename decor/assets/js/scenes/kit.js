// FFP — общий каркас для 3D-сцен.
// Отвечает за: проверку WebGL2, рендерер (ACESFilmic, sRGB, мягкие тени),
// окружение для отражений (RoomEnvironment + PMREM), лёгкий постпроцессинг
// (MSAA → bloom → тонмаппинг, виньетка, зерно), адаптивное качество
// (плотность пикселей вверх/вниз по фактическому fps + ступени эффектов),
// запуск/паузу по IntersectionObserver и видимости вкладки,
// prefers-reduced-motion (один статичный кадр) и полную очистку ресурсов.
import * as THREE from 'three';

export { THREE };

// Дополнения three/examples грузим параллельно. Если CDN их не отдал —
// сцены всё равно работают: без окружения и постобработки, но с тонмаппингом.
const addon = (p) => import(`three/addons/${p}`).catch(() => null);
const [ENV, BLOOM, PASS] = await Promise.all([
  addon('environments/RoomEnvironment.js'),
  addon('postprocessing/UnrealBloomPass.js'),
  addon('postprocessing/Pass.js'),
]);

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
const cores = navigator.hardwareConcurrency || 4;
const memory = navigator.deviceMemory || 8;
// «Слабое» устройство стартует сразу со средней ступени качества.
export const lowEnd = isMobile ? (cores <= 4 || memory <= 3) : (cores <= 2 || memory <= 2);

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);

let glOk = null;
export function webglAvailable() {
  if (glOk !== null) return glOk;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
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

// Хвост для собственных ShaderMaterial: в прямом рендере (без постобработки)
// даёт тонмаппинг и sRGB, в рендер-таргет постобработки — ничего не меняет.
export const GLSL_OUT = /* glsl */`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

// Мягкая точка для частиц (общий GLSL)
export const GLSL_SOFT_POINT = /* glsl */`
  float softPoint(vec2 pc){ float d = length(pc - 0.5); return smoothstep(0.5, 0.0, d); }
`;

// Микрорельеф без текстур: нормаль возмущается производными процедурной «высоты»
// (прожилки лепестков, переплетение льна). Работает в любом физическом материале.
export const GLSL_BUMP = /* glsl */`
  vec3 ffpBump(vec3 surfPos, vec3 n, float h, float faceDir) {
    vec3 sx = dFdx(surfPos), sy = dFdy(surfPos);
    vec3 r1 = cross(sy, n), r2 = cross(n, sx);
    float det = dot(sx, r1) * faceDir;
    vec2 dh = vec2(dFdx(h), dFdy(h));
    vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
    vec3 r = abs(det) * n - grad;
    // крошечная (ещё не выросшая) геометрия: производные ≈ 0 — оставляем нормаль как есть, без NaN
    float l2 = dot(r, r);
    return (l2 > 1e-24 && l2 == l2) ? r * inversesqrt(l2) : n;
  }
`;

/**
 * Встраивает свой код в стандартный шейдер three (MeshPhysicalMaterial и т.п.).
 * spec: {
 *   key: уникальный ключ программы,
 *   uniforms: { name: {value} } — общие объекты, их можно менять снаружи,
 *   head: GLSL (uniform/attribute/varying/функции) для вершинного шейдера,
 *   body: GLSL внутри ffpCalc(out pos, out nrm): деформация вершины, lp = localP(),
 *   frag: [[chunk, code, 'before'|'after'|'replace'], ...] — правки фрагментного,
 *   fragHead: GLSL для фрагментного,
 * }
 */
const V_COMMON = /* glsl */`
  uniform float uP;
  uniform float uTime;
  #ifdef STAGGER
    attribute float aT;
  #endif
  float localP() {
    #ifdef STAGGER
      return clamp(uP * 1.7 - aT * 0.7, 0.0, 1.0);
    #else
      return uP;
    #endif
  }
  float outBack(float x) { float c1 = 1.4; float c3 = c1 + 1.0; return 1.0 + c3 * pow(x - 1.0, 3.0) + c1 * pow(x - 1.0, 2.0); }
`;
const vertexHead = (spec) => `${V_COMMON}
  varying vec2 vPUv;
  ${spec.head || ''}
  void ffpCalc(out vec3 pos, out vec3 nrm) {
    pos = position; nrm = normal; vPUv = uv;
    float lp = localP();
    ${spec.body || ''}
    // вырожденная нормаль (кончик лепестка, нулевой масштаб) → без NaN в HDR-буфере
    float nl = dot(nrm, nrm);
    nrm = (nl > 1e-20 && nl == nl) ? nrm * inversesqrt(nl) : vec3(0.0, 1.0, 0.0);
  }`;
const put = (src, chunk, code, mode) => {
  const tag = `#include <${chunk}>`;
  if (!src.includes(tag)) return src;
  if (mode === 'replace') return src.replace(tag, code);
  if (mode === 'before') return src.replace(tag, `${code}\n${tag}`);
  return src.replace(tag, `${tag}\n${code}`);
};

export function patchMaterial(mat, spec) {
  const uniforms = { uP: { value: 1 }, uTime: { value: 0 }, ...(spec.uniforms || {}) };
  mat.userData.uniforms = uniforms;
  mat.customProgramCacheKey = () => spec.key;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    let vs = put(sh.vertexShader, 'common', vertexHead(spec), 'after');
    vs = put(vs, 'beginnormal_vertex', 'vec3 ffpPos, ffpNrm; ffpCalc(ffpPos, ffpNrm); vec3 objectNormal = ffpNrm;', 'replace');
    vs = put(vs, 'begin_vertex', 'vec3 transformed = ffpPos;', 'replace');
    let fs = put(sh.fragmentShader, 'common', `varying vec2 vPUv;\n${GLSL_BUMP}\n${spec.fragHead || ''}`, 'after');
    (spec.frag || []).forEach(([chunk, code, mode]) => { fs = put(fs, chunk, code, mode); });
    sh.vertexShader = vs;
    sh.fragmentShader = fs;
  };
  return mat;
}

// Материал глубины для теней с той же деформацией вершин.
export function depthFor(mat, spec) {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  if (mat.defines) d.defines = { ...(d.defines || {}), ...Object.fromEntries(Object.entries(mat.defines).filter(([k]) => k !== 'STANDARD' && k !== 'PHYSICAL')) };
  d.customProgramCacheKey = () => `${spec.key}-depth`;
  d.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, mat.userData.uniforms);
    let vs = put(sh.vertexShader, 'common', vertexHead(spec), 'after');
    vs = put(vs, 'begin_vertex', 'vec3 ffpPos, ffpNrm; ffpCalc(ffpPos, ffpNrm); vec3 transformed = ffpPos;', 'replace');
    sh.vertexShader = vs;
  };
  return d;
}

// ─── Постобработка ───
// Сцена рисуется в HDR-таргет с MSAA и прозрачным фоном (premultiplied).
// Финальный проход тонмаппит только «содержимое», поэтому CSS-фон под канвасом
// виден без искажений, а свечение bloom ложится поверх него аддитивно.
const FINISH_VS = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FINISH_FS = /* glsl */`
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float uBloom;
  uniform float uExposure;
  uniform float uVig;
  uniform float uGrain;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uPR;
  varying vec2 vUv;
  vec3 rrtOdt(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
  vec3 aces(vec3 c) {
    const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    c *= uExposure / 0.6;
    return clamp(OUT * rrtOdt(IN * c), 0.0, 1.0);
  }
  vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  void main() {
    vec4 s = texture2D(tScene, vUv);
    if (!(dot(s, s) < 1e9)) s = vec4(0.0); // NaN/Inf-страховка
    float a = clamp(s.a, 0.0, 1.0);
    vec3 b = uBloom > 0.5 ? texture2D(tBloom, vUv).rgb : vec3(0.0);
    if (!(dot(b, b) < 1e9)) b = vec3(0.0);
    vec3 straight = s.rgb / max(a, 1e-3);
    vec3 col = srgb(aces(straight + b)) * a;
    vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
    col *= 1.0 - uVig * smoothstep(0.45, 1.15, length(q) * 1.25);
    vec2 g = floor(gl_FragCoord.xy / max(uPR, 1.0));
    float n = hash(g + fract(uTime * 7.31) * 517.0) + hash(g * 1.37 + fract(uTime * 3.17) * 211.0) - 1.0;
    col += n * uGrain * a;
    // свечение поверх фона страницы — как полупрозрачный слой своего цвета
    // (корректный premultiplied: rgb ≤ alpha, без «сверхъярких» пикселей)
    vec3 G = srgb(aces(b));
    float ga = clamp(max(G.r, max(G.g, G.b)), 0.0, 1.0) * (1.0 - a);
    float outA = a + ga;
    col = clamp(col + G * (1.0 - a), 0.0, 1.0);
    // дизеринг ±½ шага 8 бит: без колец на слабом свечении и градиентах
    float dn = (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) / 255.0;
    outA = clamp(outA + dn * step(0.0005, outA), 0.0, 1.0);
    col = clamp(col + dn, 0.0, 1.0);
    gl_FragColor = vec4(min(col, vec3(outA)), outA);
  }
`;

function createFX(renderer, opts) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  rt.texture.name = 'ffp.scene';
  let bloom = null;
  if (opts.bloom) {
    const b = opts.bloom;
    bloom = new BLOOM.UnrealBloomPass(new THREE.Vector2(256, 256), b.strength ?? 0.5, b.radius ?? 0.6, b.threshold ?? 0.9);
    // Свечение остаётся в своей текстуре — смешиваем его сами в финальном проходе.
    // Штатный шаг «наложить на readBuffer» пропускаем целиком: он лишь повторно
    // резолвит MSAA-таргет (≈4 мс на 5 Мп).
    const quadRender = bloom.fsQuad.render.bind(bloom.fsQuad);
    bloom.fsQuad.render = (r) => { if (bloom.fsQuad.material !== bloom.blendMaterial) quadRender(r); };
  }
  const u = {
    tScene: { value: rt.texture }, tBloom: { value: null }, uBloom: { value: 0 },
    uExposure: { value: renderer.toneMappingExposure }, uVig: { value: opts.vignette ?? 0.14 },
    uGrain: { value: opts.grain ?? 0.018 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uPR: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: FINISH_VS, fragmentShader: FINISH_FS, depthTest: false, depthWrite: false });
  const quad = new PASS.FullScreenQuad(mat);
  const bloomScale = opts.bloomScale ?? 0.5;

  const releaseTargets = () => {
    rt.dispose();
    if (bloom) {
      bloom.renderTargetBright.dispose();
      bloom.renderTargetsHorizontal.forEach((r) => r.dispose());
      bloom.renderTargetsVertical.forEach((r) => r.dispose());
    }
  };
  return {
    setSize(w, h, pr) {
      const pw = Math.max(1, Math.round(w * pr)), ph = Math.max(1, Math.round(h * pr));
      // MSAA x4 на обычной плотности; на Retina/4K (≥1.75) хватает x2 — пиксели и так мелкие
      const s = pr >= 1.75 || pw * ph > 6e6 ? 2 : 4;
      if (rt.samples !== s) { rt.samples = s; rt.dispose(); }
      rt.setSize(pw, ph);
      if (bloom) bloom.setSize(Math.max(2, Math.round(pw * bloomScale)), Math.max(2, Math.round(ph * bloomScale)));
      u.uRes.value.set(pw, ph);
      u.uPR.value = pr;
    },
    render(scene, camera, t, level) {
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      const useBloom = !!bloom && level >= 1;
      if (useBloom) bloom.render(renderer, null, rt, 0, false);
      u.tBloom.value = useBloom ? bloom.renderTargetsHorizontal[0].texture : null;
      u.uBloom.value = useBloom ? 1 : 0;
      u.uTime.value = t;
      u.uExposure.value = renderer.toneMappingExposure;
      renderer.setRenderTarget(null);
      quad.render(renderer);
    },
    release: releaseTargets,
    dispose() {
      releaseTargets();
      if (bloom) bloom.dispose();
      mat.dispose();
      quad.dispose();
    },
  };
}

/**
 * Монтирует сцену в host.
 * setup(ctx) → { scene, camera, update(t, dt), resize(w, h, pr), staticFrame?(), quality?(level), dispose?() }
 * ctx: { renderer, canvas, host, THREE, mobile, reduced, env, level, hq }
 * opts: { observe, shadows, bloom: {strength, radius, threshold} | false, grain, vignette, exposure, env, dprCap }
 * Ступени качества: 2 — всё (пропускание стекла, bloom, тени), 1 — без дорогих
 * эффектов сцены, 0 — без постобработки. Ступень только понижается.
 */
export function mountScene(host, setup, opts = {}) {
  if (!host || !webglAvailable()) { host && host.classList.add('is-fallback'); return null; }

  const canvas = document.createElement('canvas');
  canvas.className = 'scene__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  const usePost = !!(BLOOM && PASS);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      premultipliedAlpha: true,
      // при постобработке сглаживает MSAA-таргет, сам канвас без AA (экономия памяти)
      antialias: !usePost,
      powerPreference: 'high-performance',
      stencil: false,
    });
    if (!renderer.capabilities.isWebGL2) throw new Error('webgl2');
  } catch (e) {
    if (renderer) renderer.dispose();
    canvas.remove();
    host.classList.add('is-fallback');
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  renderer.setClearColor(0x000000, 0);
  if (opts.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  // Плотность пикселей: мобильные стартуют с 1.5 (потолок 2), десктоп — с 2,
  // а на 4K/Retina поднимается до нативной, если держится 50+ fps.
  const dpr = window.devicePixelRatio || 1;
  const prMax = Math.min(isMobile ? Math.min(dpr, 2) : Math.min(dpr, 3), opts.dprCap || 9);
  const prFloor = Math.min(1, prMax);
  let prCeil = prMax;
  let pr = Math.min(prMax, isMobile ? 1.5 : 2);
  let level = lowEnd ? 1 : 2;
  renderer.setPixelRatio(pr);

  let env = null;
  if (ENV && opts.env !== false) {
    try {
      const pm = new THREE.PMREMGenerator(renderer);
      const room = new ENV.RoomEnvironment(renderer);
      env = pm.fromScene(room, 0.04).texture;
      room.dispose();
      pm.dispose();
    } catch (e) { env = null; }
  }
  const fx = usePost ? createFX(renderer, opts) : null;

  const api = setup({
    renderer, canvas, host, THREE, env, level,
    mobile: isMobile, reduced: reducedMotion, hq: !isMobile && !lowEnd,
  });

  let w = 0, h = 0;
  let running = false, inView = false, raf = 0, last = 0, time = 0, destroyed = false;

  const draw = (t) => {
    if (fx && level > 0) fx.render(api.scene, api.camera, t, level);
    else { renderer.setRenderTarget(null); renderer.render(api.scene, api.camera); }
  };
  const applySize = () => {
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    if (fx) fx.setSize(w, h, pr);
    api.resize(w, h, pr);
  };

  const renderOnce = () => {
    if (destroyed || !w) return;
    // reduced-motion — статичный кадр; иначе текущее состояние без анимации (dt=1 → сразу к цели)
    if (reducedMotion && api.staticFrame) api.staticFrame();
    else api.update(time, 1);
    draw(time);
  };

  const resize = () => {
    const r = host.getBoundingClientRect();
    const nw = Math.max(1, Math.round(r.width));
    const nh = Math.max(1, Math.round(r.height));
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    applySize();
    if (!running) renderOnce();
  };

  // ─── адаптивное качество ───
  // Окна по 40 кадров (медиана). < ~42 fps два окна подряд → ступень вниз;
  // ≥ ~52 fps три окна подряд → плотность пикселей вверх (не выше прошлой «тяжёлой»).
  // Медиана окна, а не среднее: разовые подвисания (компиляция шейдеров соседней
  // сцены, GC) не должны ронять качество.
  const win = new Float32Array(40);
  let frames = 0, slow = 0, fast = 0, warm = 0;
  // Лестница вниз: плотность до 1.5 → без дорогих эффектов → плотность до 1 → без постобработки.
  // После снятия эффектов плотности снова разрешено расти (освободился бюджет).
  const dropLevel = () => { level--; prCeil = prMax; if (api.quality) api.quality(level); };
  const degrade = () => {
    if (pr > 1.5 + 0.01) pr = Math.max(1.5, pr > 2 ? pr - 0.5 : pr - 0.25);
    else if (level === 2) { dropLevel(); return; }
    else if (pr > prFloor + 0.01) pr = Math.max(prFloor, pr - 0.25);
    else if (level === 1) { dropLevel(); return; }
    else return;
    prCeil = pr;
    applySize();
  };
  const upgrade = () => {
    if (pr >= prCeil - 0.01) return;
    pr = Math.min(prCeil, pr + 0.25);
    applySize();
  };
  const adapt = (dtMs) => {
    if (warm < 30) { warm++; return; } // первые кадры: компиляция шейдеров, прогрев
    win[frames++] = dtMs;
    if (frames < win.length) return;
    frames = 0;
    const avg = win.slice().sort()[win.length >> 1];
    if (avg > 24) { fast = 0; if (++slow >= 2) { slow = 0; degrade(); } }
    else if (avg < 19) { slow = 0; if (++fast >= 3) { fast = 0; upgrade(); } }
    else { slow = 0; fast = 0; }
  };

  const tick = (dtMs) => {
    const dt = Math.min(0.05, dtMs / 1000);
    time += dt;
    api.update(time, dt);
    draw(time);
    adapt(dtMs);
  };
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dtMs = last ? now - last : 16.7;
    last = now;
    tick(dtMs);
  };

  const start = () => {
    if (running || destroyed || reducedMotion || !w) return;
    running = true; last = 0; warm = 0; frames = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    // вне экрана освобождаем тяжёлые HDR-таргеты; при возврате создадутся заново
    if (fx) fx.release();
  };
  const sync = () => (inView && !document.hidden ? start() : stop());

  const io = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    if (inView && reducedMotion) renderOnce();
    sync();
  }, { rootMargin: '80px 0px' });
  io.observe(opts.observe || host);

  const ro = new ResizeObserver(() => { resize(); sync(); });
  ro.observe(host);
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);

  const onLost = (e) => { e.preventDefault(); stop(); host.classList.add('is-fallback'); };
  const onRestored = () => { host.classList.remove('is-fallback'); w = h = 0; resize(); sync(); };
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  const onShow = (e) => { if (e.persisted && !destroyed) sync(); };
  const destroy = () => {
    if (destroyed) return;
    stop();
    destroyed = true;
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('pageshow', onShow);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (api.dispose) api.dispose();
    disposeScene(api.scene);
    if (fx) fx.dispose();
    if (env) env.dispose();
    renderer.dispose();
    canvas.remove();
  };
  const onHide = (e) => { if (!e.persisted) destroy(); else stop(); };
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', onShow);

  resize();
  requestAnimationFrame(() => host.classList.add('is-ready'));
  return { destroy, renderer };
}

export function disposeScene(scene) {
  if (!scene) return;
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose();
    const mats = [];
    if (o.material) mats.push(...(Array.isArray(o.material) ? o.material : [o.material]));
    if (o.customDepthMaterial) mats.push(o.customDepthMaterial);
    mats.forEach((mm) => {
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
