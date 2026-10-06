// «ПРОЕКТЫ» — расцветающие цветы.
// Секция закреплена на N экранов: в фокусе один цветок за раз —
// бутон поднимается снизу → раскрывается → карточка проекта выезжает (её
// двигает контроллер в home.js по тому же прогрессу) → цветок уходит вверх,
// снизу поднимается следующий. Вид и оттенок цветка берутся из data-flower /
// data-tone карточки; фильтр проектов меняет набор цветков на лету.
import { THREE, mountScene, clamp, lerp, smooth, rng, GLSL_OUT } from './kit.js';
import { buildFlower } from './flora.js';

const POLLEN_VS = /* glsl */`
  uniform float uTime; uniform float uSize; uniform float uAlpha;
  attribute vec4 aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    float t = uTime * aSeed.y;
    p.y = mod(p.y + t * 0.16 + 2.5, 5.0) - 2.5;
    p.x += sin(t * 0.7 + aSeed.x * 6.28) * 0.3;
    p.z += cos(t * 0.5 + aSeed.z * 6.28) * 0.2;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aSeed.w) / -mv.z;
    vA = uAlpha * smoothstep(2.5, 1.5, abs(p.y)) * (0.4 + 0.6 * aSeed.w);
  }`;
const POLLEN_FS = /* glsl */`
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vA;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(0.7, 0.5, 0.2), a);
    ${GLSL_OUT}
  }`;

export function mount(host, ctrl) {
  return mountScene(host, ({ mobile, reduced, env, hq }) => {
    const scene = new THREE.Scene();
    scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.set(0, 0.9, 7.2);
    const look = new THREE.Vector3(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xFFF6EA, 0xC2BBA8, env ? 0.5 : 1.3));
    const key = new THREE.DirectionalLight(0xFFF0DE, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -1.9, right: 1.9, top: 1.9, bottom: -1.9, near: 1, far: 16 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    const rim = new THREE.DirectionalLight(0xE6ECFF, 1.2);
    scene.add(key, key.target, rim);

    // цветы по карточкам (строим все сразу, видимы максимум два)
    const cards = ctrl.cards;
    const flowers = cards.map((c, i) => {
      const f = buildFlower({
        species: c.dataset.flower || 'peony', tone: c.dataset.tone || 'blush',
        mobile, seed: 11 + i * 7, stem: false, detail: hq ? 1.15 : 1,
      });
      const pivot = new THREE.Group();
      pivot.add(f.group);
      pivot.visible = false;
      scene.add(pivot);
      return { f, pivot, card: c };
    });

    // пыльца
    const R = rng(9);
    const nP = mobile ? 40 : 110;
    const pp = new Float32Array(nP * 3), ps = new Float32Array(nP * 4);
    for (let i = 0; i < nP; i++) {
      pp.set([(R() - 0.5) * 7, (R() - 0.5) * 5, (R() - 0.5) * 3], i * 3);
      ps.set([R(), 0.4 + R() * 0.8, R(), R()], i * 4);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    pg.setAttribute('aSeed', new THREE.BufferAttribute(ps, 4));
    const pollenMat = new THREE.ShaderMaterial({
      vertexShader: POLLEN_VS, fragmentShader: POLLEN_FS,
      uniforms: { uTime: { value: 0 }, uSize: { value: 30 }, uAlpha: { value: 0.8 } },
      transparent: true, depthWrite: false,
    });
    const pollen = new THREE.Points(pg, pollenMat);
    pollen.frustumCulled = false;
    scene.add(pollen);

    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e) => { pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = (e.clientY / window.innerHeight) * 2 - 1; };
    if (!reduced && !mobile) window.addEventListener('pointermove', onMove, { passive: true });

    let layout = { x: 0, y: 0, s: 1, travel: 3 };
    let prog = null;
    const tmp = new THREE.Vector3();

    const apply = (p, t) => {
      const list = ctrl.list();
      const N = Math.max(1, list.length);
      const x = p * N;
      flowers.forEach((fl) => { fl.pivot.visible = false; });
      list.forEach((card, k) => {
        const fl = flowers[cards.indexOf(card)];
        if (!fl) return;
        const l = x - k;
        const a = smooth(-0.16, 0.02, l);
        const e = k < N - 1 ? smooth(0.82, 1.1, l) : 0;
        if (a <= 0.001 || e >= 0.999) return;
        const o = smooth(0.0, 0.62, l);
        fl.f.setOpen(0.04 + o * 0.98 + Math.max(0, l - 0.62) * 0.08, t);
        const pv = fl.pivot;
        pv.visible = true;
        const sc = layout.s * (0.55 + 0.45 * a) * (1 - 0.3 * e);
        pv.scale.setScalar(sc);
        pv.position.set(
          layout.x - e * 0.35 * layout.s,
          layout.y - (1 - a) * layout.travel + e * layout.travel,
          0,
        );
        pv.rotation.set(0.5 + pointer.sy * 0.1 - (1 - a) * 0.4 + e * 0.5, t * 0.06 + l * 0.9 + k * 1.3 + pointer.sx * 0.25, pointer.sx * -0.05);
      });
      pollenMat.uniforms.uTime.value = t;
      // свет и тень следуют за точкой фокуса
      tmp.set(layout.x, layout.y, 0);
      key.target.position.copy(tmp);
      key.position.set(tmp.x - 3, tmp.y + 5, 3.5);
      rim.position.set(tmp.x + 3, tmp.y + 1.2, -3.5);
      camera.position.set(pointer.sx * 0.2, 0.9 - pointer.sy * 0.12, 7.2);
      camera.lookAt(look);
    };

    return {
      scene, camera,
      resize(w, h, pr) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const dist = camera.position.distanceTo(look);
        const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
        const visW = visH * camera.aspect;
        if (w >= 700) {
          // цветок слева от карточки
          const cardW = Math.min(400, w * (w >= 1024 ? 0.34 : 0.44));
          const free = (w - cardW - 64) / w;
          const cx = free * 0.5;
          layout = { x: (cx - 0.5) * visW, y: -0.05, s: Math.min(1.25, (visH * 0.62) / 2.4, (visW * free * 0.85) / 2.4), travel: visH * 0.62 };
        } else {
          // мобильный: цветок в верхней половине, карточка снизу
          layout = { x: 0, y: visH * 0.2, s: Math.min(0.95, (visW * 0.78) / 2.4, (visH * 0.36) / 2.4), travel: visH * 0.58 };
        }
        pollenMat.uniforms.uSize.value = 24 * pr * (h / 900 + 0.4);
      },
      update(t, dt) {
        const target = ctrl.progress();
        if (prog === null) prog = target;
        prog = lerp(prog, target, Math.min(1, dt * 6));
        if (Math.abs(prog - target) < 0.0004) prog = target;
        const k = Math.min(1, dt * 3);
        pointer.sx = lerp(pointer.sx, pointer.x, k);
        pointer.sy = lerp(pointer.sy, pointer.y, k);
        apply(clamp(prog), t);
      },
      staticFrame() { apply(ctrl.progress(), 2.0); },
      dispose() { window.removeEventListener('pointermove', onMove); },
    };
  }, { observe: ctrl.wrap, shadows: true, bloom: { strength: 0.2, radius: 0.5, threshold: 2.0 }, grain: 0.016, vignette: 0.08 });
}
