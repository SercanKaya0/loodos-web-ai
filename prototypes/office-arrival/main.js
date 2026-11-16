// Sahne akışı:
//  uyanma (göz kırpma) → sokakta yürüyüş → kapı → lobi: resepsiyonist "hoş geldiniz" der
//  → asansör → 5. kat toplantı odası → masa başına oturma → perde kalkar, konuşmacı görünür
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld, updateWorld, WALK_Y, GLASS_X, DOOR_Z, LOBBY } from './world.js';
import { buildRoom, FY, ROOM_DOOR, SEAT, PRESENTER, CURTAIN_Z, TABLE } from './room.js';
import { createPost } from './post.js';
import { createRain } from './rain.js';
import { Sound } from './audio.js';
import { buildStore, STORE, STORE_PRESENTER, STORE_CAM_START, STORE_CAM_STOP, BENCH_SEATS } from './store.js';
import { createPhone } from './phone.js';
import { loadKD, loadApps, drawNav } from './kdapp.js';
import { STOPS, FINALE, VOICE_IDS, lineText } from './tour.js';
import { buildStops, createScooter } from './stops.js';
import { createPerson } from './people.js';

const params = new URLSearchParams(location.search);
const EYE = 1.66, EYE_SIT = 1.2;
const STEP = 0.66;          // topuklu ayakkabı: biraz kısa adım
const WALK_SPEED = 1.95;    // sokakta "biraz hızlı" tempo
const WAKE_END = 3.4;
const LOOK_END = 5.0;
const WELCOME = {
  who: 'Resepsiyon',
  text: 'Merhaba, hoş geldiniz! Loodos ekibi sizi beşinci katta bekliyor. Asansörler hemen sağ tarafta.',
  dur: 9.4,
};

const LINES = {
  onder1: { dur: 20.1, text: "Merhaba, ben Önder Şahin. Ekim ayından beri Loodos'tayım; iş geliştirme ve büyüme benden sorulur. Yirmi sekiz yılda sekiz durak: bankacılık teknolojileri, Hewlett-Packard, SAP ve Bakü. Dokuzuncu durağı şimdi Loodos'ta birlikte yazıyoruz." },
  onder2: { dur: 5.4, text: "Şimdi size Loodos'ta geliştirdiğimiz uygulamalardan bahsetmek istiyorum." },
  onder3: { dur: 7.2, text: "İlk durağımız Kahve Dünyası. Hadi, hep beraber Kahve Dünyası'na bakalım!" },
  store1: { dur: 10.3, text: 'İşte geldik! Kahve Dünyası uygulamasının ana sayfasında Çekirdeklerinizi ve Biri Bizden ilerlemenizi tek bakışta görüyorsunuz.' },
  store2: { dur: 7.2, text: 'Hazır Al ile siparişinizi yoldayken veriyor, mağazaya geldiğinizde sıra beklemeden alıyorsunuz.' },
  store3: { dur: 6.8, text: "Online Mağaza'da ise Türk kahvesinden çikolataya kadar tüm ürünler bir dokunuş uzağınızda." },
  store4: { dur: 7.7, text: 'Kahve Dünyası uygulamasını Loodos olarak geliştiriyoruz. Sıradaki uygulamaya geçelim mi?' },
};

// Uygulama durakları + kapanış cümleleri
VOICE_IDS.forEach((id) => { LINES[id] = { dur: lineText(id).length * 0.072, text: lineText(id) }; });
void FINALE;

// --- Renderer
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 1600);
camera.rotation.order = 'YXZ';
scene.add(camera);

const world = buildWorld(scene);
// Lobi/kabin ışıkları (sokak ışıkları hariç) — toplantı odasındayken kapatılır
const lobbyLights = [];
scene.traverse((o) => { if (o.isLight && !o.isHemisphereLight && o.position.x < GLASS_X - 0.1 && o.position.y < 10) lobbyLights.push(o); });
const room = buildRoom(scene, { glassMat: world.glassMats[0], envMats: world.lobbyMats });
const roomLights = [];
room.group.traverse((o) => { if (o.isLight) roomLights.push(o); });
const store = buildStore(scene, { envMats: world.lobbyMats });
const stops = buildStops(scene, { envMats: world.lobbyMats, createPerson });
// BRIFIC: sokakta, kaldırımda bir scooter
const scooter = createScooter();
scooter.position.set(-1.6, WALK_Y, -0.65); scooter.rotation.y = -1.15; scooter.visible = false;
scene.add(scooter);
stops.where.brific = {
  env: null, p: new THREE.Vector3(-2.35, WALK_Y, 0.15), ry: 0.1,
  cam: [new THREE.Vector3(-1.9, WALK_Y, 5.6), new THREE.Vector3(-2.05, WALK_Y, 2.05)], seats: [],
};
const envName = (e) => Object.keys(stops.envs).find((n) => stops.envs[n] === e);
const recHome = { pos: world.receptionist.root.position.clone(), ry: world.receptionist.root.rotation.y };
const phone = createPhone();
phone.group.visible = false;
scene.add(phone.group);
const navCanvas = document.getElementById('nav');
const navCtx = navCanvas.getContext('2d');
const rain = createRain(scene, []);
const post = createPost(renderer, scene, camera);
post.setSize(window.innerWidth, window.innerHeight);
post.bloom.threshold = 0.95;
post.film.grain.value = 0.03;
const sound = new Sound();

// Bölge ışıkları: 'street' (sokak+lobi) | 'room' (5. kat) | 'store' (KD mağazası)
function setArea(a, { dry = false } = {}) {
  lobbyLights.forEach((l) => { l.visible = a === 'street'; });
  roomLights.forEach((l) => { l.visible = a === 'room'; });
  store.lights.forEach((l) => { l.visible = a === 'store'; });
  for (const [n, e] of Object.entries(stops.envs)) {
    e.group.visible = n === a;
    e.lights.forEach((l) => { l.visible = n === a; });
  }
  world.sun.visible = a === 'street' || a === 'room';
  world.hemi.visible = a === 'street' || a === 'room';
  rain.visible = a === 'street' && !dry;
  sound.dry = dry ? 1 : 0;
}
setArea('street');
// Katılımcıların toplantı odasındaki yerleri (replay için)
const homes = room.people.map((p) => ({ pos: p.root.position.clone(), ry: p.root.rotation.y }));

// --- Yansımalar: sokak için şehir küp haritası, iç mekânlar için oda yansıması
const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
const cubeCam = new THREE.CubeCamera(0.5, 1500, cubeRT);
cubeCam.position.set(7, 2.2, -8);
function bakeEnv() {
  rain.visible = false;
  world.cars.forEach((c) => { c.obj.visible = false; });
  cubeCam.update(renderer, scene);
  rain.visible = true;
  world.cars.forEach((c) => { c.obj.visible = true; });
  scene.environment = cubeRT.texture;
  const pm = new THREE.PMREMGenerator(renderer);
  const roomEnv = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  world.lobbyMats.forEach((m) => { m.envMap = roomEnv; m.envMapIntensity = 0.22; });
}

// --- Yollar
const v = (x, z) => new THREE.Vector3(x, 0, z);
const leg = (y, pts) => {
  const path = new THREE.CatmullRomCurve3(pts.map(([x, z]) => v(x, z)), false, 'centripetal');
  return { y, path, len: path.getLength() };
};
const LEGS = {
  street: leg(WALK_Y, [[-2.3, 6], [-2.1, -3], [-2.25, -10.5], [-3.5, -14.8], [GLASS_X + 0.6, -15.95], [GLASS_X - 1.5, -16], [-8.7, -15.3], [-10.7, -13.5]]),
  elev: leg(WALK_Y, [[-10.7, -13.5], [-10.9, -16.0], [-11.9, -18.9], [-12.5, -20.6], [-12.5, -23.0]]),
  room: leg(FY, [[ROOM_DOOR.x, -10.45], [-13.6, -10.85], [-12.0, -11.2], [SEAT.x, -11.35]]),
  store: leg(STORE.y, [[STORE_CAM_START.x, STORE_CAM_START.z], [0.3, 4.0], [STORE_CAM_STOP.x, STORE_CAM_STOP.z]]),
};
let DOOR_S = 0;
for (let i = 0; i <= 400; i++) {
  if (LEGS.street.path.getPointAt(i / 400).x <= GLASS_X) { DOOR_S = (i / 400) * LEGS.street.len; break; }
}
const RECEPTION_HEAD = new THREE.Vector3(-12, WALK_Y + 1.6, -10.6);
const ELEV = world.elevators[0];

// --- Durum
const st = { pos: new THREE.Vector3(), tan: new THREE.Vector3(0, 0, -1) };
const $ = (id) => document.getElementById(id);
function reset() {
  Object.assign(st, {
    T: 0, started: true, phase: 'wake', phaseT: 0,
    leg: LEGS.street, s: 0, speed: 0, dist: 0, stepIdx: 0, foot: 0, eye: EYE, baseY: WALK_Y,
    yaw: 0, pitch: -0.28, roll: 0.14, bobAmt: 0, fade: 1,
    door: 0, doorOpening: false, doorClosing: false, doorClosed: false,
    greetDone: false, speaking: false, elevOpen: false, rideFx: 0,
    placeShown: false, placeHidden: false, ended: false,
  });
  st.pos.set(-2.3, 0, 6); st.tan.set(0, 0, -1);
  world.doors.forEach((d) => { d.pivot.rotation.y = 0; });
  world.elevators.forEach((e) => { e.open = 0; });
  room.curtain.lift = 0;
  camera.fov = 62; camera.updateProjectionMatrix();
  room.spot.intensity = 0;
  setArea('street');
  ['end', 'place', 'subs'].forEach((id) => $(id).classList.remove('is-on'));
  Object.assign(st, { free: false, pull: 0, presentPhone: false, line: null, lineDone: false, nav: 0, white: 0 });
  phone.group.visible = false;
  room.presenter.root.position.copy(PRESENTER); room.presenter.root.rotation.y = 0; room.presenter.play('idle');
  room.people.forEach((p, i) => { p.root.position.copy(homes[i].pos); p.root.rotation.y = homes[i].ry; });
  navCanvas.style.opacity = 0; $('white').style.opacity = 0;
  sound.cafe = false;
  Object.assign(st, { stop: -1, saidA: false, saidB: false, saidF: false, outShown: false, talker: null, finaleEnd: false });
  scooter.visible = false;
  world.receptionist.root.position.copy(recHome.pos); world.receptionist.root.rotation.y = recHome.ry;
  room.presenter.root.visible = true;
  $('end').classList.remove('is-final');
  $('place').classList.remove('is-top');
  $('placeTime').textContent = '09:55'; $('placeName').textContent = 'Maslak · Büyükdere Caddesi'; $('placeSub').textContent = 'Noramin İş Merkezi · No 237';
  markChapter('start');
}

function subs(who, text) {
  $('subsWho').textContent = who; $('subsText').textContent = text;
  $('subs').classList.toggle('is-on', !!text);
}

// Göz kapağı anahtar kareleri [zaman, açıklık]
const LID_KEYS = [[0, 0], [0.5, 0], [0.9, 0.3], [1.1, 0.28], [1.3, 0.03], [1.7, 0.03], [2.15, 0.6], [2.35, 0.56], [2.5, 0.12], [2.7, 0.16], [3.4, 1]];
function lidAt(t) {
  for (let i = 1; i < LID_KEYS.length; i++) {
    const [t1, v1] = LID_KEYS[i];
    if (t <= t1) {
      const [t0, v0] = LID_KEYS[i - 1];
      const k = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (k * k * (3 - 2 * k));
    }
  }
  return 1;
}
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDamp = (a, b, k, dt) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * (1 - Math.exp(-k * dt)); };

const tmp = new THREE.Vector3();
const look = new THREE.Vector3();
const fwd = new THREE.Vector3();
const PRESENTER_HEAD = PRESENTER.clone().add(new THREE.Vector3(0, 1.62, 0));

// Yol boyunca yürü (hedef hıza yumuşak ivme, sona doğru frenleme)
function walk(dt, target) {
  const L = st.leg.len;
  target = Math.min(target, Math.sqrt(Math.max(0, 2 * 1.1 * (L - st.s))));
  st.speed = damp(st.speed, target, st.speed < target ? 1.8 : 4, dt);
  const ds = Math.min(L - st.s, st.speed * dt);
  st.s += ds; st.dist += ds;
  const u = st.s / L;
  st.pos.copy(st.leg.path.getPointAt(u));
  st.tan.copy(st.leg.path.getTangentAt(u));
  return st.s >= L - 0.02;
}
function aheadOnLeg(m) {
  return st.leg.path.getPointAt(Math.min(1, (st.s + m) / st.leg.len));
}
function go(phase) { st.phase = phase; st.phaseT = 0; }

const tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3(), hp = new THREE.Vector3(), pk = new THREE.Vector3();
st.camPos = new THREE.Vector3(); st.camLook = new THREE.Vector3();
const STORE_HEAD = STORE.clone().add(STORE_PRESENTER).add(new THREE.Vector3(0, 1.62, 0));

// Konuşmacının cümlesi: ses + altyazı; bitince st.lineDone
function say(id) {
  const L = LINES[id];
  st.line = id; st.lineDone = false; st.lineT0 = st.T;
  const head = room.presenter.headBone ? room.presenter.headBone.getWorldPosition(new THREE.Vector3()) : PRESENTER_HEAD;
  const d = sound.voice(id, head, () => { if (st.line === id) st.lineDone = true; }, 7);
  st.lineDur = d || L.dur;
  st.talker = room.presenter;
  subs('Önder Şahin', L.text);
}
// Telefon: cepten ele, ekranı izleyiciye (ya da konuşmacının kendisine) dönük
function placePhone() {
  const P = room.presenter, hand = P.bones?.Bip01_R_Hand, thigh = P.bones?.Bip01_R_Thigh;
  if (!hand || st.pull <= 0) { phone.group.visible = false; return; }
  phone.group.visible = true;
  hand.getWorldPosition(hp);
  thigh.getWorldPosition(pk); pk.y -= 0.14;
  const target = st.presentPhone ? camera.position : (P.headBone ? P.headBone.getWorldPosition(tmp2) : PRESENTER_HEAD);
  const toT = tmp3.subVectors(target, hp).normalize();
  // telefon parmakların önünde dursun (ekran kapanmasın)
  hp.addScaledVector(toT, st.presentPhone ? 0.1 : 0.04); hp.y += 0.07;
  const k = st.pull * st.pull * (3 - 2 * st.pull);
  phone.group.position.lerpVectors(pk, hp, k);
  phone.group.lookAt(target);
  phone.group.scale.setScalar(0.6 + 0.4 * k);
  phone.update(1 / 60);
}
// Telefon ekranını kadraja dolduracak kamera konumu
function phoneTarget(out, dist) {
  // dikey ekranda (mobil) yatay görüş dar: telefon taşmasın diye biraz uzak dur
  dist *= Math.min(1.7, Math.max(1, 0.78 / camera.aspect));
  const p = phone.group.position;
  const dir = tmp2.copy(st.camFrom || camera.position).sub(p); dir.y = 0; dir.normalize();
  return out.copy(p).addScaledVector(dir, dist).add(tmp3.set(0, 0.02, 0));
}
function followPhone(dist) {
  phoneTarget(tmp, dist);
  st.camPos.lerp(tmp, 0.15); st.camLook.copy(phone.group.position);
}
function drawNavFrame(progress, zoom) {
  const dpr = Math.min(window.devicePixelRatio, 2), w = window.innerWidth, h = window.innerHeight;
  if (navCanvas.width !== w * dpr) { navCanvas.width = w * dpr; navCanvas.height = h * dpr; }
  navCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawNav(navCtx, w, h, { progress, zoom, t: st.T });
}
// KD mağazasına geçiş: konuşmacı ve ekip mağazada
function enterStore() {
  setArea('store');
  room.presenter.root.position.copy(STORE).add(STORE_PRESENTER);
  room.presenter.root.rotation.y = 0;
  room.people.slice(0, BENCH_SEATS.length).forEach((p, i) => {
    p.root.position.set(STORE.x + BENCH_SEATS[i][0], STORE.y, STORE.z + BENCH_SEATS[i][1]);
    p.root.rotation.y = Math.PI / 2;
  });
  room.people.slice(BENCH_SEATS.length).forEach((p) => { p.root.position.y = -500; });
  phone.show('home');
  sound.hush(); sound.murmur(80); sound.cafe = true;
  st.leg = LEGS.store; st.s = 0; st.baseY = STORE.y; st.eye = EYE; st.free = false;
  st.pos.copy(LEGS.store.path.getPointAt(0)); st.tan.copy(LEGS.store.path.getTangentAt(0));
  st.yaw = 0; st.pitch = -0.05;
  camera.fov = 55; camera.updateProjectionMatrix();
  st.store1 = false;
  go('storeIn');
}

// Bir uygulama durağına geçiş (beyaz ekranın arkasında)
function presenterHead() { return room.presenter.headBone ? room.presenter.headBone.getWorldPosition(hp) : PRESENTER_HEAD; }
function placeCast(W) {
  room.people.forEach((p, i) => {
    const seat = W.seats[i];
    if (seat) { p.root.position.copy(seat.p); p.root.rotation.y = seat.ry; } else p.root.position.y = -500;
  });
  const rec = world.receptionist.root;
  if (W.clerk) { rec.position.copy(W.clerk.p); rec.rotation.y = W.clerk.ry; } else { rec.position.copy(recHome.pos); rec.rotation.y = recHome.ry; }
}
function showPlace(title, sub) {
  $('placeTime').textContent = title; $('placeName').textContent = sub; $('placeSub').textContent = 'Loodos ile geliştirildi';
  $('place').classList.add('is-on', 'is-top');
  clearTimeout(showPlace.t); showPlace.t = setTimeout(() => $('place').classList.remove('is-on'), 3800);
}
function enterStop(i) {
  const S = STOPS[i], W = stops.where[S.id];
  st.stop = i; st.saidA = false; st.saidB = false;
  setArea(W.env ? envName(W.env) : 'street', { dry: true });
  scooter.visible = S.id === 'brific';
  room.presenter.root.position.copy(W.p); room.presenter.root.rotation.y = W.ry;
  room.presenter.play('phone', 0.1);
  placeCast(W);
  st.pull = 1; st.presentPhone = true; phone.show(S.screens[0], {}, 0.01);
  sound.hush(); sound.cafe = W.env ? envName(W.env) === 'cafe' : false;
  if (W.env && ['cafe', 'market', 'gate', 'telco'].includes(envName(W.env))) sound.murmur(40);
  const path = new THREE.CatmullRomCurve3([W.cam[0], W.cam[0].clone().lerp(W.cam[1], 0.5), W.cam[1]]);
  st.leg = { y: W.p.y, path, len: path.getLength() };
  st.s = 0; st.speed = 0; st.baseY = W.p.y; st.eye = EYE; st.free = false;
  st.pos.copy(W.cam[0]); st.tan.copy(path.getTangentAt(0));
  fwd.subVectors(W.p, W.cam[0]); st.yaw = Math.atan2(-fwd.x, -fwd.z); st.pitch = -0.02;
  camera.fov = 55; camera.updateProjectionMatrix();
  subs('', '');
  showPlace(S.title, S.place);
  markChapter(S.id);
  go('tIn');
}
// Kapanış: toplantı odasına dönüş
function enterFinale() {
  setArea('room');
  scooter.visible = false;
  room.presenter.root.position.copy(PRESENTER); room.presenter.root.rotation.y = 0;
  room.presenter.play('talk', 0.2);
  st.pull = 0; st.presentPhone = false; phone.group.visible = false;
  room.people.forEach((p, i) => { p.root.position.copy(homes[i].pos); p.root.rotation.y = homes[i].ry; });
  world.receptionist.root.position.copy(recHome.pos); world.receptionist.root.rotation.y = recHome.ry;
  room.curtain.lift = 1; room.spot.intensity = 60;
  st.baseY = FY; st.eye = EYE_SIT; st.free = false; st.speed = 0; st.bobAmt = 0;
  st.pos.set(SEAT.x, 0, SEAT.z);
  sound.hush(); sound.cafe = false; sound.murmur(30);
  camera.fov = 40; camera.updateProjectionMatrix();
  subs('', '');
  markChapter('finale');
  go('finale');
}

function step(dt) {
  const T = (st.T += dt);
  st.phaseT += dt;
  const pt = st.phaseT;

  // Uyanma efektleri
  const wake = smooth(0.2, 3.8, T);
  post.film.lid.value = lidAt(T);
  post.film.blur.value = 1 - smooth(0.6, 4.2, T);
  post.film.desat.value = 0.12 + 0.35 * (1 - wake);
  post.film.vignette.value = 1 + 1.2 * (1 - wake);
  if (!st.placeShown && T > 4.2) { st.placeShown = true; $('place').classList.add('is-on'); }
  if (!st.placeHidden && T > 11) { st.placeHidden = true; $('place').classList.remove('is-on'); }

  // ses çalmasa da (ya da yüklenmediyse) cümle süresi dolunca bitmiş say
  if (st.line && !st.lineDone && T - st.lineT0 > st.lineDur + 0.4) st.lineDone = true;
  let lookMode = 'path';
  switch (st.phase) {
    case 'wake':
      lookMode = 'wake';
      if (T > LOOK_END) go('street');
      break;

    case 'street': {
      let target = WALK_SPEED;
      if (st.s > DOOR_S - 3.6 && st.door < 0.55) target = 0.75;
      else if (st.s > DOOR_S - 0.5) target = 1.35;
      const done = walk(dt, target);
      if (!st.doorOpening && st.s > DOOR_S - 3.3) { st.doorOpening = true; sound.door(); }
      if (done) {
        go('greet');
        const d = sound.voice('welcome', RECEPTION_HEAD, () => { st.greetDone = true; });
        st.greetDur = d || WELCOME.dur;
        st.speaking = true;
        world.receptionist.play('talk'); st.talker = world.receptionist;
        subs(WELCOME.who, WELCOME.text);
      }
      break;
    }

    case 'greet':
      if (pt > st.greetDur + 0.1) st.greetDone = true;
      if (st.greetDone && st.speaking) { st.speaking = false; subs('', ''); world.receptionist.play('idle'); }
      if (st.greetDone && pt > st.greetDur + 0.3) { go('elev'); st.leg = LEGS.elev; st.s = 0; }
      break;

    case 'elev': {
      const nearEnd = st.leg.len - st.s;
      const target = nearEnd < 3.4 && ELEV.open < 0.8 ? 0.5 : 1.35;
      const done = walk(dt, target);
      if (!st.elevOpen && nearEnd < 4.2) { st.elevOpen = true; sound.ding(); setTimeout(() => sound.slide(1.1), 250); }
      if (done) go('ride');
      break;
    }

    case 'ride':
      lookMode = 'ride';
      if (pt > 0.9 && st.elevOpen) { st.elevOpen = false; sound.slide(1.1); }
      if (pt > 1.7) st.fade = Math.max(0, 1 - (pt - 1.7) / 0.7);
      if (pt > 1.8 && !st.rideFx) { st.rideFx = 1; sound.ride(2.6); }
      if (pt > 4.3) {
        // 5. kat: toplantı odası
        sound.ding();
        sound.murmur(60);
        setArea('room');
        st.leg = LEGS.room; st.s = 0; st.baseY = FY;
        st.pos.copy(LEGS.room.path.getPointAt(0)); st.tan.copy(LEGS.room.path.getTangentAt(0));
        st.yaw = Math.PI * 0.95; st.pitch = 0;
        go('room');
      }
      break;

    case 'room':
      st.fade = Math.min(1, pt / 1.2);
      if (pt > 0.6 && walk(dt, 1.1)) go('sit');
      break;

    case 'sit': {
      // Masa başındaki koltuğa otur
      const k = smooth(0.2, 1.6, pt);
      st.eye = EYE + (EYE_SIT - EYE) * k;
      st.pos.lerpVectors(LEGS.room.path.getPointAt(1), tmp.set(SEAT.x, 0, SEAT.z), k);
      lookMode = 'stage';
      if (pt > 3.2) { go('reveal'); sound.hush(); sound.curtain(5.2); }
      break;
    }

    case 'reveal':
      lookMode = 'stage';
      room.curtain.lift = smooth(0.2, 5.2, pt);
      room.spot.intensity = 60 * smooth(1.2, 3.2, pt);
      room.presenter.setPose?.('talk');
      camera.fov = 62 - 24 * smooth(2.5, 7.5, pt);
      camera.updateProjectionMatrix();
      if (pt > 7.2) { go('talk1'); say('onder1'); room.presenter.play('talk', 0.8); }
      break;

    case 'talk1':
      lookMode = 'stage';
      if (st.lineDone) { go('talk2'); say('onder2'); room.presenter.play('talk2', 0.8); }
      break;

    case 'talk2':
      // cümlenin sonuna doğru telefonu cebinden çıkarır
      lookMode = 'stage';
      if (!st.pulling && pt > Math.max(0.5, st.lineDur - 2.2)) { st.pulling = true; room.presenter.play('phone', 0.7); }
      if (st.pulling) st.pull = Math.min(1, st.pull + dt / 1.3);
      if (st.lineDone && st.pull >= 1) {
        go('talk3'); say('onder3');
        st.presentPhone = true; phone.show('home');
        st.free = true; st.camFrom = camera.position.clone(); st.lookFrom = look.clone();
      }
      break;

    case 'talk3': {
      // kamera masanın üstünden telefona yaklaşır; ekran haritaya geçer
      const k = smooth(0.4, Math.max(2.5, st.lineDur - 0.2), pt);
      phoneTarget(tmp, 0.19);
      st.camPos.lerpVectors(st.camFrom, tmp, k);
      st.camLook.lerpVectors(PRESENTER_HEAD, phone.group.position, smooth(0.0, 1.5, pt));
      camera.fov = 38 - 6 * k; camera.updateProjectionMatrix();
      if (pt > st.lineDur * 0.42 && phone.screenName() !== 'map') phone.show('map', { progress: 0 }, 0.5);
      if (st.lineDone && k >= 1) go('nav');
      break;
    }

    case 'nav': {
      // tam ekran navigasyon: rota çizilir → KD pinine yakınlaşılır → beyaz geçiş
      st.nav = Math.min(1, pt / 0.5);
      if (pt < 0.1) subs('', '');
      const progress = smooth(0.4, 3.8, pt);
      const zoom = smooth(4.2, 6.4, pt);
      drawNavFrame(progress, zoom);
      st.white = smooth(5.6, 6.5, pt);
      if (pt > 6.6) enterStore();
      break;
    }

    case 'storeIn': {
      st.white = 1 - smooth(0.1, 1.2, pt);
      st.nav = 1 - smooth(0, 0.2, pt);
      lookMode = 'storeLook';
      if (pt > 1.0 && !st.store1) { st.store1 = true; say('store1'); }
      if (walk(dt, 1.0) && st.store1) {
        go('zoomPhone'); st.free = true; st.camFrom = camera.position.clone();
      }
      break;
    }

    case 'zoomPhone': {
      const k = smooth(0.2, 2.6, pt);
      phoneTarget(tmp, 0.2);
      st.camPos.lerpVectors(st.camFrom, tmp, k);
      st.camLook.lerpVectors(STORE_HEAD, phone.group.position, k);
      camera.fov = 55 - 10 * k; camera.updateProjectionMatrix();
      if (st.lineDone && k >= 1) { go('app2'); }
      break;
    }

    case 'app2':
      followPhone(0.2);
      if (pt < 0.6) phone.set({ tap: { x: 104, y: 480, k: pt / 0.6 } });
      else if (phone.screenName() !== 'order') { phone.show('order', { ready: 0 }); say('store2'); }
      else phone.set({ ready: smooth(st.lineDur * 0.45, st.lineDur * 0.6, pt - 0.6), tap: null });
      if (st.lineDone && pt > 1) go('app3');
      break;

    case 'app3':
      followPhone(0.2);
      if (pt < 0.45) phone.set({ tap: { x: 24, y: 79, k: pt / 0.45 } });
      else if (pt < 0.5) phone.show('home', {}, 0.2);
      else if (pt < 1.1) phone.set({ tap: { x: 289, y: 480, k: (pt - 0.5) / 0.6 } });
      else if (phone.screenName() !== 'shop') { phone.show('shop'); say('store3'); }
      if (st.lineDone && pt > 1.5) { go('outro'); st.camFrom = camera.position.clone(); phone.show('home', {}, 0.4); say('store4'); }
      break;

    case 'outro': {
      const k = smooth(0.3, 3.5, pt);
      phoneTarget(tmp, 0.2);
      st.camPos.lerpVectors(tmp, tmp2.copy(STORE).add(STORE_CAM_STOP).setY(STORE.y + 1.6).add(tmp3.set(-0.6, 0, 0.6)), k);
      st.camLook.lerpVectors(phone.group.position, STORE_HEAD, k);
      camera.fov = 45 + 10 * k; camera.updateProjectionMatrix();
      if (st.lineDone && pt > 3.6) { st.stop = -1; st.camFrom = camera.position.clone(); go('tOut'); }
      break;
    }

    // ---------- Uygulama durakları ----------
    case 'tIn': {
      // beyaz geçişten çık, konuşmacıya yürü
      st.white = 1 - smooth(0.05, 0.9, pt);
      lookMode = 'tour';
      if (pt > 0.6 && !st.saidA) { st.saidA = true; say(`${STOPS[st.stop].id}_a`); }
      const done = walk(dt, 0.95);
      if (done && st.saidA && pt > 2.2) { go('tZoom'); st.free = true; st.camFrom = camera.position.clone(); st.lookFrom = presenterHead().clone(); }
      break;
    }
    case 'tZoom': {
      const k = smooth(0.1, 2.2, pt);
      phoneTarget(tmp, 0.2);
      st.camPos.lerpVectors(st.camFrom, tmp, k);
      st.camLook.lerpVectors(st.lookFrom, phone.group.position, k);
      camera.fov = 55 - 10 * k; camera.updateProjectionMatrix();
      if (st.lineDone && k >= 1) go('tApp');
      break;
    }
    case 'tApp': {
      const S = STOPS[st.stop];
      followPhone(0.2);
      if (pt < 0.6) phone.set({ tap: { x: 196, y: 560, k: pt / 0.6 } });
      else if (!st.saidB) { st.saidB = true; phone.show(S.screens[1], { scroll: 0 }); say(`${S.id}_b`); }
      else phone.set({ tap: null, scroll: smooth(1.5, Math.max(2, st.lineDur - 1), pt - 0.6) });
      if (st.saidB && st.lineDone && pt > 1.5) { go('tOut'); st.camFrom = camera.position.clone(); }
      break;
    }
    case 'tOut': {
      // telefonda sıradaki uygulama açılır, kamera ekrana dalar → beyaz
      const next = STOPS[st.stop + 1];
      if (!st.outShown) { st.outShown = true; phone.show(next ? next.screens[0] : 'loodos', {}, 0.45); subs('', ''); }
      const k = smooth(0.0, 1.0, pt), k2 = smooth(0.9, 2.1, pt);
      phoneTarget(tmp, 0.2 - 0.16 * k2);
      st.free = true;
      st.camPos.lerpVectors(st.camFrom, tmp, Math.max(k, k2));
      st.camLook.copy(phone.group.position);
      st.white = smooth(1.5, 2.2, pt);
      if (pt > 2.3) { st.outShown = false; if (next) enterStop(st.stop + 1); else enterFinale(); }
      break;
    }
    case 'finale': {
      st.white = 1 - smooth(0.05, 1.0, pt);
      lookMode = 'stage';
      if (pt > 1.2 && !st.saidF) { st.saidF = true; say('finale'); }
      if (st.saidF && st.lineDone && !st.finaleEnd) { st.finaleEnd = pt; sound.curtain(5.2); subs('', ''); room.presenter.play('idle', 0.8); }
      if (st.finaleEnd) {
        const q = pt - st.finaleEnd;
        room.curtain.lift = 1 - smooth(0.3, 5.5, q);
        if (q > 4.5 && !st.ended) { st.ended = true; $('end').classList.add('is-on', 'is-final'); }
      }
      break;
    }
  }

  // Kapı (sokak girişi)
  if (st.doorOpening && !st.doorClosing) st.door = Math.min(1, st.door + dt / 1.25);
  if (!st.doorClosing && st.phase === 'street' && st.s > DOOR_S + 2.4) st.doorClosing = true;
  if (st.doorClosing && !st.doorClosed) {
    st.door = Math.max(0, st.door - dt / 1.6);
    if (st.door === 0) { st.doorClosed = true; sound.doorClose(); }
  }
  const ease = st.door * st.door * (3 - 2 * st.door);
  world.doors.forEach((d) => { d.pivot.rotation.y = d.dir * ease * 1.62; });
  ELEV.open = damp(ELEV.open, st.elevOpen ? 1 : 0, 3.2, dt);

  // Konum + baş sallanması + topuklu ayak sesleri
  const walking = Math.min(1, st.speed / 1.3) * (['sit', 'reveal', 'ride', 'greet', 'talk1', 'talk2'].includes(st.phase) ? 0 : 1);
  st.bobAmt = damp(st.bobAmt, walking, 6, dt);
  if (st.bobAmt < 0.05) st.speed = damp(st.speed, 0, 6, dt);
  const phase = (st.dist / STEP) * Math.PI;
  const idx = Math.floor(st.dist / STEP);
  if (idx > st.stepIdx) {
    st.stepIdx = idx; st.foot ^= 1;
    sound.step(st.baseY > 10 ? 'carpet' : st.baseY < -10 || st.pos.x < GLASS_X ? 'marble' : 'wet', st.foot);
  }
  const right = tmp.set(-st.tan.z, 0, st.tan.x);
  const sway = Math.sin(phase) * 0.026 * st.bobAmt;
  camera.position.set(
    st.pos.x + right.x * sway,
    st.baseY + st.eye + Math.abs(Math.sin(phase)) * 0.045 * st.bobAmt - 0.025 * st.bobAmt + Math.sin(T * 1.4) * 0.006,
    st.pos.z + right.z * sway,
  );

  // Bakış
  let tYaw, tPitch, k = 3;
  if (st.free) {
    camera.position.copy(st.camPos);
    camera.lookAt(st.camLook);
    st.yaw = camera.rotation.y; st.pitch = camera.rotation.x;
  } else if (lookMode === 'wake' && T < WAKE_END) {
    tYaw = Math.sin(T * 0.6) * 0.08;
    tPitch = -0.28 + 0.26 * smooth(1.5, 5, T);
    st.roll = damp(st.roll, 0.14 * (1 - smooth(2, 5.2, T)), 2, dt);
    k = 1.5;
  } else if (lookMode === 'wake') {
    const a = smooth(WAKE_END, WAKE_END + 0.75, T) - smooth(WAKE_END + 0.85, LOOK_END, T);
    tYaw = 0.55 * a; tPitch = -0.02 + 0.22 * a; k = 2.2;
  } else if (lookMode === 'ride') {
    tYaw = Math.PI; tPitch = -0.02; k = 2.2;
  } else {
    if (lookMode === 'tour') {
      // önce mekâna, sonra konuşmacıya
      const W = stops.where[STOPS[st.stop].id];
      const hd = presenterHead();
      look.copy(hd).add(tmp.set(-Math.sin(W.ry) * 2.5, 0.3, -Math.cos(W.ry) * 2.5)).lerp(hd, smooth(0.6, 2.4, st.phaseT));
      look.lerp(phone.group.position, 0.15 * smooth(1.5, 3, st.phaseT));
    } else if (lookMode === 'storeLook') {
      // önce banktaki ekibe, sonra konuşmacıya
      look.copy(STORE).add(tmp.set(-3.0, 1.15, 0.6)).lerp(tmp2.copy(STORE_HEAD).lerp(phone.group.position, 0.3), smooth(1.2, 3.2, st.phaseT));
    } else if (lookMode === 'stage') {
      look.copy(PRESENTER_HEAD).lerp(tmp.set(TABLE.x, FY + 1.3, CURTAIN_Z), st.phase === 'reveal' ? 1 - smooth(1.5, 4.5, st.phaseT) : 1);
    } else if (st.phase === 'street') {
      const a = aheadOnLeg(5); look.set(a.x, WALK_Y + EYE - 0.12, a.z);
      const dS = DOOR_S - st.s;
      const wTotem = smooth(17, 12, dS) * (1 - smooth(9, 6.5, dS));
      const wDoor = smooth(6.5, 4, dS) * (1 - smooth(0, -1.5, dS));
      const wRec = smooth(-1.0, -3.0, dS);
      look.lerp(tmp.set(-3.75, WALK_Y + 1.7, -9.4), wTotem * 0.55);
      look.lerp(tmp.set(GLASS_X, WALK_Y + 1.5, DOOR_Z), wDoor * 0.7);
      look.lerp(RECEPTION_HEAD, wRec * 0.85);
    } else if (st.phase === 'greet') {
      look.copy(RECEPTION_HEAD);
    } else if (st.phase === 'elev') {
      const a = aheadOnLeg(4); look.set(a.x, WALK_Y + EYE - 0.1, a.z);
      look.lerp(tmp.set(ELEV.x, WALK_Y + 1.5, LOBBY.z0), smooth(4.5, 2.5, st.leg.len - st.s) * (1 - smooth(1.4, 0.6, st.leg.len - st.s)));
    } else if (st.phase === 'room') {
      const a = aheadOnLeg(3); look.set(a.x, FY + EYE - 0.15, a.z);
      look.lerp(tmp.set(TABLE.x, FY + 1.1, -16), smooth(0.5, 2.5, st.s));
    }
    fwd.subVectors(look, camera.position).normalize();
    tYaw = Math.atan2(-fwd.x, -fwd.z);
    tPitch = Math.asin(fwd.y);
    st.roll = damp(st.roll, 0, 3, dt);
    if (st.phase === 'greet' || lookMode === 'stage') k = 2;
  }
  if (!st.free) {
    st.yaw = angDamp(st.yaw, tYaw, k, dt);
    st.pitch = damp(st.pitch, tPitch, k, dt);
    camera.rotation.set(st.pitch, st.yaw, st.roll + Math.sin(phase) * 0.005 * st.bobAmt);
  }
  post.film.fade.value = st.fade;

  // Karakterler
  const inLobby = st.baseY < 10 && st.pos.x < GLASS_X + 1;
  world.receptionist.nod = st.speaking ? 1 : 0;
  world.receptionist.update(dt, inLobby || (st.stop >= 0 && st.phase.startsWith('t')) ? camera.position : null);
  const watching = (st.phase === 'reveal' && st.phaseT > 0.8) || ['talk1', 'talk2', 'talk3', 'nav', 'storeIn', 'zoomPhone', 'app2', 'app3', 'outro', 'tIn', 'tZoom', 'tApp', 'tOut', 'finale'].includes(st.phase);
  const pHead = room.presenter.headBone ? room.presenter.headBone.getWorldPosition(tmp3) : PRESENTER_HEAD;
  room.people.forEach((p) => p.update(dt, watching ? pHead : camera.position));
  // dudak senkronu: konuşanın çenesi ses şiddetiyle açılır
  const lvl = sound.level?.() || 0;
  st.mouth = damp(st.mouth || 0, Math.max(0, lvl - 0.05) * 1.6, 18, dt);
  room.presenter.mouth = st.talker === room.presenter ? Math.min(1, st.mouth) : 0;
  world.receptionist.mouth = st.talker === world.receptionist ? Math.min(1, st.mouth) : 0;
  room.presenter.update(dt, st.phase === 'finale' ? camera.position : camera.position);
  placePhone(dt);
  navCanvas.style.opacity = st.nav;
  // telefon yakın çekimlerinde altyazı sola alınır (ekranı kapatmasın)
  $('subs').classList.toggle('is-side', ['zoomPhone', 'app2', 'app3', 'tZoom', 'tApp'].includes(st.phase) || (st.phase === 'talk3' && st.phaseT > 3));
  $('white').style.opacity = st.white;

  // Ses + atmosfer: içeride sis azalır, parlama ve pozlama yumuşar
  const indoor = st.baseY > 10 || st.baseY < -10;
  const insideRaw = indoor ? 1 : Math.min(1, Math.max(0, (GLASS_X + 0.2 - st.pos.x) / 2.5)) * (st.doorClosed ? 1 : 0.6);
  sound.mix(wake, insideRaw, indoor ? 1 : 0);
  const inside = indoor ? 1 : Math.min(1, Math.max(0, (GLASS_X + 0.5 - st.pos.x) / 3));
  // Gözün ışığa uyumu: dışarıda düşük pozlama, içeride yüksek
  scene.fog.density = 0.0065 * (1 - inside * 0.5);
  post.bloom.strength = 0.22 + inside * 0.1;
  renderer.toneMappingExposure = 0.95 + inside * 0.35;
  sound.ambience(dt, camera.position);
  camera.getWorldDirection(fwd);
  sound.listen(camera.position, fwd);
}

// Hata ayıklama: ?debug → konsoldan erişim
if (params.has('debug')) window.__oa = { st, room, camera, world, phone, stops };

// --- Döngü
const clock = new THREE.Clock();
let elapsed = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;
  if (st.started) step(dt);
  updateWorld(world, elapsed, dt);
  room.curtain.update(elapsed);
  rain.update(elapsed, camera.position);
  post.render(elapsed);
  requestAnimationFrame(frame);
}

// --- Bölümler (atlama menüsü)
const CHAPTERS = [['start', 'Giriş · Maslak'], ['kd', 'Kahve Dünyası'], ...STOPS.map((s) => [s.id, s.title]), ['finale', 'Kapanış']];
function markChapter(id) {
  document.querySelectorAll('#chapterList button').forEach((b) => b.classList.toggle('is-current', b.dataset.id === id));
}
function jumpTo(id) {
  reset();
  if (id === 'start') return;
  // uyanma, yürüyüş ve toplantı atlanır: konuşmacı telefonu elinde
  Object.assign(st, { T: 60, placeShown: true, placeHidden: true, pull: 1, presentPhone: true, white: 1, fade: 1, doorClosed: true });
  post.film.lid.value = 1;
  room.curtain.lift = 1; room.spot.intensity = 60;
  room.presenter.play('phone', 0.1);
  if (id === 'kd') { enterStore(); markChapter('kd'); } else if (id === 'finale') enterFinale(); else enterStop(STOPS.findIndex((s) => s.id === id));
}
{
  const list = $('chapterList');
  CHAPTERS.forEach(([id, label], i) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id;
    b.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>${label}`;
    b.addEventListener('click', async () => {
      $('chapters').classList.remove('is-open');
      $('end').classList.remove('is-on');
      if (!st.started) await begin(true, true);
      jumpTo(id);
    });
    list.appendChild(b);
  });
  $('chapterBtn').addEventListener('click', () => $('chapters').classList.toggle('is-open'));
}

// --- Başlat
const startBtn = $('start');
async function begin(withSound, noJump) {
  if (st.started) return;
  if (withSound) {
    sound.init(); sound.resume();
    world.cars.forEach((c) => { c.audio = sound.addCar(); });
    sound.loadVoice('welcome', 'assets/voice/welcome.m4a');
    Object.keys(LINES).forEach((id) => sound.loadVoice(id, `assets/voice/${id}.m4a`));
  }
  reset();
  startBtn.classList.add('is-hidden');
  $('chapters').classList.add('is-ready');
  if (noJump) return;
  const stop = params.get('stop');
  if (stop) { jumpTo(stop); return; }
  // Hata ayıklama: ?t=12 → o saniyeye atla
  const jump = parseFloat(params.get('t') || '0');
  for (let t = 0; t < jump; t += 1 / 30) step(1 / 30);
}

THREE.DefaultLoadingManager.onLoad = async () => {
  if (startBtn.classList.contains('is-ready')) return;
  await Promise.all([loadKD(), loadApps([...new Set([...STOPS.flatMap((s) => s.screens), 'oneapp_card'])].filter((k) => k !== 'oneapp_2'))]);
  bakeEnv();
  renderer.compile(scene, camera);
  startBtn.classList.add('is-ready');
  $('startCta').textContent = 'Uyanmak için tıkla';
  if (params.has('auto')) begin(false);
};
startBtn.addEventListener('click', () => { if (startBtn.classList.contains('is-ready')) begin(true); });
$('replay').addEventListener('click', () => { reset(); });
$('endChapters').addEventListener('click', () => { $('chapters').classList.add('is-open'); });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

camera.position.set(-2.3, WALK_Y + EYE, 6);
frame();
