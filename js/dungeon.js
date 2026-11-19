// Dungeon-Generator: zufälliger Aufbau je Art (Physisch, Dorn, Blut, Erinnerung) und Rang
BM.RUNES = [
  { de: 'Mond', en: 'Moon' }, { de: 'Dorn', en: 'Thorn' }, { de: 'Auge', en: 'Eye' }, { de: 'Krone', en: 'Crown' },
  { de: 'Schlüssel', en: 'Key' }, { de: 'Flamme', en: 'Flame' }, { de: 'Wolf', en: 'Wolf' }, { de: 'Feder', en: 'Feather' },
];

BM.Dungeon = (function () {
  const TYPE = {
    physical: { density: 1.0, safe: [1, 2], chest: 0.35, traps: 3, riddle: 0.25 },
    thorn: { density: 0.8, safe: [1, 1], chest: 0.6, traps: 0, riddle: 0.25 },
    blood: { density: 2.6, safe: [0, 1], chest: 0.3, traps: 2, riddle: 0.2 },
    memory: { density: 0.45, safe: [3, 4], chest: 0.5, traps: 0, riddle: 1 },
  };

  function genFloor(d, floor) {
    const rng = BM.RNG((d.seed + floor * 7919) >>> 0);
    const ri = BM.rankIdx(d.realRank), T = TYPE[d.type];
    const W = 38 + ri * 6, H = 28 + ri * 4;
    const tiles = new Array(W * H).fill(0), room = new Array(W * H).fill(-1);
    const rooms = [];
    const maxRooms = 8 + ri * 2;
    for (let tries = 0; tries < 400 && rooms.length < maxRooms; tries++) {
      const w = rng.int(5, 10), h = rng.int(4, 8), x = rng.int(2, W - w - 3), y = rng.int(2, H - h - 3);
      if (rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), safe: false });
    }
    rooms.forEach((r, i) => { for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) { tiles[yy * W + xx] = 1; room[yy * W + xx] = i; } });
    const carve = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) tiles[y * W + x] = 1; };
    const corridor = (a, b) => {
      let x = a.cx, y = a.cy;
      const horizFirst = rng.chance(0.5);
      const stepX = () => { while (x !== b.cx) { carve(x, y); x += Math.sign(b.cx - x); } };
      const stepY = () => { while (y !== b.cy) { carve(x, y); y += Math.sign(b.cy - y); } };
      if (horizFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
      carve(x, y);
    };
    // Verbinden: Spannbaum über nächste Nachbarn + ein paar Schleifen
    const connected = [0], rest = rooms.map((_, i) => i).slice(1);
    while (rest.length) {
      let best = null;
      for (const a of connected) for (const b of rest) {
        const dd = Math.abs(rooms[a].cx - rooms[b].cx) + Math.abs(rooms[a].cy - rooms[b].cy);
        if (!best || dd < best[2]) best = [a, b, dd];
      }
      corridor(rooms[best[0]], rooms[best[1]]);
      connected.push(best[1]); rest.splice(rest.indexOf(best[1]), 1);
    }
    for (let i = 0; i < 2 + ri; i++) corridor(rng.pick(rooms), rng.pick(rooms));

    const start = 0;
    const dist = bfs(tiles, W, H, rooms[start].cx, rooms[start].cy);
    let goal = 1, gd = -1;
    rooms.forEach((r, i) => { const v = dist[r.cy * W + r.cx]; if (i !== start && v > gd) { gd = v; goal = i; } });

    const objs = [], mons = [];
    const occupied = new Set();
    const key = (x, y) => y * W + x;
    // interior=true: nie auf Randfelder, an denen Gänge in den Raum münden
    const freeIn = (r, interior) => {
      const m = interior ? 1 : 0;
      for (let k = 0; k < 30; k++) {
        const x = rng.int(r.x + m, r.x + r.w - 1 - m), y = rng.int(r.y + m, r.y + r.h - 1 - m);
        if (!occupied.has(key(x, y))) { occupied.add(key(x, y)); return { x, y }; }
      }
      return null;
    };
    const put = (kind, p, extra) => { if (p) { occupied.add(key(p.x, p.y)); objs.push(Object.assign({ kind, x: p.x, y: p.y }, extra || {})); } };
    occupied.add(key(rooms[start].cx, rooms[start].cy));
    if (floor === 0) put('rubble', { x: rooms[start].cx, y: rooms[start].y });

    const last = floor === d.floors - 1;
    const goalKind = last ? (d.goal || 'boss') : 'stairs';
    const gr = rooms[goal];
    if (goalKind === 'stairs') put('stairs', { x: gr.cx, y: gr.cy });
    else if (goalKind === 'riddle') put('seal', { x: gr.cx, y: gr.cy });

    // Sichere Räume
    const candidates = rooms.map((_, i) => i).filter((i) => i !== start && i !== goal);
    rng.shuffle(candidates);
    const nSafe = rng.int(T.safe[0], T.safe[1]);
    for (let k = 0; k < nSafe && candidates.length; k++) {
      const i = candidates.pop(); rooms[i].safe = true;
      put('safe', { x: rooms[i].cx, y: rooms[i].cy });
      if (d.type === 'memory') put('supply', freeIn(rooms[i]));
    }
    // Endrätsel: Runentafeln auf der letzten Ebene
    if (last && goalKind === 'riddle') {
      const pool = rooms.map((_, i) => i).filter((i) => i !== goal);
      rng.shuffle(pool);
      d.riddle.forEach((rune, idx) => { const r = rooms[pool[idx % pool.length]]; put('tablet', freeIn(r), { idx, rune, read: false }); });
    }
    // Erinnerungsschleifen
    if (d.type === 'memory') {
      const pool = rooms.map((_, i) => i).filter((i) => i !== start && !rooms[i].safe);
      rng.shuffle(pool);
      for (let k = 0; k < 2 && pool.length; k++) put('orb', freeIn(rooms[pool.pop()], true), { loop: rng.chance(0.5) ? 'active' : 'inactive', used: false });
    }
    // Truhen
    rooms.forEach((r, i) => { if (i !== start && rng.chance(T.chest)) put('chest', freeIn(r, true), { open: false }); });
    // Fallen
    if (d.type === 'thorn') {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = dist[key(x, y)];
        if (tiles[key(x, y)] && v > 3 && v % 20 === 0 && room[key(x, y)] < 0 && !occupied.has(key(x, y))) put('trap', { x, y }, { seen: false });
      }
      rooms.forEach((r, i) => { if (i !== start && !r.safe) for (let k = 0; k < rng.int(1, 2); k++) put('trap', freeIn(r), { seen: false }); });
    } else {
      for (let k = 0; k < T.traps; k++) { const r = rooms[rng.int(1, rooms.length - 1)]; if (!r.safe) put('trap', freeIn(r), { seen: false }); }
    }
    // Deko
    for (let k = 0; k < rooms.length; k++) if (rng.chance(0.4)) { const p = freeIn(rng.pick(rooms)); if (p) { objs.push({ kind: 'bones', x: p.x, y: p.y, deco: true }); occupied.delete(key(p.x, p.y)); } }

    // Monster
    const nM = Math.round(rooms.length * T.density * (BM.S.run && BM.S.run.bloodMoon ? 1.3 : 1));
    const types = Object.keys(BM.MONSTERS).filter((id) => { const M = BM.MONSTERS[id]; return !M.boss && M.types[d.type] && (M.minRank || 0) <= ri; });
    const weights = types.map((id) => [id, BM.MONSTERS[id].types[d.type]]);
    const spawnRooms = rooms.map((_, i) => i).filter((i) => i !== start && !rooms[i].safe);
    for (let k = 0; k < nM && spawnRooms.length; k++) {
      const r = rooms[rng.pick(spawnRooms)];
      const p = freeIn(r);
      if (!p) continue;
      const partyN = BM.S.run ? BM.S.run.party.length : 1;
      const packN = BM.clamp(rng.int(1, 1 + Math.floor((ri + partyN) / 2)) + (d.type === 'blood' && rng.chance(0.5) ? 1 : 0), 1, 4);
      const pack = []; for (let j = 0; j < packN; j++) pack.push(rng.weighted(weights));
      occupied.delete(key(p.x, p.y));
      mons.push({ id: 'm' + k, x: p.x, y: p.y, pack, boss: false });
    }
    if (last && goalKind === 'boss') {
      const bossId = BM.BOSS_FOR[d.type];
      const minions = rng.int(0, 2), pack = [bossId];
      for (let j = 0; j < minions; j++) pack.push(rng.weighted(weights));
      mons.push({ id: 'boss', x: gr.cx, y: gr.cy, pack, boss: true });
    }

    const map = {
      floor, w: W, h: H, tiles, room, rooms, objs, mons, seen: new Array(W * H).fill(0),
      px: rooms[start].cx, py: rooms[start].cy, goalRoom: goal, steps: 0,
    };
    ensureReachable(map);
    return map;
  }

  // ---------- Erreichbarkeit: Hindernis-Objekte dürfen nie Wege versperren ----------
  const BLOCKING = (o) => !o.gone && !o.deco && (o.kind === 'chest' || o.kind === 'seal' || (o.kind === 'orb' && !o.used));

  // Prüft, ob vom Spieler aus jedes freie Feld und jedes Hindernis-Objekt erreichbar ist
  function checkReach(m) { return reachProblems(m) === 0; }
  // Anzahl unerreichbarer freier Felder + unerreichbarer Hindernis-Objekte
  function reachProblems(m) {
    const W = m.w, blocked = new Set(m.objs.filter(BLOCKING).map((o) => o.y * W + o.x));
    const seen = new Uint8Array(W * m.h), q = [m.py * W + m.px];
    seen[q[0]] = 1;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= m.h || seen[n] || !m.tiles[n] || blocked.has(n)) continue;
        seen[n] = 1; q.push(n);
      }
    }
    let bad = 0;
    for (let k = 0; k < m.tiles.length; k++) if (m.tiles[k] && !blocked.has(k) && !seen[k]) bad++;
    for (const k of blocked) {
      const x = k % W, y = (k / W) | 0;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(y + dy) * W + x + dx])) bad++;
    }
    return bad;
  }

  // Verschiebt störende Hindernisse auf ein sicheres Feld (bei der Erzeugung und für alte Spielstände)
  function ensureReachable(m) {
    let bad = reachProblems(m);
    if (!bad) return 0;
    const W = m.w, rng = BM.RNG((m.w * 31 + m.h * 7 + m.floor) >>> 0);
    const taken = (x, y) => (x === m.px && y === m.py) || m.objs.some((o) => !o.gone && o.x === x && o.y === y) || m.mons.some((o) => o.x === x && o.y === y);
    let moved = 0;
    for (const o of m.objs.filter(BLOCKING)) {
      if (!bad) break;
      // Würde es ohne dieses Objekt besser? Dann ist es (mit)schuld und wird verschoben
      o.gone = true; const without = reachProblems(m); o.gone = false;
      if (without >= bad) continue;
      const ox = o.x, oy = o.y, ri = m.room[oy * W + ox];
      const rooms = ri >= 0 ? [m.rooms[ri], ...rng.shuffle(m.rooms.slice())] : rng.shuffle(m.rooms.slice());
      let best = null, bestBad = bad;
      for (const r of rooms) {
        const cands = [];
        for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (m.tiles[y * W + x] && !taken(x, y)) cands.push([x, y]);
        rng.shuffle(cands);
        for (const [x, y] of cands.slice(0, 12)) {
          o.x = x; o.y = y;
          const b = reachProblems(m);
          if (b < bestBad) { bestBad = b; best = [x, y]; if (!b) break; }
        }
        if (best && !bestBad) break;
      }
      if (best) { o.x = best[0]; o.y = best[1]; bad = bestBad; moved++; }
      else { o.x = ox; o.y = oy; }
    }
    // Notfall: Truhen, die sich nicht verschieben lassen, verschwinden (Rätsel-Siegel bleibt immer)
    if (bad) for (const o of m.objs.filter(BLOCKING)) { if (o.kind === 'seal') continue; o.gone = true; const b = reachProblems(m); if (b < bad) { bad = b; moved++; } else o.gone = false; }
    return moved;
  }

  function bfs(tiles, W, H, sx, sy) {
    const dist = new Array(W * H).fill(-1), q = [sy * W + sx];
    dist[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !tiles[n] || dist[n] >= 0) continue;
        dist[n] = dist[c] + 1; q.push(n);
      }
    }
    return dist;
  }

  // Beim ersten Betreten: Ziel (Boss/Rätsel) und Rätsel würfeln
  function prepare(d) {
    const rng = BM.RNG((d.seed ^ 0x5bd1e995) >>> 0);
    const T = TYPE[d.type];
    d.goal = rng.chance(T.riddle) ? 'riddle' : 'boss';
    const n = 3 + (BM.rankIdx(d.realRank) >= 4 ? 1 : 0);
    const runes = rng.shuffle(BM.RUNES.map((_, i) => i));
    d.riddle = runes.slice(0, n);
    d.clues = new Array(n).fill(-1);
    d.state = { floor: 0, map: genFloor(d, 0) };
  }

  // Sichtfeld mit einfachen Strahlen
  function computeFov(m, radius) {
    const vis = new Set();
    const W = m.w;
    for (let a = 0; a < 360; a += 3) {
      const rad = a * Math.PI / 180, dx = Math.cos(rad), dy = Math.sin(rad);
      let x = m.px + 0.5, y = m.py + 0.5;
      for (let i = 0; i <= radius; i++) {
        const tx = Math.floor(x), ty = Math.floor(y);
        if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) break;
        const k = ty * W + tx;
        vis.add(k); m.seen[k] = 1;
        if (!m.tiles[k]) break;
        x += dx; y += dy;
      }
    }
    return vis;
  }

  return { genFloor, prepare, computeFov, bfs, TYPE, checkReach, ensureReachable };
})();
