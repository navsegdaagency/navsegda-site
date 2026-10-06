// «КАК УКРАШАЮТСЯ СТОЛЫ» — закреплённая секция, 5 шагов по скроллу:
// Скатерть · Посуда · Свечи · Флористика · Свет.
// Все объекты — InstancedMesh с общими шейдерами; анимация появления
// считается в вершинном шейдере (uP — прогресс группы, aT — задержка экземпляра),
// поэтому на кадр CPU обновляет только несколько uniform'ов.
import { THREE, mountScene, clamp, lerp, smooth, pinProgress, rng } from './kit.js';

const TOP = 0.76;
const DAY_BG = new THREE.Color('#EFEAE1');
const DUSK_BG = new THREE.Color('#2A2520');

// ─── общий свет ───
const LIGHT = /* glsl */`
  uniform float uDusk;
  uniform float uCandle;
  uniform float uHalf;
  uniform vec3 uBg;
  uniform vec2 uFog;
  vec3 shade(vec3 albedo, vec3 N, vec3 P, float spec, float wrap) {
    vec3 V = normalize(cameraPosition - P);
    if (dot(N, V) < 0.0) N = -N;
    vec3 L = normalize(vec3(-0.45, 1.0, 0.55));
    float d = clamp((dot(N, L) + wrap) / (1.0 + wrap), 0.0, 1.0);
    float day = 1.0 - uDusk;
    vec3 amb = mix(vec3(0.17, 0.16, 0.18), vec3(0.56, 0.55, 0.53), day);
    vec3 hemi = amb * (0.75 + 0.25 * N.y);
    vec3 sun = vec3(1.0, 0.97, 0.92) * mix(0.06, 0.62, day);
    vec3 col = albedo * (hemi + sun * d);
    vec3 H = normalize(L + V);
    col += spec * pow(max(dot(N, H), 0.0), 48.0) * sun * 0.6;
    vec3 cp = vec3(clamp(P.x, -uHalf, uHalf), ${(TOP + 0.42).toFixed(3)}, 0.0);
    vec3 Lc = cp - P;
    float dist = length(Lc);
    Lc /= max(dist, 1e-4);
    float att = uCandle / (1.0 + dist * dist * 5.0);
    float dc = clamp(dot(N, Lc) * 0.75 + 0.25, 0.0, 1.0);
    vec3 warm = vec3(1.0, 0.64, 0.34);
    col += albedo * warm * att * dc * 1.5;
    vec3 Hc = normalize(Lc + V);
    col += spec * pow(max(dot(N, Hc), 0.0), 32.0) * warm * att * 0.9;
    float fd = length(cameraPosition - P);
    return mix(col, uBg, smoothstep(uFog.x, uFog.y, fd));
  }
`;

const COMMON_V = /* glsl */`
  uniform float uP;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vP;
  varying vec2 vUv;
  varying vec3 vCol;
  const float PI = 3.14159265;
  #ifdef STAGGER
    attribute float aT;
  #endif
  float localP() {
    #ifdef STAGGER
      return clamp(uP * 1.7 - aT * 0.7, 0.0, 1.0);
    #else
      return uP;
    #endif
  }
  float outBack(float x) { float c1 = 1.4; float c3 = c1 + 1.0; return 1.0 + c3 * pow(x - 1.0, 3.0) + c1 * pow(x - 1.0, 2.0); }
`;

function litMaterial(shared, { color = '#ffffff', spec = 0.2, wrap = 0.3, defines = {}, head = '', body = '', world = '', frag = '', transparent = false, side = THREE.FrontSide }) {
  const vs = `${COMMON_V}
    ${head}
    void main() {
      vec3 pos = position;
      vec3 nrm = normal;
      vUv = uv;
      float lp = localP();
      ${body}
      mat4 im = mat4(1.0);
      #ifdef USE_INSTANCING
        im = instanceMatrix;
      #endif
      vCol = vec3(1.0);
      #ifdef USE_INSTANCING_COLOR
        vCol = instanceColor;
      #endif
      vec4 wp = modelMatrix * im * vec4(pos, 1.0);
      ${world}
      vP = wp.xyz;
      vN = normalize(mat3(modelMatrix) * mat3(im) * nrm);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;
  const fs = `
    uniform vec3 uColor;
    uniform float uSpec;
    uniform float uWrap;
    varying vec3 vN;
    varying vec3 vP;
    varying vec2 vUv;
    varying vec3 vCol;
    ${LIGHT}
    void main() {
      vec3 albedo = uColor * vCol;
      float spec = uSpec;
      float alpha = 1.0;
      ${frag}
      gl_FragColor = vec4(shade(albedo, normalize(vN), vP, spec, uWrap), alpha);
    }`;
  return new THREE.ShaderMaterial({
    vertexShader: vs,
    fragmentShader: fs,
    defines,
    uniforms: {
      ...shared,
      uP: { value: 1 },
      uColor: { value: srgb(color) },
      uSpec: { value: spec },
      uWrap: { value: wrap },
    },
    transparent,
    depthWrite: !transparent,
    side,
  });
}

// Шейдеры сцены считают цвет в «экранном» sRGB, поэтому uniform-цвета переводим из linear.
const srgb = (c) => new THREE.Color(c).convertLinearToSRGB();

function stagger(geo, values) {
  geo.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(values), 1));
}

export function mount(host, section, onStep) {
  return mountScene(host, ({ renderer, mobile, reduced }) => {
    const R = rng(33);
    const TL = mobile ? 5.0 : 7.2;
    const TW = 1.1;
    const seats = mobile ? 5 : 8;
    const half = TL / 2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(mobile ? 50 : 34, 1, 0.1, 80);

    const shared = {
      uDusk: { value: 0 }, uCandle: { value: 0 }, uHalf: { value: half - 0.3 },
      uBg: { value: DAY_BG.clone().convertLinearToSRGB() }, uFog: { value: new THREE.Vector2(7, 18) },
      uTime: { value: 0 },
    };
    const groups = {};
    const reg = (name, mat) => { (groups[name] = groups[name] || []).push(mat); return mat; };

    // ─── пол и мягкая тень ───
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), litMaterial(shared, { color: '#E8E1D5', spec: 0, wrap: 0.6 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const shadowMat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: new THREE.Vector2(half + 0.5, TW / 2 + 0.5) }, uDusk: shared.uDusk },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec2 uSize; uniform float uDusk; varying vec2 vP;
        void main(){ vec2 q = abs(vP) - uSize + 0.6; float d = length(max(q,0.0)) + min(max(q.x,q.y),0.0);
        float a = (1.0 - smoothstep(-0.4, 0.7, d)) * mix(0.28, 0.12, uDusk); gl_FragColor = vec4(0.12,0.1,0.08,a); }`,
      transparent: true, depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(TL + 3, TW + 3), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.003;
    scene.add(shadow);

    // ─── стол ───
    const wood = litMaterial(shared, { color: '#A3876C', spec: 0.15 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(TL, 0.05, TW), wood);
    top.position.y = TOP - 0.025;
    scene.add(top);
    const legGeo = new THREE.BoxGeometry(0.06, TOP - 0.05, 0.06);
    const legs = new THREE.InstancedMesh(legGeo, wood, 4);
    const m4 = new THREE.Matrix4();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
      m4.makeTranslation(sx * (half - 0.15), (TOP - 0.05) / 2, sz * (TW / 2 - 0.12));
      legs.setMatrixAt(i, m4);
    });
    scene.add(legs);

    // ─── скатерть ───
    const D = 0.62;
    const clothGeo = new THREE.PlaneGeometry(1, 1, mobile ? 100 : 180, mobile ? 26 : 44);
    const clothMat = reg('cloth', litMaterial(shared, {
      color: '#F6F4EF', spec: 0.05, wrap: 0.5, side: THREE.DoubleSide,
      head: `
        uniform vec2 uGrid; uniform vec2 uHalfT;
        vec3 settled(float gx, float gz) {
          float ox = max(abs(gx) - uHalfT.x, 0.0);
          float oz = max(abs(gz) - uHalfT.y, 0.0);
          float px = sign(gx) * min(abs(gx), uHalfT.x);
          float pz = sign(gz) * min(abs(gz), uHalfT.y);
          float hang = ox + oz;
          float y = ${TOP.toFixed(3)} + 0.004 - hang;
          float fz = (sin(gx * 10.0) * 0.022 + sin(gx * 23.0 + 1.3) * 0.008) * smoothstep(0.0, 0.35, oz);
          float fx = sin(gz * 12.0 + 0.7) * 0.02 * smoothstep(0.0, 0.35, ox);
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
      body: `
        float c = lp;
        vec3 p0 = cloth(uv, c);
        vec3 pa = cloth(uv + vec2(0.004, 0.0), c);
        vec3 pb = cloth(uv + vec2(0.0, 0.012), c);
        pos = p0;
        nrm = normalize(cross(pb - p0, pa - p0));`,
    }));
    clothMat.uniforms.uGrid = { value: new THREE.Vector2(TL + 2 * D, TW + 2 * D) };
    clothMat.uniforms.uHalfT = { value: new THREE.Vector2(half + 0.02, TW / 2 + 0.02) };
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.frustumCulled = false;
    scene.add(cloth);

    // ─── посуда ───
    const seatX = [];
    for (let i = 0; i < seats; i++) seatX.push(-half + (TL / seats) * (i + 0.5));
    const seatPos = [];
    seatX.forEach((x) => [-1, 1].forEach((s) => seatPos.push([x, s])));
    const nSeat = seatPos.length;

    const dropBody = `
      float e = lp <= 0.0 ? 0.0 : outBack(smoothstep(0.0, 1.0, lp));
      pos *= max(e, 0.0001);`;
    const dropWorld = `wp.y += (1.0 - smoothstep(0.0, 1.0, lp)) * 0.45;`;

    const plateGeo = new THREE.LatheGeometry([
      [0, 0], [0.15, 0], [0.165, 0.008], [0.16, 0.013], [0.14, 0.007],
      [0.125, 0.009], [0.128, 0.021], [0.12, 0.023], [0.09, 0.013], [0.0, 0.014],
    ].map(([x, y]) => new THREE.Vector2(x, y)), mobile ? 24 : 40);
    const plateMat = reg('dishes', litMaterial(shared, {
      color: '#F8F6F1', spec: 0.6, wrap: 0.4, defines: { STAGGER: '' }, body: dropBody, world: dropWorld,
      frag: `float rim = smoothstep(0.17, 0.2, vUv.y) * (1.0 - smoothstep(0.31, 0.34, vUv.y));
             albedo = mix(albedo, vec3(0.78, 0.62, 0.36), rim); spec += rim * 0.8;`,
    }));
    const plates = new THREE.InstancedMesh(plateGeo, plateMat, nSeat);
    const tPlates = [];
    seatPos.forEach(([x, s], i) => {
      m4.makeTranslation(x, TOP + 0.006, s * 0.36);
      plates.setMatrixAt(i, m4);
      tPlates.push((x + half) / TL * 0.85 + R() * 0.1);
    });
    stagger(plateGeo, tPlates);
    scene.add(plates);

    // приборы
    const cutGeo = new THREE.BoxGeometry(0.014, 0.005, 0.19);
    const cutMat = reg('dishes', litMaterial(shared, { color: '#C9C6BF', spec: 1.0, defines: { STAGGER: '' }, body: dropBody, world: dropWorld }));
    const cutlery = new THREE.InstancedMesh(cutGeo, cutMat, nSeat * 2);
    const tCut = [];
    seatPos.forEach(([x, s], i) => {
      [-1, 1].forEach((side, k) => {
        m4.makeTranslation(x + side * 0.2, TOP + 0.008, s * 0.36);
        cutlery.setMatrixAt(i * 2 + k, m4);
        tCut.push(Math.min(1, tPlates[i] + 0.08));
      });
    });
    stagger(cutGeo, tCut);
    scene.add(cutlery);

    // бокалы
    const glassGeo = new THREE.LatheGeometry([
      [0.0, 0.0], [0.036, 0.0], [0.037, 0.004], [0.007, 0.009], [0.005, 0.08],
      [0.012, 0.088], [0.034, 0.104], [0.042, 0.135], [0.04, 0.165], [0.036, 0.185],
    ].map(([x, y]) => new THREE.Vector2(x, y)), mobile ? 16 : 28);
    const glassMat = reg('dishes', litMaterial(shared, {
      color: '#FFFFFF', spec: 1.4, wrap: 0.2, defines: { STAGGER: '' }, body: dropBody, world: dropWorld,
      transparent: true, side: THREE.DoubleSide,
      frag: `vec3 Vg = normalize(cameraPosition - vP); float fr = pow(1.0 - abs(dot(normalize(vN), Vg)), 2.0);
             alpha = 0.05 + 0.55 * fr; albedo = mix(vec3(0.9), vec3(1.0, 0.9, 0.8), uCandle * 0.4);`,
    }));
    const glasses = new THREE.InstancedMesh(glassGeo, glassMat, nSeat);
    const tGlass = [];
    seatPos.forEach(([x, s], i) => {
      m4.makeTranslation(x + 0.15, TOP + 0.004, s * 0.17);
      glasses.setMatrixAt(i, m4);
      tGlass.push(Math.min(1, tPlates[i] + 0.12));
    });
    stagger(glassGeo, tGlass);
    glasses.renderOrder = 3;
    scene.add(glasses);

    // ─── свечи ───
    const nCandle = mobile ? 6 : 9;
    const candleX = [];
    for (let i = 0; i < nCandle; i++) candleX.push(-half + 0.45 + ((TL - 0.9) / (nCandle - 1)) * i);
    const candleH = candleX.map((_, i) => (i % 2 ? 0.26 : 0.34) + R() * 0.03);
    const candleZ = candleX.map(() => (R() - 0.5) * 0.06);

    const holderGeo = new THREE.CylinderGeometry(0.026, 0.05, 0.07, 16);
    holderGeo.translate(0, 0.035, 0);
    const holderMat = reg('candles', litMaterial(shared, { color: '#B4935E', spec: 1.2, wrap: 0.2, defines: { STAGGER: '' }, body: dropBody, world: `wp.y += (1.0 - smoothstep(0.0, 1.0, lp)) * 0.2;` }));
    const holders = new THREE.InstancedMesh(holderGeo, holderMat, nCandle);
    const candleGeo = new THREE.CylinderGeometry(0.015, 0.018, 1, 12, 1);
    candleGeo.translate(0, 0.5, 0);
    const candleMat = reg('candles', litMaterial(shared, {
      color: '#F4ECDD', spec: 0.25, wrap: 0.6, defines: { STAGGER: '' },
      body: `float g = smoothstep(0.25, 1.0, lp); pos.y *= max(g, 0.0001); pos.xz *= step(0.0001, g);`,
      frag: `albedo += vec3(1.0, 0.7, 0.4) * uCandle * 0.18 * smoothstep(0.6, 1.0, vUv.y);`,
    }));
    const candles = new THREE.InstancedMesh(candleGeo, candleMat, nCandle);
    const tCandle = [];
    candleX.forEach((x, i) => {
      m4.makeTranslation(x, TOP + 0.004, candleZ[i]);
      holders.setMatrixAt(i, m4);
      const cm = new THREE.Matrix4().makeTranslation(x, TOP + 0.074, candleZ[i]).multiply(new THREE.Matrix4().makeScale(1, candleH[i], 1));
      candles.setMatrixAt(i, cm);
      tCandle.push((x + half) / TL);
    });
    stagger(holderGeo, tCandle);
    stagger(candleGeo, tCandle);
    scene.add(holders, candles);

    // пламя и ореолы — билборды с аддитивным смешиванием
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
        vec3 p = aF.xyz + right * position.x * sz.x + up * (position.y + 0.5) * sz.y;
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
          float a = pow(max(1.0 - d, 0.0), 2.2) * 0.22 * vI * uBoost;
          gl_FragColor = vec4(vec3(1.0, 0.68, 0.38) * a, a);
        #else
          vec2 q = vUv - vec2(0.5, 0.3);
          q.x *= 2.4 / (0.35 + vUv.y);
          float d = length(vec2(q.x, q.y * 1.15));
          float core = smoothstep(0.5, 0.0, d);
          vec3 c = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.95, 0.82), core * core);
          float a = core * vI;
          gl_FragColor = vec4(c * a, a);
        #endif
      }`;
    const mkBill = (halo, size) => {
      const g = new THREE.InstancedBufferGeometry();
      const pg = new THREE.PlaneGeometry(1, 1);
      g.index = pg.index;
      g.setAttribute('position', pg.getAttribute('position'));
      g.setAttribute('uv', pg.getAttribute('uv'));
      pg.dispose();
      const arr = new Float32Array(nCandle * 4);
      candleX.forEach((x, i) => arr.set([x, TOP + 0.074 + candleH[i] + (halo ? 0.03 : -0.004), candleZ[i], (i * 0.37) % 1], i * 4));
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
    const flames = mkBill(false, [0.034, 0.075]);
    const halos = mkBill(true, [0.75, 0.75]);
    scene.add(flames, halos);

    // ─── флористика: листья и бутоны ───
    const nLeaf = mobile ? 230 : 560;
    const leafGeo = new THREE.PlaneGeometry(1, 1, 2, 4);
    const leafMat = reg('flora', litMaterial(shared, {
      color: '#FFFFFF', spec: 0.25, wrap: 0.5, defines: { STAGGER: '' }, side: THREE.DoubleSide,
      head: `vec3 leaf(vec2 uv) { float u = uv.x * 2.0 - 1.0; float v = uv.y;
               float w = 0.2 * pow(max(sin(PI * v), 0.0), 0.8);
               float x = u * w; return vec3(x, abs(x) * 0.6 + v * v * 0.18, v); }`,
      body: `float e = lp <= 0.0 ? 0.0 : outBack(lp);
             vec3 p0 = leaf(uv); vec3 pa = leaf(uv + vec2(0.02, 0.0)); vec3 pb = leaf(uv + vec2(0.0, 0.02));
             nrm = normalize(cross(pa - p0, pb - p0));
             pos = p0 * max(e, 0.0001);`,
      frag: `albedo *= mix(0.9, 1.25, vUv.y);`,
    }));
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, nLeaf);
    const greens = ['#8E9872', '#6F7A57', '#A4AD8A', '#7B7A4E', '#97A07F'].map(srgb);
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
    const nBloom = mobile ? 40 : 96;
    const bloomGeo = (() => {
      const pet = [];
      for (let i = 0; i < 5; i++) pet.push([(i / 5) * Math.PI * 2, 0]);
      for (let i = 0; i < 6; i++) pet.push([((i + 0.5) / 6) * Math.PI * 2, 1]);
      const gu = 3, gv = 4;
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
    const bloomMat = reg('flora', litMaterial(shared, {
      color: '#FFFFFF', spec: 0.15, wrap: 0.6, defines: { STAGGER: '' }, side: THREE.DoubleSide,
      head: `attribute vec2 aPet;
        vec3 bloom(vec2 uv, float o) {
          float u = uv.x * 2.0 - 1.0; float v = uv.y; float layer = aPet.y; float ang = aPet.x;
          float L = mix(0.55, 0.85, layer); float W = mix(0.6, 0.8, layer);
          float hw = 0.5 * W * pow(max(sin(PI * pow(v, 1.3)), 0.0), 0.6);
          float cup = mix(2.5, mix(1.5, 0.75, layer), o);
          float a = u * cup; float x = sin(a) / cup * hw; float d = (1.0 - cos(a)) / cup * hw;
          float tilt = mix(-0.2, mix(0.5, 1.3, layer), o);
          vec3 p = vec3(x, v * L, -d);
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
      frag: `albedo *= mix(0.72, 1.04, smoothstep(0.0, 0.7, vUv.y));`,
    }));
    const blooms = new THREE.InstancedMesh(bloomGeo, bloomMat, nBloom);
    const petalsC = ['#F5ECE2', '#EBCFC6', '#FAF7F1', '#E3BFB4', '#F1E2CF', '#D4A592'].map(srgb);
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
        gl_FragColor = vec4(vec3(1.0, 0.75, 0.45) * a, a); }`,
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

    const setGroup = (name, v) => (groups[name] || []).forEach((m) => { m.uniforms.uP.value = v; });
    let prog = 0, lastStep = -1;
    const bg = new THREE.Color();

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
      shared.uDusk.value = dusk;
      const flick = 1 + Math.sin(t * 9.0) * 0.03 + Math.sin(t * 17.3) * 0.02;
      shared.uCandle.value = (light * 0.8 + fin * 0.5) * flick;
      shared.uTime.value = t;
      bg.copy(DAY_BG).lerp(DUSK_BG, dusk);
      shared.uBg.value.copy(bg).convertLinearToSRGB();
      renderer.setClearColor(bg, 1);
      flames.material.uniforms.uLight.value = light;
      halos.material.uniforms.uLight.value = light;
      halos.material.uniforms.uBoost.value = 1 + fin * 1.4;
      dustMat.uniforms.uA.value = fin * 0.8;

      camPath.getPoint(p, camera.position);
      lookPath.getPoint(p, look);
      camera.position.x += pointer.sx * 0.2;
      camera.position.y += -pointer.sy * 0.1;
      camera.lookAt(look);
      return { bg, dusk, step: Math.min(4, Math.floor(s)) };
    };

    const report = (r) => {
      if (r.step !== lastStep) { lastStep = r.step; onStep && onStep(r.step); }
      section.style.setProperty('--dusk', r.dusk.toFixed(3));
      section.classList.toggle('is-dusk', r.dusk > 0.62);
    };

    return {
      scene, camera,
      resize(w, h) {
        camera.aspect = w / h;
        camera.fov = camera.aspect < 0.8 ? 52 : camera.aspect < 1.2 ? 44 : 34;
        camera.updateProjectionMatrix();
        dustMat.uniforms.uSize.value = 40 * Math.min(window.devicePixelRatio || 1, 1.75) * (h / 900 + 0.3);
      },
      update(t, dt) {
        const target = pinProgress(section);
        prog = lerp(prog, target, Math.min(1, dt * 5));
        if (Math.abs(prog - target) < 0.0005) prog = target;
        const k = Math.min(1, dt * 3);
        pointer.sx = lerp(pointer.sx, pointer.x, k);
        pointer.sy = lerp(pointer.sy, pointer.y, k);
        const r = apply(prog, t);
        report(r);
      },
      staticFrame() { report(apply(0.97, 2.0)); },
      dispose() { window.removeEventListener('pointermove', onMove); },
    };
  }, { observe: section, alpha: false, clearColor: DAY_BG.getHex() });
}
