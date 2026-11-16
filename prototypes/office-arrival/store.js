// Kahve Dünyası Maslak mağazası (iç mekân). Referans: uygulamadaki gerçek mağaza fotoğrafı (ic_mock_store):
// koyu beton duvar, açık meşe lambri + siyah minderli bank, yuvarlak masalar, siyah ahşap sandalyeler,
// siyah sarkıt lambalar, açık gri karo zemin, ışıklı pasta vitrini, ürün rafları, büyük cam vitrin.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const STORE = new THREE.Vector3(0, -60, 0);   // sokaktan bağımsız, kapalı hacim
export const SW = 7.2, SD = 14, SH = 3.4;
export const STORE_PRESENTER = new THREE.Vector3(0.55, 0, -0.6); // mağaza içi yerel konum
export const STORE_CAM_START = new THREE.Vector3(0.1, 0, 6.0);
export const STORE_CAM_STOP = new THREE.Vector3(0.45, 0, 1.75);
export const BENCH_SEATS = [[-3.18, 3.3], [-3.18, 2.5], [-3.18, 0.1], [-3.18, -2.3]];
const KD_BORDO = 0x6c0733, KD_GREEN = 0x005e5b;

const loader = new THREE.TextureLoader();
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

export function buildStore(scene, { envMats }) {
  const g = new THREE.Group(); g.position.copy(STORE); scene.add(g);
  const lights = [];
  const add = (m, x, y, z, { cast = true } = {}) => { m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, o) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, o);
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0) => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), x, y, z, { cast: false }); m.rotation.set(rx, ry, 0); return m; };

  // Malzemeler
  const tiles = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#b9b7b3'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const v = 178 + Math.random() * 14; c.fillStyle = `rgb(${v},${v - 1},${v - 4})`; c.fillRect(i * 256 + 2, j * 256 + 2, 252, 252);
    }
    c.fillStyle = '#8f8c87'; for (let i = 0; i <= 4; i++) { c.fillRect(i * 256 - 2, 0, 4, h); c.fillRect(0, i * 256 - 2, w, 4); }
  });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(SW / 2.4, SD / 2.4);
  const floorM = new THREE.MeshStandardMaterial({ map: tiles, normalMap: pbrTex('concrete', 'normal', SW / 2, SD / 2), roughness: 0.42 });
  const concreteWall = new THREE.MeshStandardMaterial({ map: pbrTex('concrete', 'color', 2, 1.2, true), normalMap: pbrTex('concrete', 'normal', 2, 1.2), color: 0x6b6d70, roughness: 0.92 });
  const oak = new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.55 });
  const black = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.6 });
  const cushion = new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.9 });
  const ceilM = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.9 });
  const counterM = new THREE.MeshStandardMaterial({ map: pbrTex('concrete', 'color', 3, 1, true), color: 0x8c8a86, roughness: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dcdf, metalness: 1, roughness: 0.18 });
  envMats.push(floorM, concreteWall, oak, black, cushion, ceilM, counterM);

  // Kabuk
  const floor = plane(SW, SD, floorM, 0, 0.001, 0, 0, -Math.PI / 2); floor.receiveShadow = true;
  plane(SW, SD, ceilM, 0, SH, 0, 0, Math.PI / 2);
  plane(SD, SH, concreteWall, -SW / 2, SH / 2, 0, Math.PI / 2);
  plane(SD, SH, concreteWall, SW / 2, SH / 2, 0, -Math.PI / 2);
  // Tavan kanalları
  const duct = new THREE.MeshStandardMaterial({ color: 0x2a2b2d, metalness: 0.6, roughness: 0.5 });
  for (const x of [-1.2, 1.4]) { const d = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, SD, 18), duct), x, SH - 0.3, 0); d.rotation.x = Math.PI / 2; }

  // Arka duvar: meşe çıtalar + arkadan aydınlatmalı KD logosu
  for (let x = -SW / 2 + 0.06; x < SW / 2; x += 0.12) box(0.07, SH, 0.05, oak, x, SH / 2, -SD / 2 + 0.03, { cast: false });
  const logoTex = loader.load('assets/kd/ic_logo_70x.png'); logoTex.colorSpace = THREE.SRGBColorSpace;
  const logo = plane(1.15, 1.15, new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, emissive: 0xffffff, emissiveMap: logoTex, emissiveIntensity: 0.55 }), -0.6, 2.1, -SD / 2 + 0.08);
  void logo;
  const halo = new THREE.PointLight(0xffe2b0, 3, 3, 2); halo.position.set(-0.6, 2.1, -SD / 2 + 0.5); g.add(halo); lights.push(halo);

  // Sol duvar: lambri + bank + minderler + tablolar
  for (let z = -SD / 2 + 0.6; z < SD / 2 - 1.2; z += 0.16) box(0.04, 1.0, 0.13, oak, -SW / 2 + 0.03, 0.5, z, { cast: false });
  box(0.6, 0.42, SD - 2.4, oak, -SW / 2 + 0.3, 0.21, -0.6);
  for (let z = -SD / 2 + 1.0; z < SD / 2 - 1.6; z += 0.82) {
    add(new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.1, 0.78, 3, 0.04), cushion), -SW / 2 + 0.32, 0.47, z);
    const bk = add(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.45, 0.78, 3, 0.05), cushion), -SW / 2 + 0.1, 0.78, z); bk.rotation.z = -0.12;
  }
  const art = (x, z, w, h, seed) => {
    const t = canvasTex(512, 640, (c, W, H) => {
      c.fillStyle = '#f2efe8'; c.fillRect(0, 0, W, H);
      let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let y = 40; y < H - 40; y += 34 + r() * 20) {
        c.fillStyle = r() < 0.65 ? '#1f2c4a' : r() < 0.5 ? '#c4363b' : '#8aa0c2';
        c.beginPath(); c.moveTo(40, y); for (let xx = 40; xx <= W - 40; xx += 20) c.lineTo(xx, y + Math.sin(xx * 0.03 + r() * 3) * 5 + r() * 4);
        c.lineTo(W - 40, y + 18); c.lineTo(40, y + 18); c.closePath(); c.fill();
      }
    });
    box(0.05, h + 0.08, w + 0.08, oak, -SW / 2 + 0.05, 2.15, z, { cast: false });
    plane(w, h, new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), -SW / 2 + 0.08, 2.15, z, Math.PI / 2);
    void x;
  };
  art(0, 2.4, 0.9, 1.15, 7); art(0, -1.2, 0.9, 1.15, 23);

  // Masalar + sandalyeler
  const tableTop = new THREE.MeshStandardMaterial({ color: 0xd9c3a2, roughness: 0.45 });
  const chair = (x, z, ry) => {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.42), black); seat.position.y = 0.46; c.add(seat);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 0.03), black); l.position.set(lx, 0.23, lz); c.add(l);
    }
    for (const lx of [-0.18, 0.18]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), black); p.position.set(lx, 0.68, -0.2); p.rotation.x = -0.12; c.add(p); }
    for (const y of [0.62, 0.82]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.02), black); s.position.set(0, y, -0.215); s.rotation.x = -0.12; c.add(s); }
    c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  };
  const cups = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.25 });
  [[-2.35, 2.9], [-2.35, 0.1], [-2.35, -2.3]].forEach(([x, z], i) => {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 36), tableTop), x, 0.72, z);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 10), black), x, 0.36, z);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.02, 24), black), x, 0.01, z);
    chair(x + 0.62, z, -Math.PI / 2);
    for (let k = 0; k < (i === 0 ? 2 : 1); k++) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.09, 16), cups), x - 0.08 + k * 0.14, 0.78, z - 0.06 + k * 0.1);
      const saucer = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.008, 20), cups), x - 0.08 + k * 0.14, 0.738, z - 0.06 + k * 0.1); void saucer;
    }
  });

  // Sarkıt lambalar (siyah kubbe)
  const shade = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.4, roughness: 0.45, side: THREE.DoubleSide });
  const bulb = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd9a0, emissiveIntensity: 6 });
  [[-2.35, 2.9], [-2.35, 0.1], [-2.35, -2.3], [-2.35, -4.8]].forEach(([x, z]) => {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2), black), x, SH - 0.6, z, { cast: false });
    const sh = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), shade), x, SH - 1.22, z, { cast: false });
    void sh;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), bulb), x, SH - 1.24, z, { cast: false });
    const l = new THREE.SpotLight(0xffd6a0, 14, 5, 1.1, 0.6, 2); l.position.set(x, SH - 1.25, z); l.target.position.set(x, 0, z);
    g.add(l, l.target); lights.push(l);
  });

  // Tezgâh + ışıklı pasta vitrini
  const CX = 2.25;
  box(1.1, 1.0, 7.0, counterM, CX, 0.5, -1.6);
  box(1.16, 0.04, 7.06, black, CX, 1.02, -1.6);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const vz0 = -2.6, vz1 = 1.6, vL = vz1 - vz0, vzc = (vz0 + vz1) / 2;
  box(1.0, 0.04, vL, black, CX, 1.06, vzc);
  plane(vL, 0.62, glassM, CX - 0.52, 1.38, vzc, -Math.PI / 2);
  plane(1.0, vL, glassM, CX, 1.7, vzc, 0, Math.PI / 2);
  const shelf = new THREE.MeshStandardMaterial({ color: 0xd8c09b, roughness: 0.5 });
  box(0.9, 0.025, vL - 0.1, shelf, CX + 0.05, 1.32, vzc, { cast: false });
  box(0.9, 0.025, vL - 0.1, shelf, CX + 0.05, 1.55, vzc, { cast: false });
  const stripM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff2dc, emissiveIntensity: 1.0 });
  box(0.02, 0.02, vL - 0.1, stripM, CX - 0.45, 1.69, vzc, { cast: false });
  // Pastalar / madlenler / kurabiyeler
  const choc = new THREE.MeshStandardMaterial({ color: 0x3a1f12, roughness: 0.35 });
  const cookie = new THREE.MeshStandardMaterial({ color: 0xa8743f, roughness: 0.8 });
  const cake = new THREE.MeshStandardMaterial({ color: 0xe9dcc6, roughness: 0.7 });
  const goodies = [];
  for (let z = vz0 + 0.18; z < vz1 - 0.1; z += 0.2) {
    for (const [y, mat, kind] of [[1.1, cookie, 'c'], [1.345, choc, 'm'], [1.57, cake, 'k']]) {
      const m = kind === 'c' ? new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 16), mat)
        : kind === 'm' ? new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.035, 0.05, 2, 0.01), mat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 20, 1, false, 0, Math.PI * 1.6), mat);
      m.position.set(CX - 0.12 + (Math.random() - 0.5) * 0.25, y + (kind === 'k' ? 0.035 : 0.012), z);
      m.rotation.y = Math.random() * 6; g.add(m); goodies.push(m);
    }
  }
  const vl = new THREE.PointLight(0xfff0d8, 2.5, 3, 2); vl.position.set(CX, 1.62, vzc); g.add(vl); lights.push(vl);
  // Kahve makinesi (arka tezgâh)
  box(0.55, 0.9, 6.5, counterM, SW / 2 - 0.3, 0.45, -1.6);
  const mach = new THREE.Group(); mach.position.set(SW / 2 - 0.35, 0.9, -3.5); g.add(mach);
  const mb = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.48, 0.9, 3, 0.04), chrome); mb.position.y = 0.24; mach.add(mb);
  const mfront = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.22), new THREE.MeshStandardMaterial({ color: KD_BORDO, roughness: 0.4 }));
  mfront.rotation.y = -Math.PI / 2; mfront.position.set(-0.226, 0.34, 0); mach.add(mfront);
  for (const z of [-0.25, 0.25]) { const gh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 14), chrome); gh.position.set(-0.27, 0.12, z); mach.add(gh); }
  mach.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // Ürün rafları (sağ duvar, tezgâhın arkası) — KD paketleri
  const logoSmall = loader.load('assets/kd/ic_logo_70x.png'); logoSmall.colorSpace = THREE.SRGBColorSpace;
  const packTex = (col, label) => canvasTex(256, 384, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 0, w, 40);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, 150, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#FFF46D'; c.font = '700 30px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillText(label, w / 2, 290);
  });
  const packs = [packTex('#6C0733', 'TÜRK KAHVESİ'), packTex('#005E5B', 'DAMLA SAKIZLI'), packTex('#3d2016', 'DRAJE')];
  const packMats = packs.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }));
  const logoMat = new THREE.MeshStandardMaterial({ map: logoSmall, transparent: true, roughness: 0.5 });
  for (const y of [1.45, 1.85, 2.25]) {
    box(0.32, 0.03, 5.6, oak, SW / 2 - 0.16, y, -1.2, { cast: false });
    for (let z = -3.8; z < 1.5; z += 0.17) {
      const k = Math.floor(Math.random() * 3);
      const p = box(0.08, 0.24, 0.13, packMats[k], SW / 2 - 0.18, y + 0.135, z, { cast: false });
      p.rotation.y = -Math.PI / 2;
      const l = plane(0.08, 0.08, logoMat, SW / 2 - 0.225, y + 0.15, z, -Math.PI / 2); void l;
    }
  }
  // Menü panoları
  const menuTex = (title, items) => canvasTex(768, 512, (c, w, h) => {
    c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#FFF46D'; c.font = '700 44px Montserrat, sans-serif'; c.fillText(title, 40, 80);
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '500 30px Montserrat, sans-serif';
    items.forEach((s, i) => c.fillText(s, 40, 150 + i * 62));
  });
  [['TÜRK KAHVESİ', ['Türk Kahvesi', 'Damla Sakızlı', 'Dibek Kahvesi', 'Osmanlı Kahvesi', 'Menengiç']],
    ['SICAK KAHVELER', ['Espresso', 'Americano', 'Caffè Latte', 'Cappuccino', 'Mocha']],
    ['SOĞUK İÇECEKLER', ['Iced Latte', 'Cold Brew', 'Frappe', 'Limonata', 'Smoothie']]].forEach(([t, it], i) => {
    const m = plane(1.4, 0.93, new THREE.MeshStandardMaterial({ map: menuTex(t, it), emissive: 0xffffff, emissiveMap: menuTex(t, it), emissiveIntensity: 0.35 }), SW / 2 - 0.02, 2.85, -3.8 + i * 1.55, -Math.PI / 2);
    m.rotation.y = -Math.PI / 2;
  });
  for (const z of [-3.6, -1.6, 0.4]) {
    const s = new THREE.SpotLight(0xfff0dc, 10, 5, 0.7, 0.6, 2); s.position.set(1.6, SH - 0.05, z); s.target.position.set(2.6, 1.0, z);
    g.add(s, s.target); lights.push(s);
  }

  // Ön cephe: cam vitrin + dışarısı (gündüz, aşırı pozlanmış sokak)
  const outTex = canvasTex(1024, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e9eef2'); gr.addColorStop(0.55, '#d7dade'); gr.addColorStop(1, '#9fa2a4');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(80,85,90,.35)'; for (let i = 0; i < 9; i++) c.fillRect(i * 120 + Math.random() * 40, 120 + Math.random() * 60, 70 + Math.random() * 60, 300);
    c.fillStyle = 'rgba(60,60,60,.25)'; c.fillRect(0, 380, w, 8);
  });
  plane(SW + 4, SH + 2, new THREE.MeshBasicMaterial({ map: outTex, toneMapped: true, fog: false }), 0, SH / 2, SD / 2 + 2.5, Math.PI);
  const frameM = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, metalness: 0.7, roughness: 0.4 });
  for (let x = -SW / 2; x <= SW / 2 + 0.01; x += SW / 4) box(0.07, SH, 0.07, frameM, x, SH / 2, SD / 2, { cast: false });
  box(SW, 0.1, 0.08, frameM, 0, 2.6, SD / 2, { cast: false });
  plane(SW, SH, glassM, 0, SH / 2, SD / 2, Math.PI);
  const day = new THREE.SpotLight(0xe8eef5, 26, 16, 1.0, 1, 1.5); day.position.set(0, SH - 0.2, SD / 2 + 0.6); day.target.position.set(0, 0, 0);
  g.add(day, day.target); lights.push(day);
  const fill = new THREE.HemisphereLight(0xfff3e4, 0x3a3430, 0.35); g.add(fill); lights.push(fill);

  lights.forEach((l) => { l.visible = false; });
  return { group: g, lights, goodies };
}
