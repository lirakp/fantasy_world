// Prozeduraler Pixel-Art-Generator: Figuren, Monster, Tiles, Gegenstände, Hintergründe
BM.METAL = { D: '#8a8d92', C: '#b87a44', B: '#d4d8e0', A: '#e8b838', S: '#86dcf2', SS: '#ff7048' };
BM.OUT = '#120a08';

BM.hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

BM.Spr = (function () {
  const cache = new Map();
  const C = BM.Color;
  const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn(BM.RNG(BM.hash(key)))); return cache.get(key); };

  // ---------------- Figuren ----------------
  function character(c) {
    const w = c.equip.weapon, a = c.equip.armor;
    const key = ['ch', c.race, c.role, c.look.skin, c.look.hair, c.look.hairStyle, c.look.eye, w ? w.base + w.rank : '-', a ? a.base + a.rank : '-'].join('|');
    return memo(key, () => drawCharacter(c));
  }

  function drawCharacter(c) {
    const P = new BM.Painter(32, 32), race = BM.RACES[c.race], role = c.role;
    const dy = race.short ? 2 : 0, wide = race.short ? 1 : 0;
    const skin = c.look.skin, skinD = C.shade(skin, -0.25), hair = c.look.hair, hairD = C.shade(hair, -0.3);
    const armor = c.equip.armor, weapon = c.equip.weapon;
    const aBase = armor ? armor.base : 'leather';
    const metal = armor ? BM.METAL[armor.rank] : BM.METAL.D;
    let body, bodyD, bodyL;
    if (aBase === 'plate') { body = C.mix('#7d838c', metal, 0.35); }
    else if (aBase === 'robe') { body = role === 'cleric' ? '#d8cfb6' : role === 'arcanist' ? '#3b2f6e' : '#5a4a6a'; }
    else { body = role === 'scout' ? '#4e5a34' : '#6a4a2e'; }
    bodyD = C.shade(body, -0.3); bodyL = C.shade(body, 0.25);

    // Schwanz (Tiermensch)
    if (race.tail) { P.line(21, 25, 25, 22, hair); P.line(22, 25, 26, 21, hair); P.line(25, 22, 26, 18, hairD); P.line(26, 21, 27, 18, hair); }

    // Beine / Robe
    if (aBase === 'robe') {
      P.poly([[10 - wide, 21 + dy], [22 + wide, 21 + dy], [24 + wide, 30], [8 - wide, 30]], body);
      P.vline(16, 22 + dy, 29, bodyD);
      P.hline(8 - wide, 24 + wide, 29, bodyD);
      P.rect(11, 30, 3, 1, '#2a1e18'); P.rect(18, 30, 3, 1, '#2a1e18');
    } else {
      P.rect(12 - wide, 23 + dy, 3, 6 - dy, '#3a2c24'); P.rect(17 + wide, 23 + dy, 3, 6 - dy, '#3a2c24');
      P.rect(11 - wide, 28, 4, 3, '#2a1e18'); P.rect(17 + wide, 28, 4, 3, '#2a1e18');
      P.hline(11 - wide, 14 - wide, 28, '#4a3628'); P.hline(17 + wide, 20 + wide, 28, '#4a3628');
    }
    // Torso
    P.rect(10 - wide, 15 + dy, 12 + wide * 2, 8, body);
    P.vline(10 - wide, 15 + dy, 22 + dy, bodyL);
    P.vline(21 + wide, 15 + dy, 22 + dy, bodyD);
    if (aBase === 'plate') {
      P.rect(8 - wide, 15 + dy, 4, 3, C.shade(body, 0.3)); P.rect(20 + wide, 15 + dy, 4, 3, C.shade(body, 0.15));
      P.hline(12, 19, 18 + dy, bodyD); P.vline(16, 16 + dy, 21 + dy, bodyL);
    } else if (aBase === 'leather') {
      P.line(11, 15 + dy, 20, 21 + dy, '#3a2616'); P.line(12, 15 + dy, 21, 21 + dy, '#5a3a22');
    } else {
      P.vline(16, 15 + dy, 22 + dy, role === 'cleric' ? '#c9a13d' : '#9a7ad0');
      P.hline(13, 19, 15 + dy, role === 'cleric' ? '#c9a13d' : '#9a7ad0');
    }
    if (aBase !== 'robe') { P.hline(10 - wide, 21 + wide, 22 + dy, '#3a2618'); P.set(16, 22 + dy, '#e0b850'); }
    // Arme
    const sleeve = aBase === 'plate' ? C.shade(body, 0.1) : body;
    P.rect(8 - wide, 16 + dy, 2, 6, sleeve); P.rect(22 + wide, 16 + dy, 2, 6, C.shade(sleeve, -0.15));
    P.rect(8 - wide, 22 + dy, 2, 2, skin); P.rect(22 + wide, 22 + dy, 2, 2, skinD);
    // Hals + Kopf
    P.rect(14, 13 + dy, 4, 3, skinD);
    P.ellipse(16, 10 + dy, 5.2, 5, skin);
    for (let y = 6 + dy; y < 15 + dy; y++) for (let x = 18; x < 22; x++) if (P.get(x, y) && x >= 19) P.set(x, y, skinD, 0.5);
    // Ohren
    if (race.ears === 'elf') {
      P.line(11, 10 + dy, 8, 7 + dy, skin); P.line(11, 11 + dy, 8, 8 + dy, skin);
      P.line(21, 10 + dy, 24, 7 + dy, skinD); P.line(21, 11 + dy, 24, 8 + dy, skinD);
    } else { P.set(10, 10 + dy, skin); P.set(10, 11 + dy, skinD); P.set(21, 10 + dy, skinD); P.set(21, 11 + dy, skinD); }
    // Augen + Mund
    for (const ex of [13, 18]) { P.set(ex, 10 + dy, '#1a1010'); P.set(ex, 11 + dy, c.look.eye); P.set(ex + 1, 10 + dy, '#1a1010'); P.set(ex + 1, 11 + dy, '#f0e8e0'); }
    P.hline(15, 16, 13 + dy, C.shade(skin, -0.4));
    // Haare
    const hs = c.look.hairStyle;
    const top = () => { P.ellipse(16, 7 + dy, 5.8, 3.2, hair); P.rect(10, 7 + dy, 2, 3, hair); P.rect(20, 7 + dy, 2, 3, hairD); P.hline(12, 19, 5 + dy, C.shade(hair, 0.2)); };
    if (role === 'scout') {
      P.ellipse(16, 8 + dy, 6.5, 5, body); P.rect(9, 8 + dy, 2, 8, body); P.rect(21, 8 + dy, 2, 8, bodyD);
      P.ellipse(16, 11 + dy, 4.5, 3.5, skin); // Gesicht frei
      for (const ex of [13, 18]) { P.set(ex, 10 + dy, '#1a1010'); P.set(ex, 11 + dy, c.look.eye); P.set(ex + 1, 10 + dy, '#1a1010'); P.set(ex + 1, 11 + dy, '#f0e8e0'); }
      P.hline(15, 16, 13 + dy, C.shade(skin, -0.4));
      P.hline(12, 20, 6 + dy, bodyL);
    } else if (role === 'bulwark') {
      top();
      P.ellipse(16, 6 + dy, 6, 3.4, C.mix('#7d838c', metal, 0.4)); P.hline(10, 22, 8 + dy, C.shade(metal, -0.3)); P.set(16, 3 + dy, C.shade(metal, 0.4));
    } else {
      top();
      if (hs === 1) { P.rect(9, 8 + dy, 2, 9, hair); P.rect(21, 8 + dy, 2, 9, hairD); }
      if (hs === 2) { P.rect(6, 8 + dy, 3, 2, hair); P.rect(5, 10 + dy, 3, 6, hair); P.rect(5, 16 + dy, 2, 2, hairD); }
      if (hs === 3) { P.set(13, 3 + dy, hair); P.set(16, 2 + dy, hair); P.set(19, 3 + dy, hair); P.set(15, 3 + dy, hair); }
      if (role === 'arcanist') {
        P.poly([[9, 7 + dy], [23, 7 + dy], [18, -1 + dy], [15, 1 + dy]], '#2a2050');
        P.hline(8, 24, 7 + dy, '#4a3a8a'); P.set(17, 4 + dy, '#e0c060');
      }
    }
    if (race.beard) { P.ellipse(16, 14 + dy, 5, 3.6, hair); P.hline(13, 19, 12 + dy, hairD); P.set(15, 13 + dy, C.shade(skin, -0.4)); P.set(16, 13 + dy, C.shade(skin, -0.4)); }
    if (race.ears === 'beast') {
      P.poly([[10, 7 + dy], [11, 0 + dy], [15, 5 + dy]], hair); P.poly([[17, 5 + dy], [21, 0 + dy], [22, 7 + dy]], hairD);
      P.set(12, 4 + dy, '#d89090'); P.set(12, 5 + dy, '#d89090'); P.set(20, 4 + dy, '#c07878'); P.set(20, 5 + dy, '#c07878');
    }
    // Schild (Bollwerk)
    if (role === 'bulwark') {
      const sm = C.mix('#6a5038', metal, 0.5);
      P.rect(4, 15 + dy, 7, 12, sm); P.rect(5, 16 + dy, 5, 10, C.shade(sm, -0.15));
      P.vline(7, 16 + dy, 25 + dy, metal); P.hline(5, 9, 20 + dy, metal);
      P.vline(4, 15 + dy, 26 + dy, C.shade(sm, 0.3));
    }
    // Waffe
    if (weapon) drawHeldWeapon(P, weapon, 23 + wide, 23 + dy);
    P.outline(BM.OUT);
    return P.canvas();
  }

  function drawHeldWeapon(P, w, hx, hy) {
    const m = BM.METAL[w.rank], mD = C.shade(m, -0.35), mL = C.shade(m, 0.4), wood = '#6a4426', woodD = '#4a2e18';
    switch (w.base) {
      case 'sword': P.rect(hx, 6, 2, hy - 8, m); P.vline(hx, 6, hy - 3, mL); P.set(hx, 5, mL); P.hline(hx - 2, hx + 3, hy - 2, '#7a5a2a'); P.rect(hx, hy - 1, 2, 3, woodD); break;
      case 'dagger': P.rect(hx, hy - 8, 2, 6, m); P.vline(hx, hy - 8, hy - 3, mL); P.hline(hx - 1, hx + 2, hy - 2, '#7a5a2a'); P.rect(hx, hy - 1, 2, 2, woodD); break;
      case 'axe': P.vline(hx, 9, hy + 2, wood); P.vline(hx + 1, 9, hy + 2, woodD); P.poly([[hx + 1, 8], [hx + 7, 6], [hx + 7, 15], [hx + 1, 13]], m); P.vline(hx + 6, 7, 14, mL); break;
      case 'mace': P.vline(hx, 12, hy + 2, wood); P.vline(hx + 1, 12, hy + 2, woodD); P.circle(hx + 1, 11, 3, m); P.set(hx, 10, mL); P.set(hx - 2, 11, mD); P.set(hx + 4, 11, mD); P.set(hx + 1, 7, mD); break;
      case 'spear': P.vline(hx + 1, 5, 31, wood); P.vline(hx + 2, 5, 31, woodD); P.poly([[hx - 0.5, 6], [hx + 1.5, 0], [hx + 3.5, 6]], m); P.vline(hx + 1, 1, 5, mL); break;
      case 'staff': P.vline(hx + 1, 7, 31, wood); P.vline(hx + 2, 7, 31, woodD); P.circle(hx + 2, 5, 3, m); P.set(hx + 1, 4, '#ffffff'); P.set(hx + 2, 4, mL); break;
      case 'crossbow': P.rect(hx - 4, hy - 1, 10, 2, wood); P.vline(hx + 5, hy - 6, hy + 4, m); P.vline(hx + 6, hy - 5, hy + 3, mD); P.line(hx + 5, hy - 6, hx - 3, hy, '#d8d0c0'); P.line(hx + 5, hy + 4, hx - 3, hy, '#d8d0c0'); break;
      default: P.rect(hx, 8, 2, hy - 10, m);
    }
  }

  // ---------------- Monster ----------------
  function monster(id) { return memo('mon|' + id + '|' + BM.gore(), (rng) => drawMonster(id, rng)); }

  function drawMonster(id, rng) {
    const P = new BM.Painter(32, 32);
    const eye = (x, y, col) => { P.set(x, y, col || '#ff3020'); };
    switch (id) {
      case 'rat': {
        const f = '#6e6058', fD = '#4e423c';
        P.line(4, 24, 9, 21, '#c09080'); P.line(3, 25, 4, 24, '#c09080');
        P.ellipse(15, 22, 8, 5, f); P.ellipse(15, 24, 7, 3, fD);
        P.ellipse(23, 19, 5, 4, f); P.set(27, 20, '#d08080'); P.set(28, 20, '#d08080');
        P.circle(21, 15, 2, '#c09080'); P.set(21, 15, '#8a5050');
        eye(24, 18); P.rect(12, 26, 2, 2, fD); P.rect(19, 26, 2, 2, fD);
        P.noise(rng, 0.1); break;
      }
      case 'slime': {
        const g = '#4ea040', gD = '#2e6a28';
        P.ellipse(16, 21, 11, 9, g); P.rect(5, 21, 23, 8, g); P.ellipse(16, 28, 11, 2, gD);
        P.ellipse(12, 16, 3, 2, '#9ae08a'); P.set(11, 15, '#e0ffe0');
        P.rect(12, 20, 2, 3, '#102a10'); P.rect(19, 20, 2, 3, '#102a10'); P.set(12, 20, '#e0ffe0');
        P.hline(14, 18, 25, gD); break;
      }
      case 'bat': {
        const b = '#3e2e4a', bD = '#2a1e34';
        P.poly([[16, 14], [2, 8], [5, 13], [3, 18], [8, 16], [10, 20], [14, 18]], b);
        P.poly([[16, 14], [30, 8], [27, 13], [29, 18], [24, 16], [22, 20], [18, 18]], bD);
        P.ellipse(16, 17, 4, 5, '#4a3a58'); P.poly([[13, 12], [14, 9], [15, 12]], b); P.poly([[17, 12], [18, 9], [19, 12]], b);
        eye(14, 15); eye(18, 15); P.set(15, 19, '#f0f0f0'); P.set(17, 19, '#f0f0f0'); break;
      }
      case 'skeleton': {
        const bn = '#d8d2c0', bnD = '#9a9482';
        P.ellipse(16, 8, 5, 5, bn); P.rect(13, 11, 7, 3, bn); P.rect(13, 8, 2, 2, '#1a1010'); P.rect(18, 8, 2, 2, '#1a1010'); eye(13, 9, '#60c0ff'); eye(18, 9, '#60c0ff');
        P.hline(14, 19, 13, bnD); P.vline(16, 14, 24, bn);
        for (let y = 16; y <= 21; y += 2) P.hline(12, 20, y, bn);
        P.line(12, 16, 8, 22, bn); P.line(20, 16, 24, 22, bn);
        P.line(14, 24, 12, 30, bn); P.line(18, 24, 20, 30, bn); P.hline(13, 19, 24, bnD);
        P.vline(25, 10, 23, '#8a8d92'); P.hline(23, 27, 22, '#6a4a2a'); break;
      }
      case 'spider': {
        const s = '#2a2026', sD = '#1a1418';
        for (const [x1, y1, x2, y2] of [[12, 18, 4, 12], [12, 20, 3, 20], [12, 22, 4, 28], [13, 23, 8, 30], [20, 18, 28, 12], [20, 20, 29, 20], [20, 22, 28, 28], [19, 23, 24, 30]]) { P.line(x1, y1, x2, y2, s); }
        P.ellipse(16, 21, 6, 5, s); P.ellipse(16, 14, 4, 3.5, sD);
        P.set(16, 24, '#8a2020'); P.set(15, 22, '#8a2020'); P.set(17, 22, '#8a2020');
        eye(14, 13); eye(18, 13); eye(15, 12); eye(17, 12); break;
      }
      case 'ghoul': {
        const k = '#7a8a6a', kD = '#56644a';
        P.ellipse(15, 18, 7, 8, k); P.ellipse(19, 10, 5, 5, k);
        P.line(10, 18, 5, 26, kD); P.line(11, 18, 6, 27, k); P.line(21, 18, 26, 25, k);
        for (const x of [4, 6, 24, 26]) P.set(x, 27, '#e0e0d0');
        P.rect(11, 25, 3, 6, kD); P.rect(17, 25, 3, 6, kD);
        eye(17, 9, '#ffd040'); eye(21, 9, '#ffd040');
        P.hline(17, 22, 13, '#2a1010'); if (BM.gore()) { P.set(18, 14, '#a01818'); P.set(21, 14, '#a01818'); P.set(18, 15, '#a01818'); }
        P.noise(rng, 0.12); break;
      }
      case 'thornling': {
        const g = '#4a6a30', gD = '#2e4a1e';
        P.ellipse(16, 20, 7, 8, g); P.ellipse(16, 23, 6, 5, gD);
        for (const [x, y] of [[9, 14], [23, 14], [16, 10], [8, 21], [24, 21], [12, 11], [20, 11]]) { P.line(16, 20, x, y, '#6a8a40'); P.set(x, y, '#d8d0a0'); }
        eye(13, 18, '#ffe040'); eye(19, 18, '#ffe040');
        P.rect(11, 27, 3, 3, gD); P.rect(18, 27, 3, 3, gD);
        P.set(10, 15, '#b02040'); P.set(22, 24, '#b02040'); break;
      }
      case 'thornbeast': {
        const g = '#3a4a2a', gD = '#26321c';
        P.ellipse(15, 19, 11, 7, g); P.ellipse(25, 16, 5, 5, g);
        P.rect(6, 23, 3, 7, gD); P.rect(11, 24, 3, 6, gD); P.rect(18, 24, 3, 6, gD); P.rect(22, 23, 3, 7, gD);
        for (let x = 6; x <= 24; x += 3) { P.line(x, 13, x - 1, 7, '#8a7a50'); P.set(x - 1, 7, '#e0d8b0'); }
        eye(26, 15, '#ff5020'); P.hline(25, 29, 19, '#e0e0d0'); P.set(28, 16, gD); break;
      }
      case 'hound': {
        const h = BM.gore() ? '#7a2422' : '#5a3a44', hD = C.shade(h, -0.35);
        P.ellipse(14, 19, 9, 5, h); P.ellipse(24, 15, 5, 4, h); P.poly([[22, 12], [23, 7], [25, 11]], hD);
        P.poly([[27, 16], [31, 17], [27, 19]], h); P.hline(26, 30, 19, '#e8e0d0');
        P.rect(7, 22, 2, 8, hD); P.rect(11, 23, 2, 7, hD); P.rect(17, 23, 2, 7, hD); P.rect(20, 22, 2, 8, hD);
        P.line(5, 18, 1, 13, h); eye(25, 14, '#ffd030'); P.noise(rng, 0.12); break;
      }
      case 'cultist': case 'bloodlord': {
        const boss = id === 'bloodlord';
        const r = boss ? '#5a0e14' : '#6a1a1e', rD = C.shade(r, -0.35);
        if (boss) P.poly([[6, 12], [26, 12], [30, 31], [2, 31]], '#2a0608');
        P.poly([[10, 12], [22, 12], [25, 31], [7, 31]], r); P.vline(16, 14, 30, rD);
        P.ellipse(16, 9, 6, 6, r); P.ellipse(16, 10, 4, 4, '#140808');
        eye(14, 10, '#ff4030'); eye(18, 10, '#ff4030');
        P.line(10, 16, 6, 22, r); P.line(22, 16, 26, 22, r);
        P.vline(27, 16, 23, '#c0c4cc'); P.set(27, 15, '#ffffff');
        if (boss) { P.hline(11, 21, 3, '#e8b838'); for (const x of [11, 14, 16, 18, 21]) P.set(x, 2, '#e8b838'); P.set(16, 1, '#ff3030'); }
        break;
      }
      case 'wraith': case 'forgotten': {
        const boss = id === 'forgotten';
        const w = boss ? '#8a80c0' : '#7aa0d0';
        P.poly([[9, 10], [23, 10], [25, 24], [21, 30], [17, 26], [13, 31], [8, 25]], w, 0.75);
        P.ellipse(16, 10, 7, 7, w, 0.8);
        P.ellipse(16, 11, 4, 4, '#101020', 0.9); eye(14, 11, '#e0f0ff'); eye(18, 11, '#e0f0ff');
        P.line(9, 15, 4, 22, w, 0.6); P.line(23, 15, 28, 22, w, 0.6);
        if (boss) { P.ellipse(16, 11, 4.5, 4.5, '#e8e0d0'); P.set(14, 11, '#101020'); P.set(18, 11, '#101020'); P.hline(14, 18, 13, '#101020'); P.hline(10, 22, 3, '#c0b0e0'); for (const x of [10, 13, 16, 19, 22]) P.set(x, 2, '#c0b0e0'); }
        break;
      }
      case 'echo': {
        const e = '#50d0d0';
        for (const [ox, al] of [[-3, 0.25], [3, 0.25], [0, 0.85]]) {
          P.ellipse(16 + ox, 8, 4, 4, e, al); P.rect(12 + ox, 12, 8, 10, e, al);
          P.rect(10 + ox, 13, 2, 7, e, al); P.rect(20 + ox, 13, 2, 7, e, al);
          P.rect(13 + ox, 22, 2, 8, e, al); P.rect(17 + ox, 22, 2, 8, e, al);
        }
        eye(15, 8, '#ffffff'); eye(17, 8, '#ffffff');
        for (let y = 2; y < 30; y += 4) P.hline(9, 23, y, '#a0ffff', 0.25); break;
      }
      case 'knight': {
        const k = '#4a4e58', kL = '#6a707c', kD = '#30333a';
        P.ellipse(16, 8, 5, 5, k); P.rect(11, 7, 10, 5, k); P.hline(12, 20, 9, '#0a0a10'); eye(14, 9, '#ff6020'); eye(18, 9, '#ff6020');
        P.rect(9, 13, 14, 10, k); P.rect(7, 13, 4, 3, kL); P.rect(21, 13, 4, 3, kL);
        P.vline(16, 14, 22, kL); P.rect(10, 23, 4, 8, kD); P.rect(18, 23, 4, 8, kD);
        P.rect(7, 16, 2, 7, k); P.rect(23, 16, 2, 7, k);
        P.vline(26, 3, 24, '#9aa0aa'); P.vline(27, 3, 24, '#70767e'); P.hline(24, 29, 22, '#5a4a3a');
        P.vline(16, 1, 3, '#8a1a1a'); break;
      }
      case 'golem': {
        const s = '#6a6258', sL = '#8a8274', sD = '#4a443c';
        P.rect(8, 10, 16, 14, s); P.rect(11, 3, 10, 8, s);
        P.rect(3, 11, 5, 12, sD); P.rect(24, 11, 5, 12, sD); P.rect(2, 22, 7, 5, s); P.rect(23, 22, 7, 5, s);
        P.rect(9, 24, 5, 7, sD); P.rect(18, 24, 5, 7, sD);
        P.hline(13, 19, 7, '#1a1410'); eye(14, 7, '#ffa020'); eye(18, 7, '#ffa020');
        P.line(10, 12, 15, 20, sD); P.line(20, 11, 17, 18, sD); P.rect(14, 15, 4, 4, '#e07a20');
        P.vline(8, 10, 23, sL); P.noise(rng, 0.15); break;
      }
      case 'thornmother': {
        const g = '#3a5a2a', gD = '#22381a';
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; P.line(16, 17, 16 + Math.cos(a) * 14, 17 + Math.sin(a) * 13, i % 2 ? gD : g); }
        P.circle(16, 17, 8, g); P.circle(16, 17, 5, '#e8d8c0'); P.circle(16, 17, 3, '#b0182a'); P.circle(16, 17, 1.2, '#100808');
        for (const [x, y] of [[8, 6], [24, 6], [16, 3], [5, 14], [27, 14]]) { P.circle(x, y, 2, '#b02040'); P.set(x, y, '#ff8090'); }
        break;
      }
      default: P.circle(16, 16, 10, '#a03030');
    }
    P.outline(BM.OUT);
    return P.canvas();
  }

  // ---------------- Tiles ----------------
  const PAL = {
    physical: { floor: '#3c3835', floor2: '#332f2c', wall: '#5a534c', wallT: '#736a60', dark: '#1a1715', acc: '#8a7a6a' },
    thorn: { floor: '#30352a', floor2: '#282c22', wall: '#3e4a30', wallT: '#566444', dark: '#121610', acc: '#9a2a3e' },
    blood: { floor: '#3a2424', floor2: '#301c1c', wall: '#5a2c2c', wallT: '#743a38', dark: '#180b0b', acc: '#c0262d' },
    memory: { floor: '#2e2c40', floor2: '#262438', wall: '#45405f', wallT: '#5c567c', dark: '#121020', acc: '#9ad0ff' },
    town: { floor: '#6a6050', floor2: '#5e5446', wall: '#7a6a58', wallT: '#9a8870', dark: '#2a241e', acc: '#c0a070' },
  };
  BM.PAL = PAL;

  function tile(kind, dtype, v) { return memo('tile|' + kind + '|' + dtype + '|' + v + '|' + BM.gore(), (rng) => drawTile(kind, dtype, v, rng)); }

  function drawTile(kind, dtype, v, rng) {
    const p = PAL[dtype] || PAL.physical, P = new BM.Painter(32, 32);
    if (kind === 'floor') {
      P.rect(0, 0, 32, 32, v % 2 ? p.floor2 : p.floor);
      // Steinplatten
      const off = v % 2 ? 8 : 0;
      P.hline(0, 31, 15, p.dark, 0.5); P.hline(0, 31, 31, p.dark, 0.5);
      P.vline((12 + off) % 32, 0, 15, p.dark, 0.5); P.vline((26 + off) % 32, 16, 31, p.dark, 0.5);
      P.hline(0, 31, 0, C.shade(p.floor, 0.08));
      P.noise(rng, 0.09);
      if (v === 2) { P.line(4, 20, 9, 24, p.dark, 0.6); P.line(9, 24, 12, 23, p.dark, 0.6); }
      if (v === 3 && dtype === 'thorn') { P.line(3, 28, 10, 22, '#3a5a2a'); P.set(6, 25, p.acc); }
      if (v === 3 && dtype === 'blood' && BM.gore()) { P.ellipse(20, 22, 4, 2.5, '#6a0e10', 0.8); P.set(14, 25, '#6a0e10'); }
      if (v === 3 && dtype === 'memory') { P.set(8, 8, '#9ad0ff', 0.6); P.set(22, 19, '#c0a0ff', 0.5); }
    } else if (kind === 'wall') {
      P.rect(0, 0, 32, 32, p.wall);
      for (let row = 0; row < 4; row++) {
        const y = row * 8, o = row % 2 ? 8 : 0;
        P.hline(0, 31, y, p.dark, 0.7);
        for (let x = o; x < 32; x += 16) P.vline(x, y, y + 7, p.dark, 0.7);
        P.hline(0, 31, y + 1, C.shade(p.wall, 0.12));
      }
      P.noise(rng, 0.1);
      if (dtype === 'thorn') {
        let x = rng.int(2, 28);
        for (let y = 0; y < 32; y++) { x = BM.clamp(x + rng.int(-1, 1), 1, 30); P.set(x, y, '#3a6a2a'); if (y % 5 === 0) { P.set(x + 1, y, '#d8d0a0'); P.set(x - 1, y + 1, '#2a4a1e'); } }
        if (v % 2) P.circle(rng.int(6, 26), rng.int(6, 26), 1.5, p.acc);
      }
      if (dtype === 'blood' && BM.gore() && v % 2) { const x = rng.int(4, 27); P.vline(x, 0, rng.int(8, 20), '#7a1014'); P.set(x, 0, '#a01818'); }
      if (dtype === 'memory' && v % 3 === 0) { P.ring(16, 16, 5, '#9ad0ff', 0.3); }
    } else if (kind === 'walltop') {
      P.rect(0, 0, 32, 32, p.dark); P.noise(rng, 0.05);
    }
    return P.canvas();
  }

  function obj(kind, dtype) { return memo('obj|' + kind + '|' + dtype + '|' + BM.gore(), (rng) => drawObj(kind, dtype, rng)); }

  function drawObj(kind, dtype, rng) {
    const P = new BM.Painter(32, 32), p = PAL[dtype] || PAL.physical;
    switch (kind) {
      case 'chest': case 'chest_open': {
        const w = '#7a4a22', wD = '#4e2e14', m = '#c9a13d';
        if (kind === 'chest') { P.rect(6, 12, 20, 6, C.shade(w, 0.1)); P.ellipse(16, 12, 10, 3, C.shade(w, 0.15)); }
        else { P.rect(6, 6, 20, 7, wD); P.rect(7, 12, 18, 3, '#1a0e06'); P.set(12, 13, '#ffd860'); P.set(19, 13, '#ffd860'); }
        P.rect(6, 17, 20, 10, w); P.hline(6, 25, 17, m); P.vline(6, 12, 26, wD); P.vline(25, 12, 26, wD);
        P.rect(14, 16, 4, 5, m); P.set(15, 18, '#3a2a10'); P.hline(6, 25, 26, wD);
        break;
      }
      case 'trap': {
        P.rect(6, 6, 20, 20, '#1a1414', 0.7);
        for (let y = 8; y < 26; y += 5) for (let x = 8; x < 26; x += 5) { P.poly([[x, y + 4], [x + 1.5, y], [x + 3, y + 4]], '#a8a8b0'); P.set(x + 1, y, '#ffffff'); }
        if (BM.gore()) { P.set(13, 12, '#9a1010'); P.set(19, 18, '#9a1010'); P.set(14, 13, '#9a1010'); }
        break;
      }
      case 'stairs': {
        for (let i = 0; i < 5; i++) { P.rect(4 + i * 2, 6 + i * 4, 24 - i * 4, 4, C.shade(p.floor, -0.15 * i)); P.hline(4 + i * 2, 27 - i * 2, 6 + i * 4, C.shade(p.wallT, -0.1 * i)); }
        P.rect(12, 26, 8, 4, '#000000');
        break;
      }
      case 'exit': {
        P.ellipse(16, 16, 11, 14, '#e8d8a0', 0.25); P.ellipse(16, 16, 8, 11, '#fff0c0', 0.5); P.ellipse(16, 16, 5, 8, '#ffffff', 0.85);
        for (let i = 0; i < 8; i++) P.set(rng.int(5, 27), rng.int(3, 29), '#fff8d0');
        break;
      }
      case 'rubble': {
        for (let i = 0; i < 9; i++) P.ellipse(rng.int(6, 26), rng.int(14, 27), rng.int(2, 5), rng.int(2, 3), C.shade(p.wall, rng.range(-0.3, 0.1)));
        break;
      }
      case 'safe': {
        P.ring(16, 16, 12, '#7ad0ff', 0.6); P.ring(16, 16, 9, '#7ad0ff', 0.35);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.set(16 + Math.cos(a) * 10.5, 16 + Math.sin(a) * 10.5, '#e0f4ff'); }
        P.poly([[16, 9], [19, 16], [16, 23], [13, 16]], '#7ad0ff', 0.5); P.set(16, 16, '#ffffff');
        break;
      }
      case 'tablet': {
        P.rect(9, 6, 14, 22, '#6a6670'); P.ellipse(16, 7, 7, 3, '#6a6670'); P.vline(9, 6, 27, '#8a8690'); P.rect(7, 27, 18, 3, '#4a4650');
        P.line(12, 11, 20, 11, '#9ad0ff'); P.line(14, 14, 18, 20, '#9ad0ff'); P.line(18, 14, 14, 20, '#9ad0ff'); P.hline(12, 20, 23, '#9ad0ff');
        break;
      }
      case 'seal': {
        P.circle(16, 16, 13, '#201a30'); P.ring(16, 16, 13, '#e8b838'); P.ring(16, 16, 10, '#a07a28');
        for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 - Math.PI / 4; P.rect(16 + Math.cos(a) * 7 - 2, 16 + Math.sin(a) * 7 - 2, 4, 4, '#e8b838', 0.6); }
        P.circle(16, 16, 3, '#ff4060');
        break;
      }
      case 'orb': {
        P.ellipse(16, 27, 7, 2, '#000000', 0.4);
        P.rect(13, 20, 6, 7, '#4a4258'); P.circle(16, 14, 7, '#b090ff', 0.35); P.circle(16, 14, 5, '#d0b8ff', 0.6); P.circle(16, 14, 2.5, '#ffffff', 0.9);
        break;
      }
      case 'supply': {
        P.rect(5, 12, 12, 14, '#8a6a3a'); P.hline(5, 16, 18, '#5a4422'); P.vline(5, 12, 25, '#a8844a');
        P.ellipse(22, 20, 6, 7, '#a88a5a'); P.ellipse(22, 14, 5, 2, '#c0a070'); P.rect(20, 11, 4, 3, '#6a5030');
        P.circle(10, 9, 3, '#c03a2a'); P.set(9, 8, '#ff8a70');
        break;
      }
      case 'bones': {
        P.line(8, 22, 20, 18, '#cfc8b4'); P.line(12, 26, 22, 24, '#cfc8b4'); P.circle(23, 18, 3, '#d8d2c0'); P.set(22, 18, '#1a1010'); P.set(24, 18, '#1a1010');
        if (BM.gore()) P.ellipse(14, 24, 6, 2, '#5a0c0e', 0.7);
        break;
      }
      case 'torch': {
        P.rect(15, 14, 2, 10, '#5a3a1e'); P.circle(16, 11, 3, '#ff9a30', 0.9); P.circle(16, 10, 1.5, '#fff0a0');
        break;
      }
    }
    if (['chest', 'chest_open', 'tablet', 'supply', 'stairs', 'seal'].includes(kind)) P.outline(BM.OUT);
    return P.canvas();
  }

  // ---------------- Gegenstände ----------------
  function item(base, rank) { return memo('item|' + base + '|' + rank, (rng) => drawItem(base, rank, rng)); }

  function drawItem(base, rank, rng) {
    const P = new BM.Painter(32, 32);
    const m = BM.METAL[rank], mD = C.shade(m, -0.4), mL = C.shade(m, 0.45), wood = '#6a4426', woodD = '#432a16', gem = rank === 'SS' ? '#ff3050' : rank === 'S' ? '#40e0ff' : '#d04040';
    switch (base) {
      case 'sword':
        P.poly([[22, 4], [27, 4], [27, 9], [12, 22], [9, 19]], m); P.line(25, 6, 11, 20, mL); P.line(26, 8, 12, 21, mD);
        P.line(6, 17, 14, 25, '#8a6a2a'); P.line(7, 17, 15, 25, '#a8843a'); P.line(10, 22, 5, 27, woodD); P.line(9, 22, 4, 27, wood); P.circle(4, 28, 1.6, m); break;
      case 'dagger':
        P.poly([[20, 7], [24, 7], [24, 11], [15, 20], [12, 17]], m); P.line(22, 9, 14, 18, mL);
        P.line(10, 16, 16, 22, '#8a6a2a'); P.line(13, 20, 8, 25, woodD); P.line(12, 20, 7, 25, wood); break;
      case 'axe':
        P.line(8, 27, 22, 8, wood); P.line(9, 27, 23, 8, woodD);
        P.poly([[17, 5], [27, 7], [29, 15], [24, 19], [20, 12]], m); P.line(27, 8, 28, 15, mL); P.line(20, 12, 24, 18, mD); break;
      case 'mace':
        P.line(7, 27, 18, 12, wood); P.line(8, 27, 19, 12, woodD);
        P.circle(21, 10, 6, m); P.circle(19, 8, 2, mL);
        for (const [x, y] of [[21, 2], [28, 9], [21, 17], [14, 10], [26, 4], [26, 15]]) P.set(x, y, mD); break;
      case 'spear':
        P.line(4, 28, 22, 10, wood); P.line(5, 28, 23, 10, woodD);
        P.poly([[20, 9], [29, 3], [24, 12]], m); P.line(22, 9, 28, 4, mL); P.line(19, 12, 22, 14, '#8a2a1a'); break;
      case 'staff':
        P.line(6, 28, 21, 11, wood); P.line(7, 28, 22, 11, woodD);
        P.circle(23, 8, 5, gem, 0.9); P.circle(22, 7, 2, '#ffffff', 0.8); P.ring(23, 8, 5.5, m); break;
      case 'crossbow':
        P.line(6, 24, 22, 10, wood); P.line(7, 25, 23, 11, woodD); P.rect(4, 23, 5, 4, woodD);
        P.line(12, 4, 28, 20, m); P.line(13, 4, 29, 19, mD); P.line(12, 4, 19, 16, '#e0d8c8'); P.line(28, 20, 19, 16, '#e0d8c8'); break;
      case 'plate':
        P.poly([[8, 6], [24, 6], [27, 10], [25, 26], [16, 29], [7, 26], [5, 10]], m);
        P.poly([[8, 6], [12, 6], [10, 14], [5, 10]], mL); P.vline(16, 8, 27, mD); P.hline(9, 23, 15, mD); P.hline(9, 23, 21, mD);
        P.rect(12, 4, 8, 3, mD); break;
      case 'leather':
        P.poly([[8, 6], [24, 6], [26, 11], [24, 27], [8, 27], [6, 11]], '#7a5030');
        P.rect(12, 4, 8, 3, '#4a2e18'); P.line(9, 8, 23, 24, '#4a2e18'); P.hline(8, 23, 20, '#3a2414'); P.set(16, 20, m); P.set(15, 20, m);
        P.noise(rng, 0.12); break;
      case 'robe':
        P.poly([[10, 4], [22, 4], [25, 10], [28, 29], [4, 29], [7, 10]], '#4a3a7a');
        P.poly([[13, 4], [19, 4], [16, 12]], '#2a2050'); P.vline(16, 12, 28, m); P.hline(5, 27, 28, m);
        P.line(10, 4, 5, 18, '#5e4c96'); break;
      case 'amulet':
        P.ring(16, 11, 9, '#a08a5a'); P.ring(16, 11, 8.5, m);
        P.circle(16, 22, 5, m); P.circle(16, 22, 3, gem); P.set(15, 21, '#ffffff'); break;
      case 'ring':
        P.ring(16, 18, 7, m); P.ring(16, 18, 6, mD); P.ring(16, 18, 7.6, m);
        P.circle(16, 10, 3.5, gem); P.set(15, 9, '#ffffff'); P.hline(13, 19, 13, m); break;
      case 'shield':
        P.poly([[6, 5], [26, 5], [26, 16], [16, 29], [6, 16]], C.mix('#6a5038', m, 0.5)); P.vline(16, 6, 27, m); P.hline(7, 25, 13, m); break;
    }
    P.outline(BM.OUT);
    return P.canvas();
  }

  // Rang-Rahmen um ein Icon
  function drawItemIcon(ctx, it, x, y, size) {
    size = size || 32;
    const col = BM.RANK_COLOR[it.rank];
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, size, size);
    if (BM.rankIdx(it.rank) >= 3) { ctx.fillStyle = col + '33'; ctx.fillRect(x, y, size, size); }
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    ctx.drawImage(item(it.base, it.rank), x, y, size, size);
    if (!it.identified) { ctx.fillStyle = 'rgba(20,20,40,0.55)'; ctx.fillRect(x, y, size, size); BM.UI.text(ctx, '?', x + size / 2, y + size / 2 - 9, { size: 18, align: 'center', color: '#a0b0ff' }); }
  }

  // ---------------- Hintergründe (240x135, werden 4x skaliert) ----------------
  function townScene(bloodMoon) { return memo('town|' + !!bloodMoon, (rng) => drawTown(!!bloodMoon, rng)); }

  function drawTown(bm, rng) {
    const P = new BM.Painter(240, 135);
    // Himmel
    for (let y = 0; y < 80; y++) {
      const t = y / 80;
      P.hline(0, 239, y, bm ? C.mix('#1a0406', '#6a1010', t) : C.mix('#3a5a8a', '#e8b880', t * t));
    }
    if (bm) { P.circle(190, 26, 14, '#b01818'); P.circle(186, 22, 12, '#d02a20'); P.circle(194, 30, 3, '#901010'); P.circle(182, 26, 2, '#901010'); }
    else { P.circle(190, 58, 10, '#fff0c0'); P.circle(190, 58, 14, '#fff0c0', 0.25); for (let i = 0; i < 4; i++) P.ellipse(rng.int(10, 230), rng.int(8, 40), rng.int(12, 24), rng.int(2, 4), '#ffffff', 0.35); }
    if (bm) for (let i = 0; i < 40; i++) P.set(rng.int(0, 239), rng.int(0, 50), '#ff9090', 0.5);
    // Berge
    const mtn = (base, h, col, seed) => { const r = BM.RNG(seed); let y = base; for (let x = 0; x < 240; x++) { y = BM.clamp(y + r.int(-2, 2), base - h, base); P.vline(x, y, 95, col); } };
    mtn(70, 26, bm ? '#2a0a0c' : '#5a6a8a', 11); mtn(80, 16, bm ? '#1a0608' : '#4a5a50', 23);
    // Stadtmauer
    P.rect(0, 84, 240, 10, bm ? '#3a2a2a' : '#7a6e60'); for (let x = 0; x < 240; x += 8) P.rect(x, 81, 5, 4, bm ? '#3a2a2a' : '#7a6e60');
    P.hline(0, 239, 84, bm ? '#4a3434' : '#9a8c7a');
    // Boden
    for (let y = 94; y < 135; y++) P.hline(0, 239, y, bm ? C.mix('#2a1a16', '#1a100e', (y - 94) / 41) : C.mix('#7a6a50', '#5a4e3a', (y - 94) / 41));
    for (let i = 0; i < 160; i++) P.set(rng.int(0, 239), rng.int(96, 134), bm ? '#3a2420' : '#8a7a5e');
    P.poly([[100, 135], [140, 135], [128, 95], [112, 95]], bm ? '#3a2824' : '#9a8a6a');
    const wallC = bm ? '#4a3a36' : '#c8b898', roofC = bm ? '#3a1414' : '#8a3a2a', winC = bm ? '#ff8040' : '#ffd890';
    const house = (x, y, w, h, roof, wall, win) => {
      P.rect(x, y, w, h, wall); P.vline(x, y, y + h - 1, C.shade(wall, 0.15)); P.vline(x + w - 1, y, y + h - 1, C.shade(wall, -0.25));
      P.poly([[x - 3, y], [x + w / 2, y - h * 0.7], [x + w + 3, y]], roof);
      P.rect(x + w / 2 - 2, y + h - 7, 4, 7, '#3a2414');
      if (win) { P.rect(x + 3, y + 4, 3, 3, winC); P.rect(x + w - 6, y + 4, 3, 3, winC); }
    };
    // Gilde (links, groß)
    const gx = 90;
    house(gx, 70, 46, 28, roofC, wallC, true); P.rect(gx + 16, 62, 14, 10, wallC);
    P.rect(gx + 20, 50, 1, 14, '#3a2a1a'); P.rect(gx + 21, 50, 8, 6, '#8b1e1a'); P.set(gx + 24, 52, '#e8b838');
    P.rect(gx + 11, 76, 4, 6, winC); P.rect(gx + 31, 76, 4, 6, winC);
    // Kirche (Turm)
    P.rect(172, 58, 22, 40, bm ? '#4a4040' : '#d8d0c0'); P.poly([[169, 58], [183, 22], [197, 58]], bm ? '#2a2028' : '#5a6a8a');
    P.rect(181, 16, 3, 8, '#e8d080'); P.rect(178, 19, 9, 2, '#e8d080'); P.rect(178, 68, 8, 12, bm ? '#ff6030' : '#a8d0ff'); P.circle(182, 68, 4, bm ? '#ff6030' : '#a8d0ff');
    house(198, 76, 30, 22, roofC, wallC, true);
    // Markt (Stände)
    for (let i = 0; i < 3; i++) {
      const x = 20 + i * 22; P.rect(x, 90, 16, 8, '#6a4a2a');
      for (let k = 0; k < 16; k += 4) P.rect(x + k, 84, 4, 4, k % 8 ? (bm ? '#5a1a1a' : '#e8e0d0') : (bm ? '#3a0a0a' : '#b03a2a'));
      P.vline(x, 84, 97, '#4a3018'); P.vline(x + 15, 84, 97, '#4a3018');
    }
    // Taverne
    house(142, 74, 26, 24, roofC, bm ? '#3e3028' : '#a88a60', true); P.rect(166, 80, 6, 5, '#6a4a2a'); P.circle(169, 82, 2, '#c9a13d');
    // Laternen
    for (const x of [70, 134, 168]) { P.vline(x, 98, 112, '#2a2018'); P.circle(x, 97, 2, winC); P.circle(x, 97, 4, winC, 0.25); }
    return P.canvas();
  }

  function titleScene() { return memo('title', (rng) => {
    const P = new BM.Painter(240, 135);
    for (let y = 0; y < 135; y++) P.hline(0, 239, y, C.mix('#060304', '#2a0808', Math.min(1, y / 110)));
    for (let i = 0; i < 70; i++) P.set(rng.int(0, 239), rng.int(0, 70), '#e8d0d0', rng.range(0.2, 0.8));
    P.circle(170, 40, 22, '#3a0606', 0.5); P.circle(170, 40, 18, '#9a1414'); P.circle(165, 35, 15, '#c0201c'); P.circle(176, 44, 4, '#8a1010'); P.circle(160, 40, 2, '#8a1010');
    let y = 100; const r = BM.RNG(77);
    for (let x = 0; x < 240; x++) { y = BM.clamp(y + r.int(-2, 2), 88, 108); P.vline(x, y, 134, '#0a0405'); }
    // Burgsilhouette
    P.rect(30, 70, 50, 40, '#0a0405'); P.rect(26, 56, 12, 54, '#0a0405'); P.rect(72, 60, 12, 50, '#0a0405'); P.poly([[24, 56], [32, 40], [40, 56]], '#0a0405'); P.poly([[70, 60], [78, 46], [86, 60]], '#0a0405');
    for (let x = 30; x < 80; x += 6) P.rect(x, 66, 3, 4, '#0a0405');
    P.rect(46, 84, 3, 4, '#ff6020', 0.8); P.rect(60, 78, 3, 4, '#ff6020', 0.6);
    // Dornen im Vordergrund
    for (let i = 0; i < 12; i++) { const bx = rng.int(0, 239); let px = bx, py = 134; for (let k = 0; k < 30; k++) { px += rng.int(-1, 1); py -= 1; P.set(px, py, '#140608'); if (k % 6 === 0) P.set(px + 1, py, '#2a0a0c'); } }
    return P.canvas();
  }); }

  // Kampfhintergrund 320×180, wird genau 3× vergrößert – dasselbe Raster wie die Kämpfer (32 px × 3)
  function battleBg(dtype) { return memo('bbg2|' + dtype + '|' + BM.gore(), (rng) => {
    const p = PAL[dtype] || PAL.physical, W = 320, H = 180, HZ = 92, P = new BM.Painter(W, H);
    const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    // Farbverlauf in harten Stufen mit Dither-Übergängen (statt weicher Mischung)
    const band = (x, y, t, a, b, steps) => {
      const v = t * steps, lo = Math.floor(v), f = v - lo;
      const k = Math.min(steps, lo + (B[y % 4][x % 4] / 16 < f ? 1 : 0));
      return C.mix(a, b, k / steps);
    };
    for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) P.set(x, y, band(x, y, y / HZ, p.dark, p.wall, 4));
    // Mauersteine mit Licht- und Schattenkante
    for (let row = 0; row * 10 < HZ; row++) {
      const yy = row * 10, o = row % 2 ? 9 : 0;
      P.hline(0, W - 1, yy, p.dark);
      for (let x = o - 18; x < W; x += 18) {
        P.vline(x, yy, yy + 9, p.dark);
        P.hline(x + 1, x + 16, yy + 1, C.shade(p.wallT, -0.1 - (HZ - yy) / HZ * 0.4), 0.7);
        P.vline(x + 17, yy + 2, yy + 9, p.dark, 0.5);
      }
    }
    // Boden: Platten in Perspektive, Stufen-Verlauf nach vorn
    for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) P.set(x, y, band(x, y, (y - HZ) / (H - HZ), p.floor, C.shade(p.floor, -0.45), 3));
    let yy = HZ + 3, step = 6;
    while (yy < H) { P.hline(0, W - 1, yy, p.dark); P.hline(0, W - 1, yy + 1, C.shade(p.floor, 0.12), 0.5); yy += step; step += 3; }
    for (let k = -12; k <= 12; k++) P.line(160 + k * 8, HZ, 160 + k * 46, H - 1, p.dark, 0.6);
    P.hline(0, W - 1, HZ, C.shade(p.wallT, 0.1)); P.hline(0, W - 1, HZ + 1, p.dark);
    P.noise(rng, 0.05);
    if (dtype === 'thorn') for (let i = 0; i < 16; i++) { let x = rng.int(0, W - 1); for (let y = 0; y < HZ - 2; y++) { x = BM.clamp(x + rng.int(-1, 1), 0, W - 1); P.set(x, y, '#2e4a22'); if (y % 7 === 0) { P.set(x + 1, y, '#c8c090'); P.set(x - 1, y + 1, '#3e5e2c'); } } }
    if (dtype === 'blood') { for (let i = 0; i < 12; i++) { const x = rng.int(0, W - 1), l = rng.int(10, 60); P.vline(x, 0, l, BM.gore() ? '#6a0c10' : '#3a1418'); P.set(x, l + 1, BM.gore() ? '#8a1014' : '#4a1a1e'); } P.ellipse(160, 150, 120, 14, BM.gore() ? '#4a0a0c' : '#2a1416', 0.6); }
    if (dtype === 'memory') for (let i = 0; i < 60; i++) { const x = rng.int(0, W - 1), y = rng.int(0, H - 1), c = rng.pick(['#9ad0ff', '#c0a0ff', '#ffffff']); P.set(x, y, c); if (rng.chance(0.3)) { P.set(x + 1, y, c, 0.5); P.set(x, y + 1, c, 0.5); } }
    // Fackeln mit Pixel-Lichthof
    for (const x of [52, 266]) {
      P.circle(x + 1, 40, 14, '#ff9a30', 0.06); P.circle(x + 1, 40, 9, '#ff9a30', 0.1);
      P.rect(x, 42, 3, 12, '#4a3018'); P.rect(x - 1, 40, 5, 3, '#2a1a10');
      P.poly([[x - 2, 40], [x + 1.5, 31], [x + 5, 40]], '#ff9a30'); P.poly([[x, 40], [x + 1.5, 35], [x + 3, 40]], '#ffe080');
    }
    return P.canvas();
  }); }

  // Geordnetes Dithering (Bayer 4×4, 2×2-Pixel-Punkte): Stufe 1–3 = 25/50/75 % Schatten
  function dither(level, rgb) {
    return memo('dither|' + level + '|' + (rgb || ''), () => {
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      const c = document.createElement('canvas'); c.width = 32; c.height = 32;
      const g = c.getContext('2d'); g.fillStyle = rgb ? 'rgb(' + rgb + ')' : '#000';
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (B[y % 4][x % 4] < level * 4) g.fillRect(x * 2, y * 2, 2, 2);
      return c;
    });
  }

  function clear() { cache.clear(); }

  return { character, monster, tile, obj, item, drawItemIcon, townScene, titleScene, battleBg, dither, clear };
})();
