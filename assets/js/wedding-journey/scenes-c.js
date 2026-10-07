/* «Путь к вашему дню» — сцены 7–9: день мероприятия, жених и невеста, финал ∞. */
import { THREE, C, M, clamp, lerp, smooth, easeOut, easeBack, easeInOut, rng, glow, glowTex, starTex, makePoints, makeTube, lemn, LEMN_C, Blooms, Leaves, Petals } from '/assets/js/wedding-journey/core.js?v=wj1';

const V3 = THREE.Vector3;
const mixv = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/* ───────── 7. День мероприятия: столы → арка → декор и лепестки ───────── */
function makeClothMesh(R, H, segs) {
  // профиль: центр стола → кромка → юбка до пола
  const prof = [];
  prof.push([0, H]); prof.push([R * 0.5, H]); prof.push([R * 0.96, H]); prof.push([R, H - 0.012]); prof.push([R * 1.015, H - 0.07]);
  const rings = 9;
  for (let i = 1; i <= rings; i++) { const f = i / rings; prof.push([R * (1.03 + 0.14 * f * f), lerp(H - 0.07, 0.04, f)]); }
  const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), segs);
  const m = new THREE.Mesh(geo, M.cloth(0xfff2dc));
  m.userData.base = geo.attributes.position.array.slice();
  m.userData.H = H;
  return m;
}

export function sceneEvent(E) {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.2, 64), new THREE.MeshStandardMaterial({ color: 0x2a0a0c, roughness: 0.8, envMapIntensity: 0.5 }));
  ground.position.y = -0.1; g.add(ground);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9.9, 0.04, 6, 96), M.gold()); ring.rotation.x = Math.PI / 2; g.add(ring);
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xffb868, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = 0.02; g.add(floorGlow);

  const blooms = new Blooms(E.mobile ? 60 : 100, 4); g.add(blooms.group);
  const leaves = new Leaves(E.mobile ? 80 : 160, 6); g.add(leaves.mesh);

  /* столы */
  const tables = [];
  const gold = M.gold(), plateM = new THREE.MeshPhysicalMaterial({ color: 0xfff8ee, roughness: 0.2, clearcoat: 1, envMapIntensity: 1.2 }), glassM = M.glass(0.3);
  const gobProf = [[0, 0], [0.012, 0], [0.012, 0.09], [0.05, 0.1], [0.052, 0.19], [0.03, 0.22], [0.0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y));
  const gobGeo = new THREE.LatheGeometry(gobProf, 12);
  [[-2.3, 1.3, 0.0], [2.5, 0.7, 0.8]].forEach(([x, z, ph], ti) => {
    const T = new THREE.Group(); T.position.set(x, 0, z); g.add(T);
    const H = 0.78, R = 1.15;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.35, H, 16), M.matte(0x4a2a1c, 0.5)); leg.position.y = H / 2; T.add(leg);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.04, 40), M.matte(0x6b4228, 0.5)); top.position.y = H - 0.02; T.add(top);
    const cloth = makeClothMesh(R, H + 0.01, E.mobile ? 36 : 56); T.add(cloth);
    const plates = [], glasses = [];
    const n = E.mobile ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ti;
      const pl = new THREE.Group(); pl.position.set(Math.cos(a) * 0.78, H + 0.01, Math.sin(a) * 0.78);
      const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.025, 28), plateM); pm.position.y = 0.012;
      const pr = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.009, 6, 28), gold); pr.rotation.x = Math.PI / 2; pr.position.y = 0.025;
      pl.add(pm, pr);
      const gl = new THREE.Mesh(gobGeo, glassM); gl.position.set(Math.cos(a) * 0.5 - Math.cos(a + 0.5) * 0.0, H + 0.0, Math.sin(a) * 0.5); gl.position.set(Math.cos(a + 0.28) * 0.6, H + 0.02, Math.sin(a + 0.28) * 0.6);
      T.add(pl, gl); plates.push(pl); glasses.push(gl);
    }
    const candles = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.6;
      const cg = new THREE.Group(); cg.position.set(Math.cos(a) * 0.3, H + 0.02, Math.sin(a) * 0.3); cg.scale.setScalar(1.6);
      const hold = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 14), gold);
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.28, 12), M.wax()); wax.geometry.translate(0, 0.16, 0);
      const flame = glow(0xffc070, 0.5, 0); flame.position.y = 0.36;
      const core = glow(0xfff1c8, 0.18, 0); core.position.y = 0.34;
      cg.add(hold, wax, flame, core); T.add(cg); candles.push({ cg, wax, flame, core, ph: i + ti * 2 });
    }
    // центр: цветы
    const heads = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, rr = i === 5 ? 0 : 0.18;
      const h = blooms.add(new V3(x + Math.cos(a) * rr, H + 0.12 + (i === 5 ? 0.08 : 0), z + Math.sin(a) * rr), new V3(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3), 0.3 + (i === 5 ? 0.05 : 0), ['blush', 'cream', 'rose'][i % 3]);
      heads.push(h);
    }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; leaves.add(new V3(x + Math.cos(a) * 0.1, H + 0.06, z + Math.sin(a) * 0.1), new V3(Math.cos(a) * 0.9, 0.5, Math.sin(a) * 0.9), 0.28); }
    tables.push({ T, cloth, plates, glasses, candles, heads, ph, x, z });
  });

  /* арка */
  const AZ = -3.6, AR = 1.75, POST = 2.8;
  const arch = new THREE.Group(); arch.position.z = AZ; g.add(arch);
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.8, 0.14, 40), M.matte(0xe9d6b6, 0.55)); platform.position.y = 0.07; arch.add(platform);
  const aisleRunner = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 6), M.matte(0xf0dcb8, 0.8)); aisleRunner.rotation.x = -Math.PI / 2; aisleRunner.position.set(0, 0.015, 3.9); g.add(aisleRunner); aisleRunner.position.z = AZ + 3.6;
  const frameM = M.goldMatte();
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, POST, 12), frameM); post.position.set(s * AR, POST / 2 + 0.14, 0); arch.add(post); }
  const arc = new THREE.Mesh(new THREE.TorusGeometry(AR, 0.05, 10, 56, Math.PI), frameM); arc.position.y = POST + 0.14; arch.add(arc);
  // путь вдоль арки: 0..1 слева (низ→верх), справа зеркально
  const archPath = (s, side) => {
    const L1 = POST, L2 = Math.PI * AR / 2, tot = L1 + L2, d = s * tot;
    if (d <= L1) return { p: new V3(side * AR, 0.14 + d, 0), n: new V3(side, 0, 0.35) };
    const a = (d - L1) / AR; // 0..π/2
    return { p: new V3(side * AR * Math.cos(a), 0.14 + POST + AR * Math.sin(a), 0), n: new V3(Math.cos(a) * side, Math.sin(a), 0.35) };
  };
  const rr = rng(41), archHeads = [];
  const nSide = E.mobile ? 13 : 24;
  for (const side of [-1, 1]) for (let i = 0; i < nSide; i++) {
    const s = (i + rr() * 0.6) / (nSide - 0.4), ap = archPath(clamp(s), side);
    const pos = ap.p.clone(); pos.x += (rr() - 0.5) * 0.22; pos.y += (rr() - 0.5) * 0.18; pos.z += 0.04 + rr() * 0.2;
    pos.add(new V3(0, 0, AZ));
    const h = blooms.add(pos, ap.n.clone().add(new V3(0, 0, 0.7)), 0.3 + rr() * 0.22, ['blush', 'cream', 'rose', 'blush', 'wine'][Math.floor(rr() * 5)]);
    archHeads.push({ h, s });
    if (i % 2 === 0) {
      const lp = ap.p.clone().add(new V3(0, 0, AZ + 0.02)); lp.x += (rr() - 0.5) * 0.15;
      const li = leaves.add(lp, ap.n.clone().add(new V3((rr() - 0.5) * 1.2, (rr() - 0.5) * 1.2, 0.5)), 0.5 + rr() * 0.3); archHeads.push({ leaf: li, s: s - 0.02 });
    }
  }
  // верхний пышный акцент
  for (let i = 0; i < (E.mobile ? 4 : 8); i++) {
    const a = Math.PI / 2 + (rr() - 0.5) * 0.9, pos = new V3(Math.cos(a) * AR * 0.9, 0.14 + POST + AR * Math.sin(a) + 0.04, AZ + 0.12 + rr() * 0.2);
    const h = blooms.add(pos, new V3(Math.cos(a) * 0.5, 1, 0.7), 0.34 + rr() * 0.18, ['cream', 'blush', 'rose'][i % 3]); archHeads.push({ h, s: 0.95 + rr() * 0.05 });
  }
  // колонны-цветники на подиуме
  /* гирлянды */
  const poleM = frameM, bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc, toneMapped: false }), bulbGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const bulbs = [];
  const poles = [[-5.2, 4], [5.2, 4], [-5.2, -1.5], [5.2, -1.5]];
  poles.forEach(([x, z]) => { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.4, 8), poleM); pl.position.set(x, 1.7, z); g.add(pl); });
  [[4, 4, -1.5, -1.5], [0, 1, 2, 3]].forEach((_, k) => { void k; });
  const strings = [[poles[0], poles[1]], [poles[2], poles[3]], [poles[0], poles[2]], [poles[1], poles[3]]];
  strings.forEach(([a, b], si) => {
    const pts = [], n = 36;
    for (let i = 0; i <= n; i++) { const f = i / n; pts.push(new V3(lerp(a[0], b[0], f), 3.35 - Math.sin(f * Math.PI) * 0.55, lerp(a[1], b[1], f))); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x120805 })));
    const cnt = E.mobile ? 9 : 14;
    for (let i = 0; i < cnt; i++) {
      const pt = pts[Math.round(((i + 0.5) / cnt) * n)];
      const m = new THREE.Mesh(bulbGeo, bulbMat); m.position.copy(pt); m.position.y -= 0.06; g.add(m);
      const sp = glow(0xffc97a, 0.7, 0); sp.position.copy(m.position); g.add(sp);
      bulbs.push({ m, sp, ph: Math.random() * 6.28, f: (si * 0.04 + i / cnt * 0.5) });
    }
  });

  const petals = new Petals(E.mobile ? 60 : 130); g.add(petals.mesh);
  const dust = makePoints(E.mobile ? 40 : 90, { size: 0.09, color: 0xffe7c6, opacity: 0.7 });
  const dp = dust.geometry.attributes.position, rd = rng(3);
  for (let i = 0; i < dp.count; i++) dp.setXYZ(i, (rd() - 0.5) * 14, rd() * 5, (rd() - 0.5) * 12);
  g.add(dust);

  const _ap = new V3();
  const camA = [[-0.7, 3.4, 5.9], [-1.5, 0.6, 1.1]], camB = [[0.2, 2.9, 4.6], [0, 2.7, AZ]], camC = [[0.3, 4.8, 11.5], [0, 1.9, -1.2]];
  return {
    group: g, mood: { lc: 0xffd2a0, li: 26, glow: 0.6 },
    // подпись этапа: какая из трёх частей идёт сейчас
    phase: (p) => (p < 0.34 ? 0 : p < 0.68 ? 1 : 2),
    update(p, t, dt) {
      const pa = clamp(p / 0.34), pb = clamp((p - 0.34) / 0.34), pc = clamp((p - 0.68) / 0.32);
      floorGlow.material.opacity = 0.18 + 0.2 * pc;
      tables.forEach((tb, ti) => {
        const e = easeOut(smooth(0, 0.16, pa) * 1.0);
        // скатерть опускается и расправляется
        const arr = tb.cloth.geometry.attributes.position, base = tb.cloth.userData.base, H = tb.cloth.userData.H;
        const dropped = easeOut(smooth(0.0 + ti * 0.04, 0.18 + ti * 0.04, pa));
        if (tb.last !== dropped) {
          tb.last = dropped;
          const amp = (1 - dropped);
          for (let i = 0; i < arr.count; i++) {
            const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
            const sk = clamp((H - by) / H), ang = Math.atan2(bz, bx);
            const f = 1 + amp * (0.55 * sk + 0.12 * Math.sin(ang * 6 + sk * 6) * sk);
            arr.setXYZ(i, bx * f, by + amp * 2.8, bz * f);
          }
          arr.needsUpdate = true;
        }
        tb.cloth.visible = dropped > 0.001;
        tb.plates.forEach((pl, i) => { const q = easeBack(smooth(0.12 + i * 0.012, 0.28 + i * 0.012, pa)); pl.position.y = 0.79 + (1 - q) * 2.2; pl.visible = q > 0.001; });
        tb.glasses.forEach((gl, i) => { const q = easeBack(smooth(0.2 + i * 0.012, 0.34 + i * 0.012, pa)); gl.position.y = 0.8 + (1 - q) * 2.2; gl.visible = q > 0.001; });
        tb.candles.forEach((c, i) => {
          const rise = easeOut(smooth(0.3 + i * 0.03, 0.46 + i * 0.03, pa)), lit = smooth(0.62 + i * 0.1, 0.9 + i * 0.1, pa);
          c.wax.scale.y = Math.max(0.001, rise); c.cg.visible = rise > 0.001;
          const fl = 0.85 + Math.sin(t * 9 + c.ph * 3) * 0.1 + Math.sin(t * 5.3 + c.ph) * 0.08;
          c.flame.material.opacity = 0.95 * lit; c.flame.scale.setScalar(0.5 * (0.5 + 0.5 * lit) * fl);
          c.core.material.opacity = lit; c.core.scale.setScalar(0.2 * fl);
          c.flame.position.y = 0.3 * rise + 0.08; c.core.position.y = 0.3 * rise + 0.06;
        });
        tb.heads.forEach((h, i) => { const q = easeBack(smooth(0.35 + i * 0.03, 0.62 + i * 0.03, pa)); blooms.write(h, clamp(q), Math.max(0.0001, q)); });
      });
      // арка
      archHeads.forEach((a) => {
        const q = easeBack(clamp(pb * 1.7 - a.s * 0.7));
        if (a.h) blooms.write(a.h, clamp(q), Math.max(0.0001, q));
        else leaves.write(a.leaf, clamp(easeOut(clamp(pb * 1.7 - a.s * 0.7))));
      });
      blooms.commit(); leaves.commit();
      // гирлянды
      const on = smooth(0.0, 1, pc);
      bulbs.forEach((b) => { const o = smooth(b.f * 0.6, b.f * 0.6 + 0.4, pc); b.sp.material.opacity = o * (0.7 + Math.sin(t * 2 + b.ph) * 0.2); b.m.visible = o > 0.01; });
      // лепестки
      petals.update(t, _ap.set(0, 2.4, -0.5), { x: 11, y: 5.5, z: 10 }, smooth(0.62, 0.9, p), 1);
      dust.material.opacity = 0.7 * smooth(0.5, 0.9, p);
    },
    cam(p) {
      const k1 = easeInOut(smooth(0.30, 0.42, p)), k2 = easeInOut(smooth(0.64, 0.78, p));
      // небольшой дрейф, чтобы кадр жил
      const dr = Math.sin(p * 6) * 0.15;
      let pos = mixv(camA[0], camB[0], k1), tgt = mixv(camA[1], camB[1], k1);
      pos = mixv(pos, camC[0], k2); tgt = mixv(tgt, camC[1], k2);
      pos[0] += dr * (1 - k2);
      return { pos, tgt };
    },
  };
}

/* ───────── 8. Выходят жених и невеста ───────── */
const VEIL_VS = /* glsl */`
  uniform float uTime;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vLen;
  vec3 veil(vec2 uv) {
    float u = uv.x - 0.5, v = uv.y;
    float L = 3.6;
    float W = 0.45 + 1.5 * pow(v, 0.9);
    float fall = pow(v, 0.55);
    float t = uTime;
    float x = u * W + sin(v * 6.0 - t * 2.3) * 0.22 * v * v + sin(u * 3.0 + t) * 0.03 * v;
    float y = 1.62 - 1.5 * fall + sin(v * 9.0 - t * 3.1) * 0.12 * v + sin(u * 6.0 + v * 4.0 - t * 2.0) * 0.045 * v + 0.1 * v;
    float z = -v * L + sin(v * 5.0 - t * 2.0 + u * 2.0) * 0.1 * v;
    return vec3(x, y, z - 0.06);
  }
  void main() {
    vUv = uv; vLen = 3.6;
    vec3 p = veil(uv);
    vec3 pu = veil(uv + vec2(0.01, 0.0)), pv = veil(uv + vec2(0.0, 0.01));
    vec3 n = normalize(cross(pu - p, pv - p));
    vN = normalize(normalMatrix * n);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;
const VEIL_FS = /* glsl */`
  varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vLen;
  void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vV);
    float fres = pow(1.0 - abs(dot(n, v)), 2.0);
    float l = clamp(dot(n, normalize(vec3(0.35, 0.8, 0.6))) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(vec3(0.97, 0.9, 0.82), vec3(1.0, 0.98, 0.95), l) + vec3(0.25, 0.2, 0.12) * fres;
    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(1.0, 0.85, vUv.y);
    vec2 g = vec2(vUv.x * 9.0, vUv.y * vLen * 5.0); vec2 c = fract(g) - 0.5;
    float dots = 1.0 - smoothstep(0.1, 0.16, length(c));
    float a = (0.42 + 0.5 * fres + dots * 0.2) * edge;
    gl_FragColor = vec4(col, clamp(a, 0.0, 0.88));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function sceneCouple(E) {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 36), new THREE.MeshStandardMaterial({ color: 0x2b0b0d, roughness: 0.7 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.005, -4); g.add(ground);
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 30), M.matte(0xf3e2c3, 0.75)); runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.006, -7); g.add(runner);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 30), M.gold()); l.rotation.x = -Math.PI / 2; l.position.set(s * 0.87, 0.008, -7); g.add(l); }

  const blooms = new Blooms(E.mobile ? 40 : 90, 8); g.add(blooms.group);
  const leaves = new Leaves(E.mobile ? 50 : 110, 9); g.add(leaves.mesh);
  const rr = rng(2);
  // цветочные вазоны вдоль дорожки
  const posts = E.mobile ? 4 : 6;
  for (const s of [-1, 1]) for (let i = 0; i < posts; i++) {
    const z = -2.2 - i * 2.8, x = s * 1.7;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.0, 16), M.matte(0xf0dcb8, 0.6)); col.position.set(x, 0.5, z); g.add(col);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.12, 16), M.gold()); cap.position.set(x, 1.04, z); g.add(cap);
    for (let k = 0; k < 4; k++) { const a = rr() * 6.28; blooms.add(new V3(x + Math.cos(a) * 0.18, 1.2 + rr() * 0.12, z + Math.sin(a) * 0.18), new V3(Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6), 0.34 + rr() * 0.12, ['blush', 'cream', 'rose'][(k + i) % 3]); }
    for (let k = 0; k < 3; k++) { const a = rr() * 6.28; leaves.add(new V3(x, 1.1, z), new V3(Math.cos(a), 0.7, Math.sin(a)), 0.5); }
    const lit = glow(0xffc27a, 0.8, 0.5); lit.position.set(x, 1.55, z); g.add(lit);
  }
  // арка вдали и контровой свет
  const stage = glow(0xffe0b0, 14, 0.7); stage.position.set(0, 1.6, -14); g.add(stage);
  const stage2 = glow(0xff9a6a, 24, 0.35); stage2.position.set(0, 1.0, -16); g.add(stage2);
  const far = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 40, Math.PI), M.gold()); far.position.set(0, 2.2, -13); g.add(far);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), M.gold()); p.position.set(s * 1.6, 1.1, -13); g.add(p); }

  /* фигуры: жених и невеста (силуэтные манекены) */
  const skin = new THREE.MeshStandardMaterial({ color: 0xe6bf9f, roughness: 0.55 });
  const dressM = new THREE.MeshPhysicalMaterial({ color: 0xfff6ea, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide, envMapIntensity: 0.9 });
  const suitM = new THREE.MeshPhysicalMaterial({ color: 0x1f1517, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0x7a4a50), envMapIntensity: 1.0 });
  const couple = new THREE.Group(); g.add(couple);
  const seg = E.mobile ? 20 : 36;

  const bride = new THREE.Group(); bride.position.x = 0.38; couple.add(bride);
  const gown = [[0, 1.6], [0.045, 1.57], [0.11, 1.5], [0.16, 1.42], [0.15, 1.3], [0.105, 1.16], [0.095, 1.08], [0.18, 0.95], [0.33, 0.62], [0.48, 0.3], [0.58, 0.04], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y));
  bride.add(new THREE.Mesh(new THREE.LatheGeometry(gown, seg), dressM));
  const bh = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 16), skin); bh.position.y = 1.68; bride.add(bh);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), M.matte(0x4a2a1a, 0.6)); bun.position.set(0, 1.7, -0.07); bride.add(bun);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.08, 10), skin); neck.position.y = 1.6; bride.add(neck);
  const tiara = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.007, 6, 20, Math.PI), M.gold()); tiara.position.set(0, 1.71, 0); tiara.rotation.set(0, 0, 0); bride.add(tiara);
  const arm = (parent, sx, tx, ty, tz, mat) => {
    const a = new V3(sx, 1.45, 0), b = new V3(tx, ty, tz), d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, len, 8), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); parent.add(m); return m;
  };
  arm(bride, -0.14, -0.05, 1.12, 0.22, dressM); arm(bride, 0.14, 0.05, 1.12, 0.22, dressM);
  const bq = new THREE.Group(); bq.position.set(0, 1.12, 0.26); bride.add(bq);
  const bouquet = new Blooms(10, 12); bq.add(bouquet.group);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; bouquet.add(new V3(Math.cos(a) * 0.07, 0.04 + (i % 2) * 0.03, Math.sin(a) * 0.07), new V3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5 + 0.4), 0.14, ['cream', 'blush', 'rose'][i % 3]); }
  // фата
  const veilGeo = new THREE.PlaneGeometry(1, 1, E.mobile ? 22 : 34, E.mobile ? 18 : 30);
  const veilMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: VEIL_VS, fragmentShader: VEIL_FS, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const veil = new THREE.Mesh(veilGeo, veilMat); veil.frustumCulled = false; bride.add(veil);

  const groom = new THREE.Group(); groom.position.x = -0.38; couple.add(groom);
  const jacket = [[0, 1.63], [0.05, 1.6], [0.14, 1.55], [0.21, 1.47], [0.2, 1.3], [0.18, 1.1], [0.2, 0.88], [0.17, 0.84], [0, 0.84]].map(([x, y]) => new THREE.Vector2(x, y));
  const jm = new THREE.Mesh(new THREE.LatheGeometry(jacket, seg), suitM); jm.scale.set(1.1, 1, 0.78); groom.add(jm);
  const legs = [];
  for (const s of [-1, 1]) { const lg = new THREE.Group(); lg.position.set(s * 0.085, 0.86, 0); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.86, 12), suitM); l.position.y = -0.43; const sh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), M.matte(0x120a0b, 0.3)); sh.position.set(0, -0.86, 0.04); lg.add(l, sh); groom.add(lg); legs.push(lg); }
  const gh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), skin); gh.position.y = 1.76; groom.add(gh);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M.matte(0x2b1810, 0.6)); hair.position.set(0, 1.77, -0.01); groom.add(hair);
  const gneck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.09, 10), skin); gneck.position.y = 1.65; groom.add(gneck);
  const tie = new THREE.Group(); tie.position.set(0, 1.58, 0.15);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 8), M.matte(0x7a1c22, 0.4)); w.rotation.z = s * Math.PI / 2; w.position.x = s * 0.04; tie.add(w); }
  groom.add(tie);
  arm(groom, -0.22, -0.2, 1.0, 0.1, suitM); arm(groom, 0.22, 0.28, 1.12, 0.14, suitM);
  const pocket = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.matte(0xffe7c6, 0.5)); pocket.position.set(0.12, 1.38, 0.15); groom.add(pocket);

  blooms.commit(); leaves.commit(); bouquet.commit();
  const petals = new Petals(E.mobile ? 70 : 150); g.add(petals.mesh);
  const _c = new V3();
  const L0 = -9.5, L1 = 1.4;
  return {
    group: g, mood: { lc: 0xffd4a0, li: 22, glow: 0.7 },
    update(p, t) {
      const w = easeInOut(smooth(0.04, 0.92, p));
      const z = lerp(L0, L1, w);
      const walking = p > 0.04 && p < 0.92;
      const step = t * 5.2;
      couple.position.set(0, (walking ? Math.abs(Math.sin(step)) * 0.025 : 0), z);
      couple.rotation.y = walking ? Math.sin(step * 0.5) * 0.015 : 0;
      legs.forEach((l, i) => { l.rotation.x = walking ? Math.sin(step + i * Math.PI) * 0.25 : 0; });
      bride.rotation.z = walking ? Math.sin(step * 0.5) * 0.015 : 0;
      veilMat.uniforms.uTime.value = t;
      petals.update(t, _c.set(0, 2.4, z - 1), { x: 8, y: 6, z: 12 }, smooth(0.0, 0.3, p), 1.0);
      stage.material.opacity = 0.55 + 0.15 * Math.sin(t * 0.7);
    },
    cam(p) {
      const w = easeInOut(smooth(0.04, 0.92, p));
      return { pos: [0.55 - p * 0.2, 1.6 - p * 0.05, 6.6 + p * 0.3], tgt: [0, 1.0 + p * 0.1, lerp(-4.5, -0.6, w)] };
    },
  };
}

/* ───────── 9. Финал: два кольца → ∞ ───────── */
/* лемниската для финала: z = sin 2t — каждая петля замкнута, поэтому два кольца переходят в ∞ без швов */
function lemnF(t, out) {
  const s = Math.sin(t), co = Math.cos(t), d = 1 + s * s;
  return out.set(LEMN_C * co / d, LEMN_C * s * co / d, 0.5 * Math.sin(2 * t));
}
export function sceneFinale(E) {
  const g = new THREE.Group();
  const segs = E.mobile ? 150 : 240, rad = E.mobile ? 14 : 24;
  const gA = makeTube(segs, rad), gB = makeTube(segs, rad);
  const mA = new THREE.Mesh(gA, M.gold()), mB = new THREE.Mesh(gB, M.gold());
  const rings = new THREE.Group(); rings.add(mA, mB); g.add(rings);
  const R = 1.15, tmp = new V3();
  const state = { key: '' };
  function build(m, cx, w) {
    // кольцо A — слева, кольцо B — справа; w — поворот плоскости кольца B
    const radius = lerp(0.11, 0.27, m);
    gA.userData.update((u, o) => {
      const th = -2 * Math.PI * u, ring = new V3(-cx + R * Math.cos(th), R * Math.sin(th), 0);
      lemnF(Math.PI / 2 + Math.PI * u, tmp); return o.copy(ring).lerp(tmp, m);
    }, radius, true);
    gB.userData.update((u, o) => {
      const th = Math.PI + 2 * Math.PI * u, ring = new V3(cx + R * Math.cos(th), R * Math.sin(th) * Math.sin(w), R * Math.sin(th) * Math.cos(w));
      lemnF(-Math.PI / 2 + Math.PI * u, tmp); return o.copy(ring).lerp(tmp, m);
    }, radius, true);
  }
  build(0, 0.6, 0);

  const halo = glow(0xffc27a, 12, 0); halo.position.z = -1; g.add(halo);
  const flash = glow(0xfff0d0, 16, 0); flash.position.z = 1.5; g.add(flash);
  const star = glow(0xffffff, 6, 0, starTex()); star.position.z = 0.6; g.add(star);
  const N = E.mobile ? 70 : 150, sparks = makePoints(N, { size: 0.12, color: 0xffe0a8, opacity: 1 });
  const sp = sparks.geometry.attributes.position, rs = rng(13), dir = [];
  for (let i = 0; i < N; i++) { const a = rs() * 6.28, f = Math.acos(2 * rs() - 1); dir.push([Math.sin(f) * Math.cos(a), Math.sin(f) * Math.sin(a), Math.cos(f), 1.5 + rs() * 4.5, rs() * 6.28]); }
  g.add(sparks);
  const amb = makePoints(E.mobile ? 60 : 140, { size: 0.09, color: 0xffe7c6, opacity: 0.0 });
  const ap = amb.geometry.attributes.position, ra = rng(17);
  for (let i = 0; i < ap.count; i++) ap.setXYZ(i, (ra() - 0.5) * 10, (ra() - 0.5) * 5, (ra() - 0.5) * 5 - 1);
  g.add(amb);
  const petals = new Petals(E.mobile ? 40 : 90); g.add(petals.mesh);
  const _c = new V3(0, 2.5, 0);

  const out = {
    group: g, mood: { lc: 0xffd0a0, li: 40, glow: 0.8 }, flash: 0,
    update(p, t) {
      const a = easeOut(smooth(0.0, 0.3, p)), link = easeInOut(smooth(0.26, 0.5, p));
      const m = easeInOut(smooth(0.52, 0.78, p));
      const cx = lerp(lerp(4.2, 0.6, a), 1.15, m);
      const w = easeInOut(smooth(0.5, 0.78, p)) * Math.PI / 2;
      const key = [m.toFixed(3), cx.toFixed(3), w.toFixed(3)].join();
      if (key !== state.key) { state.key = key; build(m, cx, w); }
      rings.rotation.set(Math.sin(t * 0.4) * 0.08, (1 - m) * (0.9 + Math.sin(t * 0.5) * 0.2) + Math.sin(t * 0.3) * 0.3 * m + (1 - link) * 0.4, (1 - m) * 0.3);
      rings.scale.setScalar(lerp(0.9, 1.0, m));
      const fp = clamp((p - 0.76) / 0.2), bell = Math.sin(Math.PI * Math.pow(fp, 0.7));
      out.flash = p < 0.76 ? 0 : bell;
      flash.material.opacity = bell * 0.9; flash.scale.setScalar(6 + 14 * fp);
      star.material.opacity = bell * 0.9; star.scale.setScalar(3 + 8 * fp); star.material.rotation = t * 0.3;
      halo.material.opacity = 0.18 * smooth(0.5, 1, p) + 0.06 * Math.sin(t);
      // искры
      const se = easeOut(clamp((p - 0.76) / 0.5));
      for (let i = 0; i < N; i++) {
        const d = dir[i], r = se * d[3];
        sp.setXYZ(i, d[0] * r, d[1] * r - se * se * 0.9 + Math.sin(t * 3 + d[4]) * 0.05, d[2] * r + 0.3);
      }
      sp.needsUpdate = true;
      sparks.material.opacity = p < 0.76 ? 0 : (1 - smooth(0.8, 1, p)) * 0.95 + 0.0;
      sparks.visible = p >= 0.76;
      amb.material.opacity = 0.75 * smooth(0.82, 1, p); amb.rotation.y = t * 0.05;
      petals.update(t, _c, { x: 9, y: 6, z: 6 }, smooth(0.8, 1, p) * 0.7, 0.8);
    },
    cam: (p) => ({ pos: [0, 0.1, 9.8 - smooth(0.7, 1, p) * 0.8], tgt: [0, 0, 0] }),
  };
  return out;
}
