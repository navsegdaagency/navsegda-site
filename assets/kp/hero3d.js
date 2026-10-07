// 3D-знак ∞ для свадебных КП НАВСЕГДА (по мотивам /event/assets/js/hero.js корпоративного сайта).
// Разметка: <header class="hero scrolly"><div class="stk"><div class="bg"></div><canvas id="gl"></canvas><div class="in">…</div></div></header>
// .hero.scrolly высотой ~230svh, .stk — sticky 100svh. Свайп/скролл ведёт сцену: знак выплывает в центр,
// растёт и камера пролетает сквозь него; текст и фото уходят. Без .scrolly — просто живой знак в hero.
// Подключение: importmap three → /event/assets/vendor/, <script type="module" src="/assets/kp/hero3d.js">.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const canvas = document.getElementById('gl');
const hero = canvas && canvas.closest('.hero');
const tx_ = hero && hero.querySelector('.in');
const bg = hero && hero.querySelector('.bg');
const scrolly = hero && hero.classList.contains('scrolly');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 768;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

if (canvas && hero) try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const Z0 = mobile ? 9.5 : 8;
  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, 1, 0.05, 100);
  camera.position.set(0, 0, Z0);

  class Infinity extends THREE.Curve {
    getPoint(t, v = new THREE.Vector3()) {
      const a = t * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), d = 1 + s * s;
      return v.set(2.3 * c / d, 2.3 * s * c / d, 0.55 * s);
    }
  }
  const geo = new THREE.TubeGeometry(new Infinity(), mobile ? 520 : 900, 0.27, mobile ? 48 : 80, true);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xf1d3a0, metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.55,
  });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));
  scene.add(group);
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd7a8, 1.5); rim.position.set(-5, -2, -4); scene.add(rim);

  // золотая пыль
  const N = mobile ? 900 : 2200;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 2.2 + Math.random() * 8, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6;
    pos[i * 3 + 2] = r * Math.cos(ph) - 2;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  const g = dot.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,236,200,1)'); grd.addColorStop(0.35, 'rgba(255,214,150,.45)'); grd.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({
    size: mobile ? 0.09 : 0.07, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.8,
  }));
  scene.add(dust);

  let tx = 0, ty = 0, rx = 0, ry = 0, visible = true, sp = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(hero);

  // стартовая позиция знака: десктоп — справа сверху, телефон — над именами
  const P0 = mobile ? { x: 0, y: 2.7, s: 0.55 } : { x: 2.6, y: 1.15, s: 0.72 };

  const clock = new THREE.Clock(), start = performance.now();
  let first = true, fAcc = 0, fN = 0, fLast = 0;
  function adapt(now) {
    if (now - start < 1500) { fLast = 0; return; }
    if (fLast) { fAcc += now - fLast; fN++; }
    fLast = now;
    if (fN >= 45) {
      const avg = fAcc / fN; fAcc = 0; fN = 0;
      if (avg > 26 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); }
    }
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible || document.hidden) { fLast = 0; return; }
    adapt(now || performance.now());
    const t = clock.getElapsedTime();
    const r = hero.getBoundingClientRect();
    const raw = scrolly ? clamp(-r.top / Math.max(1, r.height - innerHeight)) : clamp(scrollY / Math.max(1, hero.offsetHeight));
    sp += (raw - sp) * (reduce ? 1 : 0.12);            // мягкое догоняние — свайп ощущается плавно
    const p = sp;
    const intro = reduce ? 1 : Math.min(1, (performance.now() - start) / 1800);
    const ease = 1 - Math.pow(1 - intro, 4);

    // 0 → 0.45: знак выплывает в центр и растёт; 0.4 → 1: камера пролетает сквозь петлю
    const m = smooth(0, 0.45, p), fly = smooth(0.4, 1, p);
    rx += (ty * 0.35 - rx) * 0.05; ry += (tx * 0.6 - ry) * 0.05;
    const spin = reduce ? 0 : Math.sin(t * 0.25) * 0.42 * (1 - m);
    group.rotation.set(rx * (1 - m) + Math.sin(t * 0.4) * 0.06 + m * 0.25, ry * (1 - m) + spin + p * Math.PI * 1.1, Math.sin(t * 0.3) * 0.05);
    group.scale.setScalar((0.55 + 0.45 * ease) * (P0.s + (mobile ? 0.45 : 0.28) * m));
    group.position.set(P0.x * (1 - m), P0.y * (1 - m), 0);
    camera.position.z = Z0 - fly * (Z0 - 0.6);
    camera.position.y = fly * 0.12;
    dust.rotation.y = t * 0.02 + p * 1.2;
    dust.material.opacity = 0.8 * ease * (1 - fly * 0.3);
    canvas.style.opacity = String(1 - smooth(0.86, 1, p));
    if (scrolly) {
      if (tx_) { tx_.style.opacity = String(1 - smooth(0.05, 0.35, p)); tx_.style.transform = 'translateY(' + (-p * 120) + 'px)'; }
      if (bg) { bg.style.transform = 'scale(' + (1.04 + p * 0.18) + ')'; bg.style.filter = 'brightness(' + (1 - p * 0.55) + ')'; }
    }
    renderer.render(scene, camera);
    if (first) { first = false; document.documentElement.classList.add('gl-ready'); }
  }
  tick();
} catch (e) { document.documentElement.classList.add('no-webgl'); }
