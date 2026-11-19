// Dungeon-Erkundung: rundenbasiertes Bewegen auf dem Raster, Fallen, Truhen, Rätsel, Erinnerungsschleifen
BM.Scenes.explore = {
  TS: 32,
  enter(p) {
    p = p || {};
    const run = BM.S.run;
    this.d = run.dungeons.find((x) => x.id === run.inDungeon);
    if (!this.d) { BM.go('town'); return; }
    this.t = 0; this.busy = false; this.facing = 1; this.shake = 0;
    this.anim = null; this.cam = null; this.flash = 0;
    BM.Audio.ambience(this.d.type);
    // Sicherheitsnetz: versperrte Wege (auch in alten Spielständen) reparieren
    if (BM.Dungeon.ensureReachable(this.m)) BM.saveGame(true);
    this.fov();
    if (p.result) this.afterBattle(p.result, p.monId);
    else if (p.fresh) this.intro();
  },
  get m() { return this.d.state.map; },
  async intro() {
    const d = this.d;
    this.busy = true;
    await BM.msg(BM.t('dg_enter'));
    if (!d.revealed) {
      d.revealed = true;
      await BM.msg(BM.t('dg_reveal_' + d.type, { r: d.realRank }), { title: BM.t('dg_type_' + d.type), color: d.type === 'memory' ? '#9ad0ff' : d.type === 'blood' ? BM.C.blood : BM.C.gold });
    }
    this.busy = false;
  },
  fov() { this.vis = BM.Dungeon.computeFov(this.m, 6); },
  partyAlive() { return BM.S.run.party.filter((c) => c.alive && c.hp > 0); },
  hasRole(role) { return this.partyAlive().some((c) => c.role === role); },
  objAt(x, y, pred) { return this.m.objs.find((o) => o.x === x && o.y === y && !o.gone && (!pred || pred(o))); },
  monAt(x, y) { return this.m.mons.find((o) => o.x === x && o.y === y); },
  inSafe(x, y) { const r = this.m.room[y * this.m.w + x]; return r >= 0 && this.m.rooms[r].safe; },
  passable(x, y) { const m = this.m; return x >= 0 && y >= 0 && x < m.w && y < m.h && m.tiles[y * m.w + x] === 1; },

  // Schaden außerhalb des Kampfes; lethal=false lässt 1 LP übrig
  hurt(c, amt, lethal) {
    c.hp -= Math.max(1, Math.round(amt));
    if (c.hp <= 0) { if (lethal) { c.hp = 0; c.alive = false; } else c.hp = 1; }
  },
  checkWipe() {
    if (!this.partyAlive().length) { this.busy = true; BM.Flow.defeat(); return true; }
    return false;
  },

  async tryMove(dx, dy, fresh) {
    if (dx) this.facing = dx;
    const m = this.m, nx = m.px + dx, ny = m.py + dy;
    if (!this.passable(nx, ny)) return;
    const mon = this.monAt(nx, ny);
    if (mon) { this.startBattle(mon); return; }
    const o = this.objAt(nx, ny, (o) => !o.deco);
    if (o) {
      if (o.kind === 'chest' && !o.open) { await this.openChest(o); this.endTurn(); return; }
      if (o.kind === 'seal') { if (fresh) await this.trySeal(); return; }
      if (o.kind === 'orb' && !o.used) { if (fresh) await this.memoryLoop(o); return; }
      if (o.kind === 'tablet' && !o.read) await this.readTablet(o);
      if (o.kind === 'supply') { o.gone = true; const n = BM.rand.int(2, 4); BM.S.run.rations += n; BM.Audio.sfx('chest'); BM.toast(BM.t('dg_supply', { n })); }
    }
    this.anim = { fx: m.px, fy: m.py, t: 0 };
    m.px = nx; m.py = ny; m.steps++; BM.S.run.stats.steps++;
    BM.Audio.sfx('step');
    this.fov();
    await this.onStep();
    if (BM.scene !== this) return;
    this.endTurn();
  },

  async onStep() {
    const m = this.m, run = BM.S.run;
    // Proviant
    if (m.steps % 30 === 0) {
      if (run.rations > 0) { run.rations--; BM.toast(BM.t('dg_eat'), BM.C.dim); }
      else { for (const c of this.partyAlive()) this.hurt(c, BM.stats(c).mhp * 0.06, false); BM.toast(BM.t('dg_starve'), BM.C.blood); }
    }
    // Pfadfinder entdeckt Fallen in der Nähe
    if (this.hasRole('scout')) for (const o of m.objs) if (o.kind === 'trap' && !o.seen && !o.gone && Math.abs(o.x - m.px) + Math.abs(o.y - m.py) <= 2 && BM.rand.chance(0.8)) { o.seen = true; BM.toast(BM.t('dg_trap_seen'), BM.C.green); }
    const o = this.objAt(m.px, m.py);
    if (o && o.kind === 'trap') {
      if (o.seen && this.hasRole('scout')) { o.gone = true; BM.toast(BM.t('dg_trap_disarm'), BM.C.green); }
      else await this.trap(o);
    }
    if (this.inSafe(m.px, m.py) && !this._wasSafe) BM.toast(BM.t('dg_safe'), '#7ad0ff');
    this._wasSafe = this.inSafe(m.px, m.py);
    if (o && o.kind === 'stairs') await this.stairs();
    else if (o && o.kind === 'exit') await this.exit();
  },

  endTurn() {
    if (this.checkWipe()) return;
    const m = this.m;
    for (const mon of m.mons) {
      if (mon.stun > 0) { mon.stun--; continue; }
      const dx = m.px - mon.x, dy = m.py - mon.y, dist = Math.abs(dx) + Math.abs(dy);
      const range = this.d.type === 'memory' ? 2 : mon.boss ? 0 : 7;
      let mx = 0, my = 0;
      if (dist <= range && this.vis.has(mon.y * m.w + mon.x)) {
        if (Math.abs(dx) >= Math.abs(dy)) mx = Math.sign(dx); else my = Math.sign(dy);
        if (!this.monCan(mon, mon.x + mx, mon.y + my)) { const t = mx; mx = my ? Math.sign(dx) : 0; my = t ? Math.sign(dy) : 0; }
      } else if (BM.rand.chance(0.3) && !mon.boss) {
        [mx, my] = BM.rand.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      }
      if (!mx && !my) continue;
      const nx = mon.x + mx, ny = mon.y + my;
      if (nx === m.px && ny === m.py) { this.startBattle(mon); return; }
      if (this.monCan(mon, nx, ny)) { mon.x = nx; mon.y = ny; }
    }
  },
  monCan(mon, x, y) {
    if (!this.passable(x, y) || this.monAt(x, y) || this.inSafe(x, y)) return false;
    if (x === this.m.px && y === this.m.py) return true;
    return !this.objAt(x, y, (o) => ['chest', 'tablet', 'seal', 'orb', 'supply', 'stairs', 'exit'].includes(o.kind));
  },

  startBattle(mon) {
    this.busy = true;
    BM.Audio.sfx('hit');
    BM.go('battle', { pack: mon.pack, boss: mon.boss, monId: mon.id, dtype: this.d.type, rank: this.d.realRank });
  },
  async afterBattle(result, monId) {
    const m = this.m;
    const mon = m.mons.find((x) => x.id === monId);
    this.busy = false;
    if (result === 'win' && mon) {
      m.mons.splice(m.mons.indexOf(mon), 1);
      if (mon.boss) await this.cleared();
    } else if (result === 'fled' && mon) mon.stun = 3;
    BM.saveGame(true);
  },
  async cleared() {
    const m = this.m; this.d.cleared = true;
    BM.Audio.sfx('levelup');
    const spots = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    let p = spots.map(([dx, dy]) => [m.px + dx, m.py + dy]).find(([x, y]) => this.passable(x, y) && !this.objAt(x, y) && !this.monAt(x, y));
    if (!p) p = [m.px, m.py];
    m.objs.push({ kind: 'exit', x: p[0], y: p[1] });
    await BM.msg(BM.t('dg_cleared'), { color: BM.C.gold });
  },

  async openChest(o) {
    const run = BM.S.run, d = this.d;
    o.open = true; o.kind = 'chest_open';
    BM.Audio.sfx('chest');
    const rng = BM.RNG(BM.newSeed());
    if (rng.chance(0.3)) {
      const g = Math.round(rng.int(8, 20) * Math.pow(BM.RANK_MULT[BM.rankIdx(d.realRank)], 2) * BM.diff().gold);
      run.gold += g; BM.toast(BM.t('dg_chest_gold', { g: BM.money(g) }), BM.C.gold2);
    } else {
      const it = BM.Loot.drop(d.realRank, d.type, rng);
      run.inventory.push(it);
      BM.toast(BM.t('dg_chest', { item: BM.Loot.name(it) }), BM.RANK_COLOR[it.rank]);
    }
  },
  async trap(o) {
    o.seen = true;
    BM.Audio.sfx('trap'); this.shake = 0.35; this.flash = 0.3;
    const pct = this.d.type === 'thorn' ? 0.2 : 0.12;
    let total = 0;
    for (const c of this.partyAlive()) {
      const s = BM.stats(c), ward = (s.fx.trapward || 0) / 100;
      const dmg = s.mhp * pct * (1 - Math.min(0.8, ward));
      total += Math.round(dmg); this.hurt(c, dmg, true);
    }
    BM.toast(BM.t('dg_trap', { dmg: total }), BM.C.blood);
    this.checkWipe();
  },
  async readTablet(o) {
    const d = this.d;
    d.clues[o.idx] = o.rune; o.read = true;
    BM.Audio.sfx('magic');
    await BM.msg(BM.t('dg_tablet', { i: o.idx + 1, rune: BM.L(BM.RUNES[o.rune]) }), { title: BM.t('dg_tablet_t'), color: '#9ad0ff' });
  },
  async trySeal() {
    const d = this.d;
    if (d.cleared) return;
    const known = d.clues.map((c, i) => (c >= 0 ? (i + 1) + '. ' + BM.L(BM.RUNES[c]) : (i + 1) + '. ?')).join('   ');
    const go = await BM.choice(BM.t('dg_seal', { n: d.riddle.length }) + '\n' + known, [
      { label: BM.t('dg_seal_try'), value: true }, { label: BM.t('back'), value: false },
    ], { cancelValue: false, title: BM.t('dg_seal_t'), color: BM.C.gold });
    if (!go) return;
    for (let i = 0; i < d.riddle.length; i++) {
      const pick = await BM.choice(BM.t('dg_seal_pick', { i: i + 1, n: d.riddle.length }), BM.RUNES.map((r, k) => ({ label: BM.L(r), value: k })), { cancelValue: -1 });
      if (pick < 0) return;
      if (pick !== d.riddle[i]) {
        BM.Audio.sfx('trap'); this.shake = 0.4;
        let total = 0;
        for (const c of this.partyAlive()) { const dmg = BM.stats(c).mhp * 0.2; total += Math.round(dmg); this.hurt(c, dmg, true); }
        await BM.msg(BM.t('dg_seal_wrong', { dmg: total }), { color: BM.C.blood });
        this.checkWipe();
        return;
      }
    }
    BM.Audio.sfx('door');
    const s = this.objAt(this.m.px, this.m.py) || this.m.objs.find((o) => o.kind === 'seal'); if (s && s.kind === 'seal') s.gone = true;
    await BM.msg(BM.t('dg_seal_right'), { color: BM.C.gold });
    this.rewardXP(1.2);
    await this.cleared();
  },
  rewardXP(f) {
    const ri = BM.rankIdx(this.d.realRank), xp = Math.round(40 * BM.RANK_MULT[ri] * f);
    for (const c of this.partyAlive()) { const ups = BM.gainXP(c, xp); if (ups) BM.toast(BM.t('bt_levelup', { n: c.name, lv: c.level }), BM.C.gold2); }
  },

  // Erinnerungsschleife: aktiv (eingreifen) oder inaktiv (still halten)
  async memoryLoop(o) {
    const ok = await BM.confirmBox(BM.t('loop_touch'), { title: BM.t('loop_title'), color: '#b090ff' });
    if (!ok) return;
    o.used = true; o.gone = true;
    BM.Audio.sfx('magic'); this.flash = 0.6;
    const party = this.partyAlive(), ri = BM.rankIdx(this.d.realRank);
    let success = false;
    if (o.loop === 'active') {
      const cleric = party.find((c) => c.role === 'cleric' && c.mp >= 10);
      const v = await BM.choice(BM.t('loop_active'), [
        { label: BM.t('loop_act_banish'), value: 'banish', disabled: !cleric },
        { label: BM.t('loop_act_change'), value: 'change' },
        { label: BM.t('loop_act_flee'), value: 'flee' },
      ], { title: BM.t('loop_title'), color: BM.C.blood });
      if (v === 'banish') { cleric.mp -= 10; success = BM.rand.chance(0.85); }
      else if (v === 'change') {
        const def = party.reduce((a, c) => a + BM.stats(c).def, 0) / party.length;
        success = BM.rand.chance(BM.clamp(0.35 + def / (40 * BM.RANK_MULT[ri]), 0.2, 0.85));
      } else { for (const c of party) this.hurt(c, BM.stats(c).mhp * 0.25, false); await BM.msg(BM.t('loop_fail')); return; }
      if (!success) { for (const c of party) this.hurt(c, BM.stats(c).mhp * 0.35, true); this.shake = 0.5; BM.Audio.sfx('scream'); await BM.msg(BM.t('loop_fail'), { color: BM.C.blood }); }
    } else {
      await BM.msg(BM.t('loop_inactive'), { title: BM.t('loop_title'), color: '#b090ff' });
      success = await this.holdStill(6 + Math.floor(ri / 2));
      if (!success) {
        const cleric = party.find((c) => c.role === 'cleric' && c.alive && c.mp >= 8);
        if (cleric) { cleric.mp -= 8; BM.Audio.sfx('heal'); await BM.msg(BM.t('loop_silence'), { color: '#7ad0ff' }); success = true; }
        else {
          BM.Audio.sfx('scream'); this.shake = 1.2; this.flash = 1;
          await BM.msg(BM.t('loop_break'), { color: BM.C.blood, title: BM.t('loop_title') });
          const victim = BM.rand.pick(party);
          if (BM.rand.chance(0.9)) this.hurt(victim, 99999, true); else this.hurt(victim, BM.stats(victim).mhp * 0.6, false);
          await BM.msg(BM.t(victim.alive ? 'loop_victim_live' : 'loop_victim_dead', { n: victim.name }), { color: BM.C.blood });
        }
      }
    }
    if (this.checkWipe()) return;
    if (success) {
      await BM.msg(BM.t(o.loop === 'active' ? 'loop_ok' : 'loop_survived'));
      const it = BM.Loot.drop(this.d.realRank, 'memory', BM.RNG(BM.newSeed()), 20);
      BM.S.run.inventory.push(it);
      BM.toast(BM.t('dg_chest', { item: BM.Loot.name(it) }), BM.RANK_COLOR[it.rank]);
      this.rewardXP(0.6);
    }
  },
  holdStill(sec) {
    return new Promise((resolve) => {
      const ov = {
        phase: 'release', t: 0, sec,
        update(dt) {
          const I = BM.Input;
          const any = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu'].some((a) => I.held(a));
          if (this.phase === 'release') { if (!any) { this.t += dt; if (this.t > 0.6) { this.phase = 'hold'; this.t = 0; } } else this.t = 0; return; }
          this.t += dt;
          if (any || I.activity() || I.clicks().length) { BM.Overlays.pop(ov); resolve(false); return; }
          if (this.t >= this.sec) { BM.Overlays.pop(ov); resolve(true); }
        },
        draw(ctx) {
          const tt = performance.now() / 1000;
          ctx.fillStyle = 'rgba(20,0,10,0.75)'; ctx.fillRect(0, 0, BM.W, BM.H);
          if (BM.gore()) { ctx.fillStyle = 'rgba(140,10,20,' + (0.15 + 0.1 * Math.sin(tt * 3)) + ')'; ctx.fillRect(0, 0, BM.W, BM.H); }
          for (let i = 0; i < 7; i++) {
            const x = 140 + i * 115 + Math.sin(tt * 0.7 + i) * 10, y = 250 + Math.sin(tt + i * 2) * 6;
            ctx.fillStyle = 'rgba(160,140,220,0.25)'; ctx.fillRect(x, y, 26, 70); ctx.beginPath(); ctx.arc(x + 13, y - 10, 13, 0, Math.PI * 2); ctx.fill();
          }
          const left = this.phase === 'hold' ? Math.ceil(this.sec - this.t) : this.sec;
          BM.UI.text(ctx, BM.t('loop_hold', { s: left }), BM.W / 2, 120, { size: 34, align: 'center', color: '#d8c8ff' });
          if (this.phase === 'release') BM.UI.text(ctx, BM.t('loop_release'), BM.W / 2, 170, { size: 16, align: 'center', color: BM.C.dim });
        },
      };
      BM.Overlays.push(ov);
    });
  },

  async rest() {
    const run = BM.S.run;
    if (run.rations <= 0) { BM.msg(BM.t('dg_rest_nofood')); return; }
    if (!(await BM.confirmBox(BM.t('dg_rest')))) return;
    run.rations--;
    for (const c of this.partyAlive()) { const s = BM.stats(c); c.hp = Math.min(s.mhp, c.hp + s.mhp * 0.5); c.mp = Math.min(s.mmp, c.mp + s.mmp * 0.5); }
    BM.Audio.sfx('heal');
    BM.saveGame(true);
    BM.msg(BM.t('dg_rested'));
  },
  async stairs() {
    if (!(await BM.confirmBox(BM.t('dg_stairs')))) return;
    const d = this.d;
    d.state.floor++;
    d.state.map = BM.Dungeon.genFloor(d, d.state.floor); // genFloor prüft die Erreichbarkeit selbst
    this.cam = null; this.anim = null;
    this.fov();
    BM.Audio.sfx('door');
    BM.saveGame(true);
    BM.toast(BM.t('dg_floor', { n: d.state.floor + 1, m: d.floors }), BM.C.gold2);
  },
  async exit() {
    if (!(await BM.confirmBox(BM.t('dg_exit')))) return;
    BM.Flow.finishDungeon(this.d);
  },
  async menu() {
    this.busy = true;
    const v = await BM.choice(BM.t('t_menu'), [
      { label: BM.t('menu_resume'), value: 0 }, { label: BM.t('menu_party'), value: 1 }, { label: BM.t('menu_settings'), value: 2 }, { label: BM.t('menu_title'), value: 3 },
    ], { cancelValue: 0 });
    this.busy = false;
    if (v === 1) BM.openParty();
    if (v === 2) BM.go('settings', { back: () => BM.go('explore'), bg: (ctx) => this.draw(ctx, true) });
    if (v === 3) { BM.saveGame(true); BM.go('title'); }
  },

  goalHint() {
    const d = this.d, last = d.state.floor === d.floors - 1;
    if (d.cleared) return BM.t('dg_hint_exit');
    if (!last) return BM.t('dg_hint_stairs');
    if (d.goal === 'riddle') return BM.t('dg_hint_riddle', { n: d.clues.filter((c) => c >= 0).length, m: d.riddle.length });
    return BM.t('dg_hint_boss');
  },

  update(dt) {
    this.t += dt;
    BM.Flow.tick(dt);
    if (this.anim) { this.anim.t += dt / 0.11; if (this.anim.t >= 1) this.anim = null; }
    this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt);
    if (this.busy || BM.scene !== this) return;
    const I = BM.Input;
    if (I.pressed('menu') || I.pressed('cancel')) { this.menu(); return; }
    if (this.anim) return;
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of dirs) if (I.held(a)) { const fresh = I.pressed(a); this.runAsync(() => this.tryMove(dx, dy, fresh)); return; }
    // Klick/Tipp auf ein Nachbarfeld
    const c = I.takeClick();
    if (c && this.cam) {
      const tx = Math.floor((c.x / this.ZOOM + this.cam.x) / this.TS), ty = Math.floor((c.y / this.ZOOM + this.cam.y) / this.TS);
      const dx = Math.sign(tx - this.m.px), dy = Math.sign(ty - this.m.py);
      if (Math.abs(tx - this.m.px) >= Math.abs(ty - this.m.py) && dx) { this.runAsync(() => this.tryMove(dx, 0)); return; }
      if (dy) { this.runAsync(() => this.tryMove(0, dy)); return; }
      if (!dx && !dy) { this.runAsync(() => this.interactHere()); return; }
    }
    if (I.pressed('confirm')) this.runAsync(() => this.interactHere());
  },
  async interactHere() {
    const o = this.objAt(this.m.px, this.m.py);
    if (o && o.kind === 'safe') await this.rest();
    else if (o && o.kind === 'stairs') await this.stairs();
    else if (o && o.kind === 'exit') await this.exit();
  },
  async runAsync(fn) {
    if (this.busy) return;
    this.busy = true;
    try { await fn(); } finally { this.busy = false; }
  },

  ZOOM: 2, // Spielwelt doppelt so groß: jedes Grafik-Pixel = 2×2 Bildpunkte
  draw(ctx, still) {
    const m = this.m, d = this.d, TS = this.TS, run = BM.S.run, Z = this.ZOOM;
    const VW = BM.W / Z, VH = BM.H / Z;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, BM.W, BM.H);
    // Kamera
    let px = m.px, py = m.py;
    if (this.anim) { const k = this.anim.t; px = this.anim.fx + (m.px - this.anim.fx) * k; py = this.anim.fy + (m.py - this.anim.fy) * k; }
    const tx = px * TS + TS / 2 - VW / 2, ty = py * TS + TS / 2 - VH / 2 - 6;
    if (!this.cam) this.cam = { x: tx, y: ty };
    this.cam.x += (tx - this.cam.x) * 0.25; this.cam.y += (ty - this.cam.y) * 0.25;
    let sx = 0, sy = 0;
    if (this.shake > 0 && BM.S.settings.shake) { sx = (Math.random() - 0.5) * 6 * this.shake; sy = (Math.random() - 0.5) * 6 * this.shake; }
    const cx = Math.round(this.cam.x + sx), cy = Math.round(this.cam.y + sy);
    const x0 = Math.max(0, Math.floor(cx / TS)), y0 = Math.max(0, Math.floor(cy / TS));
    const x1 = Math.min(m.w - 1, Math.ceil((cx + VW) / TS)), y1 = Math.min(m.h - 1, Math.ceil((cy + VH) / TS));
    ctx.save(); ctx.scale(Z, Z);
    const pal = BM.PAL[d.type];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = y * m.w + x;
      if (!m.seen[k]) continue;
      const X = x * TS - cx, Y = y * TS - cy;
      const v = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 4;
      if (m.tiles[k]) ctx.drawImage(BM.Spr.tile('floor', d.type, v), X, Y);
      else {
        const nearFloor = (this.passable(x, y + 1) || this.passable(x, y - 1) || this.passable(x + 1, y) || this.passable(x - 1, y));
        if (nearFloor) ctx.drawImage(BM.Spr.tile('wall', d.type, v), X, Y);
        else { ctx.fillStyle = pal.dark; ctx.fillRect(X, Y, TS, TS); }
      }
      if (m.tiles[k] && this.inSafe(x, y)) { ctx.fillStyle = 'rgba(120,200,255,0.06)'; ctx.fillRect(X, Y, TS, TS); }
    }
    // Objekte
    for (const o of m.objs) {
      if (o.gone || !m.seen[o.y * m.w + o.x]) continue;
      if (o.kind === 'trap' && !o.seen) continue;
      if (o.x < x0 - 1 || o.x > x1 + 1 || o.y < y0 - 1 || o.y > y1 + 1) continue;
      const X = o.x * TS - cx, Y = o.y * TS - cy;
      if (o.kind === 'exit' || o.kind === 'orb' || o.kind === 'safe') {
        ctx.globalAlpha = 0.75 + Math.sin(this.t * 3 + o.x) * 0.25;
        ctx.drawImage(BM.Spr.obj(o.kind, d.type), X, Y - (o.kind === 'orb' ? Math.round(Math.sin(this.t * 2) * 2) : 0));
        ctx.globalAlpha = 1;
      } else ctx.drawImage(BM.Spr.obj(o.kind, d.type), X, Y);
      if (o.kind === 'tablet' && o.read) { ctx.fillStyle = 'rgba(154,208,255,0.25)'; ctx.fillRect(X, Y, TS, TS); }
    }
    // Monster
    for (const mon of m.mons) {
      if (!this.vis.has(mon.y * m.w + mon.x)) continue;
      const X = mon.x * TS - cx, Y = mon.y * TS - cy, bob = Math.round(Math.sin(this.t * 4 + mon.x) * 1.5);
      if (mon.boss) {
        BM.UI.shadow(ctx, X + 16, Y + 20, 24, 14, 0.3 + (Math.sin(this.t * 3) > 0 ? 0.1 : 0), '200,30,30');
        ctx.drawImage(BM.Spr.monster(mon.pack[0]), X - 16, Y - 30 + bob, 64, 64);
      } else {
        ctx.drawImage(BM.Spr.monster(mon.pack[0]), X, Y + bob);
        if (mon.pack.length > 1) BM.UI.text(ctx, '×' + mon.pack.length, X + 31, Y - 3, { size: 8, align: 'right', color: '#ff8070' });
      }
      if (mon.stun > 0) BM.UI.text(ctx, 'z', X + 24, Y - 5, { size: 8, color: '#a0c0ff' });
    }
    // Spieler
    const hero = run.party.find((c) => c.alive) || run.party[0];
    const HX = Math.round(px * TS - cx), HY = Math.round(py * TS - cy) - 4;
    BM.UI.shadow(ctx, HX + 16, HY + 33, 10, 3, 0.35);
    ctx.save();
    if (this.facing < 0) { ctx.translate(HX + 32, HY); ctx.scale(-1, 1); ctx.drawImage(BM.Spr.character(hero), 0, 0); }
    else ctx.drawImage(BM.Spr.character(hero), HX, HY);
    ctx.restore();
    // Licht in harten Dither-Stufen (Pixel-Art statt weichem Verlauf):
    // nahe = hell, weiter weg = 25/50/75 % Schattenpunkte, nur erinnert = 75 % + abgedunkelt
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = y * m.w + x;
      if (!m.seen[k]) continue;
      const X = x * TS - cx, Y = y * TS - cy;
      if (!this.vis.has(k)) { ctx.drawImage(BM.Spr.dither(3), X, Y); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X, Y, TS, TS); continue; }
      const dist = Math.hypot(x - px, y - py);
      const lvl = dist < 2.6 ? 0 : dist < 3.8 ? 1 : dist < 5 ? 2 : 3;
      if (lvl) ctx.drawImage(BM.Spr.dither(lvl), X, Y);
    }
    const tint = { physical: 'rgba(255,170,90,0.04)', thorn: 'rgba(60,120,40,0.08)', blood: 'rgba(170,10,20,0.12)', memory: 'rgba(90,110,220,0.1)' }[d.type];
    ctx.fillStyle = tint; ctx.fillRect(0, 0, VW, VH);
    if (run.bloodMoon) { ctx.fillStyle = 'rgba(150,0,0,0.08)'; ctx.fillRect(0, 0, VW, VH); }
    if (this.flash > 0) { ctx.fillStyle = (BM.gore() ? 'rgba(180,0,0,' : 'rgba(255,255,255,') + (Math.ceil(this.flash * 4) / 8) + ')'; ctx.fillRect(0, 0, VW, VH); }
    ctx.restore();
    if (still) return;
    // HUD
    BM.drawHud(ctx);
    BM.UI.panel(ctx, 10, 54, 360, 74, { fill: 'rgba(10,7,6,0.8)' });
    BM.UI.text(ctx, BM.dungeonName(d), 24, 64, { size: 16, color: BM.C.gold2, maxW: 330 });
    BM.UI.text(ctx, BM.t('dg_type_' + d.type) + ' · ' + BM.t('t_rank') + ' ' + (d.type === 'memory' ? d.realRank : d.realRank) + ' · ' + BM.t('dg_floor', { n: d.state.floor + 1, m: d.floors }), 24, 84, { size: 13, color: BM.C.dim, maxW: 340 });
    BM.UI.text(ctx, this.goalHint(), 24, 104, { size: 13, color: d.cleared ? BM.C.green : BM.C.ink, maxW: 340 });
    this.drawMinimap(ctx);
    // Trupp
    run.party.forEach((c, i) => {
      const x = 10 + i * 150, y = BM.H - 54, s = BM.stats(c);
      BM.UI.panel(ctx, x, y, 144, 46, { fill: 'rgba(10,7,6,0.82)', edge: c.alive ? BM.C.edge : '#3a1a1a' });
      BM.UI.text(ctx, c.name, x + 10, y + 7, { size: 12, color: c.alive ? BM.C.ink : BM.C.mute, maxW: 80 });
      BM.UI.text(ctx, Math.round(c.hp) + '/' + s.mhp, x + 134, y + 7, { size: 11, align: 'right', color: BM.C.dim });
      BM.UI.bar(ctx, x + 10, y + 24, 124, 7, c.hp / s.mhp, BM.C.hp);
      BM.UI.bar(ctx, x + 10, y + 33, 124, 5, c.mp / s.mmp, BM.C.mp);
    });
    const here = this.objAt(m.px, m.py);
    if (here && ['safe', 'stairs', 'exit'].includes(here.kind) && !this.busy) {
      const key = here.kind === 'safe' ? 'dg_rest_hint' : here.kind === 'stairs' ? 'dg_stairs_hint' : 'dg_exit_hint';
      const w = 360; BM.UI.panel(ctx, BM.W - w - 10, BM.H - 54, w, 46, { fill: 'rgba(10,7,6,0.82)' });
      BM.UI.text(ctx, BM.t(key), BM.W - w / 2 - 10, BM.H - 40, { size: 14, align: 'center', color: '#9ad0ff' });
    }
  },
  drawMinimap(ctx) {
    const m = this.m, s = 3, w = m.w * s, h = m.h * s, X = BM.W - w - 12, Y = 54;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(X - 4, Y - 4, w + 8, h + 8);
    ctx.strokeStyle = BM.C.edge; ctx.strokeRect(X - 4.5, Y - 4.5, w + 9, h + 9);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = y * m.w + x;
      if (!m.seen[k] || !m.tiles[k]) continue;
      ctx.fillStyle = this.inSafe(x, y) ? '#3a6a8a' : '#6a5e50'; ctx.fillRect(X + x * s, Y + y * s, s, s);
    }
    for (const o of m.objs) {
      if (o.gone || !m.seen[o.y * m.w + o.x]) continue;
      const col = { stairs: '#e8d080', exit: '#ffffff', seal: '#e8b838', tablet: '#9ad0ff', orb: '#b090ff', chest: '#c9a13d', trap: o.seen ? '#ff4040' : null }[o.kind];
      if (col) { ctx.fillStyle = col; ctx.fillRect(X + o.x * s - 1, Y + o.y * s - 1, s + 1, s + 1); }
    }
    for (const mon of m.mons) if (this.vis.has(mon.y * m.w + mon.x)) { ctx.fillStyle = '#e03030'; ctx.fillRect(X + mon.x * s, Y + mon.y * s, s, s); }
    ctx.fillStyle = '#7aff7a'; ctx.fillRect(X + m.px * s - 1, Y + m.py * s - 1, s + 2, s + 2);
  },
};
