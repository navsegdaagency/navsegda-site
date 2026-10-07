/* «Путь к вашему дню» — сцены 5–6: стеклянная оранжерея и веер карточек подбора. */
import { THREE, C, M, Blooms, Leaves, clamp, lerp, smooth, easeOut, easeBack, easeInOut, rng, glow, glowTex, makePoints, canvasTex } from '/assets/js/wedding-journey/core.js?v=wj1';

const V3 = THREE.Vector3;
const mixv = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/* ───────── 5. Зал: стеклянная оранжерея, камера входит внутрь ───────── */
export function sceneHall(E) {
  const g = new THREE.Group();
  const W = 4, D = 6, WH = 2.7, RH = 4.3;
  const frame = M.goldMatte(), glass = M.glass(0.2); glass.color.set(0xffdcae); glass.emissive = new THREE.Color(0xff9a50); glass.emissiveIntensity = 0.1;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.16, 12.8), new THREE.MeshStandardMaterial({ color: 0x3b1912, roughness: 0.36, metalness: 0.1, envMapIntensity: 1.0 }));
  floor.position.y = -0.08; g.add(floor);
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 12.4), M.matte(0xf0dcb8, 0.8)); runner.rotation.x = -Math.PI / 2; runner.position.y = 0.012; g.add(runner);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 12.4), M.gold()); l.rotation.x = -Math.PI / 2; l.position.set(s * 0.77, 0.014, 0); g.add(l); }

  const box = (w, h, d, x, y, z, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frame); m.position.set(x, y, z); m.rotation.z = rz; g.add(m); return m; };
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 6; i++) box(0.12, WH, 0.12, s * W, WH / 2, -D + i * 2);
    box(0.1, 0.1, D * 2 + 0.2, s * W, WH, 0);
  }
  box(0.14, 0.14, D * 2 + 0.2, 0, RH, 0);
  const rl = Math.hypot(W, RH - WH), ra = Math.atan2(RH - WH, W);
  for (let i = 0; i <= 6; i++) { box(rl, 0.08, 0.08, -W / 2, WH + (RH - WH) / 2, -D + i * 2, ra); box(rl, 0.08, 0.08, W / 2, WH + (RH - WH) / 2, -D + i * 2, -ra); }
  // стёкла
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(D * 2, WH), glass); w.rotation.y = Math.PI / 2; w.position.set(s * W, WH / 2, 0); g.add(w);
    const geo = new THREE.PlaneGeometry(rl, D * 2); geo.rotateX(-Math.PI / 2);
    const rf = new THREE.Mesh(geo, glass); rf.position.set(s * W / 2, WH + (RH - WH) / 2, 0); rf.rotation.z = -s * ra; g.add(rf);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, WH), glass); back.position.set(0, WH / 2, -D); g.add(back);
  const gs = new THREE.Shape(); gs.moveTo(-W, 0); gs.lineTo(W, 0); gs.lineTo(0, RH - WH); gs.closePath();
  const gb = new THREE.Mesh(new THREE.ShapeGeometry(gs), glass); gb.position.set(0, WH, -D); g.add(gb);
  const gf = gb.clone(); gf.position.z = D; g.add(gf);
  // фронт: боковые стёкла + двери
  for (const s of [-1, 1]) {
    const fw = new THREE.Mesh(new THREE.PlaneGeometry(W - 1.9, WH), glass); fw.position.set(s * (1.9 + (W - 1.9) / 2), WH / 2, D); g.add(fw);
    box(0.12, WH, 0.12, s * 1.9, WH / 2, D);
  }
  box(W * 2, 0.12, 0.12, 0, WH, D); box(3.8, 0.1, 0.1, 0, WH - 0.2, D);
  const hingeL = new THREE.Group(), hingeR = new THREE.Group(); hingeL.position.set(-1.9, 0, D); hingeR.position.set(1.9, 0, D);
  for (const [h, s] of [[hingeL, 1], [hingeR, -1]]) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1.88, WH - 0.3), glass); leaf.position.set(s * 0.95, (WH - 0.3) / 2, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.06), frame); bar.position.set(s * 0.95, WH - 0.3, 0);
    const bar2 = bar.clone(); bar2.position.y = 0.03;
    const ed = new THREE.Mesh(new THREE.BoxGeometry(0.06, WH - 0.3, 0.06), frame); ed.position.set(s * 1.88, (WH - 0.3) / 2, 0);
    h.add(leaf, bar, bar2, ed); g.add(h);
  }

  // тёплый свет внутри
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(11, 15), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xffb866, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  fg.rotation.x = -Math.PI / 2; fg.position.y = 0.03; g.add(fg);
  const back2 = glow(0xffd29a, 9, 0.5); back2.position.set(0, 2.0, -5.5); g.add(back2);

  // гирлянды
  const bulbs = [];
  const strings = E.mobile ? 3 : 5, per = E.mobile ? 7 : 11;
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc, toneMapped: false });
  const bulbGeo = new THREE.SphereGeometry(0.06, 8, 6);
  for (let s = 0; s < strings; s++) {
    const z = lerp(-4.6, 4.2, strings === 1 ? 0 : s / (strings - 1));
    const pts = [];
    for (let i = 0; i <= 40; i++) { const x = lerp(-W + 0.1, W - 0.1, i / 40); pts.push(new V3(x, 3.25 + (RH - 3.25) * 0.0 - 0.55 * (1 - Math.pow(x / W, 2)) + 0.4 * (1 - Math.abs(x) / W) , z)); }
    const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1d0d08 })); g.add(wire);
    for (let i = 0; i < per; i++) {
      const pt = pts[Math.round(((i + 0.5) / per) * 40)];
      const m = new THREE.Mesh(bulbGeo, bulbMat); m.position.copy(pt).y -= 0.08; g.add(m);
      const sp = glow(0xffc97a, 0.75, 0.9); sp.position.copy(m.position); g.add(sp);
      bulbs.push({ sp, ph: Math.random() * 6.28 });
    }
  }
  // столы
  const cloth = M.cloth(0xfff0da);
  [[-2.35, -3.5], [2.35, -3.5], [-2.35, -0.3], [2.35, -0.3], [-2.35, 2.9], [2.35, 2.9]].slice(0, E.mobile ? 4 : 6).forEach(([x, z]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.78, 28, 1, true), cloth); t.position.set(x, 0.39, z); g.add(t);
    const tp = new THREE.Mesh(new THREE.CircleGeometry(0.85, 28), cloth); tp.rotation.x = -Math.PI / 2; tp.position.set(x, 0.78, z); g.add(tp);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), M.wax()); c.position.set(x, 0.9, z); g.add(c);
    const f = glow(0xffc070, 0.55, 0.95); f.position.set(x, 1.07, z); g.add(f);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), M.matte(0xe9b2a6, 0.7)); fl.scale.y = 0.6; fl.position.set(x + 0.3, 0.88, z - 0.2); g.add(fl);
  });

  // цветочная арка в глубине зала и букеты на столах
  const blooms = new Blooms(E.mobile ? 36 : 70, 14); g.add(blooms.group);
  const leaves = new Leaves(E.mobile ? 40 : 70, 15); g.add(leaves.mesh);
  const rb = rng(61), tones = ['blush', 'cream', 'rose', 'blush', 'wine'];
  const nA = E.mobile ? 16 : 30;
  for (let i = 0; i < nA; i++) {
    const a = (i / (nA - 1)) * Math.PI, jx = (rb() - 0.5) * 0.25;
    const pos = new V3(Math.cos(a) * 1.7 + jx, 0.1 + Math.sin(a) * 2.1 + (a > 1.3 && a < 1.85 ? 0.9 : 0) * 0 + (rb() - 0.5) * 0.2, -5.5 + rb() * 0.2);
    blooms.add(pos, new V3(Math.cos(a), Math.sin(a) * 0.4, 1.2), 0.3 + rb() * 0.2, tones[Math.floor(rb() * 5)]);
    if (i % 2 === 0) leaves.add(pos.clone().add(new V3(0, 0, -0.02)), new V3(Math.cos(a) + (rb() - 0.5), Math.sin(a) + (rb() - 0.5), 0.6), 0.55);
  }
  for (const s of [-1, 1]) for (let k = 0; k < (E.mobile ? 2 : 4); k++) {
    const z = -4.2 + k * 2.3;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.7, 14), M.matte(0xf0dcb8, 0.6)); pot.position.set(s * 1.25, 0.35, z); g.add(pot);
    for (let n = 0; n < 4; n++) { const a = rb() * 6.28; blooms.add(new V3(s * 1.25 + Math.cos(a) * 0.12, 0.8 + rb() * 0.1, z + Math.sin(a) * 0.12), new V3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5), 0.3 + rb() * 0.1, tones[(n + k) % 5]); }
  }
  blooms.commit(); leaves.commit();
  const K = [[9.5, 4.6, 22], [2.4, 2.1, 11.2], [0.15, 1.65, 6.1], [0, 1.6, 1.2]], T = [[0, 1.5, -1], [0, 1.7, -2.5], [0, 1.5, -6], [0, 1.25, -6]];
  return {
    group: g, mood: { lc: 0xffc88c, li: 18, glow: 0.7 },
    update(p, t) {
      const o = easeInOut(smooth(0.2, 0.5, p)) * 1.6;
      hingeL.rotation.y = -o; hingeR.rotation.y = o;
      bulbs.forEach((b) => { b.sp.material.opacity = 0.75 + Math.sin(t * 1.8 + b.ph) * 0.2; });
      fg.material.opacity = 0.32 + 0.12 * smooth(0.3, 1, p);
    },
    cam(p) {
      const a = easeInOut(smooth(0, 0.3, p)), b = easeInOut(smooth(0.3, 0.6, p)), c = easeInOut(smooth(0.6, 1, p));
      let pos = mixv(K[0], K[1], a), tgt = mixv(T[0], T[1], a);
      pos = mixv(pos, K[2], b); tgt = mixv(tgt, T[2], b);
      pos = mixv(pos, K[3], c); tgt = mixv(tgt, T[3], c);
      return { pos, tgt };
    },
  };
}

/* ───────── 6. Подбор: веер карточек (цвет, цветы, ткани, свет) ───────── */
function cardTex(kind, w = 512, h = 740) {
  return canvasTex(w, h, (c) => {
    const title = { color: 'Цвет', flowers: 'Цветы', fabric: 'Ткани', light: 'Свет' }[kind];
    const bg = { color: '#fbefd9', flowers: '#f7d9d0', fabric: '#f3e6cf', light: '#3b0a0f' }[kind];
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    if (kind === 'color') {
      const cols = ['#4e0002', '#7a1c22', '#e3aaa0', '#ffe7c6', '#ba8a48', '#7d8a63'];
      cols.forEach((cl, i) => { const x = 62 + (i % 2) * 200, y = 70 + Math.floor(i / 2) * 170; c.fillStyle = cl; c.beginPath(); c.roundRect(x, y, 180, 150, 18); c.fill(); if (cl === '#ffe7c6') { c.strokeStyle = '#d6b07b'; c.lineWidth = 3; c.stroke(); } });
    } else if (kind === 'flowers') {
      const cx = w / 2, cy = 300;
      c.strokeStyle = '#56673c'; c.lineWidth = 8; c.beginPath(); c.moveTo(cx, cy + 20); c.quadraticCurveTo(cx - 20, cy + 150, cx + 10, cy + 260); c.stroke();
      c.fillStyle = '#56673c'; c.beginPath(); c.ellipse(cx + 50, cy + 170, 52, 20, -0.6, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx - 46, cy + 120, 48, 18, 0.6, 0, 7); c.fill();
      for (let r = 0; r < 3; r++) for (let i = 0; i < 8 - r; i++) {
        const a = (i / (8 - r)) * Math.PI * 2 + r * 0.4, rad = 92 - r * 28;
        c.fillStyle = ['#e9a89c', '#f0bfb2', '#fbe2d8'][r]; c.beginPath(); c.ellipse(cx + Math.cos(a) * rad * 0.62, cy + Math.sin(a) * rad * 0.62, rad * 0.5, rad * 0.3, a, 0, 7); c.fill();
      }
      c.fillStyle = '#d9a95c'; c.beginPath(); c.arc(cx, cy, 14, 0, 7); c.fill();
    } else if (kind === 'fabric') {
      for (let i = 0; i < 26; i++) {
        const x = 40 + i * 17, gr = c.createLinearGradient(x, 0, x + 17, 0);
        gr.addColorStop(0, '#d9bf96'); gr.addColorStop(0.5, '#fff6e6'); gr.addColorStop(1, '#d9bf96');
        c.fillStyle = gr; c.beginPath(); c.moveTo(x, 70); c.bezierCurveTo(x + 14 * Math.sin(i), 250, x - 14 * Math.cos(i), 400, x + 4, 560); c.lineTo(x + 18, 560); c.bezierCurveTo(x + 18 - 14 * Math.cos(i), 400, x + 18 + 14 * Math.sin(i), 250, x + 18, 70); c.fill();
      }
      c.fillStyle = '#ba8a48'; c.fillRect(34, 60, w - 68, 10); c.fillRect(34, 556, w - 68, 10);
    } else {
      const cx = w / 2, cy = 270;
      const rg = c.createRadialGradient(cx, cy, 10, cx, cy, 250); rg.addColorStop(0, 'rgba(255,214,150,.95)'); rg.addColorStop(0.35, 'rgba(255,190,110,.35)'); rg.addColorStop(1, 'rgba(255,190,110,0)');
      c.fillStyle = rg; c.fillRect(0, 0, w, 620);
      c.strokeStyle = '#d6b07b'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx, 60); c.lineTo(cx, 150); c.stroke();
      c.fillStyle = '#ffe9bd'; c.beginPath(); c.arc(cx, cy, 62, 0, 7); c.fill(); c.strokeStyle = '#d6b07b'; c.stroke();
      c.fillStyle = '#d6b07b'; c.fillRect(cx - 28, cy + 56, 56, 38);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; c.strokeStyle = 'rgba(255,224,170,.7)'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90); c.lineTo(cx + Math.cos(a) * 128, cy + Math.sin(a) * 128); c.stroke(); }
    }
    // подпись
    c.fillStyle = kind === 'light' ? '#ffe7c6' : '#4e0002'; c.font = "600 54px 'SF Pro Display',system-ui,sans-serif"; c.textAlign = 'center'; c.fillText(title, w / 2, 672);
    c.fillStyle = '#ba8a48'; c.fillRect(w / 2 - 40, 690, 80, 4);
    c.strokeStyle = 'rgba(186,138,72,.7)'; c.lineWidth = 6; c.beginPath(); c.roundRect(8, 8, w - 16, h - 16, 26); c.stroke();
  });
}

export function sceneCards(E) {
  const g = new THREE.Group();
  const CW = 2.0, CH = 2.9, R = 0.14;
  const shape = new THREE.Shape();
  shape.moveTo(-CW / 2 + R, 0); shape.lineTo(CW / 2 - R, 0); shape.quadraticCurveTo(CW / 2, 0, CW / 2, R);
  shape.lineTo(CW / 2, CH - R); shape.quadraticCurveTo(CW / 2, CH, CW / 2 - R, CH); shape.lineTo(-CW / 2 + R, CH); shape.quadraticCurveTo(-CW / 2, CH, -CW / 2, CH - R);
  shape.lineTo(-CW / 2, R); shape.quadraticCurveTo(-CW / 2, 0, -CW / 2 + R, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: E.mobile ? 4 : 8 });
  const fan = new THREE.Group(); fan.position.y = -1.75; g.add(fan);
  const kinds = ['color', 'flowers', 'fabric', 'light'];
  const cards = kinds.map((k, i) => {
    const tex = cardTex(k); tex.repeat.set(1 / CW, 1 / CH); tex.offset.set(0.5, 0);
    const mats = [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.8 }), M.goldMatte()];
    const m = new THREE.Mesh(geo, mats); m.position.z = i * 0.07; fan.add(m);
    return m;
  });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 20), M.gold()); hub.rotation.x = Math.PI / 2; hub.position.set(0, 0.15, 0.1); fan.add(hub);

  const dust = makePoints(E.mobile ? 50 : 120, { size: 0.09, color: 0xffe7c6, opacity: 0.75 });
  const r = rng(9), dp = dust.geometry.attributes.position;
  for (let i = 0; i < dp.count; i++) dp.setXYZ(i, (r() - 0.5) * 9, (r() - 0.5) * 6, (r() - 0.5) * 4 - 1);
  g.add(dust);
  const halo = glow(0xba8a48, 9, 0.2); halo.position.set(0, 0.5, -1.5); g.add(halo);

  return {
    group: g, mood: { lc: 0xffd6a4, li: 44, glow: 0.45 },
    update(p, t) {
      cards.forEach((m, i) => {
        const e = easeBack(smooth(i * 0.07, 0.5 + i * 0.07, p));
        const target = (i - 1.5) * 0.4;
        m.rotation.z = -target * e + Math.sin(t * 0.8 + i) * 0.012 * e;
        m.position.y = Math.sin(t * 0.9 + i * 1.3) * 0.03 * e;
        m.rotation.y = (1 - e) * 0.5 * (i % 2 ? 1 : -1);
      });
      fan.rotation.y = Math.sin(t * 0.35) * 0.1;
      dust.rotation.y = t * 0.03;
    },
    cam: (p) => ({ pos: [0, 0.3, 10.2 - p * 0.5], tgt: [0, 0.15, 0] }),
  };
}
