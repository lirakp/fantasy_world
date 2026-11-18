// Kleiner Synthesizer für Effekte und Atmosphäre (keine Audiodateien nötig)
BM.Audio = (function () {
  let ctx = null, master = null, sfxGain = null, musGain = null, amb = null;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.connect(master);
      musGain = ctx.createGain(); musGain.connect(master);
      applyVolume();
    } catch (e) { ctx = null; }
  }

  function applyVolume() {
    if (!ctx) return;
    const s = BM.S ? BM.S.settings : { sfx: 0.6, music: 0.4 };
    sfxGain.gain.value = s.sfx;
    musGain.gain.value = s.music * 0.5;
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

  function noise(dur, vol, freq, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
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
  };

  function sfx(name) { if (FX[name]) FX[name](); }

  // Atmosphäre: tiefer Drone-Klang, je nach Ort
  function ambience(kind) {
    if (!ctx) return;
    stopAmbience();
    const presets = {
      town: [[110, 'sine', 0.05], [165, 'sine', 0.035], [220, 'triangle', 0.02]],
      physical: [[55, 'sawtooth', 0.03], [82.4, 'sine', 0.04]],
      thorn: [[49, 'sawtooth', 0.03], [73.4, 'triangle', 0.035], [98.7, 'sine', 0.015]],
      blood: [[41.2, 'sawtooth', 0.045], [61.7, 'sawtooth', 0.025], [87.3, 'sine', 0.02]],
      memory: [[65.4, 'sine', 0.04], [98, 'sine', 0.03], [138.6, 'triangle', 0.015]],
      menu: [[55, 'sine', 0.04], [82.4, 'triangle', 0.025], [110, 'sine', 0.015]],
    };
    const p = presets[kind] || presets.menu;
    const nodes = [];
    for (const [f, type, v] of p) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.value = 0; g.gain.linearRampToValueAtTime(v, ctx.currentTime + 2);
      lfo.frequency.value = 0.05 + Math.random() * 0.15; lg.gain.value = v * 0.5;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(musGain);
      o.start(); lfo.start();
      nodes.push(o, lfo, g);
    }
    amb = nodes;
  }
  function stopAmbience() {
    if (!amb || !ctx) return;
    for (const n of amb) { try { if (n.stop) n.stop(ctx.currentTime + 0.3); } catch (e) {} }
    amb = null;
  }

  return { unlock, sfx, ambience, stopAmbience, applyVolume };
})();
