// HERO — процедурный пион.
// Все лепестки — один InstancedMesh: форма лепестка (ширина, чашевидность,
// изгиб, волнистый край) считается в вершинном шейдере по параметрам экземпляра
// и общему uOpen, поэтому раскрытие стоит один draw call.
import { THREE, mountScene, clamp, lerp, easeOutCubic, rng } from './kit.js';

const PETAL_VS = /* glsl */`
  uniform float uOpen;
  uniform float uTime;
  attribute vec4 aP; // слой 0..1, азимут, seed, задержка раскрытия
  attribute vec4 aS; // длина, ширина, радиус основания, высота основания
  attribute vec4 aK; // наклон закрыт/открыт, чаша закрыт/открыт
  attribute vec4 aB; // изгиб закрыт/открыт, тип (0 лепесток, 1 чашелистик), волнистость
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vP;
  varying float vLayer;
  varying float vKind;
  const float PI = 3.14159265;

  vec3 petal(vec2 uv, float o) {
    float u = uv.x * 2.0 - 1.0;
    float v = uv.y;
    float L = aS.x, W = aS.y;
    float shape = pow(max(sin(PI * pow(v, 1.6)), 0.0), 0.42);
    shape = max(shape, 0.1 * (1.0 - v));
    float hw = 0.5 * W * shape;
    float cup = max(mix(aK.z, aK.w, o), 0.001);
    float bend = mix(aB.x, aB.y, o);
    bend = abs(bend) < 0.002 ? 0.002 : bend;
    float R = L / bend;
    float ang = v * bend;
    vec3 S = vec3(0.0, R * sin(ang), R * (1.0 - cos(ang)));
    vec3 Nout = vec3(0.0, -sin(ang), cos(ang));
    float a = u * cup;
    float x = sin(a) / cup * hw;
    float d = (1.0 - cos(a)) / cup * hw;
    float seed = aP.z;
    float rf = (sin(u * 9.0 + seed * 40.0) * 0.6 + sin(u * 19.0 - seed * 23.0) * 0.3) * pow(v, 2.2) * L * 0.075 * aB.w;
    rf += sin(v * 11.0 + seed * 17.0) * pow(abs(u), 3.0) * L * 0.025 * aB.w;
    vec3 p = S + vec3(x, 0.0, 0.0) - Nout * d + Nout * rf;
    float tilt = mix(aK.x, aK.y, o)
      + sin(uTime * 0.7 + seed * 6.283) * 0.02 * o
      + max(uOpen - 1.0, 0.0) * 0.3 * aP.x;
    float c = cos(tilt), s = sin(tilt);
    p = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
    float ph = aP.y;
    vec3 radial = vec3(cos(ph), 0.0, sin(ph));
    vec3 tangent = vec3(-sin(ph), 0.0, cos(ph));
    return tangent * p.x + vec3(0.0, p.y + aS.w, 0.0) + radial * (p.z + aS.z);
  }

  void main() {
    float o = smoothstep(aP.w, aP.w + 0.55, uOpen);
    vec3 p0 = petal(uv, o);
    vec3 pu = petal(uv + vec2(0.01, 0.0), o);
    vec3 pv = petal(uv + vec2(0.0, 0.01), o);
    vec3 n = normalize(cross(pu - p0, pv - p0));
    vec4 wp = modelMatrix * vec4(p0, 1.0);
    vP = wp.xyz;
    vN = normalize(mat3(modelMatrix) * n);
    vUv = uv;
    vLayer = aP.x;
    vKind = aB.z;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const PETAL_FS = /* glsl */`
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vP;
  varying float vLayer;
  varying float vKind;

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vP);
    if (dot(N, V) < 0.0) N = -N;
    float u = vUv.x * 2.0 - 1.0;
    float v = vUv.y;

    vec3 base = mix(vec3(0.80, 0.52, 0.50), vec3(0.88, 0.64, 0.61), vLayer);
    vec3 mid  = mix(vec3(0.93, 0.75, 0.71), vec3(0.96, 0.84, 0.80), vLayer);
    vec3 tip  = vec3(0.985, 0.93, 0.90);
    vec3 col = mix(base, mid, smoothstep(0.0, 0.45, v));
    col = mix(col, tip, smoothstep(0.42, 1.0, v));
    col = mix(col, tip, smoothstep(0.55, 1.0, abs(u)) * 0.35);
    float vein = sin(u * (40.0 + 12.0 * v)) * 0.5 + 0.5;
    col *= 1.0 - 0.035 * vein * (1.0 - 0.6 * v);
    if (vKind > 0.5) col = mix(vec3(0.40, 0.45, 0.32), vec3(0.62, 0.66, 0.50), v);

    vec3 L1 = normalize(vec3(-0.55, 0.85, 0.55));
    vec3 L2 = normalize(vec3(0.75, 0.35, -0.65));
    float wrap = 0.5;
    float d1 = clamp((dot(N, L1) + wrap) / (1.0 + wrap), 0.0, 1.0);
    float d2 = clamp((dot(N, L2) + wrap) / (1.0 + wrap), 0.0, 1.0);
    float t1 = clamp(-dot(N, L1), 0.0, 1.0);
    float t2 = clamp(-dot(N, L2), 0.0, 1.0);
    float ao = mix(0.6, 1.0, smoothstep(0.0, 0.6, v)) * mix(0.8, 1.0, vLayer);
    vec3 sss = col * vec3(1.0, 0.70, 0.60);
    vec3 lit = col * (vec3(0.44, 0.40, 0.38) + 0.6 * d1 * vec3(1.0, 0.97, 0.93) + 0.16 * d2) * ao;
    lit += sss * (t1 * 0.5 + t2 * 0.4) * (0.55 + 0.45 * v);
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
    lit += rim * 0.1 * vec3(1.0, 0.96, 0.92);
    gl_FragColor = vec4(lit, 1.0);
  }
`;

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
    gl_FragColor = vec4(0.82, 0.66, 0.36, a);
  }
`;

function buildPetals(mobile) {
  const R = rng(7);
  const layers = [
    // n, длина, ширина, r0, h0, наклон закрыт/открыт, чаша закрыт/открыт, изгиб закрыт/открыт, волна
    { n: 5,  L: 0.40, W: 0.40, r0: 0.02, h0: 0.12, ct: -0.34, ot: 0.18, cc: 2.5, oc: 1.7, cb: -1.0, ob: -0.45, rf: 0.6 },
    { n: 7,  L: 0.58, W: 0.52, r0: 0.05, h0: 0.07, ct: -0.20, ot: 0.55, cc: 2.2, oc: 1.15, cb: -0.8, ob: -0.05, rf: 0.8 },
    { n: 9,  L: 0.78, W: 0.66, r0: 0.08, h0: 0.03, ct: -0.06, ot: 0.95, cc: 2.0, oc: 0.8, cb: -0.65, ob: 0.25, rf: 1.0 },
    { n: 11, L: 0.95, W: 0.78, r0: 0.11, h0: 0.0,  ct: 0.04,  ot: 1.25, cc: 1.8, oc: 0.6, cb: -0.5, ob: 0.5, rf: 1.0 },
    { n: 13, L: 1.08, W: 0.86, r0: 0.14, h0: -0.03, ct: 0.14, ot: 1.48, cc: 1.6, oc: 0.45, cb: -0.4, ob: 0.75, rf: 1.1 },
  ];
  const used = mobile ? [layers[0], { ...layers[1], n: 6 }, { ...layers[2], n: 8 }, layers[3], { ...layers[4], n: 11 }] : layers;
  const sepals = { n: 5, L: 0.55, W: 0.2, r0: 0.1, h0: -0.07, ct: 0.6, ot: 1.95, cc: 0.8, oc: 0.4, cb: 0.2, ob: 0.6, rf: 0.2, kind: 1 };

  const rows = [];
  used.forEach((ly, li) => {
    const layerN = li / (used.length - 1);
    for (let i = 0; i < ly.n; i++) {
      const az = ((i + (li % 2) * 0.5 + (R() - 0.5) * 0.25) / ly.n) * Math.PI * 2;
      const k = 0.92 + R() * 0.16;
      rows.push({
        p: [layerN, az, R(), (1 - layerN) * 0.42 + R() * 0.06],
        s: [ly.L * k, ly.W * (0.92 + R() * 0.16), ly.r0, ly.h0 + (R() - 0.5) * 0.02],
        k: [ly.ct, ly.ot + (R() - 0.5) * 0.08, ly.cc, ly.oc],
        b: [ly.cb, ly.ob + (R() - 0.5) * 0.15, 0, ly.rf],
      });
    }
  });
  for (let i = 0; i < sepals.n; i++) {
    const az = ((i + 0.3) / sepals.n) * Math.PI * 2;
    rows.push({
      p: [1, az, R(), 0],
      s: [sepals.L, sepals.W, sepals.r0, sepals.h0],
      k: [sepals.ct, sepals.ot, sepals.cc, sepals.oc],
      b: [sepals.cb, sepals.ob, 1, sepals.rf],
    });
  }

  const seg = mobile ? [8, 12] : [14, 22];
  const base = new THREE.PlaneGeometry(1, 1, seg[0], seg[1]);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('uv', base.getAttribute('uv'));
  const n = rows.length;
  const mk = (key) => {
    const arr = new Float32Array(n * 4);
    rows.forEach((r, i) => arr.set(r[key], i * 4));
    return new THREE.InstancedBufferAttribute(arr, 4);
  };
  geo.setAttribute('aP', mk('p'));
  geo.setAttribute('aS', mk('s'));
  geo.setAttribute('aK', mk('k'));
  geo.setAttribute('aB', mk('b'));
  geo.instanceCount = n;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.3, 0), 2.2);
  base.dispose();

  const mat = new THREE.ShaderMaterial({
    vertexShader: PETAL_VS,
    fragmentShader: PETAL_FS,
    uniforms: { uOpen: { value: 0 }, uTime: { value: 0 } },
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

function buildStamens(mobile) {
  const R = rng(11);
  const count = mobile ? 70 : 140;
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xD4AE5E, emissive: 0x3A2A0A });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2;
    const r = 0.07 + Math.sqrt(R()) * 0.17;
    p.set(Math.cos(a) * r, 0.12 + R() * 0.07 + (0.24 - r) * 0.3, Math.sin(a) * r);
    const k = 0.016 + R() * 0.012;
    s.set(k, k * 1.5, k);
    q.setFromAxisAngle(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), r * 1.5);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function buildStemAndLeaves(mobile) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(0.02, -0.8, 0.05),
    new THREE.Vector3(-0.1, -2.0, 0.2),
    new THREE.Vector3(-0.32, -4.4, 0.45),
  ]);
  const stemGeo = new THREE.TubeGeometry(curve, mobile ? 24 : 48, 0.045, mobile ? 6 : 10, false);
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x7D8761 });
  g.add(new THREE.Mesh(stemGeo, stemMat));

  const leafGeo = new THREE.PlaneGeometry(1, 1, mobile ? 4 : 6, mobile ? 8 : 12);
  const pos = leafGeo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2; // -1..1
    const v = pos.getY(i) + 0.5; // 0..1
    const w = Math.pow(Math.sin(Math.PI * v), 0.8) * 0.26;
    const x = u * w;
    const z = -Math.abs(x) * 0.5 + v * v * 0.35;
    pos.setXYZ(i, x, v * 1.0, z);
  }
  leafGeo.computeVertexNormals();
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x8E9872, side: THREE.DoubleSide });
  const mkLeaf = (t, rotY, rotZ, scale) => {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    const at = curve.getPointAt(t);
    leaf.position.copy(at);
    leaf.rotation.set(-0.4, rotY, rotZ);
    leaf.scale.setScalar(scale);
    g.add(leaf);
  };
  mkLeaf(0.2, 0.6, -1.0, 0.95);
  mkLeaf(0.33, -2.4, 1.1, 0.8);
  if (!mobile) mkLeaf(0.5, 1.4, -0.9, 0.7);
  return g;
}

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
  return mountScene(host, ({ renderer, mobile, reduced }) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 3.0, 5.6);

    scene.add(new THREE.HemisphereLight(0xFFF8EE, 0xB9B39C, 1.1));
    const key = new THREE.DirectionalLight(0xFFF4E6, 1.6);
    key.position.set(-3, 5, 3);
    scene.add(key);

    const flower = new THREE.Group();
    const petals = buildPetals(mobile);
    const stamens = buildStamens(mobile);
    flower.add(petals, stamens, buildStemAndLeaves(mobile));
    const rig = new THREE.Group();
    rig.add(flower);
    scene.add(rig);
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
      petals.material.uniforms.uOpen.value = open;
      petals.material.uniforms.uTime.value = t;
      const st = clamp((open - 0.45) / 0.45);
      stamens.scale.setScalar(Math.max(0.0001, st));
      stamens.visible = st > 0.01;
      pollen.material.uniforms.uTime.value = t;
      pollen.material.uniforms.uAlpha.value = clamp((open - 0.4) * 1.6) * (1 - scrollP * 0.6);

      rig.position.set(layout.x, layout.y + scrollP * 0.5, 0);
      rig.scale.setScalar(layout.s * (1 + scrollP * 0.12));
      flower.rotation.set(0.32 + pointer.sy * 0.12 + scrollP * 0.35, t * 0.05 + pointer.sx * 0.25 + scrollP * 0.8, pointer.sx * -0.05);
      camera.position.set(pointer.sx * 0.25, 3.0 + pointer.sy * -0.15 - scrollP * 0.6, 5.6);
      camera.lookAt(target);
    };

    return {
      scene, camera,
      resize(w, h) {
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
        pollen.material.uniforms.uSize.value = 26 * renderer.getPixelRatio() * (h / 900 + 0.4);
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
  });
}
