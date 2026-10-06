// FFP — процедурные цветы для 3D-сцен: пион, роза, ранункулюс, анемон.
// Лепестки одного цветка — один инстанс-меш: форма (длина, ширина, чаша, изгиб,
// загиб кончика, рваный край, волна) считается в вершинном шейдере по
// параметрам экземпляра и общему uOpen. Материал — MeshPhysicalMaterial
// с sheen (бархат лепестка), прожилками через микрорельеф, просвечиванием
// на контровом свете и мягким затенением у основания.
import { THREE, patchMaterial, depthFor, rng, clamp, lerp } from './kit.js';

// ─── палитры (sRGB): основание, середина, кончик, блеск ───
export const TONES = {
  blush: ['#BF7470', '#ECB3A8', '#FAE6DE', '#FFE4DA'],
  ivory: ['#DCC9A6', '#F3E7D2', '#FFFBF2', '#FFF8EA'],
  peach: ['#D46F43', '#EE9E72', '#F8C9A8', '#FFE1CC'],
  white: ['#CFC8DA', '#F2EFF2', '#FFFFFF', '#FFFFFF'],
  wine:  ['#24040A', '#4C0C18', '#6A1A28', '#A85A66'],
  coral: ['#C44A47', '#E57D73', '#F6B2A6', '#FFD3CA'],
};
export const SPECIES_RU = { peony: 'пион', rose: 'роза', ranunculus: 'ранункулюс', anemone: 'анемон' };

const PETAL_HEAD = /* glsl */`
  uniform float uOpen;
  attribute vec4 aP; // слой 0..1, азимут, seed, задержка раскрытия
  attribute vec4 aS; // длина, ширина, радиус основания, высота основания
  attribute vec4 aK; // наклон закрыт/открыт, чаша закрыт/открыт
  attribute vec4 aB; // изгиб закрыт/открыт, тип (0 лепесток, 1 чашелистик), волнистость края
  attribute vec4 aE; // загиб кончика закрыт/открыт, рваный край, округлость
  varying float vLayer;
  varying float vKind;
  varying float vSeed;

  vec3 petal(vec2 uv, float o) {
    float u = uv.x * 2.0 - 1.0;
    float v = uv.y;
    float seed = aP.z;
    float L = aS.x, W = aS.y;
    // контур кончика: фестоны и мелкие надрывы
    float teeth = 2.0 + floor(seed * 3.0);
    float scal = aE.z * (0.09 * pow(abs(sin(u * teeth * 1.5708 + seed * 9.0)), 1.5) + 0.035 * sin(u * 13.0 + seed * 21.0) + 0.035);
    float vv = v * (1.0 - scal * smoothstep(0.5, 1.0, v));
    float k = mix(1.6, 2.2, aE.w);
    float shape = pow(max(sin(PI * pow(vv, k)), 0.0), mix(0.42, 0.3, aE.w));
    shape = max(shape, 0.1 * (1.0 - vv));
    float hw = 0.5 * W * shape * (1.0 + aE.z * 0.07 * sin(vv * 17.0 + seed * 31.0) * vv);
    float cup = max(mix(aK.z, aK.w, o), 0.001);
    float bend = mix(aB.x, aB.y, o);
    bend = abs(bend) < 0.002 ? 0.002 : bend;
    float R = L / bend;
    float ang = vv * bend;
    vec3 S = vec3(0.0, R * sin(ang), R * (1.0 - cos(ang)));
    vec3 Nout = vec3(0.0, -sin(ang), cos(ang));
    float a = u * cup;
    float x = sin(a) / cup * hw;
    float d = (1.0 - cos(a)) / cup * hw;
    float rf = (sin(u * 9.0 + seed * 40.0) * 0.6 + sin(u * 19.0 - seed * 23.0) * 0.3) * pow(vv, 2.2) * L * 0.075 * aB.w;
    rf += sin(vv * 11.0 + seed * 17.0) * pow(abs(u), 3.0) * L * 0.025 * aB.w;
    float curl = mix(aE.x, aE.y, o);
    rf += curl * pow(smoothstep(0.45, 1.0, vv), 2.0) * L * 0.32 * (1.0 - 0.35 * u * u);
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
`;
const PETAL_BODY = /* glsl */`
  float o = smoothstep(aP.w, aP.w + 0.55, uOpen);
  vec3 p0 = petal(uv, o);
  vec3 pu = petal(uv + vec2(0.01, 0.0), o);
  vec3 pv = petal(uv + vec2(0.0, 0.01), o);
  pos = p0;
  nrm = normalize(cross(pu - p0, pv - p0));
  vLayer = aP.x; vKind = aB.z; vSeed = aP.z;
`;
const PETAL_FRAG_HEAD = /* glsl */`
  uniform vec3 uBase;
  uniform vec3 uMid;
  uniform vec3 uTip;
  uniform vec3 uSSS;
  uniform float uVein;
  varying float vLayer;
  varying float vKind;
  varying float vSeed;
`;
const PETAL_FRAG = [
  ['color_fragment', /* glsl */`
    float fpu = vPUv.x * 2.0 - 1.0;
    float fpv = vPUv.y;
    vec3 pc = mix(uBase, uMid, smoothstep(0.0, 0.45, fpv));
    pc = mix(pc, uTip, smoothstep(0.5, 1.0, fpv));
    pc = mix(pc, uTip, smoothstep(0.55, 1.0, abs(fpu)) * 0.3);
    pc *= mix(0.88, 1.0, vLayer);
    // прожилки: веер линий от основания + центральная жилка
    float vs = fpu * (7.0 + 3.0 * vSeed);
    float vaa = clamp(1.0 - fwidth(vs) * 1.2, 0.0, 1.0);
    float fvein = pow(1.0 - abs(fract(vs) - 0.5) * 2.0, 5.0) * vaa;
    float fmid = exp(-fpu * fpu * 140.0);
    pc *= 1.0 - (0.045 * fvein + 0.05 * fmid) * (1.0 - 0.55 * fpv);
    if (vKind > 0.5) pc = mix(vec3(0.10, 0.14, 0.06), vec3(0.30, 0.36, 0.18), fpv);
    diffuseColor.rgb = pc;
  `, 'after'],
  ['normal_fragment_maps', /* glsl */`
    float fh = (fvein * 0.55 + fmid * 0.8) * (1.0 - 0.5 * fpv);
    fh += 0.25 * sin(fpv * 38.0 + fpu * 4.0 + vSeed * 30.0) * smoothstep(0.2, 1.0, fpv);
    normal = ffpBump(-vViewPosition, normal, fh * uVein, faceDirection);
  `, 'after'],
  ['lights_fragment_end', /* glsl */`
    #if NUM_DIR_LIGHTS > 0
      for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        float bt = clamp(-dot(normal, directionalLights[i].direction), 0.0, 1.0);
        reflectedLight.directDiffuse += diffuseColor.rgb * uSSS * directionalLights[i].color * bt * (0.35 + 0.65 * fpv) * (1.0 - vKind * 0.7);
      }
    #endif
  `, 'after'],
  ['aomap_fragment', /* glsl */`
    float fao = mix(0.5, 1.0, smoothstep(0.0, 0.55, fpv)) * mix(0.78, 1.0, vLayer);
    reflectedLight.indirectDiffuse *= fao;
    reflectedLight.indirectSpecular *= fao;
    reflectedLight.directDiffuse *= mix(0.7, 1.0, smoothstep(0.0, 0.35, fpv));
  `, 'after'],
];
const PETAL_SPEC = { key: 'ffp-petal-v2', head: PETAL_HEAD, body: PETAL_BODY, fragHead: PETAL_FRAG_HEAD, frag: PETAL_FRAG };

const lin = (hex) => new THREE.Color(hex);

export function petalMaterial(tone, { veins = 0.0018 } = {}) {
  const [b, m, t, sh] = TONES[tone] || TONES.blush;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.58,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.42,
    sheenColor: lin(sh).multiplyScalar(0.32),
    specularIntensity: 0.35,
    side: THREE.DoubleSide,
    envMapIntensity: 0.35,
  });
  const tint = lin(m);
  patchMaterial(mat, {
    ...PETAL_SPEC,
    uniforms: {
      uOpen: { value: 0 },
      uBase: { value: lin(b) }, uMid: { value: tint }, uTip: { value: lin(t) },
      uSSS: { value: new THREE.Color(1.0, 0.72, 0.62).multiplyScalar(tone === 'wine' ? 0.4 : 0.55) },
      uVein: { value: veins },
    },
  });
  return mat;
}

// ─── параметры лепестков по видам ───
// строка: p [слой, азимут, seed, задержка], s [длина, ширина, r0, h0],
// k [наклон закр/откр, чаша закр/откр], b [изгиб закр/откр, тип, волна], e [загиб закр/откр, рваность, округлость]
function rowsFor(species, mobile, R) {
  const rows = [];
  const add = (p, s, k, b, e) => rows.push({ p, s, k, b, e });
  const sepals = (n, L, r0, h0, ot = 1.95) => {
    for (let i = 0; i < n; i++) {
      add([1, ((i + 0.3) / n) * Math.PI * 2, R(), 0], [L, 0.2, r0, h0], [0.6, ot, 0.8, 0.4], [0.2, 0.6, 1, 0.2], [0, 0, 0, 0]);
    }
  };
  if (species === 'rose') {
    const n = mobile ? 22 : 30;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const k = 0.94 + R() * 0.12;
      add([t, i * 2.39996 + (R() - 0.5) * 0.2, R(), (1 - t) * 0.42 + R() * 0.04],
        [(0.3 + 0.58 * Math.pow(t, 0.75)) * k, (0.46 + 0.42 * t) * (0.94 + R() * 0.12), 0.01 + 0.09 * t, 0.2 * Math.pow(1 - t, 1.2) - 0.02],
        [-0.36 + 0.16 * t, lerp(-0.22, 1.02, Math.pow(t, 1.6)) + (R() - 0.5) * 0.08, 2.8, lerp(2.6, 1.05, t)],
        [-0.6, lerp(-0.55, 0.15, t), 0, 0.22],
        [0, lerp(0, 1.4, clamp((t - 0.35) / 0.65)) * (0.85 + R() * 0.3), 0.2, 1]);
    }
    sepals(5, 0.5, 0.08, -0.06, 2.1);
  } else if (species === 'ranunculus') {
    const rings = mobile ? 6 : 8;
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1);
      const n = 5 + r * 2;
      for (let i = 0; i < n; i++) {
        const L = (0.17 + 0.42 * t) * (0.94 + R() * 0.12);
        add([t, ((i + (r % 2) * 0.5 + (R() - 0.5) * 0.3) / n) * Math.PI * 2, R(), (1 - t) * 0.4 + R() * 0.05],
          [L, L * (1.1 + R() * 0.12), 0.015 + 0.13 * t, 0.13 * (1 - t) - 0.01],
          [-0.2, lerp(-0.04, 1.0, Math.pow(t, 1.3)) + (R() - 0.5) * 0.06, 1.7, lerp(1.5, 0.75, t)],
          [-0.4, lerp(-0.4, 0.1, t), 0, 0.12],
          [0, 0.1 * t, 0.08, 1]);
      }
    }
    sepals(5, 0.42, 0.1, -0.06);
  } else if (species === 'anemone') {
    const layers = [
      { n: 6, L: 0.86, W: 0.98, r0: 0.11, h0: 0.0, ot: 1.42, ob: 0.25, off: 0 },
      { n: 6, L: 0.78, W: 0.9, r0: 0.09, h0: 0.025, ot: 1.18, ob: 0.12, off: 0.5 },
    ];
    layers.forEach((ly, li) => {
      for (let i = 0; i < ly.n; i++) {
        add([1 - li * 0.4, ((i + ly.off + (R() - 0.5) * 0.15) / ly.n) * Math.PI * 2, R(), li * 0.1 + R() * 0.06],
          [ly.L * (0.93 + R() * 0.14), ly.W * (0.92 + R() * 0.14), ly.r0, ly.h0],
          [-0.28, ly.ot + (R() - 0.5) * 0.12, 2.0, 0.35],
          [-0.5, ly.ob, 0, 0.55],
          [0, 0.08, 0.18, 0.7]);
      }
    });
    sepals(4, 0.35, 0.09, -0.05, 1.7);
  } else {
    // пион
    const layers = [
      { n: 5, L: 0.40, W: 0.40, r0: 0.02, h0: 0.12, ct: -0.34, ot: 0.18, cc: 2.5, oc: 1.7, cb: -1.0, ob: -0.45, rf: 0.6 },
      { n: 7, L: 0.58, W: 0.52, r0: 0.05, h0: 0.07, ct: -0.20, ot: 0.55, cc: 2.2, oc: 1.15, cb: -0.8, ob: -0.05, rf: 0.8 },
      { n: 9, L: 0.78, W: 0.66, r0: 0.08, h0: 0.03, ct: -0.06, ot: 0.95, cc: 2.0, oc: 0.8, cb: -0.65, ob: 0.25, rf: 1.0 },
      { n: 11, L: 0.95, W: 0.78, r0: 0.11, h0: 0.0, ct: 0.04, ot: 1.25, cc: 1.8, oc: 0.6, cb: -0.5, ob: 0.5, rf: 1.0 },
      { n: 13, L: 1.08, W: 0.86, r0: 0.14, h0: -0.03, ct: 0.14, ot: 1.48, cc: 1.6, oc: 0.45, cb: -0.4, ob: 0.75, rf: 1.1 },
    ];
    const used = mobile ? [layers[0], { ...layers[1], n: 6 }, { ...layers[2], n: 8 }, layers[3], { ...layers[4], n: 11 }] : layers;
    used.forEach((ly, li) => {
      const layerN = li / (used.length - 1);
      for (let i = 0; i < ly.n; i++) {
        const az = ((i + (li % 2) * 0.5 + (R() - 0.5) * 0.25) / ly.n) * Math.PI * 2;
        const k = 0.92 + R() * 0.16;
        add([layerN, az, R(), (1 - layerN) * 0.42 + R() * 0.06],
          [ly.L * k, ly.W * (0.92 + R() * 0.16), ly.r0, ly.h0 + (R() - 0.5) * 0.02],
          [ly.ct, ly.ot + (R() - 0.5) * 0.08, ly.cc, ly.oc],
          [ly.cb, ly.ob + (R() - 0.5) * 0.15, 0, ly.rf],
          [0, 0.12 * layerN, 0.35, 0]);
      }
    });
    sepals(5, 0.55, 0.1, -0.07);
  }
  return rows;
}

function petalGeometry(rows, seg) {
  const base = new THREE.PlaneGeometry(1, 1, seg[0], seg[1]);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('normal', base.getAttribute('normal'));
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
  geo.setAttribute('aE', mk('e'));
  geo.instanceCount = n;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.3, 0), 2.4);
  base.dispose();
  return geo;
}

// ─── центры цветков ───
const physical = (o) => new THREE.MeshPhysicalMaterial({ roughness: 0.5, metalness: 0, envMapIntensity: 0.6, ...o });

function stamens(R, count, { r0, r1, y, len, filament, anther, tilt = 1.2 }) {
  const g = new THREE.Group();
  const fGeo = new THREE.CylinderGeometry(0.0035, 0.005, 1, 5, 1);
  fGeo.translate(0, 0.5, 0);
  const aGeo = new THREE.SphereGeometry(1, 8, 6);
  const fil = new THREE.InstancedMesh(fGeo, physical({ color: filament, roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(filament) }), count);
  const ant = new THREE.InstancedMesh(aGeo, physical({ color: anther, roughness: 0.55, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(anther) }), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), ax = new THREE.Vector3(), up = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2;
    const rr = r0 + Math.sqrt(R()) * (r1 - r0);
    const l = len * (0.7 + R() * 0.5);
    const tl = (rr - r0) / Math.max(0.001, r1 - r0) * tilt * 0.6 + (R() - 0.5) * 0.2;
    ax.set(Math.sin(a), 0, -Math.cos(a));
    q.setFromAxisAngle(ax, tl);
    p.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    s.set(1, l, 1);
    m.compose(p, q, s);
    fil.setMatrixAt(i, m);
    up.set(0, l, 0).applyQuaternion(q).add(p);
    const k = 0.011 + R() * 0.006;
    s.set(k, k * 1.6, k);
    m.compose(up, q, s);
    ant.setMatrixAt(i, m);
  }
  fil.castShadow = ant.castShadow = true;
  g.add(fil, ant);
  return g;
}

function centerFor(species, mobile, R) {
  if (species === 'anemone') {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), physical({ color: '#120D16', roughness: 0.65, sheen: 0.4, sheenColor: new THREE.Color('#2A2133'), envMapIntensity: 0.25 }));
    dome.scale.set(1, 0.62, 1);
    dome.position.y = 0.05;
    g.add(dome, stamens(R, mobile ? 50 : 90, { r0: 0.1, r1: 0.17, y: 0.02, len: 0.1, filament: '#1D1624', anther: '#0D0A12', tilt: 1.6 }));
    return g;
  }
  if (species === 'ranunculus') {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), physical({ color: '#7E9450', roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color('#C8D89A') }));
    eye.position.y = 0.11;
    eye.scale.set(1, 0.8, 1);
    return eye;
  }
  if (species === 'rose') return null;
  // пион: золотые тычинки
  return stamens(R, mobile ? 70 : 130, { r0: 0.05, r1: 0.22, y: 0.1, len: 0.08, filament: '#E6D3A0', anther: '#D0A447' });
}

function leafMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({ color: '#6E7A55', roughness: 0.52, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color('#B9C79A'), side: THREE.DoubleSide, envMapIntensity: 0.5 });
  patchMaterial(mat, {
    key: 'ffp-leaf-v1',
    frag: [
      ['normal_fragment_maps', /* glsl */`
        float lu = vPUv.x * 2.0 - 1.0; float lv = vPUv.y;
        float mid = exp(-lu * lu * 260.0);
        float lat = pow(1.0 - abs(fract(lv * 7.0 - abs(lu) * 2.2) - 0.5) * 2.0, 6.0) * smoothstep(0.02, 0.2, abs(lu));
        normal = ffpBump(-vViewPosition, normal, (mid * 1.2 + lat * 0.4) * 0.004, faceDirection);
        diffuseColor.rgb *= 1.0 + mid * 0.25 + lat * 0.06;
      `, 'after'],
    ],
  });
  return mat;
}

export function leafGeometry(segU = 6, segV = 12) {
  const g = new THREE.PlaneGeometry(1, 1, segU, segV);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2;
    const v = pos.getY(i) + 0.5;
    const w = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.9)), 0.8) * 0.26;
    const x = u * w;
    const z = -Math.abs(x) * 0.5 + v * v * 0.35 + Math.sin(v * 9 + u * 2) * 0.01;
    pos.setXYZ(i, x, v, z);
  }
  g.computeVertexNormals();
  return g;
}

export function buildStem(mobile, { length = 4.4, leaves = 3 } = {}) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(0.02, -0.8, 0.05),
    new THREE.Vector3(-0.1, -length * 0.45, 0.2),
    new THREE.Vector3(-0.32, -length, 0.45),
  ]);
  const stemGeo = new THREE.TubeGeometry(curve, mobile ? 28 : 64, 0.045, mobile ? 8 : 14, false);
  const stem = new THREE.Mesh(stemGeo, new THREE.MeshPhysicalMaterial({ color: '#76825A', roughness: 0.45, sheen: 0.3, sheenColor: new THREE.Color('#C3CDA4'), envMapIntensity: 0.5 }));
  stem.castShadow = true;
  g.add(stem);
  const leafGeo = leafGeometry(mobile ? 4 : 8, mobile ? 8 : 16);
  const leafMat = leafMaterial();
  const mk = (t, rotY, rotZ, scale) => {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.copy(curve.getPointAt(t));
    leaf.rotation.set(-0.4, rotY, rotZ);
    leaf.scale.setScalar(scale);
    leaf.castShadow = true;
    g.add(leaf);
  };
  mk(0.2, 0.6, -1.0, 0.95);
  if (leaves > 1) mk(0.33, -2.4, 1.1, 0.8);
  if (leaves > 2 && !mobile) mk(0.5, 1.4, -0.9, 0.7);
  return g;
}

/**
 * Собирает цветок.
 * opts: { species, tone, mobile, seed, stem, shadows }
 * → { group, petals, center, setOpen(open), dispose() }
 */
export function buildFlower({ species = 'peony', tone = 'blush', mobile = false, seed = 7, stem = true, shadows = true, detail = 1 } = {}) {
  const R = rng(seed);
  const rows = rowsFor(species, mobile, R);
  const seg = mobile ? [10, 14] : [Math.round(16 * detail), Math.round(24 * detail)];
  const geo = petalGeometry(rows, seg);
  const mat = petalMaterial(tone);
  const petals = new THREE.Mesh(geo, mat);
  petals.frustumCulled = false;
  if (shadows) {
    petals.castShadow = true;
    petals.receiveShadow = true;
    petals.customDepthMaterial = depthFor(mat, PETAL_SPEC);
  }
  const group = new THREE.Group();
  group.add(petals);
  const center = centerFor(species, mobile, R);
  if (center) group.add(center);
  if (stem) group.add(buildStem(mobile, { leaves: species === 'anemone' ? 1 : 2 }));
  const u = mat.userData.uniforms;
  // тычинки «проявляются», когда цветок раскрылся
  const centerFrom = species === 'peony' ? 0.45 : species === 'anemone' ? 0.25 : 0.35;
  return {
    group, petals, center, species, tone,
    setOpen(open, t = 0) {
      u.uOpen.value = open;
      u.uTime.value = t;
      if (center) {
        const st = clamp((open - centerFrom) / 0.45);
        center.scale.setScalar(Math.max(0.0001, species === 'ranunculus' ? 1 : st));
        center.visible = species === 'ranunculus' || st > 0.01;
      }
    },
  };
}
