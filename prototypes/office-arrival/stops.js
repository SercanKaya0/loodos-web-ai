// Uygulama durakları için mekânlar. Hepsi sokaktan bağımsız, kapalı hacimler (y = -60 düzleminde, x boyunca dizili).
// Kural: konuşmacı yerel (0,0,0)'da +z'ye bakar; kamera +z tarafından yaklaşır. Arka plan (−z) mekânın vitrini.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const Y = -60;
const loader = new THREE.TextureLoader();
const F = (w, s) => `${w} ${s}px Montserrat, "Red Hat Display", sans-serif`;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function pbrTex(name, file, rx, ry, srgb) {
  const t = loader.load(`assets/materials/${name}/${file}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function imgTex(src) { const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// Yazılı tabela dokusu
function signTex(text, { bg = '#fff', fg = '#111', w = 1024, h = 256, size = 120, weight = 700, sub = '', subSize = 40, align = 'center' } = {}) {
  return canvasTex(w, h, (c) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); } else c.clearRect(0, 0, w, h);
    c.fillStyle = fg; c.textBaseline = 'middle'; c.textAlign = align;
    c.font = F(weight, size);
    const x = align === 'center' ? w / 2 : 40;
    c.fillText(text, x, sub ? h * 0.42 : h / 2);
    if (sub) { c.globalAlpha = 0.75; c.font = F(500, subSize); c.fillText(sub, x, h * 0.78); c.globalAlpha = 1; }
  });
}

function kit(g, envMats) {
  const add = (m, x, y, z, { cast = true, recv = true } = {}) => { m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; g.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, o) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, o);
  const rbox = (w, h, d, r, mat, x, y, z, o) => add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat), x, y, z, o);
  const cyl = (rt, rb, h, mat, x, y, z, seg = 20, o) => add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z, o);
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0) => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), x, y, z, { cast: false }); m.rotation.set(rx, ry, 0); return m; };
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); envMats.push(m); return m; };
  const glow = (map, k = 0.6) => new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, roughness: 0.5 });
  // Oda kabuğu: zemin, tavan, 4 duvar (genişlik W, derinlik D, yükseklik H; merkez z = zc)
  const shell = (W, D, H, floorM, wallM, ceilM, zc = 0) => {
    plane(W, D, floorM, 0, 0.001, zc, 0, -Math.PI / 2).receiveShadow = true;
    plane(W, D, ceilM, 0, H, zc, 0, Math.PI / 2);
    plane(D, H, wallM, -W / 2, H / 2, zc, Math.PI / 2);
    plane(D, H, wallM, W / 2, H / 2, zc, -Math.PI / 2);
    plane(W, H, wallM, 0, H / 2, zc - D / 2, 0);
    plane(W, H, wallM, 0, H / 2, zc + D / 2, Math.PI);
  };
  return { add, box, rbox, cyl, plane, std, glow, shell };
}

// Ürün dizisi (raf üstünde rastgele renkli kutular), InstancedMesh
function products(g, { x0, x1, z, y, depth = 0.32, face = 1, palette, fill = 0.93, alongX = true, h = [0.12, 0.3] }) {
  const n = Math.floor(Math.abs(x1 - x0) / 0.11);
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const mesh = new THREE.InstancedMesh(geo, mat, n * 2);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  let k = 0, run = 0, runCol = palette[0], runH = 0.2, runW = 0.1;
  for (let i = 0; i < n; i++) {
    if (run <= 0) { run = 2 + Math.floor(rnd() * 6); runCol = palette[Math.floor(rnd() * palette.length)]; runH = h[0] + rnd() * (h[1] - h[0]); runW = 0.07 + rnd() * 0.05; }
    run--;
    if (rnd() > fill) continue;
    for (let r = 0; r < 2; r++) {
      const p = x0 + (i + 0.5) * (x1 - x0) / n;
      const q = z + face * (r === 0 ? depth * 0.25 : -depth * 0.2);
      if (alongX) m4.makeScale(runW, runH, 0.12).setPosition(p, y, q); else m4.makeScale(0.12, runH, runW).setPosition(q, y, p);
      mesh.setMatrixAt(k, m4);
      col.set(runCol).offsetHSL(0, 0, (rnd() - 0.5) * 0.08); mesh.setColorAt(k, col);
      k++;
    }
  }
  mesh.count = k; mesh.castShadow = false; mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
const GROCERY = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#f4f1ea', '#6d4c41', '#00acc1', '#c62828', '#ffb300', '#283593'];

// Raf ünitesi (gondol) z ekseni boyunca
function gondola(k, g, x, z0, z1, { h = 1.8, levels = 5, both = true, palette = GROCERY, fill = 0.93, metal }) {
  const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
  k.box(0.08, h, len, metal, x, h / 2, zc);
  k.box(0.9, 0.1, len, metal, x, 0.05, zc);
  for (let i = 0; i < levels; i++) {
    const y = 0.12 + i * (h - 0.3) / (levels - 1);
    for (const s of both ? [-1, 1] : [1]) {
      k.box(0.42, 0.02, len, metal, x + s * 0.24, y, zc, { cast: false });
      products(g, { x0: z0 + 0.05, x1: z1 - 0.05, z: x + s * 0.26, y: y + 0.01, face: s, palette, fill, alongX: false });
    }
  }
}

// Basit araba (otopark)
function car(color) {
  const c = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.85, 0.72, 4.5, 3, 0.18), paint); body.position.y = 0.62; c.add(body);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.6, 2.4, 3, 0.2), new THREE.MeshStandardMaterial({ color: 0x07090b, metalness: 0.9, roughness: 0.1 }));
  cab.position.set(0, 1.22, -0.25); c.add(cab);
  const wg = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18); wg.rotateZ(Math.PI / 2);
  const wm = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.8 });
  for (const [wx, wz] of [[-0.86, 1.45], [0.86, 1.45], [-0.86, -1.45], [0.86, -1.45]]) { const w = new THREE.Mesh(wg, wm); w.position.set(wx, 0.34, wz); c.add(w); }
  const head = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff6e8, emissiveIntensity: 0.4 });
  for (const sx of [-0.66, 0.66]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.04), head); h.position.set(sx, 0.75, 2.26); c.add(h); }
  c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return c;
}

// E-scooter (BRIFIC tarzı: koyu gövde, mavi kaplama)
export function createScooter() {
  const s = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x16181c, metalness: 0.4, roughness: 0.45 });
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x1f46d6, metalness: 0.3, roughness: 0.35, clearcoat: 1 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.85 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.3 });
  const deck = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.07, 0.95, 3, 0.03), dark); deck.position.set(0, 0.14, 0); s.add(deck);
  const cover = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.035, 0.6, 3, 0.015), blue); cover.position.set(0, 0.19, -0.05); s.add(cover);
  for (const z of [0.52, -0.52]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.045, 12, 28), tyre); t.rotation.y = Math.PI / 2; t.position.set(0, 0.155, z); s.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 18), rim); r.rotation.z = Math.PI / 2; r.position.set(0, 0.155, z); s.add(r);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.05, 12), dark); stem.position.set(0, 0.68, 0.5); stem.rotation.x = -0.18; s.add(stem);
  const fork = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.35, 0.08, 2, 0.02), blue); fork.position.set(0, 0.32, 0.53); fork.rotation.x = -0.18; s.add(fork);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 10), dark); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.19, 0.6); s.add(bar);
  for (const x of [-0.25, 0.25]) { const gp = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.12, 10), tyre); gp.rotation.z = Math.PI / 2; gp.position.set(x, 1.19, 0.6); s.add(gp); }
  const disp = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.02, 0.07, 2, 0.008), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x7fd8ff, emissiveIntensity: 1.2 }));
  disp.position.set(0, 1.21, 0.58); disp.rotation.x = -0.4; s.add(disp);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 14), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 2 }));
  lamp.rotation.x = Math.PI / 2 - 0.18; lamp.position.set(0, 1.05, 0.58); s.add(lamp);
  s.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return s;
}

// Pencere dışı görünüm (gündüz şehir)
function cityView(w = 1024, h = 512, { horizon = 0.62, tarmac = false } = {}) {
  return canvasTex(w, h, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, h * horizon);
    gr.addColorStop(0, '#9fb8cf'); gr.addColorStop(1, '#e4ebf0');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(rnd() * w, rnd() * h * 0.35, 60 + rnd() * 120, 14 + rnd() * 18, 0, 0, Math.PI * 2); c.fill(); }
    if (tarmac) {
      c.fillStyle = '#8b939b'; for (let i = 0; i < 14; i++) { const bw = 30 + rnd() * 70, bh = 10 + rnd() * 40; c.fillRect(rnd() * w, h * horizon - bh, bw, bh); }
      const tg = c.createLinearGradient(0, h * horizon, 0, h); tg.addColorStop(0, '#9aa0a5'); tg.addColorStop(1, '#5d6266');
      c.fillStyle = tg; c.fillRect(0, h * horizon, w, h);
      c.strokeStyle = '#e8c33a'; c.lineWidth = 4; c.setLineDash([40, 30]);
      c.beginPath(); c.moveTo(0, h * 0.86); c.lineTo(w, h * 0.8); c.stroke(); c.setLineDash([]);
    } else {
      for (let i = 0; i < 26; i++) {
        const bw = 40 + rnd() * 90, bh = 60 + rnd() * h * 0.45, x = rnd() * w;
        const v = 120 + rnd() * 60; c.fillStyle = `rgb(${v},${v + 6},${v + 14})`;
        c.fillRect(x, h * horizon - bh, bw, bh);
        c.fillStyle = 'rgba(255,255,255,.25)';
        for (let yy = h * horizon - bh + 8; yy < h * horizon - 6; yy += 12) c.fillRect(x + 4, yy, bw - 8, 3);
      }
      c.fillStyle = '#7f8a80'; c.fillRect(0, h * horizon, w, h);
      c.fillStyle = '#5f7a55'; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(rnd() * w, h * horizon + rnd() * 30, 10 + rnd() * 18, 0, Math.PI * 2); c.fill(); }
    }
  });
}

// Sabit tanıtım panosu (loodos.com tanıtım görseli)
function poster(k, src, w, h, x, y, z, ry = 0, frameM) {
  const t = imgTex(src);
  if (frameM) k.box(w + 0.08, h + 0.08, 0.04, frameM, x - Math.sin(ry) * 0.03, y, z - Math.cos(ry) * 0.03, { cast: false }).rotation.y = ry;
  return k.plane(w, h, k.glow(t, 0.45), x, y, z, ry);
}

/* ======================= Mekânlar ======================= */

function buildCafe(g, k) {
  const W = 8, D = 10, H = 3.2;
  const floorTex = canvasTex(1024, 1024, (c, w, h) => {
    for (let i = 0; i < 16; i++) { const v = 120 + rnd() * 30; c.fillStyle = `rgb(${v + 40},${v + 10},${v - 30})`; c.fillRect(0, i * 64, w, 62); }
    c.globalAlpha = 0.08; for (let i = 0; i < 400; i++) { c.fillStyle = '#000'; c.fillRect(rnd() * w, rnd() * h, 80 + rnd() * 200, 1); } c.globalAlpha = 1;
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(2, 3);
  const floorM = k.std({ map: floorTex, roughness: 0.5 });
  const wall = k.std({ color: 0xf1eee9, roughness: 0.9 });
  const ceil = k.std({ color: 0xe9e6e0, roughness: 0.9 });
  k.shell(W, D, H, floorM, wall, ceil, -1);
  const purple = k.std({ color: 0x4a3aff, roughness: 0.5 });
  const white = k.std({ color: 0xffffff, roughness: 0.35 });
  const black = k.std({ color: 0x18181b, roughness: 0.5 });
  const oak = k.std({ color: 0xc8a57a, roughness: 0.55 });
  // Arka duvar: mor vurgu + ışıklı "frink" yazısı
  k.box(W, H, 0.05, purple, 0, H / 2, -5.97, { cast: false });
  k.plane(2.6, 0.65, k.glow(signTex('frink', { bg: null, fg: '#ffffff', size: 190, w: 1024, h: 256 }), 1.2), -1.1, 2.35, -5.92).material.transparent = true;
  k.plane(2.6, 0.32, k.glow(signTex('Frink Point', { bg: null, fg: '#d9d4ff', size: 70, w: 1024, h: 128, weight: 500 }), 0.8), -1.1, 1.85, -5.92).material.transparent = true;
  // Tezgâh
  k.rbox(4.2, 1.0, 0.7, 0.03, white, -0.6, 0.5, -3.6);
  k.box(4.3, 0.04, 0.8, oak, -0.6, 1.02, -3.6);
  const mach = k.rbox(0.7, 0.5, 0.5, 0.05, k.std({ color: 0xd9dcdf, metalness: 1, roughness: 0.2 }), -1.6, 1.29, -3.75);
  void mach;
  for (let i = 0; i < 5; i++) k.cyl(0.04, 0.032, 0.11, white, 0.2 + i * 0.16, 1.1, -3.5, 16);
  // Menü ekranları
  const menu = signTex('Instant Pickup', { bg: '#14121f', fg: '#fff', size: 64, sub: 'Latte · Americano · Filter · Cappuccino', subSize: 30, w: 1024, h: 384 });
  k.plane(1.5, 0.56, k.glow(menu, 0.6), 1.9, 2.3, -5.92);
  // Tanıtım panosu (yan duvar)
  poster(k, 'assets/apps/hero_frink.jpg', 2.4, 1.2, 3.97, 1.7, -2.5, -Math.PI / 2, black);
  // Masalar + sandalyeler (oturan müşteriler için)
  const seats = [];
  for (const [x, z] of [[-2.6, -0.6], [2.6, 0.8]]) {
    k.cyl(0.4, 0.4, 0.03, oak, x, 0.74, z, 32);
    k.cyl(0.03, 0.03, 0.72, black, x, 0.37, z, 10);
    const side = x < 0 ? 1 : -1;
    // sandalye (oturan kişi masaya bakar)
    k.box(0.42, 0.04, 0.42, black, x - side * 0.62, 0.46, z);
    k.box(0.04, 0.45, 0.42, black, x - side * 0.84, 0.7, z);
    seats.push([x - side * 0.62, z, side > 0 ? Math.PI / 2 : -Math.PI / 2]);
    k.cyl(0.045, 0.035, 0.1, white, x + side * 0.1, 0.8, z, 14);
  }
  // Işıklar
  const lights = [];
  const pend = k.std({ color: 0x111111, metalness: 0.5, roughness: 0.4 });
  for (const [x, z] of [[-1.6, -3.4], [0.4, -3.4], [-2.6, -0.6], [2.6, 0.8]]) {
    k.cyl(0.005, 0.005, 0.9, pend, x, H - 0.45, z, 6, { cast: false });
    k.cyl(0.12, 0.2, 0.18, pend, x, H - 0.98, z, 20, { cast: false });
    const l = new THREE.SpotLight(0xffe0b8, 12, 5, 1.0, 0.6, 2); l.position.set(x, H - 1.05, z); l.target.position.set(x, 0, z);
    g.add(l, l.target); lights.push(l);
  }
  const key = new THREE.SpotLight(0xfff4e6, 22, 12, 0.9, 0.8, 1.5); key.position.set(1.5, H - 0.1, 3); key.target.position.set(0, 1, -1); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); g.add(key, key.target); lights.push(key);
  const fill = new THREE.HemisphereLight(0xfff6ee, 0x6a5a50, 0.6); g.add(fill); lights.push(fill);
  return { lights, seats: seats.map((s) => ({ p: s })), anchors: { frink: { p: [0.2, -1.9], cam: [[0.4, 3.6], [0.3, -0.1]] } } };
}

function buildMarket(g, k, { brand = 'A101', color = '#00a8c6', aisle = false } = {}) {
  const W = 10, D = 16, H = 3.6;
  const tile = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#d9d9d6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 222 + rnd() * 14; c.fillStyle = `rgb(${v},${v},${v - 2})`; c.fillRect(i * 256 + 2, j * 256 + 2, 252, 252); }
  });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(W / 1.2, D / 1.2);
  const floorM = k.std({ map: tile, roughness: 0.25, metalness: 0.0 });
  const wall = k.std({ color: 0xf4f4f2, roughness: 0.9 });
  const ceil = k.std({ color: 0xeeeeec, roughness: 0.9 });
  k.shell(W, D, H, floorM, wall, ceil, -3);
  const metal = k.std({ color: 0xe8e8e6, metalness: 0.3, roughness: 0.45 });
  const brandM = k.std({ color, roughness: 0.5 });
  // Marka kuşağı
  k.box(W, 0.6, 0.05, brandM, 0, H - 0.5, -10.97, { cast: false });
  k.box(0.05, 0.6, D, brandM, -4.97, H - 0.5, -3, { cast: false });
  k.box(0.05, 0.6, D, brandM, 4.97, H - 0.5, -3, { cast: false });
  const lights = [];
  const anchors = {};
  if (!aisle) {
    k.plane(3, 0.75, k.glow(signTex(brand, { bg: color, fg: '#fff', size: 170, w: 1024, h: 256 }), 0.9), 0, H - 0.5, -10.93);
    // Raflar: iki gondol sırası (sol/sağ), ortada geniş koridor
    for (const x of [-3.3, -1.9, 1.9, 3.3]) gondola(k, g, x, -9, -2.2, { metal, both: Math.abs(x) < 3, h: 1.7 });
    // Kasa + kasiyer
    k.rbox(0.7, 0.9, 2.0, 0.02, k.std({ color: 0x2b2f36, roughness: 0.5 }), -3.6, 0.45, 1.6);
    k.box(0.7, 0.03, 2.0, k.std({ color: 0x111111, roughness: 0.3 }), -3.6, 0.92, 1.6);
    poster(k, 'assets/apps/hero_a101.jpg', 3.2, 1.6, 2.5, 1.65, 2.9, -Math.PI, null);
    anchors.a101 = { p: [0, -1.0], cam: [[0.6, 4.5], [0.4, 0.8]], clerk: [-4.1, 1.6, Math.PI / 2] };
  } else {
    // Dar reyon: iki tarafta dolu raflar, bazı boşluklar (raf kontrolü)
    const hang = signTex('ATIŞTIRMALIK', { bg: '#3a2d6e', fg: '#fff', size: 90, w: 1024, h: 200 });
    for (const x of [-1.25, 1.25]) gondola(k, g, x, -10, 3.2, { metal, both: true, h: 1.9, levels: 6, fill: 0.85 });
    for (const x of [-3.9, 3.9]) gondola(k, g, x, -10, 3.2, { metal, both: false, h: 1.9, levels: 6 });
    const s = k.plane(1.6, 0.31, k.glow(hang, 0.8), 0, 2.75, -2.5); s.material.side = THREE.DoubleSide;
    k.cyl(0.005, 0.005, 0.7, metal, -0.6, H - 0.35, -2.5, 6, { cast: false });
    k.cyl(0.005, 0.005, 0.7, metal, 0.6, H - 0.35, -2.5, 6, { cast: false });
    poster(k, 'assets/apps/hero_igoya.jpg', 4, 2, 0, 1.6, -10.93, 0, null);
    anchors.igoya = { p: [0, -1.2], cam: [[0.15, 4.4], [0.1, 0.6]] };
  }
  // Tavan panel ışıkları
  const panelM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 });
  for (let z = -9; z <= 3; z += 3) for (const x of [-2.5, 0, 2.5]) k.box(1.2, 0.03, 0.3, panelM, x, H - 0.02, z, { cast: false });
  for (const z of [-7, -1.5, 3]) {
    const l = new THREE.PointLight(0xf4f8ff, 6, 9, 1.6); l.position.set(0, H - 0.3, z); g.add(l); lights.push(l);
  }
  const key = new THREE.SpotLight(0xffffff, 12, 12, 0.9, 0.8, 1.5); key.position.set(1.2, H - 0.1, 3.5); key.target.position.set(0, 1, -1.2); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); g.add(key, key.target); lights.push(key);
  const fill = new THREE.HemisphereLight(0xffffff, 0x8a8a88, 0.45); g.add(fill); lights.push(fill);
  return { lights, seats: [], anchors };
}

function buildFashion(g, k, { createPerson }) {
  const W = 10, D = 14, H = 3.6;
  const wood = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#8a6a4a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let j = -1; j < 4; j++) { const v = 150 + rnd() * 30; c.fillStyle = `rgb(${v + 30},${v + 12},${v - 15})`; c.fillRect(j * 256 + (i % 2) * 128, i * 128, 254, 126); }
  });
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(3, 4);
  k.shell(W, D, H, k.std({ map: wood, roughness: 0.45 }), k.std({ color: 0xf7f7f5, roughness: 0.9 }), k.std({ color: 0xf2f2f0, roughness: 0.9 }), -2);
  const blue = k.std({ color: 0x0342a7, roughness: 0.5 });
  const chrome = k.std({ color: 0xcfd3d8, metalness: 1, roughness: 0.2 });
  const white = k.std({ color: 0xffffff, roughness: 0.4 });
  // Arka duvar: mavi + KazanıYORUM görseli
  k.box(W, H, 0.05, blue, 0, H / 2, -8.97, { cast: false });
  poster(k, 'assets/apps/hero_kazaniyorum.jpg', 4.4, 2.2, 0, 1.75, -8.92, 0, null);
  // Askılıklar: kıyafetler (ince kutular)
  const clothCols = [0x1c2a44, 0xe8e2d6, 0x8a1c2b, 0x2f5d8a, 0x4b4f2a, 0xd6b38c, 0x111111, 0xf0f0f0, 0x9fb7d9];
  const rack = (x, z, len, ry) => {
    const r = new THREE.Group(); r.position.set(x, 0, z); r.rotation.y = ry; g.add(r);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 8), chrome); bar.rotation.z = Math.PI / 2; bar.position.y = 1.45; r.add(bar);
    for (const sx of [-len / 2, len / 2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.45, 8), chrome); p.position.set(sx, 0.725, 0); r.add(p); }
    const n = Math.floor(len / 0.07);
    const run = clothCols[Math.floor(rnd() * clothCols.length)];
    for (let i = 0; i < n; i++) {
      const c = rnd() < 0.7 ? run : clothCols[Math.floor(rnd() * clothCols.length)];
      const cl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75 + rnd() * 0.15, 0.5), new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
      cl.position.set(-len / 2 + 0.1 + i * 0.07, 1.05, 0); cl.rotation.y = (rnd() - 0.5) * 0.1; cl.castShadow = true; r.add(cl);
    }
  };
  rack(-3.6, -5, 2.4, Math.PI / 2); rack(-3.6, -1.5, 2.4, Math.PI / 2); rack(3.6, -5, 2.4, Math.PI / 2); rack(3.6, -1.5, 2.4, Math.PI / 2);
  rack(-1.8, -6.6, 2, 0); rack(1.8, -6.6, 2, 0);
  // Katlanmış ürün masası
  k.rbox(1.6, 0.8, 0.9, 0.02, white, 2.2, 0.4, 0.8);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) k.box(0.32, 0.04 + rnd() * 0.02, 0.26, new THREE.MeshStandardMaterial({ color: clothCols[(i + j) % clothCols.length], roughness: 0.95 }), 1.65 + i * 0.22, 0.83 + j * 0.045, 0.8 + ((i % 2) - 0.5) * 0.3);
  // Mankenler (stilize)
  for (const [x, z, top] of [[-1.6, -3.4, 0x8a1c2b], [1.6, -3.4, 0x1c2a44]]) {
    const m = createPerson({ top, bottom: 0xe8e2d6, skin: 0xf2f2f0, hair: 0xf2f2f0, height: 1.78 });
    m.root.position.set(x, 0, z); m.root.rotation.y = x < 0 ? 0.4 : -0.4; g.add(m.root);
    k.cyl(0.25, 0.25, 0.05, chrome, x, 0.025, z, 24);
  }
  const lights = [];
  for (const [x, z] of [[-2, -5], [2, -5], [-2, -1], [2, -1], [0, 2]]) {
    const l = new THREE.SpotLight(0xfff3e2, 16, 6, 0.8, 0.6, 1.8); l.position.set(x, H - 0.05, z); l.target.position.set(x * 1.4, 0.6, z); g.add(l, l.target); lights.push(l);
  }
  const key = new THREE.SpotLight(0xffffff, 18, 12, 0.9, 0.8, 1.5); key.position.set(1, H - 0.1, 4); key.target.position.set(0, 1, -1); key.castShadow = true; g.add(key, key.target); lights.push(key);
  const fill = new THREE.HemisphereLight(0xffffff, 0x7c6a58, 0.7); g.add(fill); lights.push(fill);
  return { lights, seats: [], anchors: { kazaniyorum: { p: [0, -0.9], cam: [[-0.4, 4.4], [-0.2, 0.9]], clerk: [-2.4, 1.0, 0.9] } } };
}

function buildHome(g, k) {
  const W = 7, D = 8, H = 2.8;
  const parquet = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#6a4a30'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 32; i++) for (let j = -1; j < 4; j++) { const v = 110 + rnd() * 35; c.fillStyle = `rgb(${v + 45},${v + 20},${v - 10})`; c.fillRect(j * 256 + (i % 2) * 128, i * 32, 255, 31); }
  });
  parquet.wrapS = parquet.wrapT = THREE.RepeatWrapping; parquet.repeat.set(2, 2.5);
  const wallM = k.std({ color: 0xe9e3d8, roughness: 0.95 });
  k.shell(W, D, H, k.std({ map: parquet, roughness: 0.4 }), wallM, k.std({ color: 0xf4f1ec, roughness: 0.95 }), -1);
  const fabric = k.std({ color: 0x5b6470, roughness: 1 });
  const wood = k.std({ color: 0x6b4a32, roughness: 0.5 });
  const black = k.std({ color: 0x111214, roughness: 0.4 });
  const white = k.std({ color: 0xf6f6f4, roughness: 0.5 });
  // Pencere (arka duvar) + dışarısı
  const view = cityView();
  k.plane(6, 3.2, new THREE.MeshBasicMaterial({ map: view, fog: false }), 0.5, 1.5, -6.2);
  const frameM = k.std({ color: 0xf2f2f0, roughness: 0.5 });
  k.box(3.4, 0.08, 0.12, frameM, 0.5, 0.75, -4.97); k.box(3.4, 0.08, 0.12, frameM, 0.5, 2.35, -4.97);
  for (const x of [-1.2, 0.5, 2.2]) k.box(0.08, 1.68, 0.12, frameM, x, 1.55, -4.97);
  // pencere boşluğu: duvarın önüne iki parça (pencere çevresi)
  const wallFront = k.std({ color: 0xe9e3d8, roughness: 0.95 });
  k.box(2.4, H, 0.1, wallFront, -2.4, H / 2, -4.96, { cast: false });
  k.box(1.3, H, 0.1, wallFront, 2.85, H / 2, -4.96, { cast: false });
  k.box(3.4, 0.75, 0.1, wallFront, 0.5, 0.375, -4.96, { cast: false });
  k.box(3.4, 0.45, 0.1, wallFront, 0.5, 2.575, -4.96, { cast: false });
  // arka duvarın tam planını gizle (pencere için): shell'in arka duvarı pencerenin arkasında kalır → onu kaldır
  g.children.filter((m) => m.isMesh && m.geometry.type === 'PlaneGeometry' && Math.abs(m.position.z - (-5)) < 0.01 && m.material === wallM).forEach((m) => { m.visible = false; });
  // Kanepe (sol, pencereye dik) + sehpa + TV ünitesi (sağ)
  const sofa = new THREE.Group(); sofa.position.set(-2.4, 0, -1.4); sofa.rotation.y = Math.PI / 2; g.add(sofa);
  const sb = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.05), fabric); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; sofa.add(m); };
  sb(2.3, 0.42, 0.95, 0, 0.21, 0); sb(2.3, 0.5, 0.22, 0, 0.62, -0.38); sb(0.2, 0.62, 0.95, -1.15, 0.31, 0); sb(0.2, 0.62, 0.95, 1.15, 0.31, 0);
  for (const x of [-0.5, 0.5]) sb(0.95, 0.1, 0.78, x, 0.47, 0.06);
  const seats = [{ p: [-2.35, -1.95, Math.PI / 2] }];
  k.rbox(1.0, 0.04, 0.6, 0.01, wood, -1.0, 0.42, -1.4);
  for (const [x, z] of [[-1.42, -1.65], [-0.58, -1.65], [-1.42, -1.15], [-0.58, -1.15]]) k.cyl(0.02, 0.02, 0.4, black, x, 0.2, z, 8);
  k.box(0.35, 0.02, 0.25, white, -1.1, 0.45, -1.35); // dergi
  k.box(0.45, 0.5, 2.0, wood, 3.2, 0.25, -1.4);
  const tvScreen = canvasTex(512, 288, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#16233b'); gr.addColorStop(1, '#3a1a3a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  k.box(0.05, 0.85, 1.5, black, 3.3, 1.15, -1.4);
  k.plane(1.44, 0.8, k.glow(tvScreen, 0.6), 3.27, 1.15, -1.4, -Math.PI / 2);
  // Halı, lamba, bitki
  k.plane(2.4, 1.8, k.std({ color: 0xbfb2a0, roughness: 1 }), -1.1, 0.004, -1.4, 0, -Math.PI / 2);
  k.cyl(0.02, 0.02, 1.5, black, -3.1, 0.75, 0.3, 8); k.cyl(0.18, 0.25, 0.3, k.std({ color: 0xf3e6cf, roughness: 0.9, emissive: 0xffe2b0, emissiveIntensity: 0.6 }), -3.1, 1.6, 0.3, 20, { cast: false });
  k.cyl(0.2, 0.16, 0.4, white, 2.9, 0.2, -4.4, 16);
  for (let i = 0; i < 9; i++) { const l = k.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), k.std({ color: 0x3f6b3a, roughness: 0.8 })), 2.9 + (rnd() - 0.5) * 0.4, 0.6 + rnd() * 0.7, -4.4 + (rnd() - 0.5) * 0.4); l.scale.set(1, 1.4, 0.6); }
  // Duvar: tablo + termostat/sayaç paneli (Zorlu durağı)
  k.plane(1.1, 0.75, k.std({ map: imgTex('assets/apps/hero_zorlu_enerji.jpg'), roughness: 0.7 }), 3.47, 1.75, 1.6, -Math.PI / 2);
  // Mutfak tezgâhı (ön sağ)
  k.box(0.65, 0.9, 2.2, white, 3.15, 0.45, 1.7); k.box(0.7, 0.04, 2.25, k.std({ color: 0x2b2b2b, roughness: 0.3 }), 3.15, 0.92, 1.7);
  // Işık: pencereden gün ışığı + iç lamba
  const lights = [];
  const sunIn = new THREE.SpotLight(0xf3f6ff, 40, 14, 0.9, 0.9, 1.2); sunIn.position.set(0.5, 2.4, -7); sunIn.target.position.set(0, 0, 0); sunIn.castShadow = true;
  sunIn.shadow.mapSize.set(1024, 1024); g.add(sunIn, sunIn.target); lights.push(sunIn);
  const lamp = new THREE.PointLight(0xffd9a0, 4, 5, 2); lamp.position.set(-3.1, 1.55, 0.3); g.add(lamp); lights.push(lamp);
  const key = new THREE.SpotLight(0xfff2e2, 10, 10, 0.9, 0.9, 1.5); key.position.set(0.5, H - 0.05, 3); key.target.position.set(0, 1, -1); g.add(key, key.target); lights.push(key);
  const fill = new THREE.HemisphereLight(0xeef3ff, 0x6b5a48, 0.7); g.add(fill); lights.push(fill);
  return {
    lights, seats,
    anchors: {
      alisgidis: { p: [-0.6, -0.4], ry: 0.25, cam: [[0.8, 2.7], [0.2, 0.75]] },
      zorlu: { p: [2.3, 1.2], ry: -0.9, cam: [[-1.0, 2.6], [1.0, 2.0]] },
    },
  };
}

function buildTelco(g, k) {
  const W = 10, D = 12, H = 3.6;
  k.shell(W, D, H, k.std({ color: 0xd9d9d9, roughness: 0.2, metalness: 0.0 }), k.std({ color: 0xe9e9e9, roughness: 0.9 }), k.std({ color: 0xf0f0f0, roughness: 0.9 }), -2);
  const red = k.std({ color: 0xe60000, roughness: 0.5 });
  const white = k.std({ color: 0xffffff, roughness: 0.3 });
  const dark = k.std({ color: 0x15171a, roughness: 0.3, metalness: 0.4 });
  k.box(W, H, 0.05, red, 0, H / 2, -7.97, { cast: false });
  poster(k, 'assets/apps/hero_vodafone_yanimda.jpg', 4.8, 2.4, 0, 1.8, -7.92, 0, null);
  k.plane(2.4, 0.5, k.glow(signTex('Her Şey Yanımda', { bg: null, fg: '#fff', size: 90, w: 1024, h: 210 }), 1), 0, 3.25, -7.92).material.transparent = true;
  // Teşhir masaları (telefonlar)
  const scr = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: imgTex('assets/apps/vodafone_1.jpg'), emissiveIntensity: 0.7 });
  for (const [x, z] of [[-2.8, -3.5], [2.8, -3.5], [-2.8, 0.5], [2.8, 0.5]]) {
    k.rbox(1.8, 0.9, 0.9, 0.03, white, x, 0.45, z);
    for (let i = 0; i < 4; i++) {
      k.box(0.075, 0.008, 0.155, dark, x - 0.6 + i * 0.4, 0.905, z);
      k.plane(0.068, 0.148, scr, x - 0.6 + i * 0.4, 0.911, z, 0, -Math.PI / 2);
    }
  }
  // Sol duvar: kırmızı bant + ürün kutuları
  k.box(0.05, 0.5, D, red, -4.97, H - 0.45, -2, { cast: false });
  k.box(0.05, 0.5, D, red, 4.97, H - 0.45, -2, { cast: false });
  const lights = [];
  for (const [x, z] of [[-2.8, -3.5], [2.8, -3.5], [-2.8, 0.5], [2.8, 0.5]]) {
    const l = new THREE.SpotLight(0xffffff, 9, 5, 0.7, 0.6, 1.8); l.position.set(x, H - 0.05, z); l.target.position.set(x, 0.9, z); g.add(l, l.target); lights.push(l);
  }
  const back = new THREE.PointLight(0xffffff, 4, 8, 1.6); back.position.set(0, 2.8, -5.5); g.add(back); lights.push(back);
  const key = new THREE.SpotLight(0xffffff, 12, 12, 0.9, 0.8, 1.5); key.position.set(1, H - 0.1, 4); key.target.position.set(0, 1, -1); key.castShadow = true; g.add(key, key.target); lights.push(key);
  const fill = new THREE.HemisphereLight(0xffffff, 0x999999, 0.4); g.add(fill); lights.push(fill);
  return { lights, seats: [], anchors: { vodafone: { p: [0, -1.6], cam: [[-0.6, 3.7], [-0.3, 0.3]], clerk: [2.0, -2.6, -0.5] } } };
}

function buildGate(g, k) {
  const W = 16, D = 12, H = 5;
  const floorM = k.std({ color: 0xd8d6d0, roughness: 0.15, metalness: 0.05 });
  const wall = k.std({ color: 0xe8e8e6, roughness: 0.8 });
  const ceil = k.std({ color: 0xdcdcdc, roughness: 0.8 });
  k.shell(W, D, H, floorM, wall, ceil, -1);
  // Arka duvar → camlı cephe (dışarı: apron + uçak)
  g.children.filter((m) => m.isMesh && Math.abs(m.position.z - (-7)) < 0.01 && m.geometry.type === 'PlaneGeometry').forEach((m) => { m.visible = false; });
  const view = cityView(2048, 768, { horizon: 0.55, tarmac: true });
  k.plane(80, 24, new THREE.MeshBasicMaterial({ map: view, fog: false, color: 0xb8bcc0 }), 0, 6, -48);
  const tarmacM = k.std({ color: 0x777c80, roughness: 0.9 });
  k.plane(80, 40, tarmacM, 0, -0.3, -27, 0, -Math.PI / 2);
  const mull = k.std({ color: 0x2a2d31, metalness: 0.7, roughness: 0.4 });
  for (let x = -8; x <= 8.01; x += 2) k.box(0.1, H, 0.12, mull, x, H / 2, -7, { cast: false });
  k.box(W, 0.12, 0.14, mull, 0, 0.1, -7, { cast: false }); k.box(W, 0.14, 0.14, mull, 0, H - 0.05, -7, { cast: false });
  // Uçak (beyaz gövde, lacivert-sarı kuyruk)
  const plane = new THREE.Group(); plane.position.set(1, 0, -24); plane.rotation.y = -0.35; g.add(plane);
  const hull = k.std({ color: 0xe9ebee, roughness: 0.3, metalness: 0.15 });
  const navy = k.std({ color: 0x1b3f73, roughness: 0.45 });
  const sun = k.std({ color: 0xfdb913, roughness: 0.45 });
  const pm = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; plane.add(o); return o; };
  pm(new THREE.CylinderGeometry(1.95, 1.95, 30, 32), hull, 0, 3.4, 0, 0, 0, Math.PI / 2);
  const nose = pm(new THREE.SphereGeometry(1.95, 32, 16), hull, 15, 3.4, 0); nose.scale.set(1.6, 1, 1);
  const tailc = pm(new THREE.ConeGeometry(1.95, 6, 32), hull, -18, 3.9, 0, 0, 0, Math.PI / 2); tailc.scale.set(1, 1, 0.8);
  pm(new THREE.BoxGeometry(5, 0.3, 30), hull, -1, 2.3, 0, 0, 0, 0).rotation.y = 0.0;
  pm(new THREE.BoxGeometry(4.2, 7, 0.35), navy, -18.5, 8, 0, 0, 0, -0.45);
  pm(new THREE.CircleGeometry(1.2, 32), sun, -18.6, 8.4, 0.19, 0, 0, 0);
  pm(new THREE.CircleGeometry(1.2, 32), sun, -18.6, 8.4, -0.19, 0, Math.PI, 0);
  pm(new THREE.BoxGeometry(3, 0.25, 11), hull, -18.5, 4.4, 0);
  for (const z of [-6, 6]) pm(new THREE.CylinderGeometry(1.1, 1.1, 3.6, 24), k.std({ color: 0xc9ccd1, metalness: 0.6, roughness: 0.3 }), 0.5, 1.6, z, 0, 0, Math.PI / 2);
  const stripe = pm(new THREE.CylinderGeometry(1.97, 1.97, 22, 32, 1, true, Math.PI * 0.62, Math.PI * 0.18), navy, -2, 3.4, 0, 0, 0, Math.PI / 2); void stripe;
  for (let i = 0; i < 22; i++) for (const s of [-1, 1]) pm(new THREE.PlaneGeometry(0.25, 0.35), k.std({ color: 0x0b1a2c, roughness: 0.2 }), 11 - i * 1.1, 4.0, s * 1.96, 0, s > 0 ? 0 : Math.PI, 0);
  for (const [x, z] of [[11, 0], [-3, 2.2], [-3, -2.2]]) pm(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 18), k.std({ color: 0x111111, roughness: 0.8 }), x, 0.45, z, Math.PI / 2, 0, 0);
  // Biniş kapısı tabelası
  const gateSign = signTex('SunExpress', { bg: '#1b3f73', fg: '#fdb913', size: 110, sub: 'Kapı 204 · Antalya 10:40 · Zamanında', subSize: 44, w: 1024, h: 300 });
  k.plane(2.4, 0.7, k.glow(gateSign, 0.9), -4.5, 3.2, -1.5, Math.PI / 4);
  k.cyl(0.04, 0.04, 1.6, mull, -4.5, 4.2, -1.5, 8, { cast: false });
  poster(k, 'assets/apps/hero_sunexpress.jpg', 3.2, 1.6, 7.97, 2.2, -1, -Math.PI / 2, null);
  // Bekleme koltukları (sıralar)
  const seatM = k.std({ color: 0x23272d, roughness: 0.6 });
  const legM = k.std({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.3 });
  const seats = [];
  for (const [rx, rz, ry] of [[-4.2, 1.6, Math.PI / 2], [4.2, 1.6, -Math.PI / 2], [-4.2, -2.4, Math.PI / 2], [4.2, -2.4, -Math.PI / 2]]) {
    const n = 6;
    k.box(0.08, 0.06, n * 0.6, legM, rx, 0.35, rz);
    for (let i = 0; i < n; i++) {
      const z = rz - (n - 1) * 0.3 + i * 0.6;
      const dir = ry > 0 ? 1 : -1;
      k.rbox(0.5, 0.08, 0.52, 0.03, seatM, rx, 0.46, z);
      k.rbox(0.08, 0.5, 0.52, 0.03, seatM, rx - dir * 0.27, 0.72, z).rotation.z = dir * 0.1;
      seats.push({ p: [rx, z, ry] });
    }
    for (const dz of [-1, 1]) k.box(0.06, 0.4, 0.06, legM, rx, 0.18, rz + dz * (n * 0.3 - 0.2));
  }
  const lights = [];
  const day = new THREE.DirectionalLight(0xfff6e8, 2.2); day.position.set(-10, 18, -30); day.target.position.set(0, 0, 0);
  day.castShadow = true; day.shadow.mapSize.set(2048, 2048); Object.assign(day.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 80 });
  g.add(day, day.target); lights.push(day);
  for (const x of [-4, 0, 4]) { const l = new THREE.PointLight(0xf4f6ff, 5, 10, 1.6); l.position.set(x, H - 0.3, 0); g.add(l); lights.push(l); }
  const fill = new THREE.HemisphereLight(0xdfe9f5, 0x8a8478, 0.55); g.add(fill); lights.push(fill);
  return { lights, seats: [seats[2], seats[9], seats[15], seats[20]], anchors: { sunexpress: { p: [0.6, -3.6], ry: 0.15, cam: [[-0.6, 3.2], [0.4, -1.6]] } } };
}

function buildParking(g, k) {
  const W = 18, D = 18, H = 2.9;
  const conc = (rx, ry) => k.std({ map: pbrTex('concrete', 'color', rx, ry, true), normalMap: pbrTex('concrete', 'normal', rx, ry), color: 0x9a9a98, roughness: 0.85 });
  const floorM = conc(6, 6); floorM.color.set(0x7d7f80); floorM.roughness = 0.6;
  k.shell(W, D, H, floorM, conc(4, 1), conc(6, 6), -2);
  // Park çizgileri
  const lineM = k.std({ color: 0xf2f2ee, roughness: 0.6 });
  for (let x = -7.5; x <= 7.6; x += 2.5) { k.box(0.1, 0.004, 5, lineM, x, 0.003, -7, { cast: false }); k.box(0.1, 0.004, 5, lineM, x, 0.003, 4, { cast: false }); }
  k.box(0.15, 0.004, 4.5, k.std({ color: 0xf2c200, roughness: 0.6 }), 0, 0.003, -1.5, { cast: false }).scale.set(1, 1, 1);
  // Kolonlar (sarı-siyah bantlı)
  const colM = conc(1, 2);
  const band = k.std({ color: 0xf2c200, roughness: 0.6 });
  for (const x of [-6.3, 6.3]) for (const z of [-7, 4]) { k.box(0.6, H, 0.6, colM, x, H / 2, z); k.box(0.62, 0.4, 0.62, band, x, 0.2, z, { cast: false }); }
  // Arabalar
  const cols = [0x1b1d20, 0xd9d6cf, 0x8a1010, 0x2a3e5c, 0x5c6066, 0xe8e8e8];
  [[-6.25, -7.2, 0], [-3.75, -7.4, 0], [3.75, -7.1, 0], [6.25, -7.3, 0], [-3.75, 4.3, Math.PI], [3.75, 4.1, Math.PI]].forEach(([x, z, ry], i) => {
    const c = car(cols[i % cols.length]); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  });
  // Tabelalar
  k.plane(2.6, 0.55, k.glow(signTex('Maslak Otopark', { bg: '#0f1720', fg: '#fff', size: 92, w: 1024, h: 216 }), 0.9), 0, 2.4, -10.95);
  k.plane(1.1, 0.5, k.glow(signTex('P', { bg: '#1453b8', fg: '#fff', size: 180, w: 400, h: 200 }), 0.9), -5.9, 2.2, -6.68);
  poster(k, 'assets/apps/hero_vodafone_one_app.jpg', 3.2, 1.6, 8.97, 1.5, -1.5, -Math.PI / 2, null);
  // Floresan tüpler + ışık
  const tube = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 2.2 });
  const lights = [];
  for (const z of [-7, -2, 3]) for (const x of [-5, 0, 5]) k.box(1.2, 0.05, 0.08, tube, x, H - 0.05, z, { cast: false });
  for (const [x, z] of [[-4, -6], [4, -6], [0, -1.5], [0, 3]]) { const l = new THREE.PointLight(0xe8f2ff, 9, 9, 1.7); l.position.set(x, H - 0.2, z); g.add(l); lights.push(l); }
  const key = new THREE.SpotLight(0xf0f6ff, 16, 12, 0.9, 0.8, 1.5); key.position.set(1, H - 0.1, 3.5); key.target.position.set(0, 1, -1.5); key.castShadow = true; g.add(key, key.target); lights.push(key);
  const fill = new THREE.HemisphereLight(0xdfe8f0, 0x555555, 0.55); g.add(fill); lights.push(fill);
  return { lights, seats: [], anchors: { oneapp: { p: [1.2, -2.6], ry: -0.15, cam: [[-0.8, 3.6], [0.6, -0.1]] } } };
}

/* ======================= Kurulum ======================= */
const BUILDERS = { cafe: buildCafe, market: (g, k) => buildMarket(g, k), aisle: (g, k) => buildMarket(g, k, { aisle: true, brand: '', color: '#3a2d6e' }), fashion: buildFashion, home: buildHome, telco: buildTelco, gate: buildGate, parking: buildParking };

export function buildStops(scene, { envMats, createPerson }) {
  const envs = {};
  Object.entries(BUILDERS).forEach(([name, fn], i) => {
    const g = new THREE.Group(); g.position.set(60 + i * 60, Y, 0); g.visible = false; scene.add(g);
    const k = kit(g, envMats);
    const r = fn(g, k, { createPerson });
    r.lights.forEach((l) => { l.visible = false; });
    envs[name] = { group: g, ...r };
  });
  // Durak → mekân + konum (dünya koordinatı)
  const where = {};
  for (const e of Object.values(envs)) {
    for (const [id, a] of Object.entries(e.anchors)) {
      const o = e.group.position;
      where[id] = {
        env: e,
        p: new THREE.Vector3(o.x + a.p[0], o.y, o.z + a.p[1]),
        ry: a.ry ?? 0,
        cam: a.cam.map(([x, z]) => new THREE.Vector3(o.x + x, o.y, o.z + z)),
        clerk: a.clerk && { p: new THREE.Vector3(o.x + a.clerk[0], o.y, o.z + a.clerk[1]), ry: a.clerk[2] },
        seats: e.seats.map((s) => ({ p: new THREE.Vector3(o.x + s.p[0], o.y, o.z + s.p[1]), ry: s.p[2] })),
      };
    }
  }
  return { envs, where };
}
