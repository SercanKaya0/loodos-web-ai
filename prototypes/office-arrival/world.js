// Maslak, Büyükdere Caddesi — yağmurlu gece. Noramin İş Merkezi girişi ve lobisi.
// Eksenler: oyuncu kaldırımda -z yönünde yürür; binalar solda (x < -4.5), yol sağda (x > 0).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createPerson } from './people.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export const WALK_Y = 0.15;          // kaldırım yüksekliği
export const FACADE_X = -4.5;        // bina cephe hattı
export const GLASS_X = -6;           // lobi cam cephesi (girinti)
export const DOOR_Z = -16;           // kapı ortası
export const LOBBY = { x0: -19, x1: GLASS_X, z0: -22, z1: -10, h: 4.2 };
export const LAMP_Z = [34, 18, 2, -26, -42];

const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(path, srgb, rx, ry) {
  const key = `${path}|${rx}|${ry}`;
  if (texCache.has(key)) return texCache.get(key);
  const t = loader.load(path);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

// ambientCG PBR malzeme: renk + normal + pürüzlülük
function pbr(name, rx, ry, opts = {}) {
  const base = `assets/materials/${name}/`;
  const m = new THREE.MeshStandardMaterial({
    map: tex(base + 'color.jpg', true, rx, ry),
    normalMap: tex(base + 'normal.jpg', false, rx, ry),
    roughnessMap: tex(base + 'roughness.jpg', false, rx, ry),
    roughness: opts.roughness ?? 1,
    metalness: 0,
    color: opts.color ?? 0xffffff,
  });
  m.normalScale.setScalar(opts.normalScale ?? 1);
  return m;
}

// Islak zemin: dünya koordinatına göre su birikintisi maskesi.
// Birikintide: koyu renk, ayna gibi pürüzsüz, normal düz; yağmur damlası halkaları
const WET_GLSL = /* glsl */`
  varying vec3 vWPos;
  uniform float uTime, uWetLo, uWetHi, uDry;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
  // Damla halkaları (hücre başına bir damla, zamanla genişleyen halka)
  float ripples(vec2 p){
    vec2 c = floor(p), f = fract(p);
    float r = h21(c);
    float tt = fract(uTime * 0.9 + r * 7.0);
    vec2 o = vec2(h21(c + 3.1), h21(c + 7.7)) * 0.6 + 0.2;
    float d = length(f - o);
    float ring = sin((d - tt * 0.45) * 60.0) * smoothstep(0.45 * tt + 0.04, 0.45 * tt, d) * (1.0 - tt);
    return ring;
  }
`;
function makeWet(mat, { lo = 0.48, hi = 0.6, dry = 0.75 } = {}) {
  mat.userData.uniforms = { uTime: { value: 0 }, uWetLo: { value: lo }, uWetHi: { value: hi }, uDry: { value: dry } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, mat.userData.uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + WET_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float wet = smoothstep(uWetLo, uWetHi, fbm(vWPos.xz * 0.32));
        diffuseColor.rgb *= mix(0.6, 0.32, wet);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor * uDry, 0.025, wet);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float rp = ripples(vWPos.xz * 3.0) + ripples(vWPos.xz * 3.0 + 17.3);
        normal = normalize(mix(normal, normalize(vNormal + vec3(rp * 0.05, 0.0, rp * 0.05)), wet));`);
  };
  return mat;
}

// Gece pencereleri: rastgele yanan ofisler
function windowCanvas(cols, rows, litP, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#5b6067';
  g.fillRect(0, 0, c.width, c.height);
  const cw = c.width / cols, ch = c.height / rows;
  for (let y = 0; y < rows; y++) {
    const floorLit = rnd() < 0.5 ? litP * 2 : litP * 0.4; // bazı katlar daha dolu
    for (let x = 0; x < cols; x++) {
      const px = x * cw + 3, py = y * ch + ch * 0.18, w = cw - 6, h = ch * 0.68;
      if (rnd() < floorLit) {
        const warm = rnd() < 0.6;
        const k = 0.55 + rnd() * 0.45;
        g.fillStyle = warm ? `rgb(${255 * k | 0},${200 * k | 0},${140 * k | 0})` : `rgb(${190 * k | 0},${220 * k | 0},${255 * k | 0})`;
        g.fillRect(px, py, w, h);
        // jaluzi çizgileri
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < h; i += 5) g.fillRect(px, py + i, w, 1.5);
      } else {
        const v = 62 + rnd() * 46;
        g.fillStyle = `rgb(${v | 0},${(v + 7) | 0},${(v + 15) | 0})`;
        g.fillRect(px, py, w, h);
      }
    }
  }
  return c;
}
const WIN_CANVASES = [windowCanvas(10, 20, 0.16, 7), windowCanvas(8, 20, 0.1, 31), windowCanvas(12, 20, 0.22, 99)];
function windowMat(variant, rx, ry, opts = {}) {
  const t = new THREE.CanvasTexture(WIN_CANVASES[variant % WIN_CANVASES.length]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({
    map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: (opts.glow ?? 1.4) * 0.18,
    color: 0xb4bcc6, roughness: 0.22, metalness: 0.3,
  });
}

// Metin dokusu (tabelalar)
function textTexture(draw, w = 1024, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function box(w, h, d, mat, x, y, z, parent, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = receive;
  parent.add(m);
  return m;
}
function plane(w, h, mat, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function buildWorld(scene) {
  const wetMats = [];
  const world = { wetMats, cars: [], doors: [], blinkers: [], lampPositions: [] };

  // --- Gökyüzü: kapalı İstanbul sabahı (Poly Haven HDRI, CC0) + yumuşak gün ışığı
  new RGBELoader().load('assets/sky/overcast_2k.hdr', (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = t;
    scene.backgroundIntensity = 0.85;
  });
  scene.fog = new THREE.FogExp2(0xa9aeb3, 0.0065);
  world.hemi = new THREE.HemisphereLight(0xdfe6ee, 0x4d4842, 1.1);
  scene.add(world.hemi);
  const sun = new THREE.DirectionalLight(0xf3efe6, 1.5);
  sun.position.set(28, 60, 18);
  sun.target.position.set(-4, 0, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  world.sun = sun;

  // --- Zemin: yol, kaldırımlar, bordür, refüj
  const Z0 = 90, Z1 = -160, LEN = Z0 - Z1, ZC = (Z0 + Z1) / 2;
  const road = makeWet(pbr('asphalt', 26 / 4, LEN / 4, { color: 0x8a8a8a }), { lo: 0.38, hi: 0.52, dry: 0.55 });
  wetMats.push(road);
  const roadMesh = plane(26, LEN, road, scene);
  roadMesh.rotation.x = -Math.PI / 2; roadMesh.position.set(13, 0, ZC);

  const walkMat = makeWet(pbr('paving', 6 / 1.6, LEN / 1.6, { color: 0xb8b2a8 }), { lo: 0.42, hi: 0.55, dry: 0.6 });
  wetMats.push(walkMat);
  const walk = plane(FACADE_X * -1, LEN, walkMat, scene);
  walk.rotation.x = -Math.PI / 2; walk.position.set(FACADE_X / 2, WALK_Y, ZC);
  const farWalk = plane(6, LEN, walkMat, scene);
  farWalk.rotation.x = -Math.PI / 2; farWalk.position.set(29, WALK_Y, ZC);

  const curbMat = pbr('concrete', 1, LEN / 2, { color: 0x9a9690, roughness: 0.9 });
  box(0.25, WALK_Y, LEN, curbMat, 0.125, WALK_Y / 2, ZC, scene);
  box(0.25, WALK_Y, LEN, curbMat, 25.875, WALK_Y / 2, ZC, scene);
  // Refüj: beton bariyer + korkuluk
  box(0.7, 0.85, LEN, pbr('concrete', 1, LEN / 2, { color: 0x77736d }), 13, 0.425, ZC, scene);
  box(0.08, 0.12, LEN, new THREE.MeshStandardMaterial({ color: 0x8b9096, metalness: 0.9, roughness: 0.35 }), 13, 1.1, ZC, scene);

  // Şerit çizgileri (kesikli) — instanced
  const dash = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.14, 3),
    new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.5, emissive: 0x111111 }),
    400,
  );
  dash.receiveShadow = true;
  const dm = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  let di = 0;
  for (const lx of [4.2, 8.4, 17.6, 21.8]) {
    for (let z = Z0; z > Z1 && di < 400; z -= 9) { dm.compose(new THREE.Vector3(lx, 0.012, z), q, new THREE.Vector3(1, 1, 1)); dash.setMatrixAt(di++, dm); }
  }
  dash.count = di;
  scene.add(dash);
  for (const lx of [0.55, 12.45, 13.55, 25.45]) {
    const line = plane(0.12, LEN, new THREE.MeshStandardMaterial({ color: 0xc9c2a0, roughness: 0.5 }), scene);
    line.rotation.x = -Math.PI / 2; line.position.set(lx, 0.011, ZC);
  }

  // --- Sokak lambaları (kaldırım tarafı: gerçek ışık; karşı taraf + refüj: parlayan başlık)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2e31, metalness: 0.7, roughness: 0.45 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, roughness: 0.3 }); // gündüz: lambalar sönük
  function lampPost(x, z, dir, real, shadow) {
    const g = new THREE.Group();
    g.position.set(x, WALK_Y, z);
    scene.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 8, 12), poleMat);
    pole.position.y = 4; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.1), poleMat);
    arm.position.set(dir * 1.05, 7.9, 0); g.add(arm);
    const housing = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.14, 0.34, 2, 0.04), poleMat);
    housing.position.set(dir * 2.05, 7.85, 0); g.add(housing);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.24), headMat);
    lens.rotation.x = Math.PI / 2; lens.position.set(dir * 2.05, 7.77, 0); g.add(lens);
    const p = new THREE.Vector3(x + dir * 2.05, WALK_Y + 7.7, z);
    world.lampPositions.push(p);
    if (real && false) {
      const s = new THREE.SpotLight(0xffdcb8, 480, 34, 1.05, 0.65, 2);
      s.position.copy(p);
      s.target.position.set(p.x - dir * 1.4, 0, z);
      scene.add(s, s.target);
      if (shadow) {
        s.castShadow = true;
        s.shadow.mapSize.set(1024, 1024);
        s.shadow.bias = -0.0004;
        s.shadow.normalBias = 0.03;
      }
    }
  }
  LAMP_Z.forEach((z, i) => lampPost(-0.55, z, 1, true, i === 1 || i === 2 || i === 3));
  for (let z = 60; z > -150; z -= 22) lampPost(26.4, z, -1, false);
  for (let z = 50; z > -150; z -= 30) {
    lampPost(13, z, 1, false); lampPost(13, z, -1, false);
  }
  // Refüj lambalarından biri yola gerçek ışık versin (ıslak asfalt parlaması)
  for (const z of []) {
    const s = new THREE.SpotLight(0xffd0a0, 700, 40, 1.0, 0.7, 2);
    s.position.set(10.95, 8, z); s.target.position.set(8, 0, z);
    scene.add(s, s.target);
  }

  // --- Ağaçlar (kaldırım boyunca)
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x2a2119, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1d2a17, roughness: 0.85, flatShading: true });
  function tree(x, z, s) {
    const g = new THREE.Group(); g.position.set(x, WALK_Y, z); scene.add(g);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 3.4 * s, 8), barkMat);
    trunk.position.y = 1.7 * s; trunk.castShadow = true; g.add(trunk);
    const grate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 1.3), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.5 }));
    grate.position.y = 0.015; g.add(grate);
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.IcosahedronGeometry((0.9 + Math.random() * 0.6) * s, 1);
      const pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, k);
        v.multiplyScalar(0.8 + Math.random() * 0.4);
        pos.setXYZ(k, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      const leaf = new THREE.Mesh(geo, leafMat);
      leaf.position.set((Math.random() - 0.5) * 1.8 * s, (3.6 + Math.random() * 1.6) * s, (Math.random() - 0.5) * 1.8 * s);
      leaf.castShadow = true; leaf.receiveShadow = true;
      g.add(leaf);
    }
  }
  [26, 10, -34, -50, -66].forEach((z) => tree(-1.3, z, 1 + Math.random() * 0.2));

  // --- Bollardlar, çöp kutusu, sokak tabelası
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3d40, metalness: 0.85, roughness: 0.35 });
  for (let z = -11; z >= -21; z -= 2.5) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.9, 12), steel);
    b.position.set(-0.9, WALK_Y + 0.45, z); b.castShadow = true; scene.add(b);
  }
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.95, 16, 1, true), steel);
  bin.position.set(-0.85, WALK_Y + 0.48, 5.5); bin.castShadow = true; scene.add(bin);

  // İstanbul tipi lacivert sokak tabelası
  const signTex = textTexture((g, w, h) => {
    g.fillStyle = '#123a7a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8eef8'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#f2f5fa'; g.textAlign = 'center';
    g.font = '600 46px "Red Hat Display", sans-serif'; g.fillText('MASLAK MAH.', w / 2, 92);
    g.font = '700 84px "Red Hat Display", sans-serif'; g.fillText('BÜYÜKDERE CAD.', w / 2, 192);
  }, 1024, 256);
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.9, 8), steel);
  signPole.position.set(-0.75, WALK_Y + 1.45, 13); scene.add(signPole);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.02), [steel, steel, steel, steel,
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.06 }),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })]);
  sign.position.set(-0.75, WALK_Y + 2.75, 13); sign.rotation.y = 0; scene.add(sign);

  // --- Noramin İş Merkezi
  const granite = pbr('granite', 1, 1, { color: 0x9a9089, roughness: 0.9 });
  const graniteFor = (w, h) => pbr('granite', w / 2, h / 2, { color: 0x8f877f, roughness: 0.9 });
  const NZ0 = -4, NZ1 = -34, NX0 = -30, GF = 4.6, FLOOR_H = 3.6, FLOORS = 6;
  const topY = GF + FLOORS * FLOOR_H;
  // Üst kütle
  box(FACADE_X - NX0, topY - GF, NZ0 - NZ1, graniteFor(30, topY - GF), (FACADE_X + NX0) / 2, (GF + topY) / 2, (NZ0 + NZ1) / 2, scene);
  // Kat şeritleri (bant pencereler) — sokak cephesi ve yan cephe
  const ribbonMat = windowMat(0, (NZ0 - NZ1) / 1.6 / 10, 1 / 20, { glow: 1.6 });
  ribbonMat.map.offset.y = 0.35;
  for (let f = 0; f < FLOORS; f++) {
    const y = GF + f * FLOOR_H + 1.9;
    const r = plane(NZ0 - NZ1 - 1, 2.0, ribbonMat.clone(), scene);
    r.material.map = ribbonMat.map.clone(); r.material.emissiveMap = r.material.map;
    r.material.map.offset.y = (f * 0.137) % 1;
    r.position.set(FACADE_X - 0.02 + 0.03, y, (NZ0 + NZ1) / 2); r.rotation.y = Math.PI / 2;
    // yan cephe (kuzeye bakan) — komşu binanın üstünde kalan katlar
    if (y > 14) {
      const side = plane(NX0 * -1 + FACADE_X - 1, 2.0, r.material, scene);
      side.position.set((FACADE_X + NX0) / 2, y, NZ0 + 0.02);
    }
  }
  // Dikey kayıtlar (mullion) — instanced
  const mullion = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 2.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x23262a, metalness: 0.8, roughness: 0.4 }), 200);
  let mi = 0;
  for (let f = 0; f < FLOORS; f++) {
    for (let z = NZ0 - 1; z > NZ1 + 0.5; z -= 1.6) {
      dm.compose(new THREE.Vector3(FACADE_X + 0.04, GF + f * FLOOR_H + 1.9, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
      if (mi < 200) mullion.setMatrixAt(mi++, dm);
    }
  }
  mullion.count = mi; scene.add(mullion);
  // Çatı parapeti
  box(FACADE_X - NX0 + 0.3, 0.6, NZ0 - NZ1 + 0.3, granite, (FACADE_X + NX0) / 2, topY + 0.3, (NZ0 + NZ1) / 2, scene);

  // Zemin kat: girişin iki yanında granit kütle + karartılmış vitrin
  const gfDark = new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.12, metalness: 0.7 });
  for (const [za, zb] of [[NZ0, LOBBY.z1], [LOBBY.z0, NZ1]]) {
    // Güney kütle asansör kabinlerinin arkasından başlar; önünde yalnızca cephe kaplaması var
    const zs = za === LOBBY.z0 ? LOBBY.z0 - 2.5 : za;
    box(FACADE_X - NX0, GF, zs - zb, graniteFor(zs - zb, GF), (FACADE_X + NX0) / 2, GF / 2, (zs + zb) / 2, scene);
    if (zs !== za) box(1.5, GF, za - zs, graniteFor(za - zs, GF), FACADE_X - 0.75, GF / 2, (za + zs) / 2, scene);
    const vit = plane(za - zb - 1.4, 2.6, gfDark, scene);
    vit.position.set(FACADE_X + 0.01, WALK_Y + 1.6, (za + zb) / 2); vit.rotation.y = Math.PI / 2;
  }
  // Girinti tavanı (saçak altı ile cam arası)
  const soffit = new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 0.7 });
  box(FACADE_X - GLASS_X, 0.4, LOBBY.z1 - LOBBY.z0, soffit, (FACADE_X + GLASS_X) / 2, GF - 0.2, DOOR_Z, scene);

  // Saçak (kanopi) + tabela
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1d2024, metalness: 0.75, roughness: 0.35 });
  const CX0 = GLASS_X, CX1 = -1.9, CZ0 = -20.8, CZ1 = -11.2, CY = 3.75;
  box(CX1 - CX0, 0.5, CZ1 - CZ0, canopyMat, (CX0 + CX1) / 2, CY + 0.25, DOOR_Z, scene);
  const fasciaTex = textTexture((g, w, h) => {
    g.fillStyle = '#16181b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4efe6'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 92px "Red Hat Display", sans-serif';
    g.letterSpacing = '18px';
    g.fillText('NORAMİN İŞ MERKEZİ', w / 2, h / 2 + 4);
  }, 2048, 108);
  const fascia = plane(CZ1 - CZ0, 0.5, new THREE.MeshStandardMaterial({ map: fasciaTex, emissiveMap: fasciaTex, emissive: 0xfff2dd, emissiveIntensity: 2.2, roughness: 0.4 }), scene);
  fascia.position.set(CX1 + 0.005, CY + 0.25, DOOR_Z); fascia.rotation.y = Math.PI / 2;
  const numTex = textTexture((g, w, h) => {
    g.fillStyle = '#16181b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4efe6'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 70px "Red Hat Display", sans-serif'; g.fillText('No 237', w / 2, h / 2 + 3);
  }, 512, 108);
  const num = plane(CX1 - CX0, 0.5, new THREE.MeshStandardMaterial({ map: numTex, emissiveMap: numTex, emissive: 0xfff2dd, emissiveIntensity: 1.6 }), scene);
  num.position.set((CX0 + CX1) / 2, CY + 0.25, CZ1 + 0.005);
  // Saçak altı spotları
  const dlMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xeaf2ff, emissiveIntensity: 10 });
  for (const z of [-12.6, -16, -19.4]) {
    for (const x of [-4.6, -2.9]) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), dlMat);
      d.rotation.x = Math.PI / 2; d.position.set(x, CY - 0.005, z); scene.add(d);
    }
  }
  for (const z of [-13.2, -18.8]) {
    const s = new THREE.SpotLight(0xe6efff, 25, 9, 0.9, 0.5, 2);
    s.position.set(-3.7, CY - 0.05, z); s.target.position.set(-3.7, 0, z);
    if (z === -13.2) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; }
    scene.add(s, s.target);
  }

  // Bina önündeki totem tabela
  const totemTex = textTexture((g, w, h) => {
    g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2ece2'; g.textAlign = 'center';
    g.font = '600 64px "Red Hat Display", sans-serif'; g.fillText('NORAMİN', w / 2, 170);
    g.font = '400 40px "Red Hat Display", sans-serif'; g.fillText('İŞ MERKEZİ', w / 2, 232);
    g.fillRect(w / 2 - 60, 290, 120, 3);
    g.font = '700 120px "Red Hat Display", sans-serif'; g.fillText('237', w / 2, 450);
    g.font = '400 30px "Red Hat Display", sans-serif'; g.globalAlpha = 0.7;
    ['A BLOK', 'B BLOK', 'C BLOK'].forEach((t, i) => g.fillText(t, w / 2, 600 + i * 56));
  }, 512, 1024);
  const totem = new THREE.Group(); totem.position.set(-3.75, WALK_Y, -9.4); scene.add(totem);
  box(0.95, 2.5, 0.32, graniteFor(1, 2.5), 0, 1.25, 0, totem);
  const tf = plane(0.78, 1.56, new THREE.MeshStandardMaterial({ map: totemTex, emissiveMap: totemTex, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.5 }), totem);
  tf.position.set(0, 1.35, 0.165);

  // --- Lobi cam cephesi + kapı
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x7f9aa0, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16,
    envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false,
  });
  world.glassMats = [glassMat];
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1f22, metalness: 0.8, roughness: 0.35 });
  const DH = 2.65, DW = 1.0;
  // Sabit cam paneller (kapı açıklığı hariç)
  const panes = [];
  for (let z = LOBBY.z1; z > LOBBY.z0 + 0.01; z -= 1.5) panes.push([z, z - 1.5]);
  panes.forEach(([za, zb]) => {
    const mid = (za + zb) / 2;
    const inDoor = za > DOOR_Z - DW - 0.01 && zb < DOOR_Z + DW + 0.01;
    if (!inDoor) {
      const g = plane(za - zb, LOBBY.h - WALK_Y, glassMat, scene);
      g.position.set(GLASS_X, (LOBBY.h + WALK_Y) / 2, mid); g.rotation.y = Math.PI / 2;
    }
    box(0.08, LOBBY.h - WALK_Y, 0.08, frameMat, GLASS_X, (LOBBY.h + WALK_Y) / 2, za, scene);
  });
  box(0.1, 0.1, LOBBY.z1 - LOBBY.z0, frameMat, GLASS_X, WALK_Y + 0.05, DOOR_Z, scene);
  // Kapı üstü vasistas + kasa
  const tr = plane(DW * 2, LOBBY.h - WALK_Y - DH, glassMat, scene);
  tr.position.set(GLASS_X, WALK_Y + DH + (LOBBY.h - WALK_Y - DH) / 2, DOOR_Z); tr.rotation.y = Math.PI / 2;
  box(0.12, 0.12, DW * 2 + 0.1, frameMat, GLASS_X, WALK_Y + DH, DOOR_Z, scene);
  box(0.12, DH, 0.1, frameMat, GLASS_X, WALK_Y + DH / 2, DOOR_Z + DW, scene);
  box(0.12, DH, 0.1, frameMat, GLASS_X, WALK_Y + DH / 2, DOOR_Z - DW, scene);
  // Kanatlar: menteşe noktasından döner, içeri (−x) açılır
  function leaf(hingeZ, dirZ) {
    const pivot = new THREE.Group();
    pivot.position.set(GLASS_X, WALK_Y, hingeZ);
    scene.add(pivot);
    const half = (DW - 0.04) / 2 * dirZ;
    const g = plane(DW - 0.1, DH - 0.12, glassMat, pivot);
    g.position.set(0, DH / 2, half); g.rotation.y = Math.PI / 2;
    box(0.05, DH - 0.04, 0.06, frameMat, 0, DH / 2, 0.03 * dirZ, pivot);
    box(0.05, DH - 0.04, 0.06, frameMat, 0, DH / 2, (DW - 0.07) * dirZ, pivot);
    box(0.05, 0.1, DW - 0.06, frameMat, 0, 0.06, half, pivot);
    box(0.05, 0.08, DW - 0.06, frameMat, 0, DH - 0.06, half, pivot);
    // Dikey kol (iki yüzde)
    const hMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.2 });
    for (const sx of [0.09, -0.09]) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 10), hMat);
      h.position.set(sx, 1.1, (DW - 0.18) * dirZ); h.castShadow = true; pivot.add(h);
    }
    world.doors.push({ pivot, dir: dirZ > 0 ? -1 : 1 });
    return pivot;
  }
  leaf(DOOR_Z - DW, 1);
  leaf(DOOR_Z + DW, -1);
  // Paspas
  const mat = plane(2.2, 1.4, new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 1 }), scene);
  mat.rotation.x = -Math.PI / 2; mat.position.set(GLASS_X - 1, WALK_Y + 0.004, DOOR_Z);

  // --- Lobi içi
  const L = LOBBY, LW = L.x1 - L.x0, LD = L.z1 - L.z0, LZ = (L.z0 + L.z1) / 2, LX = (L.x0 + L.x1) / 2;
  const marble = pbr('marble', LW / 2, LD / 2, { color: 0xe2ded8, roughness: 0.16, normalScale: 0.12 });
  marble.envMapIntensity = 0.8;
  world.lobbyFloor = marble;
  world.lobbyMats = [marble];
  const floor = plane(LW, LD, marble, scene);
  floor.rotation.x = -Math.PI / 2; floor.position.set(LX, WALK_Y + 0.002, LZ);
  const plaster = new THREE.MeshStandardMaterial({ color: 0x9c958b, roughness: 0.85 });
  const ceil = plane(LW, LD, plaster, scene);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(LX, L.h, LZ);
  // Yan duvarlar
  const wl = plane(LW, L.h, plaster, scene); wl.position.set(LX, L.h / 2, L.z1 - 0.01); wl.rotation.y = Math.PI;
  // Sağ duvar: asansör açıklıkları bırakılarak parça parça
  const ELEV = [-12.5, -15.5], EW = 1.2, EH = 2.3;
  {
    const cuts = [L.x0, ...ELEV.slice().sort((a, b) => a - b).flatMap((x) => [x - EW / 2, x + EW / 2]), L.x1];
    for (let i = 0; i < cuts.length; i += 2) {
      const w = cuts[i + 1] - cuts[i];
      const seg = plane(w, L.h, plaster, scene); seg.position.set((cuts[i] + cuts[i + 1]) / 2, L.h / 2, L.z0 + 0.01);
    }
    for (const x of ELEV) {
      const lintel = plane(EW, L.h - WALK_Y - EH, plaster, scene);
      lintel.position.set(x, WALK_Y + EH + (L.h - WALK_Y - EH) / 2, L.z0 + 0.01);
    }
  }
  // Arka duvar: ceviz panel
  const walnut = new THREE.MeshStandardMaterial({ color: 0x3b2a1f, roughness: 0.55 });
  world.lobbyMats.push(plaster, walnut);
  const back = plane(LD, L.h, walnut, scene); back.position.set(L.x0 + 0.01, L.h / 2, LZ); back.rotation.y = Math.PI / 2;
  // Panel derzleri
  for (let z = L.z0 + 1.2; z < L.z1; z += 1.2) box(0.02, L.h, 0.015, new THREE.MeshStandardMaterial({ color: 0x1a120c }), L.x0 + 0.02, L.h / 2, z, scene, { cast: false });
  // Tavan ışık panelleri
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff1de, emissiveIntensity: 1.3 });
  for (let x = L.x0 + 2; x < L.x1 - 0.8; x += 2.6) {
    for (let z = L.z0 + 2; z < L.z1 - 0.8; z += 2.7) {
      const p = plane(1.2, 0.3, panelMat, scene); p.rotation.x = Math.PI / 2; p.position.set(x, L.h - 0.01, z);
    }
  }
  for (const [x, z] of [[-9, -13], [-14.5, -18.5], [-15, -13]]) {
    const pl = new THREE.PointLight(0xffe4c4, 9, 14, 2);
    pl.position.set(x, L.h - 0.35, z); scene.add(pl);
  }
  // Danışma bankosu
  const deskTop = new THREE.MeshStandardMaterial({ color: 0xf1ede7, roughness: 0.25 });
  world.lobbyMats.push(deskTop);
  box(3.4, 1.05, 0.8, walnut, -12, WALK_Y + 0.525, -11.4, scene);
  box(3.5, 0.05, 0.9, deskTop, -12, WALK_Y + 1.08, -11.4, scene);
  const strip = plane(3.3, 0.03, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff0dc, emissiveIntensity: 6 }), scene);
  strip.position.set(-12, WALK_Y + 0.12, -11.81); strip.rotation.y = Math.PI;
  // Asansörler (sağ duvar)
  const steelDoor = new THREE.MeshStandardMaterial({ color: 0xb4b9bf, metalness: 0.75, roughness: 0.32 });
  world.lobbyMats.push(steelDoor);
  // Asansör: iki kanatlı sürgülü kapı + kabin (yalnızca ilki çalışıyor)
  world.elevators = [];
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xa9adb2, metalness: 0.55, roughness: 0.4 });
  world.lobbyMats.push(cabinMat);
  for (const x of ELEV) {
    const panels = [-1, 1].map((side) => {
      const pnl = box(EW / 2, EH, 0.04, steelDoor, x + side * EW / 4, WALK_Y + EH / 2, L.z0 - 0.03, scene, { cast: false });
      pnl.userData.home = pnl.position.x; pnl.userData.side = side;
      return pnl;
    });
    box(EW + 0.2, 0.1, 0.06, frameMat, x, WALK_Y + EH + 0.05, L.z0 + 0.03, scene, { cast: false });
    for (const sx of [-1, 1]) box(0.08, EH, 0.06, frameMat, x + sx * (EW / 2 + 0.04), WALK_Y + EH / 2, L.z0 + 0.03, scene, { cast: false });
    const ind = plane(0.25, 0.06, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb070, emissiveIntensity: 4 }), scene);
    ind.position.set(x, WALK_Y + 2.55, L.z0 + 0.03);
    // Kabin içi
    const CD = 2.2, CW = 1.7, CH = 2.5, cz = L.z0 - 0.06 - CD / 2;
    const fl = plane(CW, CD, new THREE.MeshStandardMaterial({ color: 0x1d1e20, roughness: 0.4 }), scene);
    fl.rotation.x = -Math.PI / 2; fl.position.set(x, WALK_Y + 0.003, cz);
    const ce = plane(CW, CD, cabinMat, scene); ce.rotation.x = Math.PI / 2; ce.position.set(x, WALK_Y + CH, cz);
    const lp = plane(CW - 0.4, CD - 0.5, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff4e6, emissiveIntensity: 1.6 }), scene);
    lp.rotation.x = Math.PI / 2; lp.position.set(x, WALK_Y + CH - 0.01, cz);
    const bk = plane(CW, CH, cabinMat, scene); bk.position.set(x, WALK_Y + CH / 2, cz - CD / 2);
    const s1 = plane(CD, CH, cabinMat, scene); s1.rotation.y = Math.PI / 2; s1.position.set(x - CW / 2, WALK_Y + CH / 2, cz);
    const s2 = plane(CD, CH, cabinMat, scene); s2.rotation.y = -Math.PI / 2; s2.position.set(x + CW / 2, WALK_Y + CH / 2, cz);
    const front = plane(CW, CH, cabinMat, scene); front.rotation.y = Math.PI; front.position.set(x, WALK_Y + CH / 2, L.z0 - 0.05);
    front.visible = false; // kapı açıklığı (kapılar zaten kapatıyor)
    const cl = new THREE.PointLight(0xfff0e0, 6, 5, 2); cl.position.set(x, WALK_Y + CH - 0.3, cz); scene.add(cl);
    // Kat paneli
    const btn = plane(0.18, 0.5, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x6fd8e0, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 }), scene);
    btn.rotation.y = -Math.PI / 2; btn.position.set(x + CW / 2 - 0.01, WALK_Y + 1.2, L.z0 - 0.5);
    world.elevators.push({ x, panels, open: 0 });
  }
  // Resepsiyonist (bankonun arkasında)
  const rec = createPerson({ female: true, hairStyle: 'bun', hair: 0x2b1b12, top: 0x1d2a3a, skin: 0xd9ab8c, height: 1.67, name: 'receptionist' });
  rec.root.position.set(-12, WALK_Y, -10.55); rec.root.rotation.y = Math.PI;
  scene.add(rec.root);
  world.receptionist = rec;
  const recLight = new THREE.SpotLight(0xffe6cc, 18, 6, 0.6, 0.6, 2);
  recLight.position.set(-12, L.h - 0.1, -12.6); recLight.target.position.set(-12, WALK_Y + 1.4, -10.6);
  scene.add(recLight, recLight.target);
  // Saksı bitkileri
  const potMat = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.6 });
  for (const [x, z] of [[-7, -10.8], [-7, -21.2], [-18.3, -10.8], [-18.3, -21.2]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.7, 20), potMat);
    pot.position.set(x, WALK_Y + 0.35, z); pot.castShadow = true; scene.add(pot);
    for (let i = 0; i < 4; i++) {
      const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshStandardMaterial({ color: 0x2f4a26, roughness: 0.8, flatShading: true }));
      lf.position.set(x + (Math.random() - 0.5) * 0.4, WALK_Y + 1.0 + i * 0.28, z + (Math.random() - 0.5) * 0.4);
      lf.scale.set(1, 1.3, 1); scene.add(lf);
    }
  }
  // Arka duvarda arkadan aydınlatmalı loodos logosu + kat bilgisi
  const logoMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1.7, transparent: true, alphaTest: 0.05 });
  const logo = plane(3.4, 3.4 * 0.32, logoMat, scene);
  logo.position.set(L.x0 + 0.04, 2.55, DOOR_Z); logo.rotation.y = Math.PI / 2;
  fetch('assets/loodos-logo.svg').then((r) => r.text()).then((svg) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 1600; c.height = 512;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      logoMat.emissiveMap = t; logoMat.alphaMap = t; logoMat.map = t; logoMat.needsUpdate = true;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/currentColor/g, '#1AB0BA'));
  });
  const floorTex = textTexture((g, w, h) => {
    g.fillStyle = '#e8e2d8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '500 54px "Red Hat Display", sans-serif'; g.letterSpacing = '22px';
    g.fillText('B BLOK  ·  KAT 5', w / 2, h / 2);
  }, 1024, 128);
  const floorSign = plane(2.2, 0.275, new THREE.MeshStandardMaterial({ map: floorTex, transparent: true, emissiveMap: floorTex, emissive: 0xffffff, emissiveIntensity: 0.6 }), scene);
  floorSign.position.set(L.x0 + 0.04, 1.75, DOOR_Z); floorSign.rotation.y = Math.PI / 2;
  // Logonun duvara yansıyan ışığı
  const wash = new THREE.PointLight(0x1ab0ba, 6, 5, 2);
  wash.position.set(L.x0 + 0.8, 2.55, DOOR_Z); scene.add(wash);
  // Lobi doldurucu kütle (arka)
  box(NX0 * -1 + L.x0, GF, LD, granite, (L.x0 + NX0) / 2, GF / 2, LZ, scene, { cast: false });

  // --- Komşu binalar (bizim taraf)
  const concrete = (w, h) => pbr('concrete', w / 3, h / 3, { color: 0x7d7973, roughness: 0.95 });
  // Kuzey komşu: 4 kat, zeminde kepenkli dükkân
  const NBZ0 = 22, NBZ1 = NZ0, NBH = 14;
  box(FACADE_X - NX0, NBH, NBZ0 - NBZ1, concrete(NBZ0 - NBZ1, NBH), (FACADE_X + NX0) / 2, NBH / 2, (NBZ0 + NBZ1) / 2, scene);
  const nbWin = windowMat(1, (NBZ0 - NBZ1) / 1.6 / 8, 3 / 20, { glow: 1.2 });
  const nbw = plane(NBZ0 - NBZ1 - 1, NBH - 4.6, nbWin, scene);
  nbw.position.set(FACADE_X + 0.01, 4.6 + (NBH - 4.6) / 2, (NBZ0 + NBZ1) / 2); nbw.rotation.y = Math.PI / 2;
  const shutterTex = textTexture((g, w, h) => {
    g.fillStyle = '#5d6064'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) { g.fillStyle = '#3b3e42'; g.fillRect(0, y, w, 3); g.fillStyle = '#80848a'; g.fillRect(0, y + 4, w, 1); }
  }, 256, 512);
  shutterTex.wrapS = shutterTex.wrapT = THREE.RepeatWrapping;
  for (const z of [16, 8, 0.5]) {
    const sh = plane(5, 3, new THREE.MeshStandardMaterial({ map: shutterTex, metalness: 0.6, roughness: 0.5 }), scene);
    sh.position.set(FACADE_X + 0.02, WALK_Y + 1.5, z); sh.rotation.y = Math.PI / 2;
    const tabela = plane(5, 0.7, new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.6 }), scene);
    tabela.position.set(FACADE_X + 0.03, WALK_Y + 3.4, z); tabela.rotation.y = Math.PI / 2;
  }
  // Güney komşu ve kuzeydeki cam kule
  function tower(x0, x1, z0, z1, h, variant, glow = 1.3) {
    const w = Math.max(x1 - x0, z0 - z1);
    const m = windowMat(variant, w / 1.6 / 10, h / 3.6 / 20, { glow });
    const t = box(x1 - x0, h, z0 - z1, m, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, scene, { cast: false, receive: false });
    world.glassMats.push(m);
    return t;
  }
  tower(NX0, FACADE_X, NZ1 - 1.5, -72, 38, 2);
  tower(NX0, FACADE_X - 2, 70, NBZ0 + 1.5, 48, 1);

  // --- Karşı taraf ve Maslak silüeti
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let z = 70; z > -170; z -= 26 + rnd() * 10) {
    const h = 18 + rnd() * 50, d = 16 + rnd() * 10;
    const t = tower(32, 32 + d, z, z - (18 + rnd() * 6), h, (rnd() * 3) | 0, 1.1);
    void t;
  }
  for (let i = 0; i < 26; i++) {
    const x = 70 + rnd() * 220, z = 120 - rnd() * 420, h = 60 + rnd() * 170, w = 24 + rnd() * 26;
    tower(x, x + w, z, z - w, h, i % 3, 0.9);
    if (h > 140) {
      const red = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
      red.position.set(x + w / 2, h + 1, z - w / 2); scene.add(red);
      world.blinkers.push(red);
    }
  }
  for (let i = 0; i < 18; i++) { // arka sıra, sol taraf (binaların üstünden görünür)
    const x = -40 - rnd() * 200, z = 100 - rnd() * 360, h = 40 + rnd() * 120, w = 22 + rnd() * 20;
    tower(x - w, x, z, z - w, h, i % 3, 0.8);
  }

  // --- Arabalar (yakın şeritler bize doğru gelir, uzak şeritler uzaklaşır)
  const glare = textTexture((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const rg = g.createLinearGradient(0, 0, w, 0);
    rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.5, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }, 64, 256);
  const bodyColors = [0x1b1d20, 0xd9d6cf, 0x2a2e35, 0xe0b100, 0x5a0f12, 0x3b3f44, 0xe0b100];
  const lanes = [[2.2, 1], [6.2, 1], [10.2, 1], [15.8, -1], [19.8, -1], [23.6, -1]];
  for (let i = 0; i < 9; i++) {
    const [lx, dir] = lanes[i % lanes.length];
    const car = new THREE.Group();
    const color = bodyColors[i % bodyColors.length];
    const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.85, 0.72, 4.5, 3, 0.18), paint);
    body.position.y = 0.62; body.castShadow = true; car.add(body);
    const cab = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.6, 2.4, 3, 0.2), new THREE.MeshStandardMaterial({ color: 0x07090b, metalness: 0.9, roughness: 0.08 }));
    cab.position.set(0, 1.22, -0.25); car.add(cab);
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18); wheelGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.86, 1.45], [0.86, 1.45], [-0.86, -1.45], [0.86, -1.45]]) {
      const w = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.8 }));
      w.position.set(wx, 0.34, wz); car.add(w);
    }
    const head = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff6e8, emissiveIntensity: 2.5 });
    const tail = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff1a10, emissiveIntensity: 1.2 });
    for (const sx of [-0.66, 0.66]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.04), head); h.position.set(sx, 0.75, 2.26); car.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.04), tail); t.position.set(sx, 0.82, -2.26); car.add(t);
    }
    if (color === 0xe0b100) { // taksi lambası
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffe066, emissiveIntensity: 3 }));
      sign.position.set(0, 1.6, -0.2); car.add(sign);
    }
    // Islak yolda far yansıması
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 14), new THREE.MeshBasicMaterial({ map: glare, color: 0xffe9cc, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
    gl.rotation.x = -Math.PI / 2; gl.position.set(0, 0.02, 9.5); car.add(gl);
    const tgl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 6), new THREE.MeshBasicMaterial({ map: glare, color: 0xff3020, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
    tgl.rotation.x = -Math.PI / 2; tgl.rotation.z = Math.PI; tgl.position.set(0, 0.02, -5); car.add(tgl);
    car.rotation.y = dir > 0 ? 0 : Math.PI;
    car.position.set(lx, 0, -150 + ((i * 53) % 240));
    scene.add(car);
    world.cars.push({ obj: car, dir, speed: 11 + rnd() * 6, audio: null });
  }

  return world;
}

export function updateWorld(world, t, dt) {
  world.wetMats.forEach((m) => { m.userData.uniforms.uTime.value = t; });
  world.cars.forEach((c) => {
    c.obj.position.z += c.dir * c.speed * dt;
    if (c.dir > 0 && c.obj.position.z > 90) c.obj.position.z = -160;
    if (c.dir < 0 && c.obj.position.z < -160) c.obj.position.z = 90;
    if (c.audio) {
      const p = c.obj.position;
      if (c.audio.positionX) { c.audio.positionX.value = p.x; c.audio.positionY.value = 0.6; c.audio.positionZ.value = p.z; } else c.audio.setPosition(p.x, 0.6, p.z);
    }
  });
  world.elevators.forEach((e) => e.panels.forEach((p) => { p.position.x = p.userData.home + p.userData.side * e.open * 0.59; }));
  const on = Math.sin(t * 3) > 0.6;
  world.blinkers.forEach((b) => { b.visible = on; });
}
