/* НАВСЕГДА · 3D-знак ∞ на первом экране /svadby/
 * Золотая лемниската (как на корпоративном сайте), палитра свадеб: бордо #4E0002 / крем #FFE7C6 / золото #BA8A48.
 * - three.js грузится лениво (после load/idle) только если нет prefers-reduced-motion и есть WebGL;
 * - иначе остаётся статичный SVG /assets/brand/mark-gold.svg (он лежит в #nsg-inf как <img>);
 * - рендер на паузе, когда знак вне экрана или вкладка скрыта.
 */
(function () {
  var host = document.getElementById('nsg-inf');
  if (!host) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { host.classList.add('is-static'); return; }

  function webgl() {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }
  if (!webgl()) { host.classList.add('is-static'); return; }

  function boot() {
    import('/assets/vendor/three.module.min.js').then(function (THREE) {
      return import('/assets/vendor/addons/RoomEnvironment.js').then(function (m) { init(THREE, m.RoomEnvironment); });
    }).catch(function (e) { if (window.console) console.warn('[nsg-inf]', e); host.classList.add('is-static'); });
  }

  function init(THREE, RoomEnvironment) {
    var mobile = innerWidth < 768;
    var canvas = document.createElement('canvas');
    canvas.className = 'nsg-inf__gl';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { canvas.remove(); host.classList.add('is-static'); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    var DPR_MIN = 1;
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    var camera = new THREE.PerspectiveCamera(36, 2.2, 0.1, 100);
    camera.position.set(0, 0, mobile ? 7.2 : 7.0);

    // Лемниската Бернулли с лёгким объёмным изгибом
    class Lemn extends THREE.Curve {
      getPoint(t, v) {
        v = v || new THREE.Vector3();
        var a = t * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), d = 1 + s * s;
        return v.set(2.3 * c / d, 2.3 * s * c / d, 0.55 * s);
      }
    }
    var geo = new THREE.TubeGeometry(new Lemn(), mobile ? 320 : 640, 0.26, mobile ? 32 : 64, true);
    var mat = new THREE.MeshPhysicalMaterial({
      color: 0xe4b86f, metalness: 1, roughness: 0.17, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.45
    });
    var knot = new THREE.Mesh(geo, mat);
    var group = new THREE.Group();
    group.add(knot);
    scene.add(group);

    var key = new THREE.DirectionalLight(0xffe7c6, 2.2); key.position.set(3, 4, 5); scene.add(key);
    var rim = new THREE.DirectionalLight(0xff9a8a, 1.2); rim.position.set(-5, -2, -4); scene.add(rim);

    // Золотая пыль вокруг знака
    var N = mobile ? 90 : 220, pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var r = 2.4 + Math.random() * 2.6, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.2;
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.55;
      pos[i * 3 + 2] = r * Math.cos(ph) - 1;
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var dot = document.createElement('canvas'); dot.width = dot.height = 64;
    var g = dot.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,231,198,1)'); grd.addColorStop(0.35, 'rgba(214,176,123,.45)'); grd.addColorStop(1, 'rgba(186,138,72,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    var dust = new THREE.Points(pg, new THREE.PointsMaterial({
      size: mobile ? 0.12 : 0.09, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.8
    }));
    scene.add(dust);

    var tx = 0, ty = 0, rx = 0, ry = 0, visible = true;
    if (!mobile) addEventListener('pointermove', function (e) { tx = (e.clientX / innerWidth - 0.5); ty = (e.clientY / innerHeight - 0.5); }, { passive: true });

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else addEventListener('resize', resize);
    resize();

    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(host);

    var clock = new THREE.Clock(), start = performance.now(), first = true;
    var fAcc = 0, fN = 0, fLast = 0;
    function adapt(now) {
      if (now - start < 1500) { fLast = 0; return; }
      if (fLast) { fAcc += now - fLast; fN++; }
      fLast = now;
      if (fN >= 45) {
        var avg = fAcc / fN; fAcc = 0; fN = 0;
        if (avg > 26 && dpr > DPR_MIN) { dpr = Math.max(DPR_MIN, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); }
      }
    }
    function tick(now) {
      requestAnimationFrame(tick);
      if (!visible || document.hidden) { fLast = 0; return; }
      adapt(now || performance.now());
      var t = clock.getElapsedTime();
      var intro = Math.min(1, (performance.now() - start) / 1600), ease = 1 - Math.pow(1 - intro, 4);
      rx += (ty * 0.3 - rx) * 0.05; ry += (tx * 0.5 - ry) * 0.05;
      var sc = Math.min(1, Math.max(0, (window.scrollY || 0) / 900));
      group.rotation.set(rx + Math.sin(t * 0.4) * 0.07, ry + Math.sin(t * 0.25) * 0.5 + sc * 0.9, Math.sin(t * 0.3) * 0.05);
      group.scale.setScalar((0.6 + 0.4 * ease) * (mobile ? 0.98 : 0.95));
      dust.rotation.y = t * 0.03;
      dust.material.opacity = 0.8 * ease;
      renderer.render(scene, camera);
      if (first) { first = false; host.classList.add('is-gl'); }
    }
    tick();
  }

  function go() { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(boot, { timeout: 2500 }); }
  if (document.readyState === 'complete') go(); else addEventListener('load', go);
})();
