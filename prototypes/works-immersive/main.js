import * as THREE from 'three';
import Lenis from 'lenis';
import { works, categories } from './data.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

const SPACING = 16; // projeler arası derinlik (world units)
const CAM_DIST = 8; // odaktaki panele kamera mesafesi
const INTRO_Z = 8;

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const decimals = (v) => (Number.isInteger(v) ? 0 : 1);
const caseUrl = (w) => `https://loodos.com/works/${w.slug}`;
const damp = (dt, k) => 1 - Math.exp(-dt * k);

/* =========================================================
   DOM
   ========================================================= */

function splitText(el) {
  const chars = [];
  [...el.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(' '); return; }
      const word = document.createElement('span');
      word.className = 'w';
      for (const c of part) {
        const ch = document.createElement('span');
        ch.className = 'ch';
        const i = document.createElement('i');
        i.textContent = c;
        ch.append(i);
        word.append(ch);
        chars.push(i);
      }
      frag.append(word);
    });
    node.replaceWith(frag);
  });
  return chars;
}

const sections = works.map((w, i) => {
  const el = document.createElement('section');
  el.className = `work ${i % 2 === 0 ? 'is-right' : 'is-left'}`;
  el.id = w.slug;
  const tags = [
    ...(w.awards || []).map((a) => `<li class="award">★ ${a}</li>`),
    ...w.services.map((s) => `<li>${s}</li>`),
  ].join('');
  const stats = w.stats.length
    ? `<div class="work__stats reveal">${w.stats
        .map((s) => `<div class="stat"><b data-value="${s.value}" data-suffix="${s.suffix}">${s.value.toFixed(decimals(s.value))}${s.suffix}</b><span>${s.label}</span></div>`)
        .join('')}</div>`
    : '';
  el.innerHTML = `
    <div class="work__inner">
      <figure class="work__fallback"><img src="${w.image}" alt="${w.title} — app screens" loading="lazy" /></figure>
      <div class="work__info">
        <p class="work__meta reveal"><b>${pad(i + 1)}</b> / ${pad(works.length)} <span>${w.category}</span></p>
        <h2 class="work__title split">${w.title}</h2>
        <p class="work__summary reveal">${w.summary}</p>
        <ul class="work__tags reveal">${tags}</ul>
        ${stats}
        <a class="work__link reveal" href="${caseUrl(w)}" target="_blank" rel="noopener">View case study <span aria-hidden="true">→</span></a>
      </div>
    </div>`;
  $('#works').append(el);
  return {
    el,
    info: el.querySelector('.work__info'),
    chars: splitText(el.querySelector('.work__title')),
    reveals: el.querySelectorAll('.reveal'),
    statEls: el.querySelectorAll('.stat b'),
  };
});

const railLinks = works.map((w, i) => {
  const a = document.createElement('a');
  a.href = `#${w.slug}`;
  a.innerHTML = `<span>${w.title}</span>${pad(i + 1)}<i></i>`;
  $('#rail').append(a);
  return a;
});

const counts = Object.fromEntries(
  categories.map((c) => [c, c === 'All' ? works.length : works.filter((w) => w.category === c).length]),
);
const chips = categories
  .filter((c) => counts[c] > 0)
  .map((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chip${c === 'All' ? ' is-active' : ''}`;
    b.dataset.cat = c;
    b.setAttribute('aria-pressed', String(c === 'All'));
    b.innerHTML = c === 'All' ? c : `${c}<sup>${counts[c]}</sup>`;
    $('#filters').append(b);
    return b;
  });

works.forEach((w) => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="${caseUrl(w)}" target="_blank" rel="noopener">${w.title} <small>${w.category}</small></a>`;
  $('#index').append(li);
});

const introChars = splitText($('.intro__title'));
const outroChars = splitText($('.outro__title'));

function applyFilter(cat) {
  chips.forEach((x) => {
    const on = x.dataset.cat === cat;
    x.classList.toggle('is-active', on);
    x.setAttribute('aria-pressed', String(on));
  });
  const matches = works.map((w) => cat === 'All' || w.category === cat);
  matches.forEach((on, i) => {
    railLinks[i].classList.toggle('is-muted', !on);
    sections[i].el.classList.toggle('is-muted', !on);
  });
  return matches;
}

/* =========================================================
   Static fallback (WebGL yok / reduced motion)
   ========================================================= */

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasWebGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
})();

function initStatic() {
  document.documentElement.classList.add('no-gl');
  $('#loader').classList.add('is-done');
  chips.forEach((b) =>
    b.addEventListener('click', () => {
      const matches = applyFilter(b.dataset.cat);
      const first = matches.indexOf(true);
      if (b.dataset.cat !== 'All' && first >= 0) sections[first].el.scrollIntoView({ behavior: 'smooth' });
    }),
  );
}

/* =========================================================
   Immersive (WebGL)
   ========================================================= */

const panelVertex = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uActive;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec3 p = position;
    // kaydırma hızına göre "yastık" bükülmesi
    p.z -= sin(uv.x * 3.14159) * sin(uv.y * 3.14159) * uVelocity * 0.9;
    // odakta değilken hafif dalgalanma
    p.z += sin(p.y * 5.0 + uTime * 1.3) * 0.03 * (1.0 - uActive);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const panelFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform vec2 uCover;
  uniform vec2 uSize;
  uniform float uVelocity;
  uniform float uActive;
  uniform float uDim;
  uniform float uHover;
  uniform float uAlpha;
  uniform float uFocus;
  uniform float uTime;
  varying vec2 vUv;
  varying float vDepth;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 uv = (vUv - 0.5) * uCover + 0.5;
    uv = (uv - 0.5) * (1.0 - 0.06 * uHover - 0.04 * (1.0 - uActive)) + 0.5;

    // hızla artan RGB kayması
    float shift = uVelocity * 0.025;
    vec3 col = vec3(0.1);
    if (uHasTex > 0.5) {
      col.r = texture2D(uTex, uv + vec2(0.0, shift)).r;
      col.g = texture2D(uTex, uv).g;
      col.b = texture2D(uTex, uv - vec2(0.0, shift)).b;
    }

    // odak dışı: koyu monokrom
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gray) * 0.45, col, uActive);
    col *= mix(1.0, 0.12, uDim);

    // yuvarlak köşe + ince kenar ışığı
    vec2 p = (vUv - 0.5) * uSize;
    float d = roundedBox(p, uSize * 0.5, 0.12);
    float aa = fwidth(d);
    float mask = 1.0 - smoothstep(-aa, aa, d);
    float edge = 1.0 - smoothstep(0.0, 0.03, abs(d));
    col += edge * 0.25 * uActive;

    // tarama çizgisi parıltısı
    float scan = smoothstep(0.0, 0.02, abs(fract(vUv.y - uTime * 0.08) - 0.5) - 0.48);
    col += (1.0 - scan) * 0.04 * uActive;

    float fog = 1.0 - smoothstep(16.0, 64.0, vDepth);
    gl_FragColor = vec4(col, mask * fog * uAlpha * uFocus);
  }
`;

const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.25 + position.x * 0.7) * 0.25;
    p.x += cos(uTime * 0.2 + position.z * 0.3) * 0.15;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aScale * uPixelRatio * (22.0 / -mv.z);
    vAlpha = smoothstep(60.0, 8.0, -mv.z) * smoothstep(0.3, 2.5, -mv.z);
  }
`;

const dustFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(1.0), a * vAlpha * 0.55);
  }
`;

const glowFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vec2 c = vUv - vec2(0.5, 0.42);
    c.x *= 1.6;
    float g = smoothstep(0.55, 0.0, length(c));
    g *= 0.08 + 0.02 * sin(uTime * 0.5);
    gl_FragColor = vec4(vec3(1.0), g);
  }
`;

function initImmersive() {
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  document.body.classList.add('is-loading');

  /* ---------- Smooth scroll ---------- */
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ---------- Three ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: true, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(window.devicePixelRatio, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x060606, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
  scene.add(camera);

  const shared = { uTime: { value: 0 }, uVelocity: { value: 0 } };

  // Arka plan parıltısı (kameraya bağlı)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 160),
    new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
    }),
  );
  glow.position.z = -120;
  camera.add(glow);

  // Partikül tozu
  const length = (works.length + 3) * SPACING;
  const dustCount = innerWidth <= 768 ? 1200 : 3200;
  const pos = new Float32Array(dustCount * 3);
  const scales = new Float32Array(dustCount);
  for (let k = 0; k < dustCount; k++) {
    pos[k * 3] = (Math.random() - 0.5) * 34;
    pos[k * 3 + 1] = (Math.random() - 0.5) * 20;
    pos[k * 3 + 2] = INTRO_Z + 6 - Math.random() * length;
    scales[k] = Math.pow(Math.random(), 3) * 3 + 0.4;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uPixelRatio: { value: pixelRatio } },
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(dust);

  // Proje panelleri
  const manager = new THREE.LoadingManager();
  const texLoader = new THREE.TextureLoader(manager);
  const panelGeo = new THREE.PlaneGeometry(1, 1, 32, 32);
  const ringGeo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 129 }, (_, k) => {
      const a = (k / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    }),
  );

  const panels = works.map((w, i) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uVelocity: shared.uVelocity,
        uTex: { value: null },
        uHasTex: { value: 0 },
        uCover: { value: new THREE.Vector2(1, 1) },
        uSize: { value: new THREE.Vector2(1, 1) },
        uActive: { value: 0 },
        uDim: { value: 0 },
        uHover: { value: 0 },
        uAlpha: { value: 0 },
        uFocus: { value: 1 },
      },
      vertexShader: panelVertex,
      fragmentShader: panelFragment,
      transparent: true,
      depthWrite: false,
      extensions: { derivatives: true },
    });
    const mesh = new THREE.Mesh(panelGeo, mat);
    mesh.userData.aspect = 16 / 9;
    scene.add(mesh);

    const ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(ring);

    texLoader.load(w.image, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      mat.uniforms.uTex.value = tex;
      mat.uniforms.uHasTex.value = 1;
      mesh.userData.aspect = tex.image.width / tex.image.height;
      layout();
    });

    return { mesh, mat, ring, base: new THREE.Vector3(), side: 0, size: new THREE.Vector2(), dimTarget: 0 };
  });

  /* ---------- Layout ---------- */
  function layout() {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const visH = 2 * CAM_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    const mobile = w <= 768;

    panels.forEach((p, i) => {
      const imgAspect = p.mesh.userData.aspect;
      const a = THREE.MathUtils.clamp(imgAspect, 1.2, 2.2);
      let W = mobile ? visW * 0.88 : Math.min(visW * 0.38, 7);
      let H = W / a;
      const maxH = visH * (mobile ? 0.36 : 0.62);
      if (H > maxH) { H = maxH; W = H * a; }

      p.side = mobile ? 0 : i % 2 === 0 ? -1 : 1; // çift index: panel solda, metin sağda
      p.base.set(mobile ? 0 : p.side * visW * 0.2, mobile ? visH * 0.2 : 0, -(i + 1) * SPACING);
      p.size.set(W, H);
      p.mesh.position.copy(p.base);
      p.mat.uniforms.uSize.value.set(W, H);
      const pa = W / H;
      p.mat.uniforms.uCover.value.set(imgAspect > pa ? pa / imgAspect : 1, imgAspect > pa ? 1 : imgAspect / pa);
      p.ring.position.set(p.base.x, p.base.y, p.base.z - 0.5);
      p.ring.scale.setScalar(Math.max(W, H) * 0.64);
    });
  }

  /* ---------- Scroll → derinlik eşlemesi ---------- */
  // anchors[k]: k. durağın (0 = intro, 1..n = projeler, n+1 = outro) scroll konumu
  let anchors = [];
  function computeAnchors() {
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    anchors = [0, ...sections.map((s) => s.el.getBoundingClientRect().top + window.scrollY + vh * 0.5), max];
  }
  // Duraklarda biraz bekle, aralarda hızlan
  const dwell = (t) => {
    const x = THREE.MathUtils.clamp((t - 0.12) / 0.76, 0, 1);
    return x * x * (3 - 2 * x);
  };
  function scrollToStop(y) {
    if (y <= anchors[0]) return 0;
    for (let k = 0; k < anchors.length - 1; k++) {
      if (y < anchors[k + 1]) return k + dwell((y - anchors[k]) / (anchors[k + 1] - anchors[k]));
    }
    return anchors.length - 1;
  }
  const goTo = (k) => lenis.scrollTo(anchors[k], { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });

  /* ---------- Metin animasyonları ---------- */
  gsap.set(sections.map((s) => s.info), { autoAlpha: 0 });
  gsap.set(sections.flatMap((s) => s.chars), { yPercent: 110 });
  gsap.set([...introChars, ...outroChars], { yPercent: 110 });
  gsap.set(['.intro__lede', '.intro__hint', '.intro .eyebrow'], { autoAlpha: 0, y: 16 });

  function showWork(i) {
    const s = sections[i];
    gsap.killTweensOf([s.info, ...s.chars, ...s.reveals]);
    gsap.set(s.info, { autoAlpha: 1 });
    gsap.fromTo(s.chars, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.018 });
    gsap.fromTo(s.reveals, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: 0.15 });
    s.statEls.forEach((b) => {
      const to = Number(b.dataset.value);
      const o = { v: 0 };
      gsap.to(o, {
        v: to, duration: 1.6, ease: 'power3.out', delay: 0.4,
        onUpdate: () => { b.textContent = o.v.toFixed(decimals(to)) + b.dataset.suffix; },
      });
    });
  }
  function hideWork(i) {
    const s = sections[i];
    gsap.killTweensOf([s.info, ...s.chars, ...s.reveals]);
    gsap.to(s.chars, { yPercent: -110, duration: 0.45, ease: 'power2.in', stagger: 0.006 });
    gsap.to(s.reveals, { autoAlpha: 0, y: -16, duration: 0.35, ease: 'power2.in' });
    gsap.set(s.info, { autoAlpha: 0, delay: 0.55 });
  }

  let activeIndex = -1;
  function setActive(idx) {
    if (activeIndex >= 0) hideWork(activeIndex);
    activeIndex = idx;
    railLinks.forEach((a, i) => a.classList.toggle('is-active', i === idx));
    sections.forEach((s, i) => s.el.classList.toggle('is-active', i === idx));
    if (idx >= 0) showWork(idx);
  }

  gsap.to('.intro__inner', {
    autoAlpha: 0, y: -80, ease: 'none',
    scrollTrigger: { trigger: '#intro', start: 'top top', end: 'bottom top', scrub: true },
  });
  ScrollTrigger.create({
    trigger: '#outro', start: 'top 40%', once: true,
    onEnter: () => gsap.to(outroChars, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.03 }),
  });

  /* ---------- Etkileşim ---------- */
  const mouse = new THREE.Vector2();
  const mouseSmooth = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const cursor = $('#cursor');
  const cursorX = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
  const cursorY = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
  const finePointer = matchMedia('(hover: hover)').matches;
  let pointerTarget = null;
  let hovered = -1;

  addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    pointerTarget = e.target;
    cursorX(e.clientX);
    cursorY(e.clientY);
  });
  addEventListener('click', (e) => {
    if (hovered >= 0 && !e.target.closest('a, button')) window.open(caseUrl(works[hovered]), '_blank', 'noopener');
  });

  railLinks.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); goTo(i + 1); }));
  chips.forEach((b) =>
    b.addEventListener('click', () => {
      const matches = applyFilter(b.dataset.cat);
      matches.forEach((on, i) => { panels[i].dimTarget = on ? 0 : 1; });
      goTo(b.dataset.cat === 'All' ? 1 : matches.indexOf(true) + 1);
    }),
  );

  /* ---------- Yükleme ---------- */
  const pctEl = $('#loaderPct');
  const barEl = $('#loaderBar');
  const pct = { v: 0 };
  const renderPct = () => { pctEl.textContent = Math.round(pct.v); barEl.style.width = `${pct.v}%`; };
  manager.onProgress = (_, loaded, total) => gsap.to(pct, { v: (loaded / total) * 100, duration: 0.5, onUpdate: renderPct });

  let ready = false;
  function start() {
    if (ready) return;
    ready = true;
    layout();
    computeAnchors();
    ScrollTrigger.refresh();
    gsap.to(pct, {
      v: 100, duration: 0.4, onUpdate: renderPct,
      onComplete: () => {
        $('#loader').classList.add('is-done');
        document.body.classList.remove('is-loading');
        lenis.start();
        gsap.to(introChars, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.06, delay: 0.2 });
        gsap.to(['.intro .eyebrow', '.intro__lede', '.intro__hint'], { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.6 });
        panels.forEach((p, i) => gsap.to(p.mat.uniforms.uAlpha, { value: 1, duration: 1.8, ease: 'power2.out', delay: 0.3 + i * 0.08 }));
      },
    });
  }
  manager.onLoad = start;
  setTimeout(start, 10000); // ağ sorunu olursa yine de aç

  addEventListener('resize', () => { layout(); computeAnchors(); ScrollTrigger.refresh(); });
  document.fonts?.ready.then(() => { computeAnchors(); ScrollTrigger.refresh(); });
  layout();
  computeAnchors();

  /* ---------- Render döngüsü ---------- */
  const progressBar = $('#progressBar');
  const lookTarget = new THREE.Vector3();
  let stop = 0;
  let vel = 0;

  gsap.ticker.add((_, deltaMS) => {
    const dt = Math.min(deltaMS / 1000, 0.05);
    const t = (shared.uTime.value += dt);
    const y = lenis.animatedScroll;

    stop += (scrollToStop(y) - stop) * damp(dt, 10);
    vel += (THREE.MathUtils.clamp((lenis.velocity || 0) * 0.012, -1.2, 1.2) - vel) * damp(dt, 6);
    shared.uVelocity.value = vel;
    mouseSmooth.lerp(mouse, damp(dt, 3));

    // Kamera: duraklar arasında hafif kavis çizerek ileri uçar
    const sway = Math.sin(stop * Math.PI);
    const camX = sway * 0.6;
    const camY = -sway * sway * 0.35;
    camera.position.set(camX + mouseSmooth.x * 0.35, camY + mouseSmooth.y * 0.22, INTRO_Z - stop * SPACING);
    lookTarget.set(camX * 0.4, camY * 0.5, camera.position.z - 10);
    camera.lookAt(lookTarget);
    camera.rotateZ(-vel * 0.03);

    panels.forEach((p, i) => {
      const u = p.mat.uniforms;
      const act = 1 - THREE.MathUtils.smoothstep(Math.abs(stop - (i + 1)), 0, 0.9);
      u.uActive.value = act;
      // Odaktayken sıradaki paneller metnin arkasında kalabalık yapmasın; intro'da tünel görünsün
      const intro = 1 - THREE.MathUtils.smoothstep(stop, 0.25, 0.75);
      u.uFocus.value = Math.max(0.08, act, intro);
      u.uDim.value += (p.dimTarget - u.uDim.value) * damp(dt, 5);
      u.uHover.value += ((hovered === i ? 1 : 0) - u.uHover.value) * damp(dt, 8);

      const s = 1 + act * 0.03 + u.uHover.value * 0.02;
      p.mesh.scale.set(p.size.x * s, p.size.y * s, 1);
      p.mesh.position.y = p.base.y + Math.sin(t * 0.6 + i) * 0.08;
      p.mesh.rotation.y = -p.side * (0.34 - act * 0.2) + mouseSmooth.x * 0.06 * act;
      p.mesh.rotation.x = -mouseSmooth.y * 0.06 * act;

      p.ring.rotation.set(1.1 + Math.sin(t * 0.2 + i) * 0.3, t * 0.12 + i, 0);
      p.ring.material.opacity = (0.02 + act * 0.2) * (1 - u.uDim.value);
    });

    // Aktif proje metni
    const r = Math.round(stop);
    const idx = Math.abs(stop - r) < 0.42 && r >= 1 && r <= works.length ? r - 1 : -1;
    if (idx !== activeIndex) setActive(idx);

    // Hover (sadece odaktaki panel)
    let next = -1;
    if (finePointer && activeIndex >= 0 && !pointerTarget?.closest?.('a, button')) {
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.intersectObject(panels[activeIndex].mesh).length) next = activeIndex;
    }
    if (next !== hovered) {
      hovered = next;
      cursor.classList.toggle('is-visible', hovered >= 0);
      document.body.style.cursor = hovered >= 0 ? 'none' : '';
    }

    const max = anchors[anchors.length - 1] || 1;
    progressBar.style.transform = `scaleX(${THREE.MathUtils.clamp(y / max, 0, 1)})`;

    renderer.render(scene, camera);
  });
}

/* Shader sabitleri tanımlandıktan sonra başlat */
if (prefersReduced || !hasWebGL) initStatic();
else initImmersive();
