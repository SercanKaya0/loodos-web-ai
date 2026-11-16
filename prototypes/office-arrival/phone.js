// iPhone benzeri telefon: titanyum gövde, kamera adası, ekran (KD uygulaması canvas dokusu)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createPhoneScreen } from './kdapp.js';

export function createPhone() {
  const W = 0.0716, H = 0.1476, D = 0.0083;
  const group = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x3b3b3e, metalness: 0.85, roughness: 0.32 });
  const back = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.2, roughness: 0.55 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.0095), [frame, frame, frame, frame, frame, back]);
  body.castShadow = true;
  group.add(body);
  // Ekran (UI renkleri bozulmasın diye tone mapping dışında)
  const scr = createPhoneScreen(2);
  const tex = new THREE.CanvasTexture(scr.canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xe8e8e8 });
  const screenGeo = new THREE.PlaneGeometry(W - 0.0036, H - 0.0036);
  // Köşeleri yuvarlatılmış ekran maskesi
  const mask = document.createElement('canvas'); mask.width = 256; mask.height = 528;
  const mg = mask.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(0, 0, 256, 528); mg.fillStyle = '#fff';
  mg.beginPath(); mg.roundRect(1, 1, 254, 526, 36); mg.fill();
  screenMat.alphaMap = new THREE.CanvasTexture(mask); screenMat.transparent = true;
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = D / 2 + 0.0002;
  group.add(screen);
  // Ekran camı yansıması
  const glass = new THREE.Mesh(screenGeo, new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.05, clearcoat: 0.6, depthWrite: false }));
  glass.position.z = D / 2 + 0.0004; group.add(glass);
  // Kamera adası
  const isle = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.03, 0.002, 3, 0.006), frame);
  isle.position.set(-W / 2 + 0.019, H / 2 - 0.019, -D / 2 - 0.001); group.add(isle);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x050608, metalness: 0.4, roughness: 0.08 });
  for (const [x, y] of [[-0.007, 0.007], [-0.007, -0.007], [0.007, 0]]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.0022, 20), lensMat);
    l.rotation.x = Math.PI / 2; l.position.set(-W / 2 + 0.019 + x, H / 2 - 0.019 + y, -D / 2 - 0.0025); group.add(l);
  }
  // Yan tuşlar
  for (const [y, h, side] of [[0.03, 0.012, -1], [0.012, 0.018, -1], [-0.01, 0.018, -1], [0.02, 0.024, 1]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.0012, h, 0.0035), frame);
    b.position.set(side * (W / 2 + 0.0004), y, 0); group.add(b);
  }

  let current = null, prev = null, fadeK = 1, opts = {}, dirty = true;
  return {
    group,
    screenName: () => current,
    show(name, o = {}, fade = 0.35) {
      if (name !== current) { prev = current; current = name; fadeK = prev ? 0 : 1; this.fade = fade; }
      opts = o; dirty = true;
    },
    set(o) { opts = { ...opts, ...o }; dirty = true; },
    update(dt) {
      if (!current || (!dirty && fadeK >= 1)) return;
      dirty = false;
      if (fadeK < 1) fadeK = Math.min(1, fadeK + dt / (this.fade || 0.35));
      scr.draw(current, opts, fadeK < 1 ? prev : null, fadeK);
      tex.needsUpdate = true;
    },
  };
}
