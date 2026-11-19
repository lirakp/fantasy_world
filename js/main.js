// Start, Skalierung, Hauptschleife und Szenenwechsel
(function () {
  // Das Spiel wird immer in fester Pixel-Auflösung (960×540) in einen Puffer gezeichnet
  // und dann ohne Glättung hochskaliert – so liegt alles auf demselben Pixel-Raster.
  const canvas = document.getElementById('screen');
  const screen = canvas.getContext('2d');
  const buf = document.createElement('canvas');
  buf.width = BM.W; buf.height = BM.H;
  const ctx = buf.getContext('2d');
  BM.ctx = ctx;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(window.innerWidth * dpr / BM.W, window.innerHeight * dpr / BM.H);
    // Ganzzahlige Vergrößerung, wenn sie das Fenster gut füllt; sonst exakt einpassen
    const k = fit >= 1 && Math.floor(fit) / fit > 0.85 ? Math.floor(fit) : fit;
    canvas.width = Math.round(BM.W * k);
    canvas.height = Math.round(BM.H * k);
    canvas.style.width = (canvas.width / dpr) + 'px';
    canvas.style.height = (canvas.height / dpr) + 'px';
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
      BM.Overlays.tickToasts(dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = BM.C.bg; ctx.fillRect(0, 0, BM.W, BM.H);
      if (BM.scene) BM.scene.draw(ctx);
      BM.Overlays.draw(ctx);
      screen.imageSmoothingEnabled = false;
      screen.drawImage(buf, 0, 0, canvas.width, canvas.height);
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
