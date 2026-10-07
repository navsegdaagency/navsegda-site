// 3D-знак ∞ для свадебных КП НАВСЕГДА (по мотивам /event/assets/js/hero.js корпоративного сайта).
// Нужно на странице: <canvas id="gl"> внутри .hero, importmap на /event/assets/vendor/ и
// <script type="module" src="/assets/kp/hero3d.js"></script>.
// Знак — золото-шампань, вокруг золотая пыль; на прокрутке уходит в глубину и гаснет, текст не трогает.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const canvas = document.getElementById('gl');
const hero = canvas && canvas.closest('.hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 768;

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

  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, 1, 0.1, 100);
  camera.position.set(0, 0, mobile ? 9.5 : 8);

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

  let tx = 0, ty = 0, rx = 0, ry = 0, visible = true;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(hero);

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
    const prog = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight)));
    const intro = reduce ? 1 : Math.min(1, (performance.now() - start) / 1800);
    const ease = 1 - Math.pow(1 - intro, 4);
    rx += (ty * 0.35 - rx) * 0.05; ry += (tx * 0.6 - ry) * 0.05;
    const spin = reduce ? 0 : Math.sin(t * 0.25) * 0.42;
    group.rotation.set(rx + Math.sin(t * 0.4) * 0.06, ry + spin + prog * Math.PI * 0.6, Math.sin(t * 0.3) * 0.05);
    // десктоп: справа сверху, над фото; телефон: по центру над именами, меньше
    group.scale.setScalar((0.55 + 0.45 * ease) * (mobile ? 0.55 : 0.72));
    group.position.set(mobile ? 0 : 2.6, mobile ? 2.7 : 1.15, 0);
    camera.position.z = (mobile ? 9.5 : 8) - prog * 3;
    dust.rotation.y = t * 0.02 + prog * 0.6;
    dust.material.opacity = 0.8 * ease;
    canvas.style.opacity = String(Math.max(0, 1 - prog * 1.6));
    renderer.render(scene, camera);
    if (first) { first = false; document.documentElement.classList.add('gl-ready'); }
  }
  tick();
} catch (e) { document.documentElement.classList.add('no-webgl'); }
