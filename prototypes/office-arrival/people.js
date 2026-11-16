// Geçici insan figürleri (mimari görselleştirmelerdeki stilize mankenler).
// assets/cast/<ad>.glb verilirse figürün yerine o model yüklenir (Tripo/Mixamo rig'li karakter).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _r = new THREE.Quaternion();

function limb(parent, a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 0.6), 4, 12), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

/**
 * @param {object} o
 *  height, skin, hair, hairStyle('bun'|'short'|'long'), top, bottom, shoes, seated, female, name(glb)
 */
export function createPerson(o = {}) {
  const k = (o.height ?? 1.7) / 1.7;
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(k);
  root.add(body);

  const skin = new THREE.MeshStandardMaterial({ color: o.skin ?? 0xc99a7c, roughness: 0.55 });
  const top = new THREE.MeshStandardMaterial({ color: o.top ?? 0x2d3440, roughness: 0.85 });
  const bottom = new THREE.MeshStandardMaterial({ color: o.bottom ?? 0x1c1e22, roughness: 0.8 });
  const shoe = new THREE.MeshStandardMaterial({ color: o.shoes ?? 0x111111, roughness: 0.35 });
  const hairM = new THREE.MeshStandardMaterial({ color: o.hair ?? 0x2a1d15, roughness: 0.6 });

  const seated = !!o.seated;
  const dy = seated ? -0.45 : 0;

  // Bacaklar
  for (const sx of [-0.095, 0.095]) {
    if (seated) {
      limb(body, V(sx, 0.5, 0), V(sx, 0.5, 0.44), 0.075, bottom);
      limb(body, V(sx, 0.5, 0.44), V(sx, 0.1, 0.5), 0.06, bottom);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24), shoe); f.position.set(sx, 0.035, 0.56); body.add(f);
    } else {
      limb(body, V(sx, 0.95, 0), V(sx, 0.5, 0.01), 0.075, bottom);
      limb(body, V(sx, 0.5, 0.01), V(sx, 0.09, 0), 0.058, bottom);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24), shoe); f.position.set(sx, 0.035, 0.05); body.add(f);
    }
  }
  // Gövde (nefes alır)
  const torso = new THREE.Group(); torso.position.y = 0.95 + dy; body.add(torso);
  const chest = limb(torso, V(0, 0.04), V(0, 0.44), 0.165, top);
  chest.scale.set(o.female ? 1.08 : 1.2, 1, 0.72);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), bottom);
  pelvis.scale.set(o.female ? 1.12 : 1.02, 0.7, 0.8); pelvis.position.y = 0.0; torso.add(pelvis);
  limb(torso, V(0, 0.46), V(0, 0.57), 0.05, skin); // boyun

  // Kollar
  for (const sx of [-1, 1]) {
    const sh = V(sx * 0.2, 0.46);
    if (seated) {
      const el = V(sx * 0.25, 0.2, 0.16), wr = V(sx * 0.17, 0.25, 0.42);
      limb(torso, sh, el, 0.055, top); limb(torso, el, wr, 0.045, top);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), skin); h.scale.set(1, 0.6, 1.4); h.position.copy(wr).add(V(0, 0, 0.05)); torso.add(h);
    } else {
      const el = V(sx * 0.23, 0.17, 0.02), wr = V(sx * 0.24, -0.09, 0.05);
      limb(torso, sh, el, 0.055, top); limb(torso, el, wr, 0.045, top);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), skin); h.scale.set(0.8, 1.3, 1); h.position.copy(wr).add(V(0, -0.06, 0)); torso.add(h);
    }
  }

  // Baş (döner)
  const head = new THREE.Group(); head.position.y = 0.57; torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), skin);
  skull.scale.set(0.92, 1.12, 1); skull.position.y = 0.1; skull.castShadow = true; head.add(skull);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 8), skin);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.09, 0.105); head.add(nose);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), skin); ear.scale.set(0.5, 1, 0.8); ear.position.set(sx * 0.097, 0.1, 0); head.add(ear);
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.113, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
  cap.scale.set(0.95, 1.12, 1.04); cap.position.set(0, 0.11, -0.008); cap.rotation.x = -0.25; head.add(cap);
  if (o.hairStyle === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), hairM); bun.position.set(0, 0.2, -0.1); head.add(bun);
  } else if (o.hairStyle === 'long') {
    const back = limb(head, V(0, 0.14, -0.06), V(0, -0.12, -0.07), 0.09, hairM); back.scale.set(1.15, 1, 0.6);
  }

  const person = { root, head, torso, body, isGLB: false, lookYaw: 0, nod: 0, bones: {} };
  root.userData.person = person;

  if (o.name) {
    gltfLoader.load(`assets/cast/${o.name}.glb`, (g) => {
      const model = g.scene;
      model.traverse((m) => {
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
        if (m.isBone) person.bones[m.name] = m;
        if (m.isBone && /Bip01_Head$/.test(m.name)) person.headBone = m;
        if (m.isBone && /Bip01_Neck$/.test(m.name)) person.neckBone = m;
      });
      // Rig'li modelin gerçek boyu: iskelet güncellendikten sonra ölçülür
      const measure = () => {
        model.updateMatrixWorld(true);
        model.traverse((m) => { if (m.isSkinnedMesh) { m.skeleton.update(); m.computeBoundingBox(); } });
        return new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
      };
      model.scale.setScalar((o.height ?? 1.7) / measure());
      model.position.set(o.offset?.x ?? 0, o.offset?.y ?? 0, o.offset?.z ?? 0);
      root.remove(body); root.add(model);
      person.isGLB = true;
      person.mixer = new THREE.AnimationMixer(model);
      person.actions = {};
      g.animations.forEach((c) => { person.actions[c.name] = person.mixer.clipAction(c); });
      const first = person.actions[person.want] || person.actions.idle || Object.values(person.actions)[0];
      if (first) { first.play(); first.time = Math.random() * first.getClip().duration; person.current = first; }
    }, undefined, () => {});
  }
  // Animasyon geçişi (crossfade)
  person.play = (name, fade = 0.5) => {
    person.want = name;
    const next = person.actions?.[name];
    if (!next || next === person.current) return;
    next.reset().fadeIn(fade).play();
    person.current?.fadeOut(fade);
    person.current = next;
  };

  let t0 = Math.random() * 10;
  person.update = (dt, lookTarget) => {
    t0 += dt;
    person.mixer?.update(dt);
    if (person.isGLB) {
      const hb = person.headBone;
      let want = 0;
      if (hb && lookTarget) {
        const wp = hb.getWorldPosition(_v);
        const inv = root.getWorldQuaternion(_q).invert();
        const d = _d.copy(lookTarget).sub(wp).applyQuaternion(inv);
        want = THREE.MathUtils.clamp(Math.atan2(d.x, d.z), -1.1, 1.1);
      }
      person.lookYaw += (want - person.lookYaw) * Math.min(1, dt * 2.5);
      // Animasyonun üstüne ek dönüş: boyun %40, baş %60
      for (const [bone, part] of [[person.neckBone, 0.4], [hb, 0.6]]) {
        if (!bone) continue;
        const pq = bone.parent.getWorldQuaternion(_q2);
        const wq = bone.getWorldQuaternion(_q3);
        _r.setFromAxisAngle(UP, person.lookYaw * part);
        wq.premultiply(_r);
        bone.quaternion.copy(pq.invert().multiply(wq));
        bone.updateMatrixWorld(true);
      }
      return;
    }
    torso.scale.y = 1 + Math.sin(t0 * 1.6) * 0.006; // nefes
    if (lookTarget) {
      const wp = head.getWorldPosition(new THREE.Vector3());
      const inv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
      const d = lookTarget.clone().sub(wp).applyQuaternion(inv);
      const yaw = THREE.MathUtils.clamp(Math.atan2(d.x, d.z), -1.3, 1.3);
      const pitch = THREE.MathUtils.clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.5, 0.5);
      head.rotation.y += (yaw - head.rotation.y) * Math.min(1, dt * 3);
      head.rotation.x += (pitch - head.rotation.x) * Math.min(1, dt * 3);
    }
    head.rotation.x += Math.sin(t0 * 9) * 0.03 * person.nod; // konuşurken baş hareketi
    head.rotation.z = Math.sin(t0 * 0.7) * 0.03;
  };
  return person;
}

// Ofis koltuğu
export function createChair(color = 0x1e2024) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: 0.9, roughness: 0.3 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.48), m); seat.position.y = 0.47; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.06), m); back.position.set(0, 0.8, -0.24); back.rotation.x = -0.1; g.add(back);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8), metal); pole.position.y = 0.27; g.add(pole);
  for (let i = 0; i < 5; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.3), metal);
    leg.rotation.y = (i / 5) * Math.PI * 2; leg.position.set(Math.sin(leg.rotation.y) * 0.15, 0.06, Math.cos(leg.rotation.y) * 0.15); g.add(leg);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
