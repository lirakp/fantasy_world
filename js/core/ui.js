// UI-Grundbausteine: Text, Panels, Balken, Menüs, Dialoge
BM.W = 960; BM.H = 540;

BM.C = {
  bg: '#0b0807', panel: '#17110f', panel2: '#2c211c', edge: '#4a3a2c',
  gold: '#b8955a', gold2: '#e6c886', ink: '#e7dcc3', dim: '#9f8a68', mute: '#6b5d4c',
  red: '#8b1e1a', blood: '#c0262d', green: '#6aa85a', blue: '#5a8ad0', purple: '#9a6ad0',
  hp: '#c0392b', mp: '#3d6fc9', xp: '#c9a13d',
};
BM.RANK_COLOR = { D: '#8e8e8e', C: '#c07a42', B: '#cfd3db', A: '#e8b440', S: '#7fd6ee', SS: '#ff6a4a' };

BM.UI = (function () {
  const PIX = '"Pixelify Sans", monospace';
  const GOTH = '"UnifrakturMaguntia", serif';

  function setFont(ctx, size, family, weight) {
    ctx.font = (weight || '400') + ' ' + size + 'px ' + (family === 'goth' ? GOTH : PIX);
  }

  function text(ctx, str, x, y, o) {
    o = o || {};
    setFont(ctx, o.size || 16, o.font, o.weight);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'top';
    str = String(str);
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillText(str, x + 1, y + 2, o.maxW);
    }
    ctx.fillStyle = o.color || BM.C.ink;
    ctx.fillText(str, x, y, o.maxW);
  }

  function measure(ctx, str, size, font) { setFont(ctx, size || 16, font); return ctx.measureText(String(str)).width; }

  function wrap(ctx, str, maxW, size, font) {
    setFont(ctx, size || 16, font);
    const out = [];
    for (const para of String(str).split('\n')) {
      const words = para.split(' ');
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
        else line = test;
      }
      out.push(line);
    }
    return out;
  }

  function textBlock(ctx, str, x, y, maxW, o) {
    o = o || {};
    const size = o.size || 16, lh = o.lh || Math.round(size * 1.35);
    const lines = wrap(ctx, str, maxW, size, o.font);
    lines.forEach((l, i) => text(ctx, l, x, y + i * lh, o));
    return lines.length * lh;
  }

  function panel(ctx, x, y, w, h, o) {
    o = o || {};
    ctx.fillStyle = o.fill || 'rgba(16,11,9,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = o.edge || BM.C.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = o.inner || 'rgba(184,149,90,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11);
    // Eckverzierung
    ctx.fillStyle = o.edge || BM.C.gold;
    for (const [cx, cy] of [[x, y], [x + w - 6, y], [x, y + h - 6], [x + w - 6, y + h - 6]]) ctx.fillRect(cx, cy, 6, 6);
  }

  function bar(ctx, x, y, w, h, ratio, color, back) {
    ratio = BM.clamp(ratio || 0, 0, 1);
    ctx.fillStyle = back || '#120c0a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * ratio), h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * ratio), Math.max(1, (h - 2) >> 2));
  }

  function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

  // Allgemeines Listenmenü – Tastatur, Gamepad und Maus/Touch
  class Menu {
    constructor(items, o) {
      this.items = items; this.o = Object.assign({ x: 0, y: 0, w: 260, rowH: 30, size: 18, maxRows: 12, align: 'left', input: true }, o || {});
      this.sel = 0; this.scroll = 0; this.rects = [];
      this.skipDisabled(1);
    }
    setItems(items) { this.items = items; if (this.sel >= items.length) this.sel = Math.max(0, items.length - 1); this.skipDisabled(1); }
    isDisabled(it) { return typeof it.disabled === 'function' ? it.disabled() : !!it.disabled; }
    label(it) { return typeof it.label === 'function' ? it.label() : it.label; }
    skipDisabled(dir) {
      const n = this.items.length; if (!n) return;
      for (let k = 0; k < n && this.isDisabled(this.items[this.sel]) && !this.items[this.sel].selectable; k++) this.sel = (this.sel + dir + n) % n;
    }
    move(dir) {
      const n = this.items.length; if (!n) return;
      let s = this.sel;
      for (let k = 0; k < n; k++) { s = (s + dir + n) % n; if (!this.isDisabled(this.items[s]) || this.items[s].selectable) break; }
      if (s !== this.sel) { this.sel = s; BM.Audio.sfx('select'); if (this.o.onMove) this.o.onMove(this.items[s], s); }
    }
    current() { return this.items[this.sel]; }
    update() {
      const I = BM.Input, it = this.items[this.sel];
      if (!this.items.length) { if (I.pressed('cancel') && this.o.onCancel) { BM.Audio.sfx('cancel'); this.o.onCancel(); } return; }
      if (I.repeat('up')) this.move(-1);
      if (I.repeat('down')) this.move(1);
      if (it && I.repeat('left') && it.onLeft) { it.onLeft(); BM.Audio.sfx('select'); }
      if (it && I.repeat('right') && it.onRight) { it.onRight(); BM.Audio.sfx('select'); }
      // Zeiger
      const p = I.pointer();
      if (p.moved) this.rects.forEach((r, i) => { if (inRect(p, r) && i !== this.sel && !this.isDisabled(this.items[i])) { this.sel = i; if (this.o.onMove) this.o.onMove(this.items[i], i); } });
      for (const c of I.clicks()) {
        this.rects.forEach((r, i) => {
          if (inRect(c, r)) {
            this.sel = i;
            const cur = this.items[i];
            // Klick auf den Wert: linke Hälfte (◀) verringert, rechte Hälfte (▶) erhöht
            if ((cur.onLeft || cur.onRight) && r.vx0 !== undefined && c.x >= r.vx0 - 12) {
              const fn = c.x < (r.vx0 + r.vx1) / 2 ? cur.onLeft : cur.onRight;
              if (fn) { fn(); BM.Audio.sfx('select'); }
            } else this.activate();
          }
        });
      }
      if (I.pressed('confirm')) this.activate();
      else if (I.pressed('cancel') && this.o.onCancel) { BM.Audio.sfx('cancel'); this.o.onCancel(); }
    }
    activate() {
      const it = this.items[this.sel];
      if (!it || this.isDisabled(it)) { BM.Audio.sfx('cancel'); return; }
      if (it.onSelect) { BM.Audio.sfx('confirm'); BM.Input.consumeAll(); it.onSelect(it, this.sel); }
    }
    draw(ctx) {
      const o = this.o, n = this.items.length;
      if (this.sel < this.scroll) this.scroll = this.sel;
      if (this.sel >= this.scroll + o.maxRows) this.scroll = this.sel - o.maxRows + 1;
      this.rects = [];
      const vis = Math.min(n, o.maxRows);
      for (let k = 0; k < vis; k++) {
        const i = this.scroll + k, it = this.items[i];
        const y = o.y + k * o.rowH;
        const r = { x: o.x, y, w: o.w, h: o.rowH - 2 };
        this.rects[i] = r;
        const sel = i === this.sel, dis = this.isDisabled(it);
        if (sel) {
          ctx.fillStyle = 'rgba(139,30,26,0.45)'; ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.fillStyle = BM.C.gold; ctx.fillRect(r.x, r.y, 3, r.h);
        }
        const col = dis ? BM.C.mute : (sel ? BM.C.gold2 : (it.color || BM.C.ink));
        let tx = o.align === 'center' ? r.x + r.w / 2 : r.x + 12;
        if (it.icon) { ctx.drawImage(it.icon, r.x + 8, r.y + (r.h - 28) / 2, 28, 28); tx += 32; }
        text(ctx, this.label(it), tx, r.y + (r.h - o.size) / 2 - 1, { size: o.size, color: col, align: o.align, maxW: r.w - 24 - (it.value ? 130 : 0) });
        if (it.value !== undefined) {
          const v = typeof it.value === 'function' ? it.value() : it.value;
          const arrows = it.onLeft || it.onRight;
          const vs = arrows ? '◀ ' + v + ' ▶' : v;
          r.vx1 = r.x + r.w - 12; r.vx0 = r.vx1 - measure(ctx, vs, o.size);
          text(ctx, vs, r.vx1, r.y + (r.h - o.size) / 2 - 1, { size: o.size, color: sel ? BM.C.gold2 : BM.C.dim, align: 'right' });
        }
      }
      if (this.scroll > 0) text(ctx, '▲', o.x + o.w - 14, o.y - 16, { size: 12, color: BM.C.dim });
      if (this.scroll + vis < n) text(ctx, '▼', o.x + o.w - 14, o.y + vis * o.rowH, { size: 12, color: BM.C.dim });
    }
  }

  return { text, measure, wrap, textBlock, panel, bar, Menu, inRect, setFont };
})();

// Overlays: Nachrichten, Auswahl-Dialoge, Einblendungen
BM.Overlays = {
  stack: [],
  toasts: [],
  push(o) { this.stack.push(o); BM.Input.consumeAll(); },
  pop(o) { const i = this.stack.indexOf(o); if (i >= 0) this.stack.splice(i, 1); BM.Input.consumeAll(); },
  active() { return this.stack.length > 0; },
  update(dt) {
    const top = this.stack[this.stack.length - 1];
    if (top) top.update(dt);
  },
  // Einblendungen laufen immer ab, auch wenn kein Dialog offen ist
  tickToasts(dt) {
    for (const t of this.toasts) t.t -= dt;
    this.toasts = this.toasts.filter((t) => t.t > 0);
  },
  draw(ctx) {
    for (const o of this.stack) o.draw(ctx);
    let y = 56;
    for (const t of this.toasts) {
      const a = Math.min(1, t.t / 0.4);
      ctx.globalAlpha = a;
      const w = BM.UI.measure(ctx, t.text, 16) + 32;
      BM.UI.panel(ctx, (BM.W - w) / 2, y, w, 34, { edge: t.color || BM.C.gold });
      BM.UI.text(ctx, t.text, BM.W / 2, y + 9, { size: 16, align: 'center', color: t.color || BM.C.ink });
      ctx.globalAlpha = 1;
      y += 40;
    }
  },
};

BM.toast = (text, color) => { BM.Overlays.toasts.push({ text, color, t: 1.4 }); if (BM.Overlays.toasts.length > 3) BM.Overlays.toasts.shift(); };

// Nachricht mit Weiter-Taste; optional Titel und Farbe
BM.msg = (text, o) => new Promise((resolve) => {
  o = o || {};
  const ov = {
    t: 0,
    update(dt) {
      this.t += dt;
      if (this.t > 0.15 && (BM.Input.pressed('confirm') || BM.Input.pressed('cancel') || BM.Input.clicks().length)) {
        BM.Audio.sfx('confirm'); BM.Overlays.pop(ov); resolve();
      }
    },
    draw(ctx) {
      const w = 720, x = (BM.W - w) / 2;
      const lines = BM.UI.wrap(ctx, text, w - 60, 18);
      const h = Math.max(110, lines.length * 25 + (o.title ? 70 : 46));
      const y = o.top ? 60 : BM.H - h - 24;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, BM.W, BM.H);
      BM.UI.panel(ctx, x, y, w, h, { edge: o.color || BM.C.gold });
      let ty = y + 20;
      if (o.title) { BM.UI.text(ctx, o.title, x + 30, ty, { size: 20, color: o.color || BM.C.gold2 }); ty += 34; }
      lines.forEach((l, i) => BM.UI.text(ctx, l, x + 30, ty + i * 25, { size: 18 }));
      if (Math.floor(this.t * 2) % 2 === 0) BM.UI.text(ctx, '▼', x + w - 30, y + h - 26, { size: 14, color: BM.C.gold });
    },
  };
  BM.Overlays.push(ov);
});

// Auswahldialog: options = [{label, value, disabled}]
BM.choice = (text, options, o) => new Promise((resolve) => {
  o = o || {};
  let ov;
  const w = 640, x = (BM.W - w) / 2;
  const menu = new BM.UI.Menu(options.map((op) => ({
    label: op.label, disabled: op.disabled,
    onSelect: () => { BM.Overlays.pop(ov); resolve(op.value); },
  })), {
    w: w - 60, rowH: 32, size: 18,
    onCancel: o.cancelValue !== undefined ? () => { BM.Overlays.pop(ov); resolve(o.cancelValue); } : null,
  });
  ov = {
    update() { menu.update(); },
    draw(ctx) {
      const lines = BM.UI.wrap(ctx, text, w - 60, 18);
      const h = lines.length * 25 + options.length * 32 + (o.title ? 90 : 60);
      const y = (BM.H - h) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, BM.W, BM.H);
      BM.UI.panel(ctx, x, y, w, h, { edge: o.color || BM.C.gold });
      let ty = y + 22;
      if (o.title) { BM.UI.text(ctx, o.title, x + 30, ty, { size: 20, color: o.color || BM.C.gold2 }); ty += 34; }
      lines.forEach((l, i) => BM.UI.text(ctx, l, x + 30, ty + i * 25, { size: 18 }));
      menu.o.x = x + 30; menu.o.y = ty + lines.length * 25 + 12;
      menu.draw(ctx);
    },
  };
  BM.Overlays.push(ov);
});

BM.confirmBox = (text, o) => BM.choice(text, [{ label: BM.t('yes'), value: true }, { label: BM.t('no'), value: false }], Object.assign({ cancelValue: false }, o));
