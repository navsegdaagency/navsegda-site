// «НЕВЕСТЫ» — шифоновые шлейфы фаты и платья.
// Каждая лента — экземпляр одной геометрии; форма (волна, кручение, трепет
// края) считается в вершинном шейдере. Материал — MeshPhysicalMaterial
// с sheen (шёлковый отлив), прозрачность по Френелю и горошек фатина.
// Сдвиг лент по экрану привязан к прогрессу скролла секции, «ветер»
// усиливается от скорости прокрутки.
import { THREE, mountScene, lerp, passProgress, rng, patchMaterial } from './kit.js';

const HEAD = /* glsl */`
  uniform float uProg;
  uniform float uWind;
  uniform float uSpan;
  uniform float uYs;
  attribute vec4 aA; // seed, y0, z0, ширина
  attribute vec4 aB; // длина, скорость(со знаком), амплитуда, фаза
  attribute float aLace;
  varying float vLace;
  varying float vLen;

  vec3 ribbon(float s, float w) {
    float L = aB.x;
    float R = uSpan * 0.5 + L * 0.5;
    float shift = mix(-R, R, fract(uProg * abs(aB.y) + aB.w));
    if (aB.y < 0.0) shift = -shift;
    float X = (s - 0.5) * L + shift;
    float t = uTime;
    float ph = aA.x * 6.283;
    float A = aB.z;
    float y = aA.y * uYs + A * sin(X * 0.55 + t * 0.35 + ph) + A * 0.45 * sin(X * 1.25 - t * 0.5 + ph * 1.7) - X * 0.08;
    float z = aA.z + A * 0.8 * cos(X * 0.42 + t * 0.3 + ph);
    float twist = 0.9 * sin(X * 0.35 + t * 0.25 + ph) + 0.35 * sin(X * 1.1 + t * 0.6);
    float width = aA.w * (0.35 + 0.65 * pow(sin(PI * s), 0.5));
    vec3 across = vec3(0.0, cos(twist), sin(twist));
    vec3 nrm = vec3(0.0, -sin(twist), cos(twist));
    float flutter = sin(X * 3.0 + t * 2.2 + w * 5.0 + ph) * 0.06 * uWind * (0.3 + abs(w) * 1.6)
                  + sin(X * 7.0 - t * 3.1 + ph) * 0.02 * uWind;
    // мягкие продольные складки шифона
    float pleat = sin(w * 26.0 + X * 0.8 + ph) * 0.018 * (0.4 + 0.6 * abs(sin(X * 0.3 + t * 0.2)));
    return vec3(X, y, z) + across * w * width + nrm * (flutter + pleat);
  }
`;
const BODY = /* glsl */`
  float s = uv.x;
  float w = uv.y - 0.5;
  vec3 p0 = ribbon(s, w);
  vec3 ps = ribbon(s + 0.004, w);
  vec3 pw = ribbon(s, w + 0.02);
  pos = p0;
  nrm = normalize(cross(ps - p0, pw - p0));
  vLace = aLace;
  vLen = aB.x;
`;
const FRAG_HEAD = /* glsl */`
  uniform float uAlpha;
  varying float vLace;
  varying float vLen;
`;
const FRAG = [
  ['normal_fragment_maps', /* glsl */`
    // тонкая нить ткани: микрорельеф поперёк ленты (гасится при удалении)
    float th = vPUv.x * vLen * 260.0;
    float thr = sin(th) * clamp(1.0 - fwidth(th) * 0.5, 0.0, 1.0);
    normal = ffpBump(-vViewPosition, normal, thr * 0.0008, faceDirection);
  `, 'after'],
  ['opaque_fragment', /* glsl */`
    float ndv = abs(dot(normal, normalize(vViewPosition)));
    float fres = pow(1.0 - ndv, 2.2);
    float edge = smoothstep(0.0, 0.2, vPUv.y) * smoothstep(1.0, 0.8, vPUv.y);
    float ends = smoothstep(0.0, 0.1, vPUv.x) * smoothstep(1.0, 0.9, vPUv.x);
    vec2 g = vec2(vPUv.x * vLen * 9.0, vPUv.y * 9.0);
    vec2 cell = fract(g) - 0.5;
    float d = length(cell);
    float aa = fwidth(d) * 1.2;
    float dots = (1.0 - smoothstep(0.09 - aa, 0.09 + aa, d)) * vLace;
    float va = (0.14 + 0.62 * fres) * edge * ends;
    va = clamp(va + dots * 0.35 * edge * ends, 0.0, 0.9) * uAlpha;
    gl_FragColor = vec4(gl_FragColor.rgb + dots * 0.04, va);
  `, 'after'],
];

export function mount(host, section) {
  return mountScene(host, ({ mobile, env }) => {
    const scene = new THREE.Scene();
    scene.environment = env;
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xFFF6EA, 0x3A3C2E, env ? 0.6 : 1.4));
    const key = new THREE.DirectionalLight(0xFFF2E2, 2.2);
    key.position.set(-3, 5, 6);
    const back = new THREE.DirectionalLight(0xE6ECFF, 0.9);
    back.position.set(4, -1, -5);
    scene.add(key, back);

    const R = rng(21);
    const count = mobile ? 5 : 8;
    const segs = mobile ? [110, 8] : [220, 16];
    const base = new THREE.PlaneGeometry(1, 1, segs[0], segs[1]);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('normal', base.getAttribute('normal'));
    geo.setAttribute('uv', base.getAttribute('uv'));
    base.dispose();

    const aA = new Float32Array(count * 4);
    const aB = new Float32Array(count * 4);
    const aLace = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const depth = i / (count - 1);
      aA.set([R(), (R() - 0.5) * 3.2, lerp(-3.5, 1.6, depth), lerp(0.9, 1.9, R())], i * 4);
      const speed = (0.55 + R() * 0.7) * (i % 3 === 1 ? -1 : 1);
      aB.set([lerp(12, 20, R()), speed, lerp(0.35, 0.9, R()), i / count + R() * 0.1], i * 4);
      aLace[i] = i % 3 === 0 ? 1 : 0;
    }
    geo.setAttribute('aA', new THREE.InstancedBufferAttribute(aA, 4));
    geo.setAttribute('aB', new THREE.InstancedBufferAttribute(aB, 4));
    geo.setAttribute('aLace', new THREE.InstancedBufferAttribute(aLace, 1));
    geo.instanceCount = count;

    const mat = new THREE.MeshPhysicalMaterial({
      color: '#F8F1E4', roughness: 0.55, sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color('#FFF3E2'),
      specularIntensity: 0.6, envMapIntensity: 0.8,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const u = {
      uProg: { value: 0 }, uWind: { value: 1 }, uSpan: { value: 16 }, uAlpha: { value: 1 }, uYs: { value: 1 },
    };
    patchMaterial(mat, { key: 'ffp-veil', uniforms: u, head: HEAD, body: BODY, fragHead: FRAG_HEAD, frag: FRAG });
    const uTime = mat.userData.uniforms.uTime;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);

    let prog = 0, lastP = null, wind = 1;
    const apply = (t, p, wnd) => {
      uTime.value = t;
      u.uProg.value = p;
      u.uWind.value = wnd;
    };

    return {
      scene, camera,
      resize(w, h) {
        camera.aspect = w / h;
        camera.fov = camera.aspect < 1 ? 52 : 38;
        camera.updateProjectionMatrix();
        const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * 8;
        const visW = visH * camera.aspect;
        const portrait = camera.aspect < 1;
        // на вертикальном экране ленты идут по диагонали, чтобы пересекать весь экран
        mesh.rotation.z = portrait ? -1.05 : 0;
        mesh.scale.setScalar(portrait ? 0.8 : 1);
        u.uSpan.value = (portrait ? Math.hypot(visW, visH) / 0.8 : visW) + 6;
        u.uYs.value = portrait ? 1.25 : 1;
      },
      update(t, dt) {
        const target = passProgress(section);
        if (lastP === null) { lastP = target; prog = target; }
        const vel = Math.abs(target - lastP) / Math.max(dt, 0.001);
        lastP = target;
        wind = lerp(wind, 1 + Math.min(vel * 6, 3), Math.min(1, dt * 2.5));
        prog = lerp(prog, target, Math.min(1, dt * 5));
        apply(t, prog * 1.4, wind);
      },
      staticFrame() { apply(3.0, 0.5, 1); },
    };
  }, { observe: section, bloom: false, grain: 0.02, vignette: 0.12, exposure: 1.05 });
}
