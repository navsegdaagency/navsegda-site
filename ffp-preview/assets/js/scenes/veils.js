// «НЕВЕСТЫ» — шифоновые шлейфы фаты и платья.
// Каждая лента — экземпляр одной геометрии; форма (волна, кручение, трепет
// края) считается в вершинном шейдере. Сдвиг лент по экрану привязан к
// прогрессу скролла секции, «ветер» усиливается от скорости прокрутки.
import { THREE, mountScene, clamp, lerp, passProgress, rng } from './kit.js';

const VS = /* glsl */`
  uniform float uTime;
  uniform float uProg;
  uniform float uWind;
  uniform float uSpan;
  uniform float uYs;
  attribute vec4 aA; // seed, y0, z0, ширина
  attribute vec4 aB; // длина, скорость(со знаком), амплитуда, фаза
  attribute float aLace;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vP;
  varying float vLace;
  varying float vLen;
  const float PI = 3.14159265;

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
    return vec3(X, y, z) + across * w * width + nrm * flutter;
  }

  void main() {
    float s = uv.x;
    float w = uv.y - 0.5;
    vec3 p0 = ribbon(s, w);
    vec3 ps = ribbon(s + 0.004, w);
    vec3 pw = ribbon(s, w + 0.02);
    vN = normalize(cross(ps - p0, pw - p0));
    vec4 wp = modelMatrix * vec4(p0, 1.0);
    vP = wp.xyz;
    vUv = uv;
    vLace = aLace;
    vLen = aB.x;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FS = /* glsl */`
  uniform float uAlpha;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vP;
  varying float vLace;
  varying float vLen;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vP);
    if (dot(N, V) < 0.0) N = -N;
    vec3 L = normalize(vec3(-0.4, 0.8, 0.6));
    float ndv = abs(dot(N, V));
    float fres = pow(1.0 - ndv, 2.2);
    float diff = 0.55 + 0.45 * clamp(dot(N, L), 0.0, 1.0);
    vec3 H = normalize(L + V);
    float sheen = pow(max(dot(N, H), 0.0), 18.0) * 0.35;
    vec3 ivory = vec3(0.975, 0.945, 0.89);
    vec3 col = ivory * diff + vec3(1.0, 0.97, 0.92) * sheen;
    float edge = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    float ends = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
    // мелкий горошек фатина на части лент
    vec2 g = vec2(vUv.x * vLen * 9.0, vUv.y * 9.0);
    vec2 cell = fract(g) - 0.5;
    float d = length(cell);
    float aa = fwidth(d) * 1.2;
    float dots = (1.0 - smoothstep(0.09 - aa, 0.09 + aa, d)) * vLace;
    float a = (0.16 + 0.6 * fres + 0.14 * sheen) * edge * ends;
    a = clamp(a + dots * 0.35 * edge * ends, 0.0, 0.9) * uAlpha;
    gl_FragColor = vec4(col + dots * 0.05, a);
  }
`;

export function mount(host, section) {
  return mountScene(host, ({ mobile, reduced }) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    const R = rng(21);
    const count = mobile ? 5 : 8;
    const segs = mobile ? [90, 6] : [180, 10];
    const base = new THREE.PlaneGeometry(1, 1, segs[0], segs[1]);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
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

    const mat = new THREE.ShaderMaterial({
      vertexShader: VS,
      fragmentShader: FS,
      uniforms: {
        uTime: { value: 0 }, uProg: { value: 0 }, uWind: { value: 1 },
        uSpan: { value: 16 }, uAlpha: { value: 1 }, uYs: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      extensions: { derivatives: true },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);

    let prog = 0, lastP = null, wind = 1;
    const apply = (t, p, wnd) => {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uProg.value = p;
      mat.uniforms.uWind.value = wnd;
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
        mat.uniforms.uSpan.value = (portrait ? Math.hypot(visW, visH) / 0.8 : visW) + 6;
        mat.uniforms.uYs.value = portrait ? 1.25 : 1;
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
  }, { observe: section });
}
