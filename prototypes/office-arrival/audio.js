// Tüm sesler kodla üretiliyor (dosya yok): yağmur, şehir uğultusu, ıslak/mermer ayak sesleri,
// geçen arabalar (3D konumlu), kapı, lobi yankısı. Uyanırken her şey boğuk başlıyor.
export class Sound {
  constructor() { this.ready = false; this.cars = []; }

  init() {
    if (this.ready) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 260;
    this.master.connect(this.muffle).connect(ctx.destination);

    // Lobi yankısı
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.4, 2.2);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 0;
    this.reverbIn.connect(this.reverb).connect(this.master);

    this.white = this.noise(4, 'white');
    this.brown = this.noise(4, 'brown');

    // Yağmur: iki katman (ince hışırtı + kalın damlalar)
    this.rainOut = ctx.createGain();
    this.rainOut.gain.value = 1;
    this.rainLP = this.filter('lowpass', 7500);
    this.rainLP.connect(this.rainOut).connect(this.master);
    this.loop(this.white, [this.filter('highpass', 700), this.gain(0.07)], this.rainLP);
    this.loop(this.white, [this.filter('bandpass', 2600, 0.5), this.gain(0.03)], this.rainLP, 1.3);
    // Şehir uğultusu
    this.cityOut = this.gain(0.5);
    this.cityOut.connect(this.master);
    this.loop(this.brown, [this.filter('lowpass', 240), this.gain(1)], this.cityOut);
    // Arabalar ayrı bir kanaldan: içeride kısılır, toplantı odasında tamamen susar
    this.carBus = this.gain(1);
    this.carBus.connect(this.master);
    // Lobi oda tonu (havalandırma)
    this.roomOut = this.gain(0);
    this.roomOut.connect(this.master);
    this.loop(this.brown, [this.filter('bandpass', 420, 0.7), this.gain(0.35)], this.roomOut);

    this.ready = true;
  }

  resume() { this.ctx?.resume(); }

  // --- yardımcılar
  noise(sec, kind) {
    const { ctx } = this;
    const b = ctx.createBuffer(2, Math.floor(sec * ctx.sampleRate), ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
    }
    return b;
  }
  impulse(sec, decay) {
    const { ctx } = this;
    const b = ctx.createBuffer(2, Math.floor(sec * ctx.sampleRate), ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay);
    }
    return b;
  }
  filter(type, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }
  gain(v) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  loop(buffer, chain, dest, rate = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer; src.loop = true; src.playbackRate.value = rate;
    src.loopStart = Math.random();
    let node = src;
    chain.forEach((n) => { node.connect(n); node = n; });
    node.connect(dest);
    src.start(0, Math.random() * 3);
    return src;
  }
  // Kısa gürültü patlaması (ayak sesi, tık vb.)
  burst({ t, dur, type = 'bandpass', freq = 1500, q = 1, gain = 0.5, attack = 0.002, dest, buffer = this.white }) {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = this.filter(type, freq, q);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f).connect(g).connect(dest || this.master);
    src.start(t, Math.random() * 3, dur + 0.05);
    return g;
  }
  thump({ t, f0, f1, dur, gain, dest }) {
    const { ctx } = this;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // --- olaylar
  // Topuklu ayakkabı: keskin topuk "tak"ı + kısa gövde rezonansı (+ yüzeye göre su / yankı / halı)
  step(surface, foot) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.005;
    const v = 0.85 + Math.random() * 0.3;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = foot ? 0.1 : -0.1;
    pan.connect(this.master);
    if (surface === 'carpet') {
      this.burst({ t, dur: 0.07, type: 'lowpass', freq: 500, gain: 0.25 * v, dest: pan });
      this.thump({ t, f0: 120, f1: 60, dur: 0.05, gain: 0.12 * v, dest: pan });
      return;
    }
    const out = this.gain(1); out.connect(pan);
    if (surface === 'marble') out.connect(this.reverbIn);
    const hard = surface === 'marble' ? 1 : 0.85;
    // ön ayak (yumuşak) → 70 ms sonra topuk (sert)
    this.burst({ t, dur: 0.04, freq: 1600, q: 1.2, gain: 0.12 * v, dest: out });
    const th = t + 0.07 + Math.random() * 0.012;
    this.burst({ t: th, dur: 0.028, freq: 4300 * v, q: 7, gain: 0.85 * v * hard, attack: 0.0008, dest: out });
    this.burst({ t: th, dur: 0.05, freq: 2600 * v, q: 5, gain: 0.45 * v * hard, attack: 0.0008, dest: out });
    this.burst({ t: th, dur: 0.06, freq: 900, q: 2.5, gain: 0.22 * v, attack: 0.001, dest: out });
    this.thump({ t: th, f0: 260, f1: 120, dur: 0.035, gain: 0.18 * v, dest: out });
    if (surface === 'wet') {
      this.burst({ t: th + 0.008, dur: 0.12, type: 'highpass', freq: 3800, gain: 0.08 * v, attack: 0.006, dest: pan });
    }
  }

  ding() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.gain(1); out.connect(this.master); out.connect(this.reverbIn);
    for (const [f, d, g] of [[1318.5, 1.6, 0.12], [2637, 0.9, 0.03], [3950, 0.5, 0.015]]) {
      const o = this.ctx.createOscillator(); o.frequency.value = f;
      const e = this.ctx.createGain();
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0005, t + d);
      o.connect(e).connect(out); o.start(t); o.stop(t + d + 0.05);
    }
  }

  slide(dur = 1.2) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.gain(1); out.connect(this.master); out.connect(this.reverbIn);
    this.burst({ t, dur, type: 'bandpass', freq: 700, q: 0.8, gain: 0.08, attack: 0.25, dest: out, buffer: this.brown });
    this.thump({ t: t + dur - 0.1, f0: 140, f1: 70, dur: 0.12, gain: 0.12, dest: out });
  }

  ride(dur) {
    if (!this.ready) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.brown; src.loop = true;
    const f = this.filter('lowpass', 160);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.8); g.gain.setValueAtTime(0.9, t + dur - 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    src.playbackRate.setValueAtTime(0.8, t); src.playbackRate.linearRampToValueAtTime(1.15, t + dur * 0.5); src.playbackRate.linearRampToValueAtTime(0.85, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.1);
  }

  // Perde: kadife hışırtısı + ray motoru
  curtain(dur) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.gain(1); out.connect(this.master); out.connect(this.reverbIn);
    const src = this.ctx.createBufferSource(); src.buffer = this.white; src.loop = true;
    const bp = this.filter('bandpass', 500, 0.6);
    bp.frequency.setValueAtTime(400, t); bp.frequency.linearRampToValueAtTime(1100, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1, t + 0.6); g.gain.setValueAtTime(0.1, t + dur - 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp).connect(g).connect(out); src.start(t); src.stop(t + dur + 0.1);
    const m = this.ctx.createOscillator(); m.type = 'sawtooth'; m.frequency.value = 58;
    const mf = this.filter('lowpass', 180); const mg = this.ctx.createGain();
    mg.gain.setValueAtTime(0, t); mg.gain.linearRampToValueAtTime(0.03, t + 0.4); mg.gain.setValueAtTime(0.03, t + dur - 0.4); mg.gain.linearRampToValueAtTime(0, t + dur);
    m.connect(mf).connect(mg).connect(out); m.start(t); m.stop(t + dur + 0.1);
  }

  // Odadaki alçak sesli sohbet (anlaşılmayan mırıltı): formant filtreli sesler, rastgele heceler
  murmur(dur) {
    if (!this.ready) return;
    const { ctx } = this;
    const t0 = ctx.currentTime;
    this.murmurOut = this.gain(0.0);
    this.murmurOut.gain.setValueAtTime(0, t0);
    this.murmurOut.gain.linearRampToValueAtTime(0.5, t0 + 1.2);
    this.murmurOut.connect(this.master); this.murmurOut.connect(this.reverbIn);
    for (let v = 0; v < 4; v++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const base = v % 2 ? 115 + Math.random() * 25 : 195 + Math.random() * 35;
      const f1 = this.filter('bandpass', 600, 5), f2 = this.filter('bandpass', 1400, 7);
      const g = ctx.createGain(); g.gain.value = 0;
      const pan = ctx.createStereoPanner(); pan.pan.value = (v / 3) * 1.4 - 0.7;
      o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(pan).connect(this.murmurOut);
      let t = t0 + Math.random();
      while (t < t0 + dur) {
        const phrase = 4 + Math.floor(Math.random() * 9);
        for (let i = 0; i < phrase; i++) {
          const syl = 0.09 + Math.random() * 0.12;
          o.frequency.setTargetAtTime(base * (0.9 + Math.random() * 0.25), t, 0.03);
          f1.frequency.setTargetAtTime(350 + Math.random() * 600, t, 0.02);
          f2.frequency.setTargetAtTime(1000 + Math.random() * 1200, t, 0.02);
          g.gain.setTargetAtTime(0.05 + Math.random() * 0.04, t, 0.015);
          g.gain.setTargetAtTime(0.004, t + syl * 0.7, 0.02);
          t += syl;
        }
        t += 0.6 + Math.random() * 2.2;
      }
      o.start(t0); o.stop(t0 + dur + 0.5);
    }
  }
  hush() {
    if (!this.murmurOut) return;
    this.murmurOut.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
  }

  // Seslendirme (hazır kayıt), 3D konumlu
  async loadVoice(name, url) {
    if (!this.ready) return;
    this.voices = this.voices || {};
    try {
      const buf = await (await fetch(url)).arrayBuffer();
      this.voices[name] = await this.ctx.decodeAudioData(buf);
    } catch (e) { /* ses yoksa altyazıyla devam */ }
  }
  voice(name, pos, onEnd, ref = 2) {
    const buf = this.ready && this.voices?.[name];
    if (!buf) return false;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF'; p.refDistance = ref; p.rolloffFactor = 0.6;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    const g = this.gain(1.6);
    src.connect(g).connect(p).connect(this.master);
    // dudak senkronu için ses şiddeti
    if (!this.vAn) { this.vAn = this.ctx.createAnalyser(); this.vAn.fftSize = 512; this.vBuf = new Float32Array(512); const z = this.gain(0); this.vAn.connect(z).connect(this.ctx.destination); }
    g.connect(this.vAn);
    g.connect(this.reverbIn);
    src.onended = onEnd;
    src.start();
    return buf.duration;
  }

  // Konuşma şiddeti 0..1 (çene hareketi için)
  level() {
    if (!this.vAn) return 0;
    this.vAn.getFloatTimeDomainData(this.vBuf);
    let e = 0; for (let i = 0; i < this.vBuf.length; i++) e += this.vBuf[i] * this.vBuf[i];
    return Math.min(1, Math.sqrt(e / this.vBuf.length) * 5);
  }

  door() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.gain(1); out.connect(this.master); out.connect(this.reverbIn);
    // Kol tıkı (iki metal tık)
    this.burst({ t, dur: 0.04, freq: 2600, q: 4, gain: 0.5, dest: out });
    this.burst({ t: t + 0.09, dur: 0.06, freq: 1800, q: 5, gain: 0.35, dest: out });
    // Kapı açılırken hava + menteşe
    const g = this.burst({ t: t + 0.15, dur: 1.4, type: 'lowpass', freq: 900, gain: 0.16, attack: 0.4, dest: out });
    void g;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(320, t + 0.2);
    o.frequency.linearRampToValueAtTime(260, t + 1.0);
    const bp = this.filter('bandpass', 900, 12);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0, t + 0.2);
    og.gain.linearRampToValueAtTime(0.025, t + 0.4);
    og.gain.linearRampToValueAtTime(0, t + 1.0);
    o.connect(bp).connect(og).connect(out);
    o.start(t + 0.2); o.stop(t + 1.1);
  }

  doorClose() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.gain(1); out.connect(this.master); out.connect(this.reverbIn);
    this.thump({ t, f0: 90, f1: 40, dur: 0.25, gain: 0.5, dest: out });
    this.burst({ t, dur: 0.12, freq: 700, q: 1, gain: 0.3, dest: out });
    this.burst({ t: t + 0.02, dur: 0.05, freq: 2400, q: 3, gain: 0.25, dest: out });
  }

  // --- Gündüz İstanbul atmosferi: martılar ve uzaktan kornalar (yalnızca dışarıdayken)
  placed(x, y, z, ref = 8) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
    p.connect(this.master);
    return p;
  }
  gull(x, y, z) {
    const { ctx } = this;
    const out = this.placed(x, y, z, 14);
    let t = ctx.currentTime + 0.05;
    const calls = 2 + Math.floor(Math.random() * 3);
    const base = 0.85 + Math.random() * 0.3;
    for (let i = 0; i < calls; i++) {
      const long = i === 0 || Math.random() < 0.3;
      const d = long ? 0.42 : 0.2;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(1300 * base, t);
      o.frequency.linearRampToValueAtTime(2250 * base, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(1000 * base, t + d);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 34; const lg = this.gain(70); lfo.connect(lg).connect(o.frequency);
      const bp = this.filter('bandpass', 2100, 2.2), hp = this.filter('highpass', 900);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0005, t + d);
      o.connect(bp).connect(hp).connect(g).connect(out);
      o.start(t); o.stop(t + d + 0.05); lfo.start(t); lfo.stop(t + d + 0.05);
      t += d + 0.08 + Math.random() * 0.12;
    }
  }
  horn(x, z) {
    const { ctx } = this;
    const out = this.placed(x, 1, z, 10);
    let t = ctx.currentTime + 0.05;
    const beeps = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < beeps; i++) {
      const d = 0.18 + Math.random() * (i ? 0.15 : 0.45);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.01); g.gain.setValueAtTime(0.06, t + d - 0.03); g.gain.linearRampToValueAtTime(0, t + d);
      const lp = this.filter('lowpass', 2400);
      for (const f of [392, 494]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + d + 0.02); }
      lp.connect(g).connect(out);
      t += d + 0.12;
    }
  }
  clink() {
    const t = this.ctx.currentTime;
    const out = this.gain(1); out.connect(this.master); out.connect(this.reverbIn);
    const f0 = 2400 + Math.random() * 1800;
    for (const [f, g] of [[f0, 0.04], [f0 * 2.7, 0.015]]) {
      const o = this.ctx.createOscillator(); o.frequency.value = f;
      const e = this.ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.002); e.gain.exponentialRampToValueAtTime(0.0003, t + 0.35);
      o.connect(e).connect(out); o.start(t); o.stop(t + 0.4);
    }
  }
  steam() {
    const t = this.ctx.currentTime;
    this.burst({ t, dur: 2.2, type: 'highpass', freq: 2500, gain: 0.025, attack: 0.3, dest: this.master });
  }
  ambience(dt, cam) {
    if (this.ready && this.cafe) {
      this.clinkT = (this.clinkT ?? 2) - dt; this.steamT = (this.steamT ?? 6) - dt;
      if (this.clinkT < 0) { this.clinkT = 1.5 + Math.random() * 4; this.clink(); }
      if (this.steamT < 0) { this.steamT = 12 + Math.random() * 10; this.steam(); }
      return;
    }
    if (!this.ready || !this.outside) return;
    this.gullT = (this.gullT ?? 2) - dt;
    this.hornT = (this.hornT ?? 6) - dt;
    if (this.gullT < 0) { this.gullT = 5 + Math.random() * 9; this.gull(cam.x + (Math.random() - 0.3) * 50, 22 + Math.random() * 15, cam.z - 20 + (Math.random() - 0.5) * 60); }
    if (this.hornT < 0) { this.hornT = 9 + Math.random() * 14; this.horn(4 + Math.random() * 18, cam.z + (Math.random() - 0.5) * 120); }
  }

  // Araba: motor + ıslak lastik hışırtısı, 3D konumlu
  addCar() {
    if (!this.ready) return null;
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 5; p.rolloffFactor = 1.4; p.maxDistance = 200;
    p.connect(this.carBus);
    this.loop(this.brown, [this.filter('lowpass', 380), this.gain(0.9)], p, 0.9 + Math.random() * 0.4);
    this.loop(this.white, [this.filter('bandpass', 1700, 0.6), this.gain(0.32)], p, 1);
    this.cars.push(p);
    return p;
  }

  listen(pos, fwd) {
    if (!this.ready) return;
    const l = this.ctx.listener;
    if (l.positionX) {
      l.positionX.value = pos.x; l.positionY.value = pos.y; l.positionZ.value = pos.z;
      l.forwardX.value = fwd.x; l.forwardY.value = fwd.y; l.forwardZ.value = fwd.z;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(pos.x, pos.y, pos.z);
      l.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }

  // wake: 0..1 (boğuk → net), inside: 0..1 (sokak → lobi)
  mix(wake, inside, room = 0) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(Math.min(1, wake * 1.6) * 0.9, t, 0.1);
    this.muffle.frequency.setTargetAtTime(260 + Math.pow(wake, 2) * 19000, t, 0.1);
    // İçeri girip kapı kapanınca yağmur neredeyse tamamen kesilir, trafik uzaktan duyulur
    this.rainLP.frequency.setTargetAtTime(7500 - inside * 6900, t, 0.25);
    const street = 1 - room; // toplantı odasında sokak sesi hiç yok
    this.rainOut.gain.setTargetAtTime(Math.max(0.015, 1 - inside) * street * (1 - (this.dry || 0)), t, 0.3);
    this.cityOut.gain.setTargetAtTime(0.5 * (1 - inside * 0.9) * street, t, 0.3);
    this.carBus.gain.setTargetAtTime((1 - inside * 0.85) * street, t, 0.3);
    this.outside = inside < 0.3;
    this.roomOut.gain.setTargetAtTime(inside * (room ? 0.03 : 0.1), t, 0.2);
    this.reverbIn.gain.setTargetAtTime(inside * 0.5, t, 0.2);
    this.cars.forEach((c) => {
      // Lobi içinde trafik sesi camın arkasında kalsın
      c.rolloffFactor = 1.4 + inside * 2;
    });
  }
}
