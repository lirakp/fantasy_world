// Synthesizer für Effekte, Atmosphäre und Musik (keine Audiodateien nötig)
BM.Audio = (function () {
  let ctx = null, master = null, sfxGain = null, ambGain = null, musGain = null, amb = null;
  let lastAmb = null, lastSong = null;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.connect(master);
      ambGain = ctx.createGain(); ambGain.connect(master);
      musGain = ctx.createGain(); musGain.connect(master);
      applyVolume();
      // Was vor der ersten Eingabe angefordert wurde, jetzt nachholen
      const wanted = lastSong;
      if (lastAmb) ambience(lastAmb);
      if (wanted && wanted !== lastSong) music(wanted);
    } catch (e) { ctx = null; }
  }

  function applyVolume() {
    if (!ctx) return;
    const s = BM.S ? BM.S.settings : { sfx: 0.6, music: 0.5, amb: 0.5 };
    sfxGain.gain.value = s.sfx;
    ambGain.gain.value = (s.amb !== undefined ? s.amb : 0.5) * 0.5;
    musGain.gain.value = s.music * 0.55;
  }

  function tone(freq, dur, type, vol, slide, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function getNoise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function noise(dur, vol, freq, delay, dest, type, at) {
    if (!ctx) return;
    const t = at !== undefined ? at : ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource(); src.buffer = getNoise();
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 1200;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxGain);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  const FX = {
    select: () => tone(520, 0.05, 'square', 0.06),
    confirm: () => { tone(660, 0.06, 'square', 0.08); tone(990, 0.08, 'square', 0.06, null, 0.05); },
    cancel: () => tone(330, 0.08, 'square', 0.07, 220),
    step: () => noise(0.04, 0.05, 500),
    hit: () => { noise(0.12, 0.3, 900); tone(140, 0.1, 'sawtooth', 0.1, 60); },
    crit: () => { noise(0.2, 0.35, 1800); tone(220, 0.18, 'sawtooth', 0.14, 50); },
    heal: () => { tone(523, 0.12, 'sine', 0.1); tone(784, 0.2, 'sine', 0.09, null, 0.08); },
    magic: () => { tone(300, 0.3, 'triangle', 0.12, 1200); noise(0.25, 0.1, 3000); },
    coin: () => { tone(1320, 0.05, 'square', 0.06); tone(1760, 0.08, 'square', 0.06, null, 0.05); },
    trap: () => { noise(0.25, 0.35, 2500); tone(180, 0.2, 'sawtooth', 0.12, 40); },
    door: () => { tone(90, 0.5, 'sawtooth', 0.12, 40); noise(0.5, 0.15, 300); },
    levelup: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, 'square', 0.07, null, i * 0.09)); },
    death: () => { tone(200, 0.8, 'sawtooth', 0.12, 40); noise(0.6, 0.15, 400); },
    scream: () => { for (let i = 0; i < 6; i++) tone(700 + Math.random() * 500, 0.5, 'sawtooth', 0.05, 300, i * 0.08); noise(1.2, 0.12, 2200); },
    chest: () => { tone(392, 0.08, 'square', 0.07); tone(523, 0.08, 'square', 0.07, null, 0.07); tone(784, 0.15, 'square', 0.07, null, 0.14); },
    curse: () => { tone(160, 0.6, 'sawtooth', 0.1, 70); tone(233, 0.6, 'sawtooth', 0.06, 90, 0.05); noise(0.5, 0.1, 600); },
  };
  function sfx(name) { if (FX[name]) FX[name](); }

  // ---------------- Atmosphäre (Drone) ----------------
  function ambience(kind) {
    lastAmb = kind;
    music(songFor(kind));
    if (!ctx) return;
    stopAmbience();
    const presets = {
      town: [[110, 'sine', 0.035], [165, 'sine', 0.02]],
      bloodtown: [[55, 'sawtooth', 0.03], [82.4, 'sine', 0.035]],
      physical: [[55, 'sawtooth', 0.03], [82.4, 'sine', 0.04]],
      thorn: [[49, 'sawtooth', 0.03], [73.4, 'triangle', 0.035], [98.7, 'sine', 0.015]],
      blood: [[41.2, 'sawtooth', 0.045], [61.7, 'sawtooth', 0.025], [87.3, 'sine', 0.02]],
      memory: [[65.4, 'sine', 0.04], [98, 'sine', 0.03], [138.6, 'triangle', 0.015]],
      menu: [[55, 'sine', 0.04], [82.4, 'triangle', 0.025]],
    };
    const p = presets[kind === 'town' && BM.S.run && BM.S.run.bloodMoon ? 'bloodtown' : kind] || presets.menu;
    const nodes = [];
    for (const [f, type, v] of p) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.value = 0; g.gain.linearRampToValueAtTime(v, ctx.currentTime + 2);
      lfo.frequency.value = 0.05 + Math.random() * 0.15; lg.gain.value = v * 0.5;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(ambGain);
      o.start(); lfo.start();
      nodes.push(o, lfo, g);
    }
    amb = nodes;
  }
  function stopAmbience() {
    if (!amb || !ctx) return;
    for (const n of amb) { try { if (n.gain) n.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4); if (n.stop) n.stop(ctx.currentTime + 0.45); } catch (e) {} }
    amb = null;
  }
  function songFor(kind) {
    if (kind === 'menu') return 'title';
    if (kind === 'town') return BM.S.run && BM.S.run.bloodMoon ? 'bloodtown' : 'town';
    if (['physical', 'thorn', 'blood', 'memory'].includes(kind)) return 'dungeon_' + kind;
    return kind;
  }

  // ---------------- Musik-Sequenzer ----------------
  // Noten: "A4", "C#5", "Bb3"; "-" hält die vorige Note, "." ist Pause, "|" nur zur Übersicht.
  // Schlagzeug: k = Bassdrum, s = Snare, h = Hi-Hat
  const SONGS = {
    title: { tempo: 72, parts: [
      { inst: 'lead', n: 'A4 - - - C5 - B4 - | A4 - - - E4 - - - | F4 - - - G4 - A4 - | E4 - - - - - - - | A4 - - - C5 - D5 - | E5 - - - D5 - C5 - | B4 - - - G4 - B4 - | A4 - - - - - - - |' },
      { inst: 'bass', n: 'A2 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | A2 - - - - - - - | C3 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - |' },
      { inst: 'pad', n: 'E4 - - - - - - - | C4 - - - - - - - | A3 - - - - - - - | G#3 - - - - - - - | E4 - - - - - - - | G4 - - - - - - - | D4 - - - - - - - | C4 - - - - - - - |' },
    ] },
    town: { tempo: 100, parts: [
      { inst: 'lead', n: 'D5 - A4 - F4 G4 A4 - | C5 - A4 G4 F4 - E4 - | D4 F4 A4 D5 C5 - A4 - | G4 - F4 E4 D4 - - - | F4 - A4 - C5 - D5 - | E5 - D5 C5 A4 - - - | B4 - A4 G4 F4 - G4 - | A4 - - - . . . . |' },
      { inst: 'bass', n: 'D3 - - - A2 - - - | C3 - - - G2 - - - | D3 - - - A2 - - - | G2 - - - A2 - - - | F2 - - - C3 - - - | C3 - - - A2 - - - | G2 - - - D3 - - - | A2 - - - A2 - - - |' },
      { inst: 'arp', n: 'D4 F4 A4 F4 D4 F4 A4 F4 | C4 E4 G4 E4 C4 E4 G4 E4 | D4 F4 A4 F4 D4 F4 A4 F4 | G3 B3 D4 B3 A3 C#4 E4 C#4 |' },
    ] },
    bloodtown: { tempo: 70, parts: [
      { inst: 'lead', n: 'D5 - - - C#5 - - - | D5 - - - A4 - - - | Bb4 - - - A4 - G4 - | A4 - - - - - - - | F5 - - - E5 - - - | D5 - - - C#5 - - - | D5 - - - Bb4 - - - | A4 - - - - - - - |' },
      { inst: 'bass', n: 'D2 - - - - - - - | D2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - |' },
      { inst: 'pad', n: 'A3 - - - - - - - | F3 - - - - - - - | D4 - - - - - - - | C#4 - - - - - - - |' },
      { inst: 'drum', n: 'k . . k . . . . |' },
    ] },
    black: { tempo: 92, parts: [
      { inst: 'pluck', n: 'A3 . C4 . E4 . D#4 . | D4 . . . C4 . A3 . | F3 . A3 . C4 . B3 . | A3 . . . . . G#3 . |' },
      { inst: 'bass', n: 'A2 . . . E2 . . . | D2 . . . A2 . . . | F2 . . . E2 . . . | A2 . . . E2 . . . |' },
      { inst: 'drum', n: 'k . h . . . h . | k . h . . h h . |' },
    ] },
    dungeon: { tempo: 64, parts: [
      { inst: 'lead2', n: 'E4 - - - . . . . | . . F4 - - - . . | E4 - - - D4 - - - | . . . . . . . . | B3 - - - . . C4 - | - - . . . . . . | E4 - - - F4 - - - | E4 - - - . . . . |' },
      { inst: 'bass', n: 'E2 - - - - - - - | E2 - - - - - - - | C2 - - - - - - - | B1 - - - - - - - |' },
      { inst: 'drum', n: 'k . . . . . . . | . . . . k . . . |' },
    ] },
    battle: { tempo: 150, parts: [
      { inst: 'lead', n: 'E5 - E5 D5 E5 - G5 - | F#5 - E5 - D5 - B4 - | C5 - C5 B4 C5 - E5 - | D5 - C5 - B4 - - - | E5 - E5 D5 E5 - G5 - | A5 - G5 - F#5 - E5 - | D5 - B4 - C5 - D5 - | E5 - - - - - - - |' },
      { inst: 'bass', n: 'E2 E3 E2 E3 E2 E3 E2 E3 | D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | B1 B2 B1 B2 B1 B2 B1 B2 |' },
      { inst: 'drum', n: 'k . h . s . h . | k . h k s . h . |' },
    ] },
    boss: { tempo: 160, parts: [
      { inst: 'lead', n: 'A4 C5 E5 A5 G#5 - E5 - | F5 E5 D5 C5 B4 - G#4 - | A4 C5 E5 A5 B5 - G#5 - | A5 - E5 - C5 - A4 - | D5 F5 A5 D6 C6 - A5 - | B5 A5 G#5 F5 E5 - D5 - | C5 E5 A5 C6 B5 - G#5 - | A5 - - - - - - - |' },
      { inst: 'bass', n: 'A1 A2 A1 A2 A1 A2 A1 A2 | F1 F2 F1 F2 F1 F2 F1 F2 | A1 A2 A1 A2 A1 A2 A1 A2 | E1 E2 E1 E2 E1 E2 E1 E2 | D2 D3 D2 D3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 | A1 A2 A1 A2 A1 A2 A1 A2 | E1 E2 E1 E2 G#1 G#2 G#1 G#2 |' },
      { inst: 'drum', n: 'k h s h k k s h |' },
    ] },
  };
  // Dungeon-Varianten: transponiert, Erinnerung mit Glockenklang
  const VARIANT = { dungeon_physical: [0, 'lead2'], dungeon_thorn: [-2, 'lead2'], dungeon_blood: [-5, 'lead'], dungeon_memory: [3, 'bell'] };

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(tok, tr) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(tok);
    if (!m) return 0;
    const n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12 + (tr || 0);
    return 440 * Math.pow(2, (n - 69) / 12);
  }
  function parse(str) { return str.split(/\s+/).filter((t) => t && t !== '|'); }

  const INST = {
    lead: { type: 'square', vol: 0.045, a: 0.01, cut: 2200 },
    lead2: { type: 'triangle', vol: 0.09, a: 0.03, cut: 3000 },
    bell: { type: 'sine', vol: 0.08, a: 0.005, cut: 6000, decay: true },
    pluck: { type: 'square', vol: 0.04, a: 0.005, cut: 1400, decay: true },
    arp: { type: 'square', vol: 0.022, a: 0.005, cut: 1600, decay: true },
    bass: { type: 'triangle', vol: 0.13, a: 0.01, cut: 900 },
    pad: { type: 'sawtooth', vol: 0.025, a: 0.4, cut: 700 },
  };

  let song = null, timer = null;
  function music(name) {
    if (!name || name === 'none') { stopMusic(); lastSong = null; return; }
    if (lastSong === name && song) return;
    lastSong = name;
    if (!ctx) return;
    stopMusic();
    const v = VARIANT[name];
    const def = SONGS[v ? 'dungeon' : name];
    if (!def) return;
    const bus = ctx.createGain(); bus.gain.value = 0; bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2); bus.connect(musGain);
    song = {
      name, bus, step: 0, next: ctx.currentTime + 0.1, dur: 60 / def.tempo / 2,
      parts: def.parts.map((p) => ({ inst: v && p.inst === 'lead2' ? v[1] : p.inst, toks: parse(p.n), tr: v ? v[0] : 0 })),
    };
    timer = setInterval(schedule, 40);
  }
  function stopMusic() {
    if (timer) { clearInterval(timer); timer = null; }
    if (song && ctx) { const b = song.bus; b.gain.cancelScheduledValues(ctx.currentTime); b.gain.setValueAtTime(b.gain.value, ctx.currentTime); b.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6); setTimeout(() => { try { b.disconnect(); } catch (e) {} }, 800); }
    song = null;
  }
  function schedule() {
    if (!song || !ctx) return;
    while (song.next < ctx.currentTime + 0.25) {
      for (const p of song.parts) {
        const tok = p.toks[song.step % p.toks.length];
        if (!tok || tok === '.' || tok === '-') continue;
        if (p.inst === 'drum') { drum(tok, song.next); continue; }
        let len = 1; while (p.toks[(song.step + len) % p.toks.length] === '-' && len < p.toks.length) len++;
        play(p.inst, freq(tok, p.tr), song.next, len * song.dur);
      }
      song.step++; song.next += song.dur;
    }
  }
  function play(inst, f, t, dur) {
    if (!f) return;
    const I = INST[inst] || INST.lead;
    const o = ctx.createOscillator(), g = ctx.createGain(), flt = ctx.createBiquadFilter();
    o.type = I.type; o.frequency.setValueAtTime(f, t);
    flt.type = 'lowpass'; flt.frequency.value = I.cut;
    const end = t + dur * 0.95;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(I.vol, t + Math.min(I.a, dur * 0.5));
    if (I.decay) g.gain.exponentialRampToValueAtTime(0.0005, t + Math.max(0.12, Math.min(dur, 1.2)));
    else { g.gain.setValueAtTime(I.vol * 0.8, Math.max(t + I.a, end - 0.05)); g.gain.linearRampToValueAtTime(0, end); }
    o.connect(flt); flt.connect(g); g.connect(song.bus);
    o.start(t); o.stop(end + 1.3);
  }
  function drum(k, t) {
    const bus = song.bus;
    if (k === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
      g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2);
    } else if (k === 's') noise(0.14, 0.12, 1800, 0, bus, 'highpass', t);
    else if (k === 'h') noise(0.04, 0.05, 7000, 0, bus, 'highpass', t);
  }

  return { unlock, sfx, ambience, stopAmbience, applyVolume, music, stopMusic, songs: () => Object.keys(SONGS) };
})();
