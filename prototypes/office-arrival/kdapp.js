// Kahve Dünyası uygulaması ekranları (canvas). Tasarım: gerçek uygulamanın ana sayfası referans alındı;
// logo/ikonlar uygulamanın kendi varlıkları, renkler Colors.xcassets'ten. Yazı tipi: Gotham yerine Montserrat.
// Harita: OpenStreetMap verisi (© OpenStreetMap katkıcıları), yürüme rotası: OSRM.
export const KD = {
  primary: '#005E5B',   // primary-default-700
  bordo: '#6C0733',     // secondary-default-700
  yellow: '#FFF46D',    // tertiary-default-700
  bg: '#FAFAFA',        // background-100
  ink: '#292929',       // background-800
};
const F = (w, s) => `${w} ${s}px Montserrat, "Red Hat Display", sans-serif`;
export const PW = 393, PH = 852; // iPhone mantıksal boyutu (pt)

const IMG = {};
const ASSETS = {
  logo: 'assets/kd/ic_logo_70x.png', qr: 'assets/kd/ic_qrcode_26x.png', cup: 'assets/kd/ic_cup_big.png',
  cupKd: 'assets/kd/ic_cup_kd_multiX.png', bean: 'assets/kd/ic_coffe_bean.png', basket: 'assets/kd/ic_basket_multiX.png',
  store: 'assets/kd/ic_mock_store.png', banner: 'assets/kd/banner.jpg', loodos: 'assets/loodos-logo.svg',
};
let MAP = null;
export async function loadKD() {
  await Promise.all([
    ...Object.entries(ASSETS).map(([k, src]) => new Promise((res) => {
      const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = res; im.src = src;
    })),
    fetch('assets/map/maslak.json').then((r) => r.json()).then((m) => { MAP = m; prepRoute(m); }),
    document.fonts?.load(F(700, 20)), document.fonts?.load(F(500, 20)), document.fonts?.load(F(400, 20)), document.fonts?.load(F(600, 20)),
  ]);
}

function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function img(c, k, x, y, w, h, tint) {
  const im = IMG[k]; if (!im) return;
  if (!tint) { c.drawImage(im, x, y, w, h); return; }
  // ikonları tek renge boya
  const o = img.off || (img.off = document.createElement('canvas'));
  o.width = Math.ceil(w * 3); o.height = Math.ceil(h * 3);
  const g = o.getContext('2d');
  g.clearRect(0, 0, o.width, o.height); g.drawImage(im, 0, 0, o.width, o.height);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = tint; g.fillRect(0, 0, o.width, o.height);
  g.globalCompositeOperation = 'source-over';
  c.drawImage(o, x, y, w, h);
}
function text(c, s, x, y, font, color, align = 'left') {
  c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(s, x, y);
}
function statusBar(c, light) {
  const col = light ? '#fff' : '#111';
  text(c, '09:58', 52, 37, F(600, 16), col, 'center');
  // dinamik ada
  c.fillStyle = '#000'; rr(c, PW / 2 - 62, 11, 124, 36, 18); c.fill();
  // sinyal / wifi / pil
  c.fillStyle = col;
  for (let i = 0; i < 4; i++) { rr(c, 300 + i * 5, 32 - (i + 1) * 3, 3.2, (i + 1) * 3, 1); c.fill(); }
  c.strokeStyle = col; c.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(331, 34, 3 + i * 3.6, -Math.PI * 0.75, -Math.PI * 0.25); c.stroke(); }
  c.globalAlpha = 0.45; rr(c, 344, 24, 25, 12, 3.5); c.stroke(); c.globalAlpha = 1;
  rr(c, 346, 26, 18, 8, 2); c.fill(); rr(c, 370, 28, 2, 4, 1); c.fill();
}
function homeIndicator(c, dark = true) {
  c.fillStyle = dark ? '#111' : '#fff'; rr(c, PW / 2 - 67, PH - 13, 134, 5, 3); c.fill();
}
function navHeader(c, title) {
  c.fillStyle = KD.bordo; c.fillRect(0, 0, PW, 104);
  statusBar(c, true);
  c.strokeStyle = '#fff'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(28, 70); c.lineTo(20, 79); c.lineTo(28, 88); c.stroke();
  text(c, title, PW / 2, 85, F(600, 17), '#fff', 'center');
}
function tap(c, tp) {
  if (!tp) return;
  const k = tp.k; // 0..1
  c.fillStyle = `rgba(255,255,255,${0.55 * (1 - k)})`;
  c.beginPath(); c.arc(tp.x, tp.y, 14 + 26 * k, 0, Math.PI * 2); c.fill();
  c.strokeStyle = `rgba(0,0,0,${0.15 * (1 - k)})`; c.lineWidth = 1.5; c.stroke();
}

/* ---------------- Ana sayfa ---------------- */
function home(c, o = {}) {
  c.fillStyle = KD.bg; c.fillRect(0, 0, PW, PH);
  // Başlık + sadakat alanı (bordo)
  c.fillStyle = KD.bordo; c.fillRect(0, 0, PW, 418);
  statusBar(c, true);
  img(c, 'logo', 19, 66, 44, 44);
  text(c, 'Hoş geldin,', 72, 84, F(400, 15), '#fff');
  text(c, o.name || 'Önder Şahin', 72, 104, F(700, 15), '#fff');
  c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(186, 99, 5.5, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(185, 96.5); c.lineTo(187.5, 99); c.lineTo(185, 101.5); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(353, 88, 22, 0, Math.PI * 2); c.fill();
  img(c, 'qr', 340, 75, 26, 26);

  // Biri Bizden halkası
  const cx = 60, cy = 196;
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, 41, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = KD.yellow; c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, 41, Math.PI * 0.62, Math.PI * 0.62 + (Math.PI * 2) / 8); c.stroke();
  img(c, 'cup', cx - 14, cy - 22, 28, 36, '#fff');
  c.fillStyle = KD.bordo; c.beginPath(); c.arc(cx, cy - 1, 5.5, 0, Math.PI * 2); c.fill();
  text(c, '1 / 8', cx, cy + 49, F(500, 13), '#fff', 'center');
  text(c, 'Biri Bizden', 116, 180, F(500, 15), '#fff');
  text(c, '0', 116, 220, F(300, 34), '#fff');
  img(c, 'cup', 140, 193, 20, 27, '#fff');
  text(c, 'Çekirdeklerim', 222, 180, F(500, 15), '#fff');
  text(c, '1.250,00', 222, 220, F(300, 30), '#fff');
  img(c, 'bean', 351, 192, 22, 30, '#fff');

  // Kampanya kartı
  c.fillStyle = 'rgba(0,0,0,0.2)'; rr(c, 18, 272, 357, 112, 12); c.fill();
  c.fillStyle = KD.yellow; c.beginPath(); c.arc(44, 298, 16, 0, Math.PI * 2); c.fill();
  img(c, 'cupKd', 35, 286, 18, 24, KD.bordo);
  text(c, '1 KG Türk Kahvesi-Cezve', 70, 296, F(700, 13.5), '#fff');
  text(c, '1 KG 10 Paket Türk Kahvesine Cezve Bizden', 70, 316, F(400, 11.2), 'rgba(255,255,255,.85)');
  text(c, 'Kazanım', 346, 292, F(500, 10), 'rgba(255,255,255,.8)', 'center');
  text(c, '0', 346, 322, F(300, 26), '#fff', 'center');
  for (let i = 0; i < 10; i++) {
    const x = 34 + i * 27.5;
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(x, 362, 7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x - 2.8, 362); c.lineTo(x - 0.6, 364.4); c.lineTo(x + 3, 359.6); c.stroke();
  }
  text(c, '0/10', 346, 367, F(500, 12), '#fff', 'center');
  for (let i = 0; i < 3; i++) { c.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(PW / 2 - 10 + i * 10, 400, 3, 0, Math.PI * 2); c.fill(); }

  // Hazır Al / Online Mağaza
  c.fillStyle = KD.yellow; rr(c, 18, 436, 172, 88, 12); c.fill();
  text(c, 'Hazır Al', 32, 466, F(700, 18), KD.bordo);
  img(c, 'cup', 150, 448, 24, 32, KD.bordo);
  text(c, 'Sipariş Ver', 32, 509, F(600, 12), KD.bordo);
  chev(c, 113, 505, KD.bordo);
  c.fillStyle = KD.primary; rr(c, 203, 436, 172, 88, 12); c.fill();
  text(c, 'Online Mağaza', 216, 466, F(700, 15.5), '#fff');
  img(c, 'basket', 344, 476, 22, 20);
  text(c, 'Alışverişe Başla', 216, 509, F(600, 12), '#fff');
  chev(c, 335, 505, '#fff');

  text(c, 'Haberler ve Fırsatlar', 18, 560, F(600, 14), KD.ink);
  c.save(); rr(c, 18, 574, 357, 188, 12); c.clip();
  if (IMG.banner) c.drawImage(IMG.banner, 18, 574, 357, 188); c.restore();
  c.fillStyle = '#333'; c.beginPath(); c.arc(PW / 2, 778, 3, 0, Math.PI * 2); c.fill();
  homeIndicator(c);
  tap(c, o.tap);
}
function chev(c, x, y, col) {
  c.strokeStyle = col; c.lineWidth = 1.3; c.beginPath(); c.arc(x, y - 4, 6, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(x - 1.2, y - 7); c.lineTo(x + 1.8, y - 4); c.lineTo(x - 1.2, y - 1); c.stroke();
}

/* ---------------- Harita ---------------- */
let ROUTE_LEN = [];
function prepRoute(m) {
  ROUTE_LEN = [0];
  for (let i = 1; i < m.route.length; i++) {
    const [ax, ay] = m.route[i - 1], [bx, by] = m.route[i];
    ROUTE_LEN.push(ROUTE_LEN[i - 1] + Math.hypot(bx - ax, by - ay));
  }
}
function routeAt(k) {
  const L = ROUTE_LEN[ROUTE_LEN.length - 1] * k;
  for (let i = 1; i < ROUTE_LEN.length; i++) {
    if (ROUTE_LEN[i] >= L) {
      const f = (L - ROUTE_LEN[i - 1]) / (ROUTE_LEN[i] - ROUTE_LEN[i - 1] || 1);
      const [ax, ay] = MAP.route[i - 1], [bx, by] = MAP.route[i];
      return { i, x: ax + (bx - ax) * f, y: ay + (by - ay) * f };
    }
  }
  const p = MAP.route[MAP.route.length - 1]; return { i: MAP.route.length, x: p[0], y: p[1] };
}
const ROAD_W = [2.2, 3, 5, 6.5, 8, 10, 13];

/** Harita: (cx, cy) metre merkez, s piksel/metre, progress 0..1 rota çizimi */
export function drawMap(c, x0, y0, w, h, { cx, cy, s, progress = 1, pins = true, labels = true }) {
  if (!MAP) return;
  c.save();
  c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  c.translate(x0 + w / 2, y0 + h / 2);
  const P = ([x, y]) => [(x - cx) * s, (y - cy) * s];
  c.fillStyle = '#EFEBE4'; c.fillRect(-w / 2, -h / 2, w, h);
  const poly = (pts) => { c.beginPath(); pts.forEach((p, i) => { const [a, b] = P(p); i ? c.lineTo(a, b) : c.moveTo(a, b); }); };
  c.fillStyle = '#D5E6C6'; MAP.green.forEach((g) => { poly(g); c.fill(); });
  c.fillStyle = '#E2DCD2'; c.strokeStyle = '#D4CCC0'; c.lineWidth = 1;
  MAP.buildings.forEach((b) => { poly(b); c.fill(); c.stroke(); });
  c.lineCap = 'round'; c.lineJoin = 'round';
  const zs = Math.min(2.2, Math.max(0.55, s));
  const roads = MAP.roads.filter((r) => !r.t).sort((a, b) => a.c - b.c);
  roads.forEach((r) => { poly(r.p); c.strokeStyle = r.c >= 5 ? '#E3C98A' : '#D6CFC4'; c.lineWidth = (ROAD_W[r.c] + 2) * zs; c.stroke(); });
  roads.forEach((r) => { poly(r.p); c.strokeStyle = r.c >= 5 ? '#FCE9B5' : '#FFFFFF'; c.lineWidth = ROAD_W[r.c] * zs; c.stroke(); });
  // Yol adları
  if (labels) {
    const done = new Set();
    MAP.roads.filter((r) => r.n && r.c >= 3 && !r.t).sort((a, b) => b.p.length - a.p.length).forEach((r) => {
      if (done.has(r.n) || r.p.length < 2) return; done.add(r.n);
      const m = Math.floor(r.p.length / 2), a = P(r.p[Math.max(0, m - 1)]), b = P(r.p[m]);
      let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      c.save(); c.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); c.rotate(ang);
      c.font = F(600, 10.5 * Math.min(1.4, Math.max(0.9, s))); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(r.n.replace('Caddesi', 'Cd.').replace('Sokağı', 'Sk.'), 0, 0);
      c.fillStyle = '#6B6257'; c.fillText(r.n.replace('Caddesi', 'Cd.').replace('Sokağı', 'Sk.'), 0, 0);
      c.restore();
    });
  }
  // Rota
  if (progress > 0) {
    const head = routeAt(progress);
    const pts = MAP.route.slice(0, head.i); pts.push([head.x, head.y]);
    poly(MAP.route); c.strokeStyle = 'rgba(0,94,91,.18)'; c.lineWidth = 7 * zs; c.stroke();
    poly(pts); c.strokeStyle = '#fff'; c.lineWidth = 10 * zs; c.stroke();
    poly(pts); c.strokeStyle = KD.primary; c.lineWidth = 6.5 * zs; c.stroke();
    const [hx, hy] = P([head.x, head.y]);
    if (progress < 1) {
      c.fillStyle = 'rgba(108,7,51,.18)'; c.beginPath(); c.arc(hx, hy, 16, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(hx, hy, 8.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = KD.bordo; c.beginPath(); c.arc(hx, hy, 6, 0, Math.PI * 2); c.fill();
    }
  }
  if (pins) {
    // Başlangıç: Loodos
    const [sx, sy] = P(MAP.start);
    c.fillStyle = '#1AB0BA'; c.beginPath(); c.arc(sx, sy, 11, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    label(c, sx, sy - 20, 'Loodos · Noramin', '#1AB0BA');
    // Varış: Kahve Dünyası
    const [ex, ey] = P(MAP.end);
    c.fillStyle = KD.bordo; c.beginPath(); c.moveTo(ex, ey); c.arc(ex, ey - 26, 19, Math.PI * 0.7, Math.PI * 2.3); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey - 26, 16, 0, Math.PI * 2); c.fill();
    if (IMG.logo) c.drawImage(IMG.logo, ex - 15, ey - 41, 30, 30);
    label(c, ex, ey - 54, 'Kahve Dünyası Maslak', KD.bordo);
  }
  c.restore();
}
function label(c, x, y, s, col) {
  c.font = F(700, 11.5); const w = c.measureText(s).width + 16;
  c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 6; rr(c, x - w / 2, y - 12, w, 22, 11); c.fill(); c.shadowBlur = 0;
  text(c, s, x, y + 3.5, F(700, 11.5), col, 'center');
}
// Rotayı kadraja sığdır
export function fitRoute(w, h, pad = 60) {
  const xs = MAP.route.map((p) => p[0]).concat(MAP.start[0], MAP.end[0]);
  const ys = MAP.route.map((p) => p[1]).concat(MAP.start[1], MAP.end[1] - 60);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, s: Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY)) };
}
export const routeInfo = () => ({ m: MAP?.distance ?? 613, min: Math.round((MAP?.duration ?? 490) / 60) });
export const routeEnd = () => MAP.end;
export const routeHead = (k) => routeAt(k);

function walker(c, x, y, col) {
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.8; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y - 7, 2.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x - 0.5, y + 2); c.lineTo(x - 3, y + 7); c.moveTo(x - 0.5, y + 2); c.lineTo(x + 2.5, y + 7);
  c.moveTo(x - 3.5, y - 1); c.lineTo(x, y - 3.5); c.lineTo(x + 3, y); c.stroke();
}

function mapScreen(c, o = {}) {
  c.fillStyle = KD.bg; c.fillRect(0, 0, PW, PH);
  const top = 104, bottom = 640;
  const f = fitRoute(PW - 70, bottom - top - 10, 34);
  f.cx -= 18;
  drawMap(c, 0, top, PW, bottom - top + 30, { ...f, progress: o.progress ?? 1 });
  navHeader(c, 'Yol Tarifi');
  sheet(c, bottom, o);
  homeIndicator(c);
  tap(c, o.tap);
}
function sheet(c, y, o) {
  const { m, min } = routeInfo();
  c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,.15)'; c.shadowBlur = 18;
  rr(c, 0, y, PW, PH - y + 20, 18); c.fill(); c.shadowBlur = 0;
  c.fillStyle = '#D9D9D9'; rr(c, PW / 2 - 18, y + 8, 36, 4, 2); c.fill();
  c.fillStyle = '#fff'; c.strokeStyle = '#eee'; c.beginPath(); c.arc(42, y + 52, 22, 0, Math.PI * 2); c.fill(); c.stroke();
  img(c, 'logo', 22, y + 32, 40, 40);
  text(c, 'Kahve Dünyası Maslak', 74, y + 48, F(700, 15.5), KD.ink);
  text(c, 'Eski Büyükdere Cd. · Sarıyer', 74, y + 68, F(400, 12), '#7a7a7a');
  walker(c, 30, y + 108, KD.bordo);
  text(c, `${min} dk`, 44, y + 113, F(700, 15), KD.bordo);
  text(c, `· ${m} m yürüme`, 44 + c.measureText(`${min} dk`).width + 6, y + 113, F(500, 13), '#7a7a7a');
  c.fillStyle = KD.bordo; rr(c, 18, y + 134, PW - 36, 48, 12); c.fill();
  text(c, o.navigating ? 'Rota Başladı' : 'Yol Tarifi Başlat', PW / 2, y + 163, F(700, 15), '#fff', 'center');
}

/* ---------------- Hazır Al: sipariş durumu ---------------- */
function orderScreen(c, o = {}) {
  c.fillStyle = KD.bg; c.fillRect(0, 0, PW, PH);
  navHeader(c, 'Hazır Al');
  c.save(); rr(c, 18, 122, PW - 36, 150, 14); c.clip();
  if (IMG.store) c.drawImage(IMG.store, 18, 122, PW - 36, 150 * 1.0);
  const gr = c.createLinearGradient(0, 180, 0, 272); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.65)');
  c.fillStyle = gr; c.fillRect(18, 122, PW - 36, 150); c.restore();
  text(c, 'Kahve Dünyası Maslak', 32, 248, F(700, 16), '#fff');
  text(c, 'Eski Büyükdere Cd. · 8 dk', 32, 264, F(500, 11.5), 'rgba(255,255,255,.85)');

  const ready = o.ready ?? 0; // 0 hazırlanıyor → 1 hazır
  c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,.08)'; c.shadowBlur = 14; rr(c, 18, 290, PW - 36, 200, 14); c.fill(); c.shadowBlur = 0;
  c.fillStyle = ready > 0.5 ? KD.primary : KD.yellow; c.beginPath(); c.arc(PW / 2, 336, 28, 0, Math.PI * 2); c.fill();
  img(c, 'cup', PW / 2 - 12, 318, 24, 34, ready > 0.5 ? '#fff' : KD.bordo);
  text(c, ready > 0.5 ? 'Siparişin hazır!' : 'Siparişin hazırlanıyor', PW / 2, 392, F(700, 17), KD.ink, 'center');
  text(c, ready > 0.5 ? 'Kasaya uğramadan teslim alabilirsin.' : 'Tahmini hazır olma süresi 4 dk', PW / 2, 412, F(400, 12.5), '#777', 'center');
  // adımlar
  const steps = ['Alındı', 'Hazırlanıyor', 'Hazır'];
  const act = ready > 0.5 ? 2 : 1;
  c.strokeStyle = '#E6E6E6'; c.lineWidth = 3; c.beginPath(); c.moveTo(70, 446); c.lineTo(PW - 70, 446); c.stroke();
  c.strokeStyle = KD.primary; c.beginPath(); c.moveTo(70, 446); c.lineTo(70 + (PW - 140) * Math.min(1, act / 2 * (0.6 + ready * 0.4) + (act === 2 ? 0.4 : 0)), 446); c.stroke();
  steps.forEach((s, i) => {
    const x = 70 + i * (PW - 140) / 2, on = i <= act;
    c.fillStyle = on ? KD.primary : '#E6E6E6'; c.beginPath(); c.arc(x, 446, 9, 0, Math.PI * 2); c.fill();
    if (on) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3.5, 446); c.lineTo(x - 1, 448.8); c.lineTo(x + 4, 443); c.stroke(); }
    text(c, s, x, 474, F(on ? 600 : 500, 11.5), on ? KD.ink : '#9a9a9a', 'center');
  });
  // ürünler
  text(c, 'Siparişin', 18, 526, F(600, 14), KD.ink);
  [['Türk Kahvesi', 'Orta şekerli'], ['Caffè Latte', 'Büyük boy · Yulaf sütü'], ['Sütlü Madlen', '2 adet']].forEach(([n, d], i) => {
    const y = 546 + i * 62;
    c.fillStyle = '#fff'; rr(c, 18, y, PW - 36, 52, 12); c.fill();
    c.fillStyle = KD.bordo + '14'; c.beginPath(); c.arc(46, y + 26, 16, 0, Math.PI * 2); c.fill();
    img(c, 'cupKd', 38, y + 14, 16, 23, KD.bordo);
    text(c, n, 72, y + 23, F(600, 13.5), KD.ink);
    text(c, d, 72, y + 40, F(400, 11.5), '#888');
    text(c, '1×', PW - 32, y + 31, F(600, 13), KD.bordo, 'right');
  });
  c.fillStyle = KD.bordo; rr(c, 18, 748, PW - 36, 48, 12); c.fill();
  text(c, 'Mağazaya Yol Tarifi', PW / 2, 777, F(700, 15), '#fff', 'center');
  homeIndicator(c);
  tap(c, o.tap);
}

/* ---------------- Online Mağaza ---------------- */
const PRODUCTS = [
  { n: 'Türk Kahvesi', d: '100 g', col: KD.bordo, kind: 'bag' },
  { n: 'Damla Sakızlı Türk Kahvesi', d: '100 g', col: KD.primary, kind: 'bag' },
  { n: 'Çikolata Kaplı Kahve Çekirdeği', d: '200 g', col: '#4A2A1C', kind: 'box' },
  { n: 'Sütlü Madlen Çikolata', d: '250 g', col: '#B88A4A', kind: 'box' },
];
function shopScreen(c, o = {}) {
  c.fillStyle = KD.bg; c.fillRect(0, 0, PW, PH);
  navHeader(c, 'Online Mağaza');
  img(c, 'basket', 352, 70, 22, 20);
  c.fillStyle = '#fff'; c.strokeStyle = '#E4E4E4'; rr(c, 18, 120, PW - 36, 42, 21); c.fill(); c.stroke();
  c.strokeStyle = '#999'; c.lineWidth = 1.6; c.beginPath(); c.arc(40, 139, 6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(44.5, 143.5); c.lineTo(49, 148); c.stroke();
  text(c, 'Ürün ara', 58, 146, F(400, 13.5), '#9a9a9a');
  const chips = ['Türk Kahvesi', 'Çikolata', 'Filtre Kahve', 'Hediyelik'];
  let x = 18;
  chips.forEach((s, i) => {
    c.font = F(600, 12.5); const w = c.measureText(s).width + 26;
    c.fillStyle = i === 0 ? KD.bordo : '#fff'; c.strokeStyle = i === 0 ? KD.bordo : '#E2E2E2'; rr(c, x, 178, w, 34, 17); c.fill(); c.stroke();
    text(c, s, x + w / 2, 200, F(600, 12.5), i === 0 ? '#fff' : KD.ink, 'center'); x += w + 8;
  });
  PRODUCTS.forEach((p, i) => {
    const cx0 = 18 + (i % 2) * 184, cy0 = 230 + Math.floor(i / 2) * 262;
    c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,.07)'; c.shadowBlur = 12; rr(c, cx0, cy0, 173, 248, 14); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#F5F1EC'; rr(c, cx0 + 10, cy0 + 10, 153, 140, 10); c.fill();
    pack(c, cx0 + 86, cy0 + 82, p);
    wrap(c, p.n, cx0 + 12, cy0 + 172, 150, F(600, 12.5), KD.ink);
    text(c, p.d, cx0 + 12, cy0 + 208, F(400, 11.5), '#8a8a8a');
    c.strokeStyle = KD.bordo; c.lineWidth = 1.4; rr(c, cx0 + 12, cy0 + 216, 149, 24, 12); c.stroke();
    text(c, 'Sepete Ekle', cx0 + 86, cy0 + 232, F(600, 11.5), KD.bordo, 'center');
  });
  homeIndicator(c);
  tap(c, o.tap);
}
function wrap(c, s, x, y, w, font, col) {
  c.font = font; const words = s.split(' '); let line = '', yy = y;
  words.forEach((wd) => { const t = line ? line + ' ' + wd : wd; if (c.measureText(t).width > w && line) { text(c, line, x, yy, font, col); line = wd; yy += 16; } else line = t; });
  text(c, line, x, yy, font, col);
}
function pack(c, x, y, p) {
  c.save(); c.translate(x, y);
  if (p.kind === 'bag') {
    c.fillStyle = p.col; c.beginPath(); c.moveTo(-34, -52); c.lineTo(34, -52); c.lineTo(38, 54); c.quadraticCurveTo(0, 60, -38, 54); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(-34, -52, 68, 10);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -6, 22, 0, Math.PI * 2); c.fill();
    if (IMG.logo) c.drawImage(IMG.logo, -20, -26, 40, 40);
    text(c, 'TÜRK KAHVESİ', 0, 34, F(700, 8.5), KD.yellow, 'center');
  } else {
    c.fillStyle = p.col; rr(c, -46, -36, 92, 72, 8); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, -46, -36, 92, 14, 8); c.fill();
    if (IMG.logo) c.drawImage(IMG.logo, -14, -22, 28, 28);
    text(c, p.n.includes('Madlen') ? 'MADLEN' : 'DRAJE', 0, 24, F(700, 9.5), '#fff', 'center');
    // çekirdek/çikolata
    c.fillStyle = '#2b160d';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(-30 + i * 15, 46, 6, 4.2, 0.3, 0, Math.PI * 2); c.fill(); }
  }
  c.restore();
}

/* ---------------- Telefon ekranı yöneticisi ---------------- */
export function createPhoneScreen(scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = PW * scale; canvas.height = PH * scale;
  const c = canvas.getContext('2d');
  const screens = { home, map: mapScreen, order: orderScreen, shop: shopScreen };
  return {
    canvas,
    draw(name, o = {}, fadeFrom = null, k = 1) {
      c.setTransform(scale, 0, 0, scale, 0, 0);
      if (fadeFrom && k < 1) {
        screens[fadeFrom](c, {});
        c.globalAlpha = k; screens[name](c, o); c.globalAlpha = 1;
      } else screens[name](c, o);
    },
  };
}

/* ---------------- Tam ekran navigasyon (harita anı) ---------------- */
export function drawNav(c, w, h, { progress, zoom, t }) {
  const f = fitRoute(w, h - 260, Math.min(w, h) * 0.08);
  const end = MAP.end;
  // zoom > 0: KD pinine doğru yakınlaş
  const zk = Math.pow(zoom, 1.6);
  const s = f.s * (1 + zk * 14);
  const cx = f.cx + (end[0] - f.cx) * Math.min(1, zoom * 1.4);
  const cy = f.cy + (end[1] - 30 - f.cy) * Math.min(1, zoom * 1.4);
  drawMap(c, 0, 0, w, h, { cx, cy: cy + (h > w ? 40 : 30) / f.s * (1 - zoom), s, progress });
  const ui = 1 - Math.min(1, zoom * 3);
  if (ui <= 0) return;
  c.globalAlpha = ui;
  // üst talimat bandı
  const bw = Math.min(560, w - 32);
  c.fillStyle = KD.bordo; c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 20; rr(c, (w - bw) / 2, 22, bw, 74, 16); c.fill(); c.shadowBlur = 0;
  const step = progress < 0.18 ? ['↰', 'Noramin çıkışından sola dönün', '90 m'] : progress < 0.6 ? ['↱', 'Büyükdere Caddesi boyunca devam edin', '250 m'] : progress < 0.85 ? ['↗', 'Eski Büyükdere Caddesi\'ne sağdan girin', '140 m'] : ['↰', 'Kahve Dünyası solunuzda', '120 m'];
  text(c, step[0], (w - bw) / 2 + 36, 72, F(700, 30), '#fff', 'center');
  text(c, step[1], (w - bw) / 2 + 66, 56, F(700, Math.min(17, bw / 30)), '#fff');
  text(c, step[2], (w - bw) / 2 + 66, 80, F(500, 13), 'rgba(255,255,255,.75)');
  img(c, 'logo', (w + bw) / 2 - 56, 37, 44, 44);
  // alt kart
  const { m, min } = routeInfo();
  const remain = Math.max(0, Math.round(min * (1 - progress)));
  const cw = Math.min(560, w - 32), cy0 = h - 118;
  c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,.2)'; c.shadowBlur = 24; rr(c, (w - cw) / 2, cy0, cw, 96, 18); c.fill(); c.shadowBlur = 0;
  walker(c, (w - cw) / 2 + 30, cy0 + 40, KD.bordo);
  text(c, `${Math.max(1, remain)} dk`, (w - cw) / 2 + 48, cy0 + 46, F(700, 24), KD.bordo);
  text(c, `${Math.round(m * (1 - progress))} m · Kahve Dünyası Maslak`, (w - cw) / 2 + 30, cy0 + 74, F(500, 13.5), '#666');
  c.fillStyle = KD.primary; rr(c, (w + cw) / 2 - 128, cy0 + 26, 110, 44, 22); c.fill();
  text(c, 'Yürüyüş', (w + cw) / 2 - 73, cy0 + 53, F(700, 14), '#fff', 'center');
  text(c, '© OpenStreetMap katkıcıları', w - 12, h - 8, F(400, 10), 'rgba(0,0,0,.45)', 'right');
  c.globalAlpha = 1;
  void t;
}
