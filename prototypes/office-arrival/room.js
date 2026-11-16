// 5. kat toplantı odası (Noramin içinde, penceresi Büyükdere Caddesi'ne bakar).
// Masa çevresinde katılımcılar, ön tarafta Loodos perdesi; arkasında konuşmacı (Önder Şahin) ve ekran.
import * as THREE from 'three';
import { createPerson, createChair } from './people.js';
import { createCurtain } from './curtain.js';

export const FY = 19.0;                          // 5. kat döşeme kotu
export const ROOM = { x0: -16, x1: -4.62, z0: -24, z1: -10, h: 3.0 };
export const TABLE = { x: -10.3, z0: -12.7, z1: -19.0 };
export const CURTAIN_Z = -20.5;
export const PRESENTER = new THREE.Vector3(-10.3, FY, -22.3);
export const ROOM_DOOR = new THREE.Vector3(-14.2, FY, -10.7);
export const SEAT = new THREE.Vector3(TABLE.x, FY, -12.05);   // bizim oturacağımız masa başı

function textTexture(draw, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function buildRoom(scene, { glassMat, envMats }) {
  const R = ROOM, W = R.x1 - R.x0, D = R.z1 - R.z0, CX = (R.x0 + R.x1) / 2, CZ = (R.z0 + R.z1) / 2;
  const g = new THREE.Group(); scene.add(g);
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
  const plane = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

  // Malzemeler
  const carpetTex = textTexture((c, w, h) => {
    c.fillStyle = '#2b2d31'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { const v = 30 + Math.random() * 26; c.fillStyle = `rgb(${v},${v + 2},${v + 5})`; c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  }, 512, 512);
  carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping; carpetTex.repeat.set(W / 2, D / 2);
  const carpet = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 1 });
  const wall = new THREE.MeshStandardMaterial({ color: 0x8e8a84, roughness: 0.9 });
  const ceilM = new THREE.MeshStandardMaterial({ color: 0x77736d, roughness: 0.95 });
  const felt = new THREE.MeshStandardMaterial({ color: 0x23484c, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.6 });
  const oak = new THREE.MeshStandardMaterial({ color: 0x6b4c34, roughness: 0.38 });
  envMats.push(carpet, wall, ceilM, felt, dark, oak);

  // Döşeme / tavan / duvarlar
  const floor = add(plane(W, D, carpet), CX, FY + 0.002, CZ); floor.rotation.x = -Math.PI / 2;
  const ceil = add(plane(W, D, ceilM), CX, FY + R.h, CZ); ceil.rotation.x = Math.PI / 2;
  const left = add(plane(D, R.h, wall), R.x0, FY + R.h / 2, CZ); left.rotation.y = Math.PI / 2;
  const back = add(plane(W, R.h, wall), CX, FY + R.h / 2, R.z1); back.rotation.y = Math.PI;
  add(plane(W, R.h, dark), CX, FY + R.h / 2, R.z0);
  // Pencere duvarı: alt/üst dolgu + cam (dışarısı Büyükdere Caddesi)
  const sill = add(plane(D, 0.9, wall), R.x1, FY + 0.45, CZ); sill.rotation.y = -Math.PI / 2;
  const head = add(plane(D, 0.1, wall), R.x1, FY + 2.95, CZ); head.rotation.y = -Math.PI / 2;
  const glass = add(plane(D, 2.0, glassMat), R.x1 + 0.02, FY + 1.9, CZ); glass.rotation.y = -Math.PI / 2;
  // Sol duvarda akustik keçe paneller
  for (let z = R.z1 - 1.6; z > CURTAIN_Z + 1; z -= 1.5) {
    const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 1.3), felt), R.x0 + 0.03, FY + 1.5, z);
    p.castShadow = false;
  }
  // Arka duvarda küçük loodos yazısı
  const brand = textTexture((c, w, h) => {
    c.fillStyle = '#1ab0ba'; c.font = '700 150px "Red Hat Display", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('loodos', w / 2, h / 2);
  }, 1024, 256);
  const brandM = add(plane(1.6, 0.4, new THREE.MeshStandardMaterial({ map: brand, transparent: true, emissive: 0x1ab0ba, emissiveMap: brand, emissiveIntensity: 0.8 })), -8, FY + 1.9, R.z1 - 0.02);
  brandM.rotation.y = Math.PI;
  // Kapı (cam, arka duvarda — açık duruyor)
  const doorFrame = new THREE.MeshStandardMaterial({ color: 0x1c1f22, metalness: 0.8, roughness: 0.35 });
  add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.12), doorFrame), ROOM_DOOR.x, FY + 2.2, R.z1);

  // Tavan: gömme ışık + masa üstü lineer sarkıt
  const lightM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff1de, emissiveIntensity: 1.1 });
  for (const z of [-11.5, -14.5, -17.5]) for (const x of [-14, -6.5]) {
    const d = add(new THREE.Mesh(new THREE.CircleGeometry(0.09, 18), lightM), x, FY + R.h - 0.005, z); d.rotation.x = Math.PI / 2;
  }
  const pendant = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 5.4), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffe8cc, emissiveIntensity: 0.55 })), TABLE.x, FY + 2.1, (TABLE.z0 + TABLE.z1) / 2);
  pendant.castShadow = false;
  for (const z of [-13.5, -18]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9), doorFrame); add(w, TABLE.x, FY + 2.55, z);
  }
  for (const z of [-14, -17.6]) {
    const pl = new THREE.PointLight(0xffe2c0, 10, 7, 2); pl.position.set(TABLE.x, FY + 1.95, z); g.add(pl);
  }
  // Pencereden gelen gün ışığı
  const day = new THREE.SpotLight(0xe4ecf5, 40, 16, 1.25, 1, 1.5);
  day.position.set(R.x1 + 0.6, FY + 2.6, -16); day.target.position.set(-12, FY + 0.5, -16);
  g.add(day, day.target);
  const fill = new THREE.PointLight(0xdfe8ff, 2.5, 9, 2); fill.position.set(-13.5, FY + 2.6, -11.5); g.add(fill);

  // Toplantı masası
  const TL = TABLE.z0 - TABLE.z1;
  const top = add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, TL), oak), TABLE.x, FY + 0.74, (TABLE.z0 + TABLE.z1) / 2);
  top.castShadow = true;
  for (const z of [TABLE.z0 - 0.6, TABLE.z1 + 0.6]) {
    const leg = add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.08), dark), TABLE.x, FY + 0.36, z); leg.castShadow = true;
  }
  // Masa üstü: laptop, bardak, defter
  const laptopM = new THREE.MeshStandardMaterial({ color: 0xa7abb0, metalness: 0.9, roughness: 0.3 });
  const screenM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x9fd8ff, emissiveIntensity: 0.6 });

  // Katılımcılar
  const SEATS_Z = [-13.4, -14.7, -16.0, -17.3, -18.6];
  const people = [];
  const cast = [
    { side: -1, z: SEATS_Z[0], o: { female: true, hairStyle: 'bun', hair: 0x3a2618, top: 0x6e2f3a, skin: 0xd8ad90 } },
    { side: -1, z: SEATS_Z[2], o: { hairStyle: 'short', hair: 0x1b1612, top: 0x2b3b52, skin: 0xb98a6a } },
    { side: -1, z: SEATS_Z[4], o: { hairStyle: 'short', hair: 0x585450, top: 0x3c3f44, skin: 0xcf9f82 } },
    { side: 1, z: SEATS_Z[1], o: { female: true, hairStyle: 'long', hair: 0x6b4428, top: 0xd8d2c6, skin: 0xe2b99c } },
    { side: 1, z: SEATS_Z[3], o: { hairStyle: 'short', hair: 0x2a1f19, top: 0x1f2a24, skin: 0xa77757 } },
    { side: 1, z: SEATS_Z[4], o: { female: true, hairStyle: 'bun', hair: 0x14100d, top: 0x24425a, skin: 0xc7936f } },
  ];
  SEATS_Z.forEach((z) => {
    for (const side of [-1, 1]) {
      const ch = createChair(); ch.position.set(TABLE.x + side * 1.15, FY, z); ch.rotation.y = side * -Math.PI / 2 - (side > 0 ? Math.PI : 0) + (side > 0 ? Math.PI : 0);
      ch.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(ch);
    }
  });
  cast.forEach((c, i) => {
    const p = createPerson({ ...c.o, seated: true, height: c.o.female ? 1.66 : 1.78, name: `attendee${i + 1}` });
    p.root.position.set(TABLE.x + c.side * 1.12, FY, c.z);
    p.root.rotation.y = c.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(p.root);
    people.push(p);
    // önünde laptop ya da defter
    const lx = TABLE.x + c.side * 0.42;
    if (i % 2 === 0) {
      const base = add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.33), laptopM), lx, FY + 0.775, c.z);
      base.rotation.y = c.side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.21), screenM);
      scr.position.set(lx + c.side * 0.13, FY + 0.88, c.z); scr.rotation.y = c.side < 0 ? Math.PI / 2 : -Math.PI / 2; scr.rotation.order = 'YXZ'; scr.rotation.x = -0.25;
      g.add(scr);
    } else {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.3), new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.9 })), lx, FY + 0.772, c.z);
    }
    const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.3 })), lx + c.side * -0.1, FY + 0.815, c.z + 0.28);
    cup.castShadow = true;
  });
  // Bizim koltuğumuz (masa başı)
  const myChair = createChair(); myChair.position.set(SEAT.x, FY, SEAT.z + 0.05); myChair.rotation.y = Math.PI; g.add(myChair);

  // Sahne alanı: ekran + konuşmacı + perde
  const screenTex = textTexture((c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#071a1d'); gr.addColorStop(1, '#0d3a3f');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1ab0ba'; c.font = '500 34px "Red Hat Display", sans-serif'; c.letterSpacing = '10px';
    c.fillText('SELECTED WORK · 2016 — 2026', 80, 130);
    c.fillStyle = '#f2efe8'; c.font = '700 230px "Red Hat Display", sans-serif'; c.letterSpacing = '-6px';
    c.fillText('Works', 70, 360);
    c.fillStyle = 'rgba(242,239,232,.6)'; c.font = '400 40px "Red Hat Display", sans-serif'; c.letterSpacing = '0px';
    c.fillText('Eleven products, millions of daily users.', 80, 450);
  }, 1280, 560);
  const screen = add(plane(4.4, 1.925, new THREE.MeshStandardMaterial({ map: screenTex, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 0.9 })), TABLE.x, FY + 1.75, R.z0 + 0.02);
  const bezel = add(new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.02, 0.04), dark), TABLE.x, FY + 1.75, R.z0 + 0.0);
  void screen; void bezel;
  // Turkuaz LED çizgi (sahne zemini)
  const led = add(new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.01, 0.03), new THREE.MeshBasicMaterial({ color: 0x1ab0ba })), CX, FY + 0.006, CURTAIN_Z + 0.35);
  void led;

  // Konuşmacı (geçici beden: Rocketbox; Önder Bey'in kendi modeli gelince onder.glb değiştirilir)
  const presenter = createPerson({ name: 'onder', height: 1.8, hairStyle: 'short', hair: 0x2a2420, top: 0x1d2433 });
  presenter.root.position.copy(PRESENTER);
  g.add(presenter.root);

  // Konuşmacı spotu (perde kalkınca yanar)
  const spot = new THREE.SpotLight(0xfff0dd, 0, 9, 0.42, 0.5, 2);
  spot.position.set(TABLE.x, FY + 2.95, CURTAIN_Z + 1.2);
  spot.target.position.copy(PRESENTER).add(new THREE.Vector3(0, 1, 0));
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005;
  g.add(spot, spot.target);
  // Perdenin üstüne vuran yumuşak ışık
  const wash = new THREE.SpotLight(0xffe6c8, 26, 12, 0.7, 0.8, 2);
  wash.position.set(TABLE.x, FY + 2.9, -15); wash.target.position.set(TABLE.x, FY + 1.2, CURTAIN_Z);
  g.add(wash, wash.target);

  const curtain = createCurtain(W - 0.2, R.h - 0.02);
  curtain.group.position.set(CX, FY, CURTAIN_Z);
  g.add(curtain.group);
  // Perde rayı
  add(new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, 0.5), dark), CX, FY + R.h - 0.04, CURTAIN_Z + 0.1);

  return { group: g, people, presenter, curtain, spot };
}
