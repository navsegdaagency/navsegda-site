/* «Путь к вашему дню» — сцены 0–4: знак ∞, предложение, команда, встреча, маршрут.
 * Сцена: { group, update(p, t, dt), cam(p, t) → {pos, tgt}, mood:{lc, li, glow} }
 * p — локальный прогресс этапа 0..1, t — время в секундах. Координаты камеры локальные. */
import { THREE, C, M, clamp, lerp, smooth, easeOut, easeBack, easeInOut, rng, glow, starTex, makeTube, lemn, makePoints, canvasTex, labelPlane } from '/assets/js/wedding-journey/core.js?v=wj1';

const V3 = THREE.Vector3;

/* ───────── 0. Вступление: золотой ∞ ───────── */
export function sceneIntro(E) {
  const g = new THREE.Group();
  const tube = makeTube(E.mobile ? 220 : 440, E.mobile ? 20 : 44);
  tube.userData.update((u, o) => lemn(u * Math.PI * 2, o), 0.27);
  const knot = new THREE.Mesh(tube, M.gold());
  const holder = new THREE.Group(); holder.add(knot); g.add(holder);

  const halo = glow(0xba8a48, 11, 0.26); halo.position.set(0, 0, -1.2); g.add(halo);

  const N = E.mobile ? 90 : 240, dust = makePoints(N, { size: E.mobile ? 0.12 : 0.1, color: 0xffe7c6, opacity: 0.8 });
  const r = rng(11), pa = dust.geometry.attributes.position, ph = [];
  for (let i = 0; i < N; i++) {
    const rr = 2.6 + r() * 3.2, th = r() * 6.28, f = Math.acos(2 * r() - 1);
    pa.setXYZ(i, rr * Math.sin(f) * Math.cos(th) * 1.25, rr * Math.sin(f) * Math.sin(th) * 0.6, rr * Math.cos(f) - 1);
    ph.push(r() * 6.28);
  }
  g.add(dust);

  return {
    group: g, mood: { lc: 0xffd9a0, li: 40, glow: 0.35 },
    update(p, t) {
      const a = easeOut(t / 1.8);
      holder.rotation.set(Math.sin(t * 0.4) * 0.07, Math.sin(t * 0.25) * 0.35 + p * 0.45, Math.sin(t * 0.3) * 0.05);
      holder.scale.setScalar((0.62 + 0.38 * a) * (E.mobile ? 0.98 : 1));
      dust.rotation.y = t * 0.03; dust.material.opacity = 0.8 * a;
      halo.material.opacity = 0.22 + 0.06 * Math.sin(t * 0.8);
    },
    cam: (p) => ({ pos: [0, 0.1, 9.4 - p * 0.5], tgt: [0, 0, 0] }),
  };
}

/* ───────── 1. Предложение: бархатная коробочка и кольцо ───────── */
export function sceneProposal(E) {
  const g = new THREE.Group();
  const holder = new THREE.Group(); g.add(holder); holder.rotation.x = 0.28;
  const velvet = M.velvet(0x5c0b13), gold = M.gold(), satin = M.cloth(0xf7e6c8);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.7), velvet); base.position.y = 0;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.05, 1.74), gold); belt.position.y = 0.05;
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 1.5), satin); cushion.position.y = 0.43;
  holder.add(base, belt, cushion);
  // нижняя часть крышки
  const lid = new THREE.Group(); lid.position.set(0, 0.45, -0.85);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.7), velvet); lidMesh.position.set(0, 0.2, 0.85);
  const lidBelt = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.05, 1.74), gold); lidBelt.position.set(0, 0.07, 0.85);
  const lining = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), satin); lining.rotation.x = Math.PI / 2; lining.position.set(0, -0.005, 0.85);
  lid.add(lidMesh, lidBelt, lining); holder.add(lid);

  // кольцо с камнем
  const ring = new THREE.Group(); holder.add(ring);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.058, 20, E.mobile ? 36 : 72), gold); band.position.y = 0.34; ring.add(band);
  const prof = [[0, 0], [0.12, 0.13], [0.2, 0.25], [0.22, 0.29], [0.17, 0.36], [0.09, 0.42], [0, 0.42]].map(([x, y]) => new V3(x, y, 0));
  const gemGeo = new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(v.x, v.y)), 10);
  const gem = new THREE.Mesh(gemGeo, new THREE.MeshPhysicalMaterial({
    color: 0xf2f6ff, metalness: 0.2, roughness: 0.02, flatShading: true, envMapIntensity: 3.4, clearcoat: 1, clearcoatRoughness: 0, iridescence: 0.4,
  }));
  gem.position.y = 0.66; gem.scale.setScalar(1.1); ring.add(gem);
  const prongs = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 16), gold); prongs.rotation.x = Math.PI / 2; prongs.position.y = 0.7; ring.add(prongs);
  ring.position.set(0, 0.42, 0.05);
  const star = glow(0xffffff, 1.7, 0, starTex()); star.position.set(0, 1.12, 0.15); holder.add(star);
  const halo = glow(0xffd9a0, 4.5, 0, null); halo.position.set(0, 0.9, -0.1); holder.add(halo);

  const dust = makePoints(E.mobile ? 40 : 90, { size: 0.08, color: 0xffe7c6, opacity: 0.7 });
  const r = rng(21), dp = dust.geometry.attributes.position;
  for (let i = 0; i < dp.count; i++) dp.setXYZ(i, (r() - 0.5) * 7, (r() - 0.3) * 4, (r() - 0.5) * 4);
  g.add(dust);

  return {
    group: g, mood: { lc: 0xffc99a, li: 36, glow: 0.4 },
    update(p, t) {
      const open = easeInOut(smooth(0.04, 0.55, p));
      lid.rotation.x = -open * 1.95;
      const rise = easeOut(smooth(0.42, 1, p));
      ring.position.y = 0.42 + rise * 0.7;
      ring.rotation.y = t * 0.5 * rise + (1 - rise) * 0.2;
      const sp = Math.pow(Math.max(0, Math.sin(t * 1.7)), 10) * smooth(0.45, 0.7, p);
      star.material.opacity = sp; star.scale.setScalar(0.8 + 1.6 * sp);
      star.position.y = 1.12 + rise * 0.7;
      halo.material.opacity = 0.35 * smooth(0.4, 0.9, p);
      halo.position.y = 0.9 + rise * 0.7;
      holder.rotation.y = Math.sin(t * 0.3) * 0.18 - 0.15 + p * 0.2;
      dust.rotation.y = t * 0.04;
    },
    cam: (p) => ({ pos: [0.2, 2.6 - p * 0.3, 7.6 - p * 0.5], tgt: [0, 0.6 + p * 0.25, 0] }),
  };
}

/* ───────── 2. Команда: частицы собираются в ∞ НАВСЕГДА ───────── */
export function sceneTeam(E) {
  const g = new THREE.Group();
  const N = E.mobile ? 340 : 820;
  const pts = makePoints(N, { size: E.mobile ? 0.13 : 0.1, color: 0xf3cf94, opacity: 0.95 });
  const pa = pts.geometry.attributes.position, r = rng(31);
  const start = new Float32Array(N * 3), target = new Float32Array(N * 3), stag = new Float32Array(N), swirl = new Float32Array(N);
  const tmp = new V3();
  for (let i = 0; i < N; i++) {
    const u = (i / N) * Math.PI * 2;
    lemn(u, tmp);
    const a = r() * 6.28, rr = Math.sqrt(r()) * 0.2;
    target[i * 3] = tmp.x + Math.cos(a) * rr; target[i * 3 + 1] = tmp.y + Math.sin(a) * rr; target[i * 3 + 2] = tmp.z + (r() - 0.5) * rr;
    const R = 5 + r() * 5, th = r() * 6.28, f = Math.acos(2 * r() - 1);
    start[i * 3] = R * Math.sin(f) * Math.cos(th) * 1.3; start[i * 3 + 1] = R * Math.sin(f) * Math.sin(th) * 0.8; start[i * 3 + 2] = R * Math.cos(f) - 2;
    stag[i] = r(); swirl[i] = (r() - 0.5) * 2;
  }
  g.add(pts);
  const tube = makeTube(E.mobile ? 200 : 360, E.mobile ? 14 : 24);
  tube.userData.update((u, o) => lemn(u * Math.PI * 2, o), 0.1);
  const mat = M.gold(); mat.transparent = true; mat.opacity = 0;
  const solid = new THREE.Mesh(tube, mat); g.add(solid);
  const halo = glow(0xba8a48, 10, 0, null); halo.position.z = -1; g.add(halo);
  const word = labelPlane('навсегда', 4.4, 1.1, { font: "300 150px 'Hello January','SF Pro Display',serif", color: '#e8c58f', px: 1024 });
  word.position.set(0, -2.15, 0.2); word.material.opacity = 0; g.add(word);
  if (document.fonts && document.fonts.load) document.fonts.load("150px 'Hello January'").then(() => {
    // перерисуем подпись, когда шрифт загрузится
    const nw = labelPlane('навсегда', 4.4, 1.1, { font: "300 150px 'Hello January','SF Pro Display',serif", color: '#e8c58f', px: 1024 });
    word.material.map.dispose(); word.material.map = nw.material.map;
  }).catch(() => {});

  return {
    group: g, mood: { lc: 0xffd2a0, li: 34, glow: 0.45 },
    update(p, t) {
      for (let i = 0; i < N; i++) {
        const e = easeOut(clamp(p * 1.55 - stag[i] * 0.55));
        const w = Math.sin(e * Math.PI) * swirl[i] * 1.6;
        pa.setXYZ(i,
          lerp(start[i * 3], target[i * 3], e) + w * 0.9,
          lerp(start[i * 3 + 1], target[i * 3 + 1], e) + w * 0.6 + Math.sin(t * 1.4 + i) * 0.015 * e,
          lerp(start[i * 3 + 2], target[i * 3 + 2], e));
      }
      pa.needsUpdate = true;
      const s = easeOut(smooth(0.7, 1, p));
      mat.opacity = s * 0.95; solid.visible = s > 0.01;
      halo.material.opacity = s * 0.22; word.material.opacity = smooth(0.82, 1, p);
      g.rotation.y = Math.sin(t * 0.3) * 0.3 + (1 - p) * 0.4;
      pts.material.opacity = 0.95 - s * 0.25;
    },
    cam: (p) => ({ pos: [0, 0.2, 9.6 - p * 0.4], tgt: [0, -0.3, 0] }),
  };
}

/* ───────── 3. Встреча: стол, чашки, смета, палитра ───────── */
export function sceneMeeting(E) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.14, E.mobile ? 40 : 72), new THREE.MeshStandardMaterial({ color: 0x6a3c26, roughness: 0.48, metalness: 0.05, envMapIntensity: 0.9 }));
  top.position.y = -0.07; g.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.035, 8, E.mobile ? 48 : 96), M.gold()); rim.rotation.x = Math.PI / 2; rim.position.y = -0.005; g.add(rim);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 3, 24), M.matte(0x3a1c12, 0.6)); leg.position.y = -1.65; g.add(leg);

  // чашка
  function cup() {
    const gr = new THREE.Group();
    const porc = new THREE.MeshPhysicalMaterial({ color: 0xfff6ea, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
    const cp = [[0, 0], [0.2, 0], [0.32, 0.05], [0.4, 0.28], [0.43, 0.4], [0.415, 0.4], [0.38, 0.28], [0.28, 0.1], [0, 0.07]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(cp, 36), porc); body.position.y = 0.06; body.material.side = THREE.DoubleSide;
    const sp = [[0, 0], [0.55, 0], [0.7, 0.03], [0.72, 0.045], [0.55, 0.03], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y));
    const saucer = new THREE.Mesh(new THREE.LatheGeometry(sp, 40), porc);
    const goldRim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 6, 36), M.gold()); goldRim.rotation.x = Math.PI / 2; goldRim.position.y = 0.46;
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.37, 28), new THREE.MeshStandardMaterial({ color: 0x2a140c, roughness: 0.15, metalness: 0.2, envMapIntensity: 1.5 }));
    coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.4;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 20, Math.PI * 1.25), porc); handle.position.set(0.45, 0.3, 0); handle.rotation.z = -Math.PI * 0.62;
    gr.add(saucer, body, goldRim, coffee, handle);
    return gr;
  }
  const cupA = cup(), cupB = cup(); cupA.position.set(-1.35, 0, 1.05); cupB.position.set(1.15, 0, 1.2); cupB.rotation.y = Math.PI * 0.8; cupA.rotation.y = 0.3;
  g.add(cupA, cupB);
  // пар
  const steam = [];
  for (let k = 0; k < (E.mobile ? 3 : 5); k++) for (const c of [cupA, cupB]) {
    const s = glow(0xfff0dc, 0.45, 0.0); g.add(s); steam.push({ s, c, ph: Math.random(), k });
  }

  // лист сметы
  const sheetTex = canvasTex(512, 700, (c, w, h) => {
    c.fillStyle = '#fbf0dc'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#4e0002'; c.font = "600 40px 'SF Pro Display',system-ui,sans-serif"; c.fillText('СМЕТА', 40, 78);
    c.fillStyle = '#ba8a48'; c.fillRect(40, 96, w - 80, 3);
    c.font = "400 26px 'TildaSans',system-ui,sans-serif";
    const rows = ['Площадка', 'Банкет', 'Декор и флористика', 'Ведущий', 'Фото и видео', 'Координация'];
    rows.forEach((s, i) => { c.fillStyle = '#4a3a34'; c.fillText(s, 40, 160 + i * 62); c.fillStyle = '#c9b69a'; c.fillRect(w - 170, 144 + i * 62, 130, 8); c.fillStyle = 'rgba(122,28,34,.0)'; });
    c.fillStyle = '#ba8a48'; c.fillRect(40, 560, w - 80, 2);
    c.fillStyle = '#4e0002'; c.font = "600 34px 'SF Pro Display',system-ui,sans-serif"; c.fillText('Итого', 40, 618);
    c.fillStyle = '#7a1c22'; c.fillRect(w - 190, 596, 150, 12);
  });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.4), new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.9 }));
  sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = 0.2; g.add(sheet);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 12), M.gold()); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5; g.add(pen);

  // палитра образцов
  const fan = new THREE.Group(); fan.position.set(1.85, 0.03, -0.55); g.add(fan);
  const sw = [0x7a1c22, 0x4e0002, 0xffe7c6, 0xba8a48, 0xe3aaa0, 0x7d8a63];
  const swatches = sw.map((c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.025, 1.45), new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
    m.geometry.translate(0, 0, -0.62); fan.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.1), M.gold()); cap.geometry.translate(0, 0.002, 0.04); m.add(cap);
    return m;
  });
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), M.gold()); pin.position.y = 0.1; fan.add(pin);

  return {
    group: g, mood: { lc: 0xffd9ac, li: 42, glow: 0.4 },
    update(p, t) {
      const eSheet = easeBack(smooth(0.0, 0.4, p)), eC = easeBack(smooth(0.18, 0.55, p)), eC2 = easeBack(smooth(0.28, 0.65, p));
      sheet.position.set(-0.15 - (1 - eSheet) * 4, 0.012 + (1 - eSheet) * 0.8, -0.35);
      sheet.rotation.z = 0.2 + (1 - eSheet) * 0.6; pen.position.set(0.1 + (1 - eSheet) * 3, 0.05 + (1 - eSheet) * 0.6, 0.55);
      cupA.position.y = (1 - eC) * 3; cupB.position.y = (1 - eC2) * 3;
      const open = easeOut(smooth(0.45, 1, p));
      swatches.forEach((m, i) => { m.rotation.y = lerp(0.1, -0.52 + i * 0.27 - 0.2, open) + Math.PI * 0; m.position.y = i * 0.027; });
      fan.rotation.y = 0.35 - 0.0;
      steam.forEach((o) => {
        const u = (t * 0.22 + o.ph) % 1;
        o.s.position.set(o.c.position.x + Math.sin(u * 6 + o.k) * 0.08, o.c.position.y + 0.55 + u * 0.95, o.c.position.z);
        o.s.material.opacity = Math.sin(u * Math.PI) * 0.22 * (o.c.position.y < 0.2 ? 1 : 0);
        o.s.scale.setScalar(0.35 + u * 0.55);
      });
    },
    cam: (p, t) => ({ pos: [Math.sin(p * 1.2) * 1.0 - 0.3, 6.3 - p * 0.5, 7.2 - p * 0.4], tgt: [0.2, 0, 0.1] }),
  };
}

/* ───────── 4. Площадка: маршрут на условной карте ───────── */
export function sceneRoute(E) {
  const g = new THREE.Group();
  const W = 15, H = 10;
  const mapTex = canvasTex(E.mobile ? 1024 : 1536, E.mobile ? 683 : 1024, (c, w, h) => {
    const r = rng(5);
    c.fillStyle = '#2c070b'; c.fillRect(0, 0, w, h);
    // кварталы
    const cols = 12, rows = 8, cw = w / cols, ch = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = i * cw + 7, y = j * ch + 7, ww = cw - 14, hh = ch - 14, v = r();
      c.fillStyle = v < 0.12 ? '#33321c' : v < 0.2 ? '#2a1f2c' : v < 0.55 ? '#3b0e14' : '#45131a';
      c.beginPath(); c.roundRect ? c.roundRect(x, y, ww, hh, 6) : c.rect(x, y, ww, hh); c.fill();
      if (v > 0.55) { c.fillStyle = 'rgba(214,176,123,.12)'; for (let k = 0; k < 3; k++) c.fillRect(x + 10 + r() * (ww - 40), y + 10 + r() * (hh - 30), 18 + r() * 24, 10 + r() * 14); }
    }
    // дороги
    c.strokeStyle = 'rgba(214,176,123,.34)'; c.lineWidth = 3;
    for (let i = 0; i <= cols; i++) { c.beginPath(); c.moveTo(i * cw, 0); c.lineTo(i * cw, h); c.stroke(); }
    for (let j = 0; j <= rows; j++) { c.beginPath(); c.moveTo(0, j * ch); c.lineTo(w, j * ch); c.stroke(); }
    c.strokeStyle = 'rgba(214,176,123,.6)'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, h * 0.62); c.bezierCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.8, w, h * 0.4); c.stroke();
    // река
    c.strokeStyle = 'rgba(120,104,138,.35)'; c.lineWidth = 34; c.beginPath(); c.moveTo(w * 0.1, 0); c.bezierCurveTo(w * 0.3, h * 0.35, w * 0.1, h * 0.7, w * 0.35, h); c.stroke();
  });
  const map = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.85, metalness: 0.05 }));
  map.rotation.x = -Math.PI / 2; g.add(map);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.12, H + 0.2), M.gold()); edge.position.y = -0.075; g.add(edge);

  const pts = [[-5.6, 2.9], [-3.8, 2.3], [-2.4, 1.0], [-0.7, 1.1], [0.5, -0.3], [1.9, -1.3], [3.3, -0.9], [4.8, -2.3]].map(([x, z]) => new V3(x, 0.09, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const SEG = E.mobile ? 120 : 220;
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.075, 8, false), new THREE.MeshBasicMaterial({ color: 0xffdfa8, toneMapped: false }));
  const aura = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.17, 8, false), new THREE.MeshBasicMaterial({ color: 0xba8a48, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  g.add(aura, core);
  const idxCount = core.geometry.index.count;

  // метка
  const pin = new THREE.Group(); pin.scale.setScalar(1.7);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), M.gold()); head.position.y = 0.62;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.62, 24), M.gold()); tip.rotation.x = Math.PI; tip.position.y = 0.26;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshBasicMaterial({ color: 0x4e0002 })); dot.position.set(0, 0.64, 0.22);
  pin.add(head, tip, dot);
  const shadow = glow(0x000000, 1.1, 0.0); shadow.material.blending = THREE.NormalBlending;
  const pulse = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.46, 40), new THREE.MeshBasicMaterial({ color: 0xffdfa8, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false }));
  pulse.rotation.x = -Math.PI / 2; g.add(pulse);
  g.add(pin);

  // площадка-цель
  const venue = new THREE.Group(); venue.position.copy(pts[pts.length - 1]).setY(0);
  const vb = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.0), M.matte(0xf3e1c0, 0.6)); vb.position.y = 0.28;
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.95, 0.55, 4, 1), M.matte(0x7a1c22, 0.6)); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.7); roof.position.y = 0.82;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 3.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); beam.position.y = 1.9;
  venue.add(vb, roof, beam); g.add(venue);
  const vglow = glow(0xffc27a, 4, 0); vglow.position.set(venue.position.x, 0.5, venue.position.z); g.add(vglow);

  const q = new V3(), start = new V3(-11, 7, 7);
  return {
    group: g, mood: { lc: 0xffd2a0, li: 40, glow: 0.3 },
    update(p, t) {
      const fly = easeOut(smooth(0, 0.24, p));
      const run = easeInOut(smooth(0.2, 0.9, p));
      core.geometry.setDrawRange(0, Math.floor(idxCount * run / 3) * 3);
      aura.geometry.setDrawRange(0, Math.floor(idxCount * run / 3) * 3);
      curve.getPoint(clamp(run * 0.999), q);
      const hover = 0.2 + Math.sin(t * 2.2) * 0.04;
      const sx = pts[0].x, sz = pts[0].z;
      if (p < 0.24) {
        pin.position.set(lerp(start.x, sx, fly), lerp(start.y, hover, fly) + Math.sin(fly * Math.PI) * 1.2, lerp(start.z, sz, fly));
        pin.rotation.z = (1 - fly) * 0.5;
      } else { pin.position.set(q.x, hover, q.z); pin.rotation.z = 0; }
      pin.rotation.y = t * 0.8;
      const land = smooth(0.9, 1, p);
      pulse.position.set(pin.position.x, 0.1, pin.position.z);
      const pp = (t * 0.7) % 1; pulse.scale.setScalar(1 + pp * 2.4); pulse.material.opacity = (1 - pp) * 0.55 * smooth(0.18, 0.3, p);
      const vs = easeBack(smooth(0.6, 0.95, p)); venue.scale.setScalar(Math.max(0.001, vs)); beam.material.opacity = 0.22 * vs; vglow.material.opacity = 0.5 * vs;
    },
    cam: (p) => ({ pos: [-0.2 + p * 0.5, 12.5 - p * 1.8, 8.6 - p * 1.0], tgt: [0.4, 0, -0.3] }),
  };
}
