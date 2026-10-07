/* НАВСЕГДА · «Путь к вашему дню» — общие утилиты 3D (three.js, ES-модуль).
 * Материалы, свечения, труба по кривой (лемниската), цветы и лепестки инстансами. */
import * as THREE from 'three';
export { THREE };

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeBack = (t) => { t = clamp(t); const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const C = {
  deep: 0x4e0002, bordo: 0x7a1c22, cream: 0xffe7c6, gold: 0xba8a48, goldS: 0xd6b07b,
  blush: 0xe3aaa0, ivory: 0xf6ead5, sage: 0x7d8a63, leaf: 0x4b5a36,
};

/* ── текстуры ── */
let _glow = null;
export function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.55)');
  gr.addColorStop(0.5, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c); _glow.colorSpace = THREE.SRGBColorSpace;
  return _glow;
}
let _star = null;
export function starTex() {
  if (_star) return _star;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.translate(64, 64);
  for (let k = 0; k < 2; k++) {
    const gr = g.createLinearGradient(-64, 0, 64, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-64, -1.6, 128, 3.2); g.rotate(Math.PI / 2);
  }
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, 22);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(-64, -64, 128, 128);
  _star = new THREE.CanvasTexture(c); _star.colorSpace = THREE.SRGBColorSpace;
  return _star;
}
export function glow(color, size, opacity = 1, tex = null) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex || glowTex(), color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  s.scale.setScalar(size);
  return s;
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* ── материалы ── */
export const M = {
  gold: () => new THREE.MeshPhysicalMaterial({ color: 0xe4b86f, metalness: 1, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 1.5 }),
  goldMatte: () => new THREE.MeshStandardMaterial({ color: 0xc89a55, metalness: 0.85, roughness: 0.42, envMapIntensity: 1.2 }),
  velvet: (c = 0x5c0b13) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.92, metalness: 0, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xc4565c) }),
  cloth: (c = 0xfff3df) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
  matte: (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }),
  glass: (o = 0.16) => new THREE.MeshPhysicalMaterial({ color: 0xfff1dc, metalness: 0, roughness: 0.04, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2.2 }),
  wax: () => new THREE.MeshStandardMaterial({ color: 0xfff1da, roughness: 0.55, emissive: 0x3a2410, emissiveIntensity: 0.4 }),
};

/* ── труба вдоль параметрической кривой (с параллельным переносом рамки) ── */
export function makeTube(segs, radial) {
  const g = new THREE.BufferGeometry();
  const nV = (segs + 1) * (radial + 1);
  const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
  const idx = [];
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const P = [], T = [], N = [];
  for (let i = 0; i <= segs; i++) { P.push(new THREE.Vector3()); T.push(new THREE.Vector3()); N.push(new THREE.Vector3()); }
  const tmp = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) for (let j = 0; j <= radial; j++) { uv[(i * (radial + 1) + j) * 2] = i / segs; uv[(i * (radial + 1) + j) * 2 + 1] = j / radial; }
  g.userData.update = (curveFn, radius, closed = true) => {
    for (let i = 0; i <= segs; i++) curveFn(i / segs, P[i]);
    for (let i = 0; i <= segs; i++) {
      const a = P[closed ? (i === 0 ? segs - 1 : i - 1) : Math.max(0, i - 1)];
      const b = P[closed ? (i === segs ? 1 : i + 1) : Math.min(segs, i + 1)];
      T[i].subVectors(b, a).normalize();
    }
    // начальная нормаль
    tmp.set(0, 0, 1); if (Math.abs(T[0].dot(tmp)) > 0.9) tmp.set(0, 1, 0);
    N[0].copy(tmp).addScaledVector(T[0], -tmp.dot(T[0])).normalize();
    for (let i = 1; i <= segs; i++) N[i].copy(N[i - 1]).addScaledVector(T[i], -N[i - 1].dot(T[i])).normalize();
    if (closed) {
      // разносим закрутку по всей длине, чтобы шов не «ломался»
      B.crossVectors(T[0], N[0]);
      const ang = Math.atan2(N[segs].dot(B), N[segs].dot(N[0]));
      for (let i = 1; i <= segs; i++) {
        const a = -ang * (i / segs), c = Math.cos(a), s = Math.sin(a);
        B.crossVectors(T[i], N[i]);
        N[i].multiplyScalar(c).addScaledVector(B, s).normalize();
      }
    }
    for (let i = 0; i <= segs; i++) {
      B.crossVectors(T[i], N[i]);
      const r = typeof radius === 'function' ? radius(i / segs) : radius;
      for (let j = 0; j <= radial; j++) {
        const th = (j / radial) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        const nx = N[i].x * c + B.x * s, ny = N[i].y * c + B.y * s, nz = N[i].z * c + B.z * s;
        const o = (i * (radial + 1) + j) * 3;
        pos[o] = P[i].x + r * nx; pos[o + 1] = P[i].y + r * ny; pos[o + 2] = P[i].z + r * nz;
        nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
      }
    }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    g.computeBoundingSphere();
  };
  return g;
}

/* лемниската Бернулли (как на корпоративном сайте и в hero-infinity.js) */
export const LEMN_C = 2.3;
export function lemn(a, out, c = LEMN_C, zk = 0.55) {
  const s = Math.sin(a), co = Math.cos(a), d = 1 + s * s;
  return out.set(c * co / d, c * s * co / d, zk * s);
}

/* ── точки-искры ── */
export function makePoints(n, { size = 0.1, color = 0xffe7c6, opacity = 0.9, tex = null } = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.PointsMaterial({
    size, map: tex || glowTex(), color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/* ── геометрия лепестка и листа ── */
export function petalGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 4, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) * 2, v = p.getY(i) + 0.5;
    const w = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.72)), 0.62) * 0.5 + 0.02;
    p.setXYZ(i, u * w, v, 0.2 * u * u * w + 0.38 * v * v - 0.09 * v);
  }
  g.computeVertexNormals();
  return g;
}
export function leafGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 2, 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) * 2, v = p.getY(i) + 0.5;
    const w = Math.sin(Math.PI * Math.pow(v, 0.8)) * 0.22;
    p.setXYZ(i, u * w, v, 0.35 * v * v + 0.4 * u * u * w);
  }
  g.computeVertexNormals();
  return g;
}

export const TONES = {
  blush: ['#f0c1b4', '#e3a597', '#fbe2d8'],
  cream: ['#fff1da', '#f3dfbf', '#fffaf0'],
  rose: ['#c9707a', '#a94855', '#e29aa0'],
  wine: ['#8b2a35', '#6a1822', '#b4535d'],
  gold: ['#e0b878', '#c99a55', '#f1d3a0'],
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const _head = new THREE.Matrix4();
const LAYERS = [
  { n: 7, tilt: 1.05, scale: 0.46, y: 0.0, w: 0.44, off: 0.0 },
  { n: 7, tilt: 0.62, scale: 0.36, y: 0.03, w: 0.4, off: 0.45 },
  { n: 5, tilt: 0.22, scale: 0.26, y: 0.06, w: 0.34, off: 0.2 },
];
const PETALS_PER_HEAD = LAYERS.reduce((a, l) => a + l.n, 0);

/* Набор цветочных головок: один InstancedMesh на все лепестки. */
export class Blooms {
  constructor(maxHeads, seed = 3) {
    this.max = maxHeads; this.rand = rng(seed);
    this.mesh = new THREE.InstancedMesh(petalGeometry(), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.55, side: THREE.DoubleSide, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffe7dc), envMapIntensity: 0.8,
    }), maxHeads * PETALS_PER_HEAD);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.heads = []; // {pos, quat, scale, tone, yaw}
    this.coreMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd9a95c, roughness: 0.6 }), maxHeads);
    this.coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.coreMesh.frustumCulled = false; this.coreMesh.count = 0;
    this.group = new THREE.Group(); this.group.add(this.mesh, this.coreMesh);
    this.col = new THREE.Color();
    this._colored = false;
  }
  add(pos, up, scale, tone = 'blush') {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up.clone().normalize());
    const h = { pos: pos.clone(), quat: q, scale, tone, yaw: this.rand() * 6.28, k: this.heads.length, jit: [] };
    for (let i = 0; i < PETALS_PER_HEAD; i++) h.jit.push(this.rand());
    this.heads.push(h);
    // цвет лепестков
    const pal = TONES[tone];
    LAYERS.forEach((l, li) => { for (let i = 0; i < l.n; i++) {
      const idx = h.k * PETALS_PER_HEAD + this._off(li) + i;
      this.col.set(pal[Math.min(2, li)]).offsetHSL(0, 0, (h.jit[this._off(li) + i] - 0.5) * 0.06);
      this.mesh.setColorAt(idx, this.col);
    } });
    this.mesh.count = this.heads.length * PETALS_PER_HEAD; this.coreMesh.count = this.heads.length;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.write(h, 1);
    return h;
  }
  _off(li) { let o = 0; for (let i = 0; i < li; i++) o += LAYERS[i].n; return o; }
  /* g — рост 0..1 (раскрытие бутона), s — множитель размера */
  write(h, g, s = 1) {
    const base = h.k * PETALS_PER_HEAD;
    const sc = h.scale * s;
    _head.compose(h.pos, h.quat, _s.set(sc, sc, sc));
    let c = 0;
    LAYERS.forEach((l, li) => {
      for (let i = 0; i < l.n; i++, c++) {
        const jit = h.jit[c];
        const az = h.yaw + (i / l.n) * Math.PI * 2 + l.off + (jit - 0.5) * 0.35;
        const open = g;
        const tilt = lerp(0.15, l.tilt, open) + (jit - 0.5) * 0.12;
        _e.set(tilt, 0, 0); _q.setFromEuler(_e);
        const qy = new THREE.Quaternion().setFromAxisAngle(_v.set(0, 1, 0), az);
        qy.multiply(_q);
        const L = l.scale * (0.75 + 0.25 * jit) * (0.25 + 0.75 * g);
        _m.compose(_v.set(0, l.y, 0), qy, _s.set(L * l.w * 3.3, L * 1.9, L * 2.0));
        _m.premultiply(_head);
        this.mesh.setMatrixAt(base + c, _m);
      }
    });
    _m.compose(_v.set(0, 0.04, 0), _q.identity(), _s.set(0.8, 0.5, 0.8));
    _m.premultiply(_head);
    this.coreMesh.setMatrixAt(h.k, _m);
  }
  commit() { this.mesh.instanceMatrix.needsUpdate = true; this.coreMesh.instanceMatrix.needsUpdate = true; }
}

/* Листья инстансами */
export class Leaves {
  constructor(max, seed = 5) {
    this.max = max; this.rand = rng(seed);
    this.mesh = new THREE.InstancedMesh(leafGeometry(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.items = []; this._c = new THREE.Color();
  }
  add(pos, dir, len) {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rand() * 6.28));
    const it = { pos: pos.clone(), quat: q, len, k: this.items.length };
    this.items.push(it);
    this._c.set(this.rand() > 0.5 ? 0x56673c : 0x3f4d2c).offsetHSL(0, 0, (this.rand() - 0.5) * 0.06);
    this.mesh.setColorAt(it.k, this._c);
    this.mesh.count = this.items.length;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.write(it, 1);
    return it;
  }
  write(it, g) {
    const L = it.len * Math.max(0.0001, g);
    _m.compose(it.pos, it.quat, _s.set(L * 0.6, L, L));
    this.mesh.setMatrixAt(it.k, _m);
  }
  commit() { this.mesh.instanceMatrix.needsUpdate = true; }
}

/* ── падающие лепестки (общая система на весь холст) ── */
export class Petals {
  constructor(n) {
    this.n = n;
    this.mesh = new THREE.InstancedMesh(petalGeometry(), new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x2a0a08, emissiveIntensity: 0.5,
    }), n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.count = 0;
    const r = rng(77), pal = ['#f0c1b4', '#fbe2d8', '#fff1da', '#e3a597', '#f1d3a0'], c = new THREE.Color();
    this.d = [];
    for (let i = 0; i < n; i++) {
      this.d.push({ x: (r() - 0.5), y: r(), z: (r() - 0.5), s: 0.55 + r() * 0.8, ph: r() * 6.28, sp: 0.35 + r() * 0.5, rx: r() * 6.28, ry: r() * 6.28, rs: 0.6 + r() * 1.4 });
      c.set(pal[i % pal.length]); this.mesh.setColorAt(i, c);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  /* center — центр облака, size — (w,h,d), amount 0..1 */
  update(t, center, size, amount, fall = 1) {
    const k = Math.floor(this.n * clamp(amount));
    this.mesh.count = k; this.mesh.visible = k > 0;
    if (!k) return;
    for (let i = 0; i < k; i++) {
      const d = this.d[i];
      const y = ((d.y - t * d.sp * 0.09 * fall) % 1 + 1) % 1;
      const sway = Math.sin(t * 0.9 + d.ph) * 0.35;
      _v.set(center.x + (d.x + sway * 0.05) * size.x + Math.sin(t * 0.7 + d.ph * 2) * 0.3, center.y + (y - 0.5) * size.y, center.z + d.z * size.z);
      _e.set(d.rx + t * d.rs, d.ry + t * d.rs * 0.7, Math.sin(t + d.ph));
      _q.setFromEuler(_e);
      const sc = 0.15 * d.s;
      _m.compose(_v, _q, _s.set(sc * 0.9, sc * 1.1, sc));
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* простая «подпись»-плоскость из canvas */
export function labelPlane(text, w, h, { font = "600 64px 'SF Pro Display',system-ui,sans-serif", color = '#ffe7c6', px = 512, bg = null } = {}) {
  const ratio = h / w;
  const tex = canvasTex(px, Math.round(px * ratio), (g, cw, ch) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch / 2 + 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  return m;
}
