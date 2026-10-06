// «КАК УКРАШАЮТСЯ СТОЛЫ» — закреплённая секция, 5 шагов по скроллу:
// Скатерть · Посуда · Свечи · Флористика · Свет.
// Все объекты — InstancedMesh с физическими материалами (MeshPhysicalMaterial):
// лён с sheen и микрорельефом, фарфор с clearcoat и золотым кантом, стекло
// с пропусканием (transmission/thickness), латунь и серебро в отражениях
// окружения. Анимация появления считается в вершинном шейдере (uP — прогресс
// группы, aT — задержка экземпляра), поэтому на кадр CPU обновляет только
// несколько uniform'ов. Тени — PCFSoft от «солнца» + мягкое пятно под столом.
import { THREE, mountScene, clamp, lerp, smooth, pinProgress, rng, patchMaterial, depthFor, GLSL_OUT } from './kit.js';

const TOP = 0.76;
const DAY_BG = new THREE.Color('#EFEAE1');
const DUSK_BG = new THREE.Color('#2A2520');

// Деформации, общие для посуды: «падение» с пружинкой.
const DROP = /* glsl */`
  float e = lp <= 0.0 ? 0.0 : outBack(smoothstep(0.0, 1.0, lp));
  pos *= max(e, 0.0001);
  pos.y += (1.0 - smoothstep(0.0, 1.0, lp)) * 0.45;`;

function stagger(geo, values) {
  geo.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(values), 1));
}
const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

export function mount(host, section, onStep) {
  return mountScene(host, ({ renderer, mobile, reduced, env, level, hq }) => {
    const R = rng(33);
    const TL = mobile ? 5.0 : 7.2;
    const TW = 1.1;
    const seats = mobile ? 5 : 8;
    const half = TL / 2;

    const scene = new THREE.Scene();
    scene.environment = env;
    const camera = new THREE.PerspectiveCamera(mobile ? 50 : 34, 1, 0.1, 80);

    const shared = { uTime: { value: 0 }, uCandle: { value: 0 } };
    const groups = {};
    const envMats = [];
    const reg = (name, mat) => { (groups[name] = groups[name] || []).push(mat.userData.uniforms.uP); return mat; };
    const phys = (params, spec = {}) => {
      const m = new THREE.MeshPhysicalMaterial(params);
      if (spec.stagger) m.defines = { ...m.defines, STAGGER: '' };
      patchMaterial(m, { key: spec.key, head: spec.head, body: spec.body, frag: spec.frag, fragHead: spec.fragHead, uniforms: { uTime: shared.uTime, uCandle: shared.uCandle, ...(spec.uniforms || {}) } });
      m.userData.env = m.envMapIntensity;
      envMats.push(m);
      return m;
    };
    const shadowed = (mesh, spec, cast = true) => {
      if (cast) { mesh.castShadow = true; mesh.customDepthMaterial = depthFor(mesh.material, spec); }
      mesh.receiveShadow = true;
      return mesh;
    };

    // ─── свет ───
    const hemi = new THREE.HemisphereLight(0xFFF8EE, 0xC9BBA5, 1.0);
    const sun = new THREE.DirectionalLight(0xFFF3E4, 2.2);
    sun.position.set(-3.6, 6.2, 3.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -half - 1, right: half + 1, top: 3, bottom: -3, near: 1, far: 20 });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.012;
    scene.add(hemi, sun, sun.target);
    const nLights = mobile ? 2 : 3;
    const candleLights = [];
    for (let i = 0; i < nLights; i++) {
      const l = new THREE.PointLight(0xFFA65E, 0, 0, 2);
      l.position.set(-half * 0.62 + (half * 1.24 / (nLights - 1)) * i, TOP + 0.42, 0);
      candleLights.push(l);
      scene.add(l);
    }

    // ─── пол: растворяется в фоне секции ───
    const floorMat = new THREE.MeshStandardMaterial({ color: '#E3DACB', roughness: 0.94, envMapIntensity: 0.4, premultipliedAlpha: true });
    patchMaterial(floorMat, {
      key: 'ffp-floor',
      head: 'varying vec2 vFloorW;',
      body: 'vFloorW = (modelMatrix * vec4(position, 1.0)).xz;',
      fragHead: 'varying vec2 vFloorW;',
      frag: [['opaque_fragment', 'gl_FragColor.a = 1.0 - smoothstep(0.45, 1.0, length(vFloorW / vec2(7.5, 4.2)));', 'after']],
    });
    floorMat.userData.env = 0.4; envMats.push(floorMat);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const shadowMat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: new THREE.Vector2(half + 0.5, TW / 2 + 0.5) }, uDusk: { value: 0 } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec2 uSize; uniform float uDusk; varying vec2 vP;
        void main(){ vec2 q = abs(vP) - uSize + 0.6; float d = length(max(q,0.0)) + min(max(q.x,q.y),0.0);
        float a = (1.0 - smoothstep(-0.4, 0.8, d)) * mix(0.3, 0.14, uDusk); gl_FragColor = vec4(0.10,0.08,0.06,a); ${GLSL_OUT} }`,
      transparent: true, depthWrite: false,
    });
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(TL + 3, TW + 3), shadowMat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.003;
    scene.add(blob);

    // ─── стол: столешница и точёные ножки ───
    const wood = new THREE.MeshPhysicalMaterial({ color: '#8A6C50', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.6 });
    wood.userData.env = 0.6; envMats.push(wood);
    const top = new THREE.Mesh(new THREE.BoxGeometry(TL, 0.05, TW), wood);
    top.position.y = TOP - 0.025;
    top.castShadow = true;
    scene.add(top);
    const LH = TOP - 0.05;
    const legGeo = lathe([[0, 0], [0.032, 0], [0.034, 0.02], [0.024, 0.06], [0.02, LH * 0.45], [0.028, LH * 0.62], [0.022, LH * 0.7], [0.026, LH * 0.94], [0.034, LH], [0, LH]], 18);
    const legs = new THREE.InstancedMesh(legGeo, wood, 4);
    const m4 = new THREE.Matrix4();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
      m4.makeTranslation(sx * (half - 0.15), 0, sz * (TW / 2 - 0.12));
      legs.setMatrixAt(i, m4);
    });
    legs.castShadow = true;
    scene.add(legs);

    // ─── скатерть: лён с мягкими складками и заломами ───
    const D = 0.62;
    const clothSpec = {
      key: 'ffp-cloth',
      uniforms: { uGrid: { value: new THREE.Vector2(TL + 2 * D, TW + 2 * D) }, uHalfT: { value: new THREE.Vector2(half + 0.02, TW / 2 + 0.02) } },
      head: /* glsl */`
        uniform vec2 uGrid; uniform vec2 uHalfT;
        varying float vHang;
        vec3 settled(float gx, float gz) {
          float ox = max(abs(gx) - uHalfT.x, 0.0);
          float oz = max(abs(gz) - uHalfT.y, 0.0);
          float px = sign(gx) * min(abs(gx), uHalfT.x);
          float pz = sign(gz) * min(abs(gz), uHalfT.y);
          float hang = ox + oz;
          float y = ${TOP.toFixed(3)} + 0.004 - hang;
          float deep = 0.6 + oz * 1.4;
          float fz = (sin(gx * 10.0) * 0.022 + sin(gx * 23.0 + 1.3) * 0.008 + sin(gx * 4.3 + 0.5) * 0.014) * smoothstep(0.0, 0.35, oz) * deep;
          float fx = (sin(gz * 12.0 + 0.7) * 0.02 + sin(gz * 27.0) * 0.006) * smoothstep(0.0, 0.35, ox) * (0.6 + ox * 1.4);
          pz += sign(gz) * (fz + 0.008 * smoothstep(0.0, 0.05, oz) + ox * 0.18);
          px += sign(gx) * (fx + 0.008 * smoothstep(0.0, 0.05, ox) + oz * 0.18);
          float under = max(0.015 - y, 0.0);
          y = max(y, 0.015);
          px += sign(gx) * under * step(0.0001, ox);
          pz += sign(gz) * under * step(0.0001, oz);
          return vec3(px, y, pz);
        }
        vec3 cloth(vec2 uv, float c) {
          float gx = (uv.x - 0.5) * uGrid.x;
          float gz = (uv.y - 0.5) * uGrid.y;
          float r = length(vec2(gx / uGrid.x, gz / uGrid.y));
          float ox = max(abs(gx) - uHalfT.x, 0.0);
          float oz = max(abs(gz) - uHalfT.y, 0.0);
          float hang = ox + oz;
          float e1 = smoothstep(0.0, 0.62, c * 1.25 - r * 0.3);
          float e2 = smoothstep(0.4, 1.0, c * 1.1 - hang * 0.15);
          float wave = (1.0 - e1);
          vec3 fall = vec3(gx * 0.9, ${TOP.toFixed(3)} + 1.25 + sin(gx * 1.3 + uTime * 1.4) * 0.14 * wave + cos(gz * 3.0 + uTime) * 0.08 * wave, gz * 0.78);
          vec3 flat0 = vec3(gx, ${TOP.toFixed(3)} + 0.004 + sin(gx * 2.0 + uTime * 2.0) * 0.03 * (1.0 - e2) * step(0.001, hang), gz);
          vec3 p = mix(fall, flat0, e1);
          return mix(p, settled(gx, gz), e2);
        }`,
      body: /* glsl */`
        vec3 p0 = cloth(uv, lp);
        vec3 pa = cloth(uv + vec2(0.004, 0.0), lp);
        vec3 pb = cloth(uv + vec2(0.0, 0.012), lp);
        pos = p0;
        nrm = normalize(cross(pb - p0, pa - p0));
        vHang = max(abs((uv.x - 0.5) * uGrid.x) - uHalfT.x, 0.0) + max(abs((uv.y - 0.5) * uGrid.y) - uHalfT.y, 0.0);`,
      fragHead: 'uniform vec2 uGrid; varying float vHang;',
      frag: [['normal_fragment_maps', /* glsl */`
        vec2 cg = (vPUv - 0.5) * uGrid;
        float wf = cg.x * 900.0, sf = cg.y * 150.0 + sin(cg.x * 7.0) * 3.0;
        float weave = (sin(wf) + sin(cg.y * 900.0)) * 0.5 * clamp(1.0 - fwidth(wf) * 0.5, 0.0, 1.0);
        float slub = sin(sf) * clamp(1.0 - fwidth(sf) * 0.5, 0.0, 1.0);
        float cd = abs(fract(cg.x / 1.2 + 0.5) - 0.5) * 1.2;
        float crease = (exp(-pow(cd / 0.012, 2.0)) * 0.8 + exp(-pow(cg.y / 0.012, 2.0)) * 0.6) * (1.0 - smoothstep(0.0, 0.05, vHang));
        normal = ffpBump(-vViewPosition, normal, weave * 0.00012 + slub * 0.00022 + crease * 0.0011, faceDirection);
        diffuseColor.rgb *= 1.0 - 0.02 * slub;
      `, 'after']],
    };
    const clothMat = reg('cloth', phys({
      color: '#F4F1EA', roughness: 0.84, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.62, 0.6, 0.57),
      side: THREE.DoubleSide, envMapIntensity: 0.7,
    }, clothSpec));
    const clothGeo = new THREE.PlaneGeometry(1, 1, mobile ? 110 : 200, mobile ? 30 : 52);
    const cloth = shadowed(new THREE.Mesh(clothGeo, clothMat), clothSpec);
    cloth.frustumCulled = false;
    scene.add(cloth);

    // ─── посуда ───
    const seatX = [];
    for (let i = 0; i < seats; i++) seatX.push(-half + (TL / seats) * (i + 0.5));
    const seatPos = [];
    seatX.forEach((x) => [-1, 1].forEach((s) => seatPos.push([x, s])));
    const nSeat = seatPos.length;
    const tPlates = seatPos.map(([x]) => (x + half) / TL * 0.85 + R() * 0.1);

    // подстановочная тарелка — латунь
    const chargerSpec = { key: 'ffp-drop', stagger: true, body: DROP };
    const chargerGeo = lathe([[0, 0], [0.15, 0], [0.166, 0.003], [0.169, 0.007], [0.165, 0.009], [0.152, 0.006], [0.0, 0.005]], mobile ? 32 : 56);
    const chargerMat = reg('dishes', phys({ color: '#C7A26B', metalness: 1, roughness: 0.34, envMapIntensity: 1.0 }, chargerSpec));
    const chargers = shadowed(new THREE.InstancedMesh(chargerGeo, chargerMat, nSeat), chargerSpec);
    seatPos.forEach(([x, s], i) => { m4.makeTranslation(x, TOP + 0.005, s * 0.36); chargers.setMatrixAt(i, m4); });
    stagger(chargerGeo, tPlates);
    scene.add(chargers);

    // фарфор: clearcoat + тонкий золотой кант
    const plateSpec = {
      key: 'ffp-plate', stagger: true,
      head: 'varying float vRad;',
      body: `vRad = length(position.xz); ${DROP}`,
      fragHead: 'varying float vRad;',
      frag: [
        ['color_fragment', 'float rim = smoothstep(0.1265, 0.1285, vRad) * (1.0 - smoothstep(0.1325, 0.1345, vRad)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.52, 0.24), rim);', 'after'],
        ['metalnessmap_fragment', 'metalnessFactor = mix(metalnessFactor, 1.0, rim);', 'after'],
        ['roughnessmap_fragment', 'roughnessFactor = mix(roughnessFactor, 0.25, rim);', 'after'],
      ],
    };
    const plateGeo = lathe([[0, 0.002], [0.07, 0.002], [0.085, 0], [0.093, 0], [0.1, 0.006], [0.115, 0.013], [0.13, 0.02], [0.136, 0.022], [0.136, 0.025], [0.131, 0.025], [0.118, 0.019], [0.1, 0.011], [0.088, 0.0092], [0.0, 0.0092]], mobile ? 32 : 64);
    const plateMat = reg('dishes', phys({ color: '#EFEBE3', roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.7 }, plateSpec));
    const plates = shadowed(new THREE.InstancedMesh(plateGeo, plateMat, nSeat), plateSpec);
    seatPos.forEach(([x, s], i) => { m4.makeTranslation(x, TOP + 0.011, s * 0.36); plates.setMatrixAt(i, m4); });
    stagger(plateGeo, tPlates.map((t) => Math.min(1, t + 0.04)));
    scene.add(plates);

    // приборы: силуэты ножа и вилки, полированное серебро
    const knifeShape = new THREE.Shape();
    knifeShape.moveTo(-0.0045, -0.1);
    knifeShape.quadraticCurveTo(0, -0.106, 0.0045, -0.1);
    knifeShape.lineTo(0.0055, -0.012);
    knifeShape.lineTo(0.0072, 0.0);
    knifeShape.lineTo(0.0072, 0.075);
    knifeShape.quadraticCurveTo(0.006, 0.098, -0.002, 0.1);
    knifeShape.lineTo(-0.0072, 0.098);
    knifeShape.lineTo(-0.0072, 0.0);
    knifeShape.lineTo(-0.0055, -0.012);
    knifeShape.lineTo(-0.0045, -0.1);
    const forkShape = new THREE.Shape();
    forkShape.moveTo(-0.0045, -0.1);
    forkShape.quadraticCurveTo(0, -0.106, 0.0045, -0.1);
    forkShape.lineTo(0.004, 0.02);
    forkShape.quadraticCurveTo(0.011, 0.035, 0.011, 0.06);
    const tineW = 0.022 / 7;
    for (let k = 0; k < 4; k++) {
      const xr = 0.011 - k * 2 * tineW;
      forkShape.lineTo(xr, 0.1);
      forkShape.lineTo(xr - tineW, 0.1);
      if (k < 3) { forkShape.lineTo(xr - tineW, 0.062); forkShape.lineTo(xr - 2 * tineW, 0.062); }
    }
    forkShape.lineTo(-0.011, 0.06);
    forkShape.quadraticCurveTo(-0.011, 0.035, -0.004, 0.02);
    forkShape.lineTo(-0.0045, -0.1);
    const extrude = (shape) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 6 });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const cutSpec = { key: 'ffp-drop', stagger: true, body: DROP };
    const silver = reg('dishes', phys({ color: '#DAD8D2', metalness: 1, roughness: 0.17, envMapIntensity: 1.25 }, cutSpec));
    const knifeGeo = extrude(knifeShape), forkGeo = extrude(forkShape);
    const knives = shadowed(new THREE.InstancedMesh(knifeGeo, silver, nSeat), cutSpec);
    const forks = shadowed(new THREE.InstancedMesh(forkGeo, silver, nSeat), cutSpec);
    seatPos.forEach(([x, s], i) => {
      // нож справа от гостя, вилка слева (гости по обе стороны стола)
      m4.makeRotationY(s > 0 ? 0 : Math.PI).setPosition(x + 0.2 * s, TOP + 0.007, s * 0.36);
      knives.setMatrixAt(i, m4);
      m4.makeRotationY(s > 0 ? 0 : Math.PI).setPosition(x - 0.2 * s, TOP + 0.007, s * 0.36);
      forks.setMatrixAt(i, m4);
    });
    const tCut = tPlates.map((t) => Math.min(1, t + 0.08));
    stagger(knifeGeo, tCut);
    stagger(forkGeo, tCut);
    scene.add(knives, forks);

    // бокалы: тонкостенный профиль, ножка и пятка
    const glassGeo = lathe([
      [0.0, 0.0], [0.036, 0.0], [0.037, 0.003], [0.02, 0.006], [0.006, 0.012], [0.0045, 0.03], [0.0045, 0.075],
      [0.007, 0.085], [0.016, 0.092], [0.03, 0.103], [0.039, 0.12], [0.0415, 0.14], [0.04, 0.162], [0.036, 0.188],
      [0.0346, 0.1885], [0.0386, 0.162], [0.0401, 0.14], [0.0376, 0.121], [0.029, 0.105], [0.016, 0.096], [0.0, 0.094],
    ], mobile ? 24 : 40);
    const glassSpec = { key: 'ffp-drop', stagger: true, body: DROP };
    const glassHQ = () => reg('dishes', phys({
      color: '#FFFFFF', metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.004, ior: 1.5,
      specularIntensity: 1, envMapIntensity: 1.4, attenuationColor: new THREE.Color('#F3EEE5'), attenuationDistance: 0.5,
    }, glassSpec));
    const glassLite = () => reg('dishes', phys({
      color: '#FFFFFF', metalness: 0, roughness: 0.04, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }, {
      ...glassSpec, key: 'ffp-glass-lite',
      frag: [['opaque_fragment', 'float gf = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0); gl_FragColor.a = 0.07 + 0.6 * gf;', 'after']],
    }));
    let glassMat = hq && level >= 2 ? glassHQ() : glassLite();
    const glasses = new THREE.InstancedMesh(glassGeo, glassMat, nSeat);
    seatPos.forEach(([x, s], i) => { m4.makeTranslation(x + 0.15 * s, TOP + 0.004, s * 0.17); glasses.setMatrixAt(i, m4); });
    stagger(glassGeo, tPlates.map((t) => Math.min(1, t + 0.12)));
    glasses.renderOrder = 3;
    scene.add(glasses);

    // ─── свечи ───
    const nCandle = mobile ? 6 : 9;
    const candleX = [];
    for (let i = 0; i < nCandle; i++) candleX.push(-half + 0.45 + ((TL - 0.9) / (nCandle - 1)) * i);
    const candleH = candleX.map((_, i) => (i % 2 ? 0.26 : 0.34) + R() * 0.03);
    const candleZ = candleX.map(() => (R() - 0.5) * 0.06);
    const tCandle = candleX.map((x) => (x + half) / TL);

    const holderGeo = lathe([[0, 0], [0.046, 0], [0.049, 0.005], [0.031, 0.012], [0.018, 0.02], [0.023, 0.029], [0.014, 0.04], [0.012, 0.055], [0.02, 0.061], [0.025, 0.069], [0.017, 0.072], [0.0, 0.072]], mobile ? 20 : 32);
    const holderSpec = { key: 'ffp-holder', stagger: true, body: 'float e = lp <= 0.0 ? 0.0 : outBack(smoothstep(0.0, 1.0, lp)); pos *= max(e, 0.0001); pos.y += (1.0 - smoothstep(0.0, 1.0, lp)) * 0.2;' };
    const brass = reg('candles', phys({ color: '#BE9A5F', metalness: 1, roughness: 0.27, envMapIntensity: 1.1 }, holderSpec));
    const holders = shadowed(new THREE.InstancedMesh(holderGeo, brass, nCandle), holderSpec);
    const candleGeo = new THREE.CylinderGeometry(0.0155, 0.0168, 1, mobile ? 16 : 28, 6);
    candleGeo.translate(0, 0.5, 0);
    const candleSpec = {
      key: 'ffp-candle', stagger: true,
      body: 'float g = smoothstep(0.25, 1.0, lp); pos.y *= max(g, 0.0001); pos.xz *= step(0.0001, g);',
      fragHead: 'uniform float uCandle;',
      frag: [['emissivemap_fragment', 'totalEmissiveRadiance += vec3(1.0, 0.5, 0.2) * uCandle * (pow(vPUv.y, 10.0) * 1.4 + 0.05);', 'after']],
    };
    const wax = reg('candles', phys({ color: '#F2EADC', roughness: 0.5, sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color('#FFF1DC'), envMapIntensity: 0.5 }, candleSpec));
    const candles = shadowed(new THREE.InstancedMesh(candleGeo, wax, nCandle), candleSpec);
    const wickGeo = new THREE.CylinderGeometry(0.0012, 0.0012, 0.012, 5);
    wickGeo.translate(0, 0.006, 0);
    const wickSpec = { key: 'ffp-wick', stagger: true, body: 'pos *= max(smoothstep(0.9, 1.0, lp), 0.0001);' };
    const wicks = new THREE.InstancedMesh(wickGeo, reg('candles', phys({ color: '#1E1A16', roughness: 0.8 }, wickSpec)), nCandle);
    candleX.forEach((x, i) => {
      m4.makeTranslation(x, TOP + 0.004, candleZ[i]);
      holders.setMatrixAt(i, m4);
      candles.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, TOP + 0.074, candleZ[i]).multiply(new THREE.Matrix4().makeScale(1, candleH[i], 1)));
      m4.makeTranslation(x, TOP + 0.074 + candleH[i], candleZ[i]);
      wicks.setMatrixAt(i, m4);
    });
    stagger(holderGeo, tCandle);
    stagger(candleGeo, tCandle);
    stagger(wickGeo, tCandle);
    scene.add(holders, candles, wicks);

    // пламя и ореолы — билборды; пламя в HDR (×4), его подхватывает bloom
    const flameVS = /* glsl */`
      uniform float uLight; uniform float uTime; uniform vec2 uSize;
      attribute vec4 aF; // x, y, z, seed
      varying vec2 vUv; varying float vI;
      void main() {
        float fl = 0.88 + 0.08 * sin(uTime * 11.0 + aF.w * 40.0) + 0.05 * sin(uTime * 23.0 + aF.w * 13.0);
        float on = smoothstep(aF.w * 0.4, aF.w * 0.4 + 0.6, uLight);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(0.0, 1.0, 0.0);
        #ifdef HALO
          up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        #endif
        vec2 sz = uSize * on * fl;
        float sway = sin(uTime * 3.1 + aF.w * 17.0) * 0.12 * (position.y + 0.5);
        vec3 p = aF.xyz + right * (position.x + sway * 0.4) * sz.x + up * (position.y + 0.5) * sz.y;
        #ifdef HALO
          p = aF.xyz + right * position.x * sz.x + up * position.y * sz.y;
        #endif
        vUv = uv; vI = on * fl;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`;
    const flameFS = /* glsl */`
      uniform float uBoost;
      varying vec2 vUv; varying float vI;
      void main() {
        #ifdef HALO
          float d = length(vUv - 0.5) * 2.0;
          float a = pow(max(1.0 - d, 0.0), 3.0) * 0.12 * vI * uBoost;
          gl_FragColor = vec4(vec3(1.0, 0.6, 0.3) * a, a);
        #else
          vec2 q = vUv - vec2(0.5, 0.3);
          q.x *= 2.4 / (0.35 + vUv.y);
          float d = length(vec2(q.x, q.y * 1.15));
          float core = smoothstep(0.5, 0.0, d);
          float blue = smoothstep(0.25, 0.0, vUv.y) * core;
          vec3 c = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.93, 0.78), core * core);
          c = mix(c, vec3(0.35, 0.45, 1.0), blue * 0.5);
          float a = core * vI;
          gl_FragColor = vec4(c * a * 4.0, a);
        #endif
        ${GLSL_OUT}
      }`;
    const mkBill = (halo, size) => {
      const g = new THREE.InstancedBufferGeometry();
      const pg = new THREE.PlaneGeometry(1, 1);
      g.index = pg.index;
      g.setAttribute('position', pg.getAttribute('position'));
      g.setAttribute('uv', pg.getAttribute('uv'));
      pg.dispose();
      const arr = new Float32Array(nCandle * 4);
      candleX.forEach((x, i) => arr.set([x, TOP + 0.074 + candleH[i] + (halo ? 0.03 : 0.004), candleZ[i], (i * 0.37) % 1], i * 4));
      g.setAttribute('aF', new THREE.InstancedBufferAttribute(arr, 4));
      g.instanceCount = nCandle;
      const mat = new THREE.ShaderMaterial({
        vertexShader: flameVS, fragmentShader: flameFS,
        defines: halo ? { HALO: '' } : {},
        uniforms: { uLight: { value: 0 }, uTime: shared.uTime, uSize: { value: new THREE.Vector2(...size) }, uBoost: { value: 1 } },
        transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      });
      const mesh = new THREE.Mesh(g, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = halo ? 5 : 4;
      return mesh;
    };
    const flames = mkBill(false, [0.034, 0.08]);
    const halos = mkBill(true, [0.36, 0.36]);
    scene.add(flames, halos);

    // ─── флористика: листья и бутоны ───
    const nLeaf = mobile ? 230 : 600;
    const leafGeo = new THREE.PlaneGeometry(1, 1, 2, mobile ? 4 : 6);
    const leafSpec = {
      key: 'ffp-tleaf', stagger: true,
      head: `vec3 leaf(vec2 uv) { float u = uv.x * 2.0 - 1.0; float v = uv.y;
               float w = 0.2 * pow(max(sin(PI * v), 0.0), 0.8);
               float x = u * w; return vec3(x, abs(x) * 0.6 + v * v * 0.18, v); }`,
      body: `float e = lp <= 0.0 ? 0.0 : outBack(lp);
             vec3 p0 = leaf(uv); vec3 pa = leaf(uv + vec2(0.02, 0.0)); vec3 pb = leaf(uv + vec2(0.0, 0.02));
             nrm = normalize(cross(pa - p0, pb - p0));
             pos = p0 * max(e, 0.0001);`,
      frag: [['normal_fragment_maps', `
        float lu = vPUv.x * 2.0 - 1.0; float lv = vPUv.y;
        float mid = exp(-lu * lu * 200.0);
        normal = ffpBump(-vViewPosition, normal, mid * 0.0012, faceDirection);
        diffuseColor.rgb *= mix(0.85, 1.2, lv) * (1.0 + mid * 0.2);`, 'after']],
    };
    const leafMat = reg('flora', phys({ color: '#FFFFFF', roughness: 0.5, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#B7C49A'), side: THREE.DoubleSide, envMapIntensity: 0.5 }, leafSpec));
    const leaves = shadowed(new THREE.InstancedMesh(leafGeo, leafMat, nLeaf), leafSpec, !mobile);
    const greens = ['#8E9872', '#6F7A57', '#A4AD8A', '#7B7A4E', '#97A07F'].map((c) => new THREE.Color(c));
    const q = new THREE.Quaternion(), e3 = new THREE.Euler(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
    const tLeaf = [];
    for (let i = 0; i < nLeaf; i++) {
      const x = -half + 0.15 + R() * (TL - 0.3);
      const zr = (R() - 0.5) * 2;
      const z = zr * 0.15;
      const y = TOP + 0.008 + (1 - zr * zr) * 0.07 * R();
      e3.set(-0.25 - R() * 0.7, R() * Math.PI * 2, (R() - 0.5) * 0.6);
      q.setFromEuler(e3);
      const k = 0.07 + R() * 0.07;
      sc.set(k, k, k);
      pv.set(x, y, z);
      m4.compose(pv, q, sc);
      leaves.setMatrixAt(i, m4);
      leaves.setColorAt(i, greens[Math.floor(R() * greens.length)]);
      tLeaf.push(clamp((x + half) / TL + (R() - 0.5) * 0.08));
    }
    stagger(leafGeo, tLeaf);
    scene.add(leaves);

    // бутоны: 11 лепестков в двух ярусах, раскрываются в шейдере
    const nBloom = mobile ? 40 : 110;
    const bloomGeo = (() => {
      const pet = [];
      for (let i = 0; i < 5; i++) pet.push([(i / 5) * Math.PI * 2, 0]);
      for (let i = 0; i < 6; i++) pet.push([((i + 0.5) / 6) * Math.PI * 2, 1]);
      const gu = mobile ? 3 : 5, gv = mobile ? 4 : 7;
      const vertsPer = (gu + 1) * (gv + 1);
      const pos = new Float32Array(pet.length * vertsPer * 3);
      const uv = new Float32Array(pet.length * vertsPer * 2);
      const ap = new Float32Array(pet.length * vertsPer * 2);
      const idx = [];
      pet.forEach(([ang, layer], pi) => {
        for (let j = 0; j <= gv; j++) for (let i = 0; i <= gu; i++) {
          const k = pi * vertsPer + j * (gu + 1) + i;
          uv[k * 2] = i / gu; uv[k * 2 + 1] = j / gv;
          ap[k * 2] = ang; ap[k * 2 + 1] = layer;
        }
        for (let j = 0; j < gv; j++) for (let i = 0; i < gu; i++) {
          const a = pi * vertsPer + j * (gu + 1) + i;
          const b = a + 1, c = a + gu + 1, d = c + 1;
          idx.push(a, b, d, a, d, c);
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setAttribute('aPet', new THREE.BufferAttribute(ap, 2));
      g.setIndex(idx);
      return g;
    })();
    const bloomSpec = {
      key: 'ffp-tbloom', stagger: true,
      head: `attribute vec2 aPet;
        vec3 bloom(vec2 uv, float o) {
          float u = uv.x * 2.0 - 1.0; float v = uv.y; float layer = aPet.y; float ang = aPet.x;
          float L = mix(0.55, 0.85, layer); float W = mix(0.6, 0.8, layer);
          float hw = 0.5 * W * pow(max(sin(PI * pow(v, 1.3)), 0.0), 0.6);
          float cup = mix(2.5, mix(1.5, 0.75, layer), o);
          float a = u * cup; float x = sin(a) / cup * hw; float d = (1.0 - cos(a)) / cup * hw;
          float tilt = mix(-0.2, mix(0.5, 1.3, layer), o);
          vec3 p = vec3(x, v * L, -d + sin(u * 7.0 + ang * 5.0) * 0.02 * v * v);
          float c = cos(tilt), s = sin(tilt);
          p = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
          vec3 radial = vec3(cos(ang), 0.0, sin(ang)); vec3 tang = vec3(-sin(ang), 0.0, cos(ang));
          return tang * p.x + vec3(0.0, p.y, 0.0) + radial * (p.z + 0.04);
        }`,
      body: `float g = lp <= 0.0 ? 0.0 : outBack(smoothstep(0.0, 0.5, lp));
             float o = smoothstep(0.35, 1.0, lp);
             vec3 p0 = bloom(uv, o); vec3 pa = bloom(uv + vec2(0.05, 0.0), o); vec3 pb = bloom(uv + vec2(0.0, 0.05), o);
             nrm = normalize(cross(pa - p0, pb - p0));
             pos = p0 * max(g, 0.0001);`,
      frag: [
        ['color_fragment', 'diffuseColor.rgb *= mix(0.62, 1.04, smoothstep(0.0, 0.7, vPUv.y));', 'after'],
        ['lights_fragment_end', `
          #if NUM_DIR_LIGHTS > 0
            float bt = clamp(-dot(normal, directionalLights[0].direction), 0.0, 1.0);
            reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1.0, 0.75, 0.65) * directionalLights[0].color * bt * 0.45;
          #endif`, 'after'],
      ],
    };
    const bloomMat = reg('flora', phys({ color: '#FFFFFF', roughness: 0.6, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0.55, 0.5, 0.48), side: THREE.DoubleSide, envMapIntensity: 0.5 }, bloomSpec));
    const blooms = shadowed(new THREE.InstancedMesh(bloomGeo, bloomMat, nBloom), bloomSpec, !mobile);
    const petalsC = ['#F5ECE2', '#EBCFC6', '#FAF7F1', '#E3BFB4', '#F1E2CF', '#D4A592'].map((c) => new THREE.Color(c));
    const tBloom = [];
    for (let i = 0; i < nBloom; i++) {
      let x = -half + 0.2 + R() * (TL - 0.4);
      // не ставим бутон прямо в свечу
      candleX.forEach((cx) => { if (Math.abs(cx - x) < 0.06) x += 0.12; });
      const z = (R() - 0.5) * 0.22;
      const y = TOP + 0.03 + R() * 0.05;
      e3.set((R() - 0.5) * 0.7, R() * Math.PI * 2, (R() - 0.5) * 0.7);
      q.setFromEuler(e3);
      const k = 0.075 + R() * 0.05;
      sc.set(k, k, k);
      pv.set(x, y, z);
      m4.compose(pv, q, sc);
      blooms.setMatrixAt(i, m4);
      blooms.setColorAt(i, petalsC[i % 11 === 0 ? 5 : Math.floor(R() * 5)]);
      tBloom.push(clamp((x + half) / TL * 0.9 + 0.08 + R() * 0.05));
    }
    stagger(bloomGeo, tBloom);
    blooms.frustumCulled = false;
    leaves.frustumCulled = false;
    scene.add(blooms);

    // ─── тёплые частицы в финале ───
    const nDust = mobile ? 40 : 90;
    const dpos = new Float32Array(nDust * 3);
    const dseed = new Float32Array(nDust);
    for (let i = 0; i < nDust; i++) {
      dpos.set([(R() - 0.5) * (TL + 1), TOP + 0.2 + R() * 1.4, (R() - 0.5) * 2.2], i * 3);
      dseed[i] = R();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dseed, 1));
    const dustMat = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uA: { value: 0 }, uSize: { value: 30 } },
      vertexShader: `uniform float uTime; uniform float uSize; attribute float aSeed; varying float vS;
        void main(){ vec3 p = position; p.y += sin(uTime * 0.4 + aSeed * 30.0) * 0.08; p.x += cos(uTime * 0.3 + aSeed * 12.0) * 0.1;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * (0.5 + aSeed) / -mv.z; vS = aSeed; }`,
      fragmentShader: `uniform float uA; varying float vS;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * uA * (0.3 + 0.7 * vS);
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * a * 1.4, a); ${GLSL_OUT} }`,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    dust.renderOrder = 6;
    scene.add(dust);

    // ─── камера по сцене ───
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const camPath = new THREE.CatmullRomCurve3(mobile
      ? [V(-5.4, 3.0, 2.3), V(-4.4, 2.15, 1.5), V(-3.9, 1.8, 1.1), V(-4.7, 2.45, 2.0)]
      : [V(-2.6, 3.6, 7.4), V(-3.0, 2.8, 5.6), V(-3.2, 2.2, 4.4), V(-3.4, 2.5, 4.8)]);
    const lookPath = new THREE.CatmullRomCurve3(mobile
      ? [V(0.2, 0.45, 0), V(0.4, 0.7, 0), V(0.6, 0.8, 0), V(0.5, 0.7, 0)]
      : [V(0.3, 0.5, 0), V(0.4, 0.65, 0), V(0.5, 0.75, 0), V(0.6, 0.7, 0)]);
    const look = new THREE.Vector3();
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e) => { pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = (e.clientY / window.innerHeight) * 2 - 1; };
    if (!reduced && !mobile) window.addEventListener('pointermove', onMove, { passive: true });

    const setGroup = (name, v) => (groups[name] || []).forEach((u) => { u.value = v; });
    let prog = 0, lastStep = -1, lastBg = '';
    const bg = new THREE.Color();
    const stage = host;

    const apply = (p, t) => {
      const s = p * 5;
      const clothP = smooth(0.05, 0.9, s);
      const dishes = smooth(1.0, 1.85, s);
      const rise = smooth(2.0, 2.5, s);
      const light = smooth(2.45, 2.95, s);
      const flora = smooth(3.0, 3.9, s);
      const fin = smooth(4.0, 4.8, s);
      setGroup('cloth', clothP);
      setGroup('dishes', dishes);
      setGroup('candles', rise);
      setGroup('flora', flora);
      const dusk = light * 0.5 + fin * 0.5;
      const day = 1 - dusk;
      const flick = 1 + Math.sin(t * 9.0) * 0.03 + Math.sin(t * 17.3) * 0.02;
      const candle = (light * 0.8 + fin * 0.5) * flick;
      shared.uCandle.value = candle;
      shared.uTime.value = t;
      hemi.intensity = lerp(0.12, 0.75, day);
      sun.intensity = lerp(0.08, 1.55, day);
      candleLights.forEach((l, i) => { l.intensity = candle * (mobile ? 0.95 : 1.15) * (1 + Math.sin(t * 7 + i * 2.1) * 0.04); });
      const envK = lerp(0.18, 1, day);
      envMats.forEach((m) => { m.envMapIntensity = m.userData.env * envK; });
      renderer.toneMappingExposure = lerp(0.92, 1.15, dusk);
      shadowMat.uniforms.uDusk.value = dusk;
      flames.material.uniforms.uLight.value = light;
      halos.material.uniforms.uLight.value = light;
      halos.material.uniforms.uBoost.value = 1 + fin * 0.8;
      dustMat.uniforms.uA.value = fin * 0.55;
      // фон секции (под прозрачным канвасом) — тот же день → вечер
      bg.copy(DAY_BG).lerp(DUSK_BG, dusk);
      const css = `#${bg.getHexString()}`;
      if (css !== lastBg) { lastBg = css; stage.style.backgroundColor = css; }

      camPath.getPoint(p, camera.position);
      lookPath.getPoint(p, look);
      camera.position.x += pointer.sx * 0.2;
      camera.position.y += -pointer.sy * 0.1;
      camera.lookAt(look);
      return { dusk, step: Math.min(4, Math.floor(s)) };
    };

    const report = (r) => {
      if (r.step !== lastStep) { lastStep = r.step; onStep && onStep(r.step); }
      section.style.setProperty('--dusk', r.dusk.toFixed(3));
      section.classList.toggle('is-dusk', r.dusk > 0.62);
    };

    return {
      scene, camera,
      resize(w, h, pr) {
        camera.aspect = w / h;
        camera.fov = camera.aspect < 0.8 ? 52 : camera.aspect < 1.2 ? 44 : 34;
        camera.updateProjectionMatrix();
        dustMat.uniforms.uSize.value = 26 * pr * (h / 900 + 0.3);
      },
      update(t, dt) {
        const target = pinProgress(section);
        prog = lerp(prog, target, Math.min(1, dt * 5));
        if (Math.abs(prog - target) < 0.0005) prog = target;
        const k = Math.min(1, dt * 3);
        pointer.sx = lerp(pointer.sx, pointer.x, k);
        pointer.sy = lerp(pointer.sy, pointer.y, k);
        report(apply(prog, t));
      },
      staticFrame() { report(apply(0.97, 2.0)); },
      quality(lv) {
        // без пропускания стекло рисуется прозрачным с френелем — вдвое дешевле
        if (lv < 2 && glassMat.transmission > 0) {
          const old = glassMat;
          groups.dishes = groups.dishes.filter((u) => u !== old.userData.uniforms.uP);
          glassMat = glassLite();
          glassMat.userData.uniforms.uP.value = old.userData.uniforms.uP.value;
          glasses.material = glassMat;
          old.dispose();
        }
        if (lv < 1) { sun.shadow.mapSize.set(1024, 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
      },
      dispose() { window.removeEventListener('pointermove', onMove); },
    };
  }, { observe: section, shadows: true, bloom: { strength: 0.8, radius: 0.55, threshold: 2.2 }, grain: 0.018, vignette: 0.16 });
}
