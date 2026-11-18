// Einheitliche Eingabe: Tastatur, Gamepad und Touch werden zu Aktionen zusammengefasst
BM.Input = (function () {
  const ACTIONS = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu'];
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Enter: 'confirm', Space: 'confirm', KeyE: 'confirm',
    Escape: 'cancel', Backspace: 'cancel', KeyQ: 'cancel',
    Tab: 'menu', KeyI: 'menu', KeyM: 'menu',
  };
  const kb = new Set(), touch = new Set(), taps = new Set(); // taps: kurze Drücke zwischen zwei Frames
  const st = {};
  for (const a of ACTIONS) st[a] = { down: false, prev: false, pressed: false, rep: false, t: 0 };
  let pad = new Set();
  let clicks = [];
  let pointer = { x: -1, y: -1, moved: false };
  let lastDevice = 'kb';
  let activity = false;

  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (a) { if (!e.repeat) taps.add(a); kb.add(a); e.preventDefault(); }
    lastDevice = 'kb'; activity = true;
    BM.Audio && BM.Audio.unlock();
  });
  window.addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) kb.delete(a); });
  window.addEventListener('blur', () => { kb.clear(); touch.clear(); });

  function bindTouch() {
    document.querySelectorAll('#touch .tbtn').forEach((el) => {
      const a = el.dataset.act;
      const on = (e) => { e.preventDefault(); touch.add(a); taps.add(a); el.classList.add('active'); lastDevice = 'touch'; activity = true; BM.Audio && BM.Audio.unlock(); };
      const off = (e) => { e.preventDefault(); touch.delete(a); el.classList.remove('active'); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    });
  }

  function bindCanvas(canvas) {
    const toLogical = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * BM.W, y: (e.clientY - r.top) / r.height * BM.H };
    };
    canvas.addEventListener('pointerdown', (e) => {
      const p = toLogical(e);
      clicks.push(p); pointer.x = p.x; pointer.y = p.y; pointer.moved = true;
      lastDevice = e.pointerType === 'touch' ? 'touch' : 'mouse';
      activity = true; BM.Audio && BM.Audio.unlock();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const p = toLogical(e); pointer.x = p.x; pointer.y = p.y; pointer.moved = true;
    });
  }

  function pollPad() {
    pad = new Set();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (b(12) || ay < -0.5) pad.add('up');
      if (b(13) || ay > 0.5) pad.add('down');
      if (b(14) || ax < -0.5) pad.add('left');
      if (b(15) || ax > 0.5) pad.add('right');
      if (b(0)) pad.add('confirm');
      if (b(1)) pad.add('cancel');
      if (b(9) || b(3)) pad.add('menu');
      if (pad.size) { lastDevice = 'pad'; activity = true; }
    }
  }

  function update(dt) {
    pollPad();
    for (const a of ACTIONS) {
      const s = st[a];
      s.prev = s.down;
      const tap = taps.has(a);
      s.down = kb.has(a) || pad.has(a) || touch.has(a) || tap;
      s.pressed = (s.down && !s.prev) || (tap && !s.prev);
      if (tap && s.prev && !kb.has(a)) s.pressed = true;
      s.rep = false;
      if (s.pressed) { s.rep = true; s.t = 0.3; }
      else if (s.down) { s.t -= dt; if (s.t <= 0) { s.rep = true; s.t = 0.085; } }
    }
    taps.clear();
  }

  // Wird am Ende jedes Frames aufgerufen
  function endFrame() { clicks = []; pointer.moved = false; activity = false; }

  return {
    bindTouch, bindCanvas, update, endFrame,
    pressed: (a) => st[a].pressed,
    held: (a) => st[a].down,
    repeat: (a) => st[a].rep,
    clicks: () => clicks,
    takeClick: () => clicks.shift(),
    pointer: () => pointer,
    device: () => lastDevice,
    activity: () => activity,
    consume: (a) => { st[a].pressed = false; st[a].rep = false; },
    consumeAll: () => { for (const a of ACTIONS) { st[a].pressed = false; st[a].rep = false; } clicks = []; },
    isTouchDevice: () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
  };
})();
