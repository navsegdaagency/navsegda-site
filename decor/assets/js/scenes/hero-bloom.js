// HERO — процедурный пион.
// Лепестки — один инстанс-меш с физическим материалом (sheen, прожилки,
// просвечивание на контровом свете), форма и раскрытие считаются в вершинном
// шейдере (flora.js), поэтому раскрытие стоит один draw call.
// Свет: тёплый ключевой с мягкими тенями + холодный контровой + окружение.
import { THREE, mountScene, clamp, lerp, easeOutCubic, rng, GLSL_OUT } from './kit.js';
import { buildFlower } from './flora.js';

const POLLEN_VS = /* glsl */`
  uniform float uTime;
  uniform float uSize;
  uniform float uAlpha;
  attribute vec4 aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    float t = uTime * aSeed.y;
    p.y = mod(p.y + t * 0.18 + 2.0, 4.0) - 2.0;
    p.x += sin(t * 0.7 + aSeed.x * 6.28) * 0.25;
    p.z += cos(t * 0.5 + aSeed.z * 6.28) * 0.2;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aSeed.w) / -mv.z;
    vA = uAlpha * smoothstep(2.0, 1.2, abs(p.y)) * (0.45 + 0.55 * aSeed.w);
  }
`;
const POLLEN_FS = /* glsl */`
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vA;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(0.66, 0.42, 0.13), a);
    ${GLSL_OUT}
  }
`;

function buildPollen(mobile) {
  const R = rng(5);
  const n = mobile ? 50 : 140;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (R() - 0.5) * 6;
    pos[i * 3 + 1] = (R() - 0.5) * 4;
    pos[i * 3 + 2] = (R() - 0.5) * 3;
    seed.set([R(), 0.4 + R() * 0.8, R(), R()], i * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: POLLEN_VS,
    fragmentShader: POLLEN_FS,
    uniforms: { uTime: { value: 0 }, uSize: { value: 40 }, uAlpha: { value: 0 } },
    transparent: true,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

export function mount(host) {
  const hero = host.closest('.hero') || host;
  return mountScene(host, ({ renderer, mobile, reduced, env, hq }) => {
    const scene = new THREE.Scene();
    scene.environment = env;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 3.0, 5.6);

    // свет: мягкий небесный, тёплый ключ с тенями, холодный контровой (просвет лепестков)
    scene.add(new THREE.HemisphereLight(0xFFF6EA, 0xB9B39C, env ? 0.32 : 1.2));
    const key = new THREE.DirectionalLight(0xFFF1E0, 1.7);
    key.position.set(-3, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    const sc = key.shadow.camera;
    sc.left = -1.8; sc.right = 1.8; sc.top = 1.8; sc.bottom = -1.8; sc.near = 1; sc.far = 14;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    const rim = new THREE.DirectionalLight(0xE8EEFF, 0.8);
    rim.position.set(2.5, 1.2, -3.5);
    const rig = new THREE.Group();
    scene.add(rig, key, key.target, rim);

    const flower = buildFlower({ species: 'peony', tone: 'blush', mobile, seed: 7, detail: hq ? 1.25 : 1 });
    const pivot = new THREE.Group();
    pivot.add(flower.group);
    rig.add(pivot);
    const pollen = buildPollen(mobile);
    scene.add(pollen);

    const target = new THREE.Vector3(0, 0.25, 0);
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reduced) window.addEventListener('pointermove', onMove, { passive: true });

    let layout = { x: 0, y: 0, s: 1 };
    let openS = 0;

    const place = (open, t, scrollP) => {
      flower.setOpen(open, t);
      pollen.material.uniforms.uTime.value = t;
      pollen.material.uniforms.uAlpha.value = clamp((open - 0.4) * 1.6) * (1 - scrollP * 0.6);

      rig.position.set(layout.x, layout.y + scrollP * 0.5, 0);
      rig.scale.setScalar(layout.s * (1 + scrollP * 0.12));
      pivot.rotation.set(0.32 + pointer.sy * 0.12 + scrollP * 0.35, t * 0.05 + pointer.sx * 0.25 + scrollP * 0.8, pointer.sx * -0.05);
      camera.position.set(pointer.sx * 0.25, 3.0 + pointer.sy * -0.15 - scrollP * 0.6, 5.6);
      camera.lookAt(target);
      // тень следует за цветком
      key.target.position.copy(rig.position);
      key.position.set(rig.position.x - 3, rig.position.y + 5, 3);
    };

    return {
      scene, camera,
      resize(w, h, pr) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const dist = camera.position.distanceTo(target);
        const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
        const visW = visH * camera.aspect;
        if (camera.aspect > 1.05) {
          layout = { x: visW * 0.23, y: 0.05, s: Math.min(1.0, (visH * 0.7) / 2.4) };
        } else {
          const s = Math.min(1, (visW * 0.8) / 2.4);
          layout = { x: 0, y: visH * 0.21, s };
        }
        pollen.material.uniforms.uSize.value = 26 * pr * (h / 900 + 0.4);
      },
      update(t, dt) {
        const r = hero.getBoundingClientRect();
        const scrollP = clamp(-r.top / Math.max(1, r.height));
        const load = easeOutCubic(t / 3.4);
        const goal = 0.04 + load * 0.84 + scrollP * 0.42;
        openS = lerp(openS, goal, Math.min(1, dt * 4));
        const k = Math.min(1, dt * 3);
        pointer.sx = lerp(pointer.sx, pointer.x, k);
        pointer.sy = lerp(pointer.sy, pointer.y, k);
        place(openS, t, scrollP);
      },
      staticFrame() { place(1.0, 2.0, 0); },
      dispose() { window.removeEventListener('pointermove', onMove); },
    };
  }, { shadows: true, bloom: { strength: 0.22, radius: 0.5, threshold: 2.0 }, grain: 0.016, vignette: 0.1, exposure: 0.95 });
}
