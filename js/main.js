// Start, Skalierung, Hauptschleife und Szenenwechsel
(function () {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  BM.ctx = ctx;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = Math.min(window.innerWidth / BM.W, window.innerHeight / BM.H);
    canvas.style.width = Math.floor(BM.W * s) + 'px';
    canvas.style.height = Math.floor(BM.H * s) + 'px';
    canvas.width = Math.floor(BM.W * s * dpr);
    canvas.height = Math.floor(BM.H * s * dpr);
    BM.scale = s * dpr;
  }
  window.addEventListener('resize', resize);

  BM.scene = null;
  BM.go = (name, params) => {
    const sc = BM.Scenes[name];
    if (!sc) { console.error('Unbekannte Szene', name); return; }
    if (BM.scene && BM.scene.leave) BM.scene.leave();
    BM.scene = sc;
    BM.Input.consumeAll();
    sc.enter(params);
  };

  function touchVisible() {
    const mode = BM.S.settings.touch;
    const on = mode === 'on' || (mode === 'auto' && (BM.Input.device() === 'touch' || (BM.Input.isTouchDevice() && BM.Input.device() !== 'kb' && BM.Input.device() !== 'pad' && BM.Input.device() !== 'mouse')));
    document.getElementById('touch').classList.toggle('on', on);
  }

  let last = performance.now(), errShown = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    requestAnimationFrame(frame);
  }
  // Ein Frame Spiellogik + Zeichnen (auch für Tests nutzbar: BM.step(n))
  BM.step = (n) => { for (let i = 0; i < (n || 1); i++) step(1 / 60); };
  function step(dt) {
    try {
      BM.Input.update(dt);
      if (BM.Overlays.active()) BM.Overlays.update(dt);
      else if (BM.scene) BM.scene.update(dt);
      else BM.Overlays.update(dt);
      ctx.setTransform(BM.scale, 0, 0, BM.scale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = BM.C.bg; ctx.fillRect(0, 0, BM.W, BM.H);
      if (BM.scene) BM.scene.draw(ctx);
      BM.Overlays.draw(ctx);
      touchVisible();
    } catch (e) {
      console.error(e);
      if (!errShown) { errShown = true; BM.toast('Fehler: ' + e.message, '#ff5040'); setTimeout(() => { errShown = false; }, 3000); }
    }
    BM.Input.endFrame();
  }

  async function boot() {
    BM.loadSettings();
    resize();
    BM.Input.bindCanvas(canvas);
    BM.Input.bindTouch();
    // Unbehandelte Fehler in async-Abläufen sichtbar machen
    window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); BM.toast('Fehler: ' + (e.reason && e.reason.message), '#ff5040'); });
    try { await Promise.race([Promise.all([document.fonts.load('20px "Pixelify Sans"'), document.fonts.load('40px "UnifrakturMaguntia"')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
    BM.go('title');
    requestAnimationFrame(frame);
  }
  boot();
})();
