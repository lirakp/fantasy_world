// Begehbare Stadt Aschenfurt: Karte, Gebäude mit Türen, Deko-Objekte und deren Pixel-Grafik
BM.TownMap = (function () {
  const W = 34, H = 22, TS = 32;
  const C = BM.Color;

  // Gebäude: Tür liegt in der untersten Reihe; Betreten öffnet die jeweilige Ansicht
  const BUILDINGS = [
    { id: 'guild', x: 2, y: 1, w: 8, h: 6, door: 5, view: 'guild', style: 'guild', label: 't_guild' },
    { id: 'tavern', x: 11, y: 2, w: 6, h: 5, door: 3, view: 'tavern', style: 'tavern', label: 't_tavern' },
    { id: 'house', x: 18, y: 3, w: 5, h: 4, door: 2, view: null, style: 'house', label: null },
    { id: 'church', x: 24, y: 0, w: 7, h: 7, door: 3, view: 'church', style: 'church', label: 't_church' },
    { id: 'black', x: 26, y: 15, w: 5, h: 4, door: 2, view: 'black', style: 'shack', label: 't_black' },
  ];
  // Deko und Interaktionen: kind, x, y, (w) ; act = Ansicht beim Anstoßen
  const PROPS = [
    { kind: 'stall', x: 4, y: 12, w: 2, act: 'buy' }, { kind: 'stall', x: 7, y: 12, w: 2, act: 'buy' }, { kind: 'stall', x: 10, y: 12, w: 2, act: 'buy' },
    { kind: 'board', x: 20, y: 11, act: 'board' },
    { kind: 'well', x: 25, y: 13 },
    { kind: 'lamp', x: 15, y: 10 }, { kind: 'lamp', x: 18, y: 10 }, { kind: 'lamp', x: 15, y: 16 }, { kind: 'lamp', x: 18, y: 16 }, { kind: 'lamp', x: 10, y: 8 }, { kind: 'lamp', x: 23, y: 8 },
    { kind: 'tree', x: 2, y: 11 }, { kind: 'tree', x: 3, y: 17 }, { kind: 'tree', x: 6, y: 19 }, { kind: 'tree', x: 11, y: 17 },
    { kind: 'tree', x: 22, y: 18 }, { kind: 'tree', x: 29, y: 19 }, { kind: 'tree', x: 31, y: 11 },
    { kind: 'tree', x: 13, y: 20 }, { kind: 'tree', x: 32, y: 4 }, { kind: 'tree', x: 21, y: 14 },
    { kind: 'crate', x: 12, y: 13 }, { kind: 'crate', x: 3, y: 13 }, { kind: 'barrel', x: 17, y: 7 },
  ];
  const GATE = [{ x: 16, y: 21 }, { x: 17, y: 21 }];

  // Bodenraster: 0 Gras, 1 Pflaster, 2 Mauer, 3 Tor
  const ground = new Array(W * H).fill(0);
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) ground[y * W + x] = v; };
  for (let x = 0; x < W; x++) { set(x, 0, 2); set(x, H - 1, 2); }
  for (let y = 0; y < H; y++) { set(0, y, 2); set(W - 1, y, 2); }
  for (let y = 7; y <= 9; y++) for (let x = 1; x < W - 1; x++) set(x, y, 1);          // Marktplatz
  for (let y = 10; y < H - 1; y++) { set(16, y, 1); set(17, y, 1); }                   // Hauptstraße zum Tor
  for (let y = 10; y <= 14; y++) for (let x = 2; x <= 13; x++) set(x, y, 1);           // Marktstände
  for (let y = 10; y <= 12; y++) for (let x = 18; x <= 22; x++) set(x, y, 1);          // Aushang-Ecke
  for (const g of GATE) set(g.x, g.y, 3);

  const blocked = new Uint8Array(W * H), act = {};
  for (let k = 0; k < W * H; k++) if (ground[k] === 2) blocked[k] = 1;
  for (const b of BUILDINGS) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    blocked[y * W + x] = 1;
    if (y === b.y + b.h - 1 && x === b.x + b.door) act[y * W + x] = { view: b.view, building: b };
  }
  for (const p of PROPS) for (let i = 0; i < (p.w || 1); i++) { blocked[p.y * W + p.x + i] = 1; if (p.act) act[p.y * W + p.x + i] = { view: p.act }; }
  for (const g of GATE) act[g.y * W + g.x] = { view: 'board', gate: true };

  const SPOTS = { gate: { x: 16, y: 19 }, church: { x: 27, y: 8 }, start: { x: 16, y: 18 } };

  // ---------- Grafik ----------
  const cache = new Map();
  const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn(BM.RNG(BM.hash(key)))); return cache.get(key); };

  function groundTile(kind, v) {
    return memo('tg|' + kind + '|' + v, (rng) => {
      const P = new BM.Painter(TS, TS);
      if (kind === 0) {
        P.rect(0, 0, TS, TS, v % 2 ? '#4c7a38' : '#507e3b'); P.noise(rng, 0.08);
        for (let i = 0; i < 6; i++) { const x = rng.int(1, 30), y = rng.int(2, 30); P.set(x, y, '#3a6230'); P.set(x, y - 1, '#5e9246'); }
        if (v === 3) for (let i = 0; i < 3; i++) { const x = rng.int(3, 28), y = rng.int(3, 28); P.set(x, y, rng.pick(['#f0e070', '#f0f0f0', '#e08aa0'])); P.set(x + 1, y, '#e8d060'); }
      } else if (kind === 1) {
        P.rect(0, 0, TS, TS, '#5e564c');
        const off = v % 2 ? 8 : 0;
        for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
          const x = col * 16 + (row % 2 ? 8 : 0) + off % 16, y = row * 8;
          const c = C.shade('#9a8e7c', rng.range(-0.12, 0.08));
          P.rect(x + 1, y + 1, 14, 6, c); P.hline(x + 2, x + 13, y + 1, C.shade(c, 0.15));
        }
      } else if (kind === 2) {
        P.rect(0, 0, TS, TS, '#6e665a');
        for (let row = 0; row < 4; row++) { const y = row * 8, o = row % 2 ? 8 : 0; P.hline(0, 31, y, '#3e3830'); for (let x = o; x < 32; x += 16) P.vline(x, y, y + 7, '#3e3830'); P.hline(0, 31, y + 1, '#857c6e'); }
        P.noise(rng, 0.08);
      } else if (kind === 3) {
        P.rect(0, 0, TS, TS, '#5e564c'); P.rect(2, 0, 28, 32, '#2a201a');
        P.rect(4, 4, 24, 28, '#6a4426'); for (let x = 6; x < 28; x += 5) P.vline(x, 4, 31, '#4a2e18'); P.hline(4, 27, 10, '#8a8d92'); P.hline(4, 27, 24, '#8a8d92');
      }
      return P.canvas();
    });
  }

  function building(b) {
    return memo('bld|' + b.id, (rng) => {
      const w = b.w * TS, h = b.h * TS, P = new BM.Painter(w, h);
      const S = {
        guild: { wall: '#8a8070', roof: '#7a2a22', trim: '#4a4238' },
        tavern: { wall: '#d8c8a0', roof: '#6a4a2e', trim: '#5a3a22' },
        house: { wall: '#c8b090', roof: '#8a3a2a', trim: '#6a4a30' },
        church: { wall: '#e0dccf', roof: '#4a5a7a', trim: '#9a9488' },
        shack: { wall: '#4a3a30', roof: '#33261f', trim: '#241a14' },
      }[b.style];
      const roofH = Math.round(h * (b.style === 'church' ? 0.5 : 0.45));
      // Wand
      P.rect(2, roofH, w - 4, h - roofH, S.wall);
      if (b.style === 'guild') { for (let y = roofH; y < h; y += 8) { P.hline(2, w - 3, y, C.shade(S.wall, -0.2)); for (let x = (y / 8) % 2 ? 2 : 10; x < w; x += 16) P.vline(x, y, y + 7, C.shade(S.wall, -0.2)); } }
      if (b.style === 'tavern' || b.style === 'house') {
        for (let x = 2; x < w; x += 32) P.rect(x, roofH, 4, h - roofH, S.trim);
        P.rect(2, roofH, w - 4, 4, S.trim); P.rect(2, h - 30, w - 4, 3, S.trim);
        if (b.style === 'tavern') for (let x = 6; x + 28 <= w; x += 32) { P.line(x, roofH + 4, x + 26, h - 30, S.trim); P.line(x + 26, roofH + 4, x, h - 30, S.trim); }
      }
      P.noise(rng, 0.05, 2, roofH, w - 4, h - roofH);
      P.rect(2, h - 3, w - 4, 3, C.shade(S.wall, -0.35));
      P.vline(2, roofH, h - 1, C.shade(S.wall, 0.15)); P.vline(w - 3, roofH, h - 1, C.shade(S.wall, -0.25));
      // Dach
      P.poly([[0, roofH + 2], [w, roofH + 2], [w - 18, 4], [18, 4]], S.roof);
      for (let y = 8; y < roofH; y += 5) { P.hline(Math.max(1, 18 - (y - 4) * 18 / roofH), Math.min(w - 2, w - 18 + (y - 4) * 18 / roofH), y, C.shade(S.roof, -0.2)); }
      for (let y = 10; y < roofH; y += 10) for (let x = (y / 10) % 2 ? 10 : 20; x < w - 10; x += 20) P.vline(x, y - 4, y, C.shade(S.roof, -0.25));
      P.hline(18, w - 18, 4, C.shade(S.roof, 0.25)); P.hline(0, w - 1, roofH + 2, C.shade(S.roof, -0.4));
      // Fenster
      const lit = '#ffd890', winY = roofH + 12;
      const doorX = b.door * TS + 8;
      for (let x = 14; x + 12 < w - 6; x += 30) {
        if (Math.abs(x + 6 - (doorX + 8)) < 22) continue;
        P.rect(x - 1, winY - 1, 14, 16, S.trim); P.rect(x, winY, 12, 14, lit); P.vline(x + 6, winY, winY + 13, S.trim); P.hline(x, x + 11, winY + 6, S.trim);
        P.rect(x, winY, 5, 5, '#fff4c8');
      }
      // Tür
      P.rect(doorX - 2, h - 30, 20, 30, S.trim); P.rect(doorX, h - 28, 16, 28, '#5a3418'); P.ellipse(doorX + 8, h - 28, 8, 4, '#5a3418');
      for (let x = doorX + 3; x < doorX + 16; x += 4) P.vline(x, h - 26, h - 2, '#422410'); P.set(doorX + 12, h - 14, '#e0b850');
      // Besonderheiten
      if (b.style === 'guild') {
        const bx = doorX + 6; P.vline(bx + 2, 6, roofH - 4, '#3a2a1a'); P.rect(bx + 3, 8, 16, 12, '#8b1e1a'); P.poly([[bx + 3, 20], [bx + 19, 20], [bx + 11, 26]], '#8b1e1a'); P.circle(bx + 11, 14, 3, '#e8b838');
        P.rect(doorX - 6, h - 42, 28, 10, '#3a2a1a'); P.line(doorX - 2, h - 34, doorX + 18, h - 40, '#c8ccd4'); P.line(doorX - 2, h - 40, doorX + 18, h - 34, '#c8ccd4');
      }
      if (b.style === 'tavern') { P.hline(doorX + 18, doorX + 30, h - 44, '#3a2a1a'); P.rect(doorX + 22, h - 43, 10, 12, '#6a4a2a'); P.rect(doorX + 24, h - 41, 5, 7, '#e8b838'); P.rect(doorX + 29, h - 40, 2, 4, '#e8b838'); }
      if (b.style === 'shack') {
        // Bretterwand, rostiges Münzschild, rote Laterne
        for (let x = 4; x < w - 2; x += 6) P.vline(x, roofH + 2, h - 4, C.shade(S.wall, -0.3));
        P.line(w - 30, roofH + 6, w - 8, roofH + 14, C.shade(S.wall, 0.15));
        P.hline(doorX + 18, doorX + 34, h - 46, '#241a14'); P.circle(doorX + 28, h - 38, 7, '#8a4a20'); P.circle(doorX + 28, h - 38, 5, '#b0662a'); P.set(doorX + 26, h - 40, '#d8904a'); P.rect(doorX + 27, h - 41, 2, 6, '#6a3416');
        P.rect(doorX - 12, h - 40, 6, 8, '#2a1a14'); P.rect(doorX - 11, h - 39, 4, 6, '#ff3a20'); P.set(doorX - 10, h - 38, '#ffb090');
      }
      if (b.style === 'church') {
        const cx = w / 2;
        P.rect(cx - 14, 0, 28, roofH + 4, S.wall); P.poly([[cx - 18, 30], [cx, 0], [cx + 18, 30]], S.roof);
        P.rect(cx - 2, -2, 4, 14, '#e8d080'); P.rect(cx - 6, 2, 12, 3, '#e8d080');
        P.circle(cx, roofH - 14, 9, S.trim); P.circle(cx, roofH - 14, 7, '#7aa8e8'); P.vline(cx, roofH - 21, roofH - 7, '#c04040'); P.hline(cx - 7, cx + 7, roofH - 14, '#c04040');
        P.rect(doorX - 4, h - 34, 24, 4, S.trim);
      }
      P.outline(BM.OUT);
      return P.canvas();
    });
  }

  function prop(kind, w) {
    return memo('prop|' + kind, (rng) => {
      let P;
      if (kind === 'tree') {
        P = new BM.Painter(32, 48);
        P.rect(14, 30, 5, 16, '#5a3a22'); P.vline(14, 30, 45, '#6e4a2c');
        P.circle(16, 18, 13, '#2e5a28'); P.circle(11, 14, 8, '#3a6e30'); P.circle(21, 15, 8, '#356a2e'); P.circle(15, 9, 7, '#4a8038');
        P.noise(rng, 0.1); P.ellipse(16, 46, 10, 2, '#000000', 0.25);
      } else if (kind === 'lamp') {
        P = new BM.Painter(32, 48);
        P.rect(15, 14, 3, 32, '#2a2420'); P.rect(12, 44, 9, 3, '#2a2420');
        P.rect(11, 4, 11, 12, '#2a2420'); P.rect(13, 6, 7, 8, '#ffd070'); P.set(14, 7, '#fff4c8'); P.rect(10, 2, 13, 3, '#2a2420');
      } else if (kind === 'well') {
        P = new BM.Painter(32, 48);
        P.rect(5, 6, 3, 30, '#5a3a22'); P.rect(24, 6, 3, 30, '#5a3a22'); P.poly([[2, 10], [16, 0], [30, 10]], '#7a2a22');
        P.ellipse(16, 36, 13, 8, '#7a7268'); P.ellipse(16, 34, 10, 5, '#1a2a3a'); P.hline(8, 24, 14, '#3a2a1a'); P.vline(16, 14, 30, '#9a8a6a');
        for (let a = 0; a < 12; a++) P.set(16 + Math.cos(a / 2) * 12, 38 + Math.sin(a / 2) * 6, '#5a544c');
      } else if (kind === 'board') {
        P = new BM.Painter(32, 48);
        P.rect(5, 18, 3, 28, '#4a3018'); P.rect(24, 18, 3, 28, '#4a3018');
        P.rect(2, 8, 28, 24, '#7a5430'); P.rect(4, 10, 24, 20, '#9a7448');
        for (const [x, y] of [[6, 12], [15, 11], [21, 14], [8, 21], [17, 20]]) { P.rect(x, y, 7, 8, '#e8dcc0'); P.hline(x + 1, x + 5, y + 2, '#6a5a4a'); P.hline(x + 1, x + 4, y + 4, '#6a5a4a'); }
        P.set(10, 22, '#c03030'); P.poly([[0, 9], [16, 2], [32, 9]], '#5a3a22');
      } else if (kind === 'stall') {
        P = new BM.Painter(64, 48);
        P.rect(4, 28, 56, 16, '#6a4a2a'); P.hline(4, 59, 28, '#8a6a3a');
        for (let x = 0; x < 64; x += 8) P.rect(x, 8, 8, 12, (x / 8) % 2 ? '#e8e0d0' : '#b03a2a');
        P.poly([[0, 20], [64, 20], [60, 24], [4, 24]], '#8a2a1e');
        P.vline(4, 8, 44, '#4a3018'); P.vline(59, 8, 44, '#4a3018');
        for (let i = 0; i < 5; i++) P.circle(12 + i * 10, 27, 3, rng.pick(['#d04030', '#e0a030', '#70a040', '#c0a080']));
      } else if (kind === 'crate') {
        P = new BM.Painter(32, 32);
        P.rect(5, 10, 22, 20, '#8a6a3a'); P.hline(5, 26, 10, '#a8844a'); P.line(5, 10, 26, 29, '#5a4422'); P.line(26, 10, 5, 29, '#5a4422');
      } else {
        P = new BM.Painter(32, 32);
        P.ellipse(16, 18, 10, 12, '#7a5030'); P.hline(6, 26, 12, '#3a3a3a'); P.hline(6, 26, 24, '#3a3a3a'); P.ellipse(16, 8, 9, 3, '#8a6040');
      }
      P.outline(BM.OUT);
      return P.canvas();
    });
  }

  const passable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !blocked[y * W + x];
  const actionAt = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? act[y * W + x] : null);

  // Zeichnet die Stadt; actors: [{img, x, y, flip}] in Pixelkoordinaten
  // Laternenschein als Pixel-Lichthof in harten Ringen
  function glow(bm) {
    return memo('glow|' + bm, () => {
      const P = new BM.Painter(64, 64), col = bm ? '#ff8c3c' : '#ffdc8c';
      P.circle(32, 32, 30, col, bm ? 0.1 : 0.07); P.circle(32, 32, 21, col, bm ? 0.12 : 0.09); P.circle(32, 32, 12, col, bm ? 0.16 : 0.12);
      return P.canvas();
    });
  }

  function draw(ctx, cam, actors, t, bm, VW, VH) {
    VW = VW || BM.W; VH = VH || BM.H;
    const x0 = Math.max(0, Math.floor(cam.x / TS)), y0 = Math.max(0, Math.floor(cam.y / TS));
    const x1 = Math.min(W - 1, Math.ceil((cam.x + VW) / TS)), y1 = Math.min(H - 1, Math.ceil((cam.y + VH) / TS));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const g = ground[y * W + x], v = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 4;
      ctx.drawImage(groundTile(g, v), x * TS - cam.x, y * TS - cam.y);
    }
    // Tiefensortierung nach Unterkante
    const list = [];
    for (const b of BUILDINGS) list.push({ z: b.y + b.h, f: () => ctx.drawImage(building(b), b.x * TS - cam.x, b.y * TS - cam.y) });
    for (const p of PROPS) {
      const img = prop(p.kind), tall = img.height > 32;
      list.push({ z: p.y + 1, f: () => ctx.drawImage(img, p.x * TS - cam.x, (p.y + 1) * TS - img.height - cam.y) });
    }
    for (const a of actors) list.push({ z: a.y / TS + 1.01, f: () => {
      BM.UI.shadow(ctx, a.x - cam.x + 16, a.y - cam.y + 30, 9, 3, 0.3);
      ctx.save();
      if (a.flip) { ctx.translate(a.x - cam.x + 32, a.y - cam.y - 4); ctx.scale(-1, 1); ctx.drawImage(a.img, 0, 0); }
      else ctx.drawImage(a.img, a.x - cam.x, a.y - cam.y - 4);
      ctx.restore();
    } });
    list.sort((a, b) => a.z - b.z).forEach((e) => e.f());
    // Laternenschein
    for (const p of PROPS) if (p.kind === 'lamp') {
      ctx.drawImage(glow(bm), p.x * TS - cam.x - 16, p.y * TS - cam.y - 38);
    }
    // Schilder über den Türen (kleine Pixel-Schrift, wird mit der Welt vergrößert)
    const sign = (txt, sx, sy) => {
      const tw = Math.ceil(BM.UI.measure(ctx, txt, 8)) + 8;
      ctx.fillStyle = '#100b09'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy), tw, 11);
      ctx.fillStyle = '#5a4630'; ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy) + 11, tw, 1);
      BM.UI.text(ctx, txt, sx, sy + 1, { size: 8, align: 'center', color: BM.C.gold2, shadow: false });
    };
    for (const b of BUILDINGS) if (b.label) sign(BM.t(b.label).replace(/ „.*“| ".*"/, ''), (b.x + b.door) * TS - cam.x + 16, (b.y + b.h) * TS - cam.y - 52);
    sign(BM.t('t_gate'), 12 * TS - cam.x, 19 * TS - cam.y + 12);
  }

  return { W, H, TS, BUILDINGS, PROPS, SPOTS, passable, actionAt, draw, clear: () => cache.clear() };
})();
