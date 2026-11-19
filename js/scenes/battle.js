// Rundenbasierter Kampf: Initiative nach Tempo, Fertigkeiten, Tribute, Sünden, Statuseffekte
BM.Unit = class {
  constructor(o) { Object.assign(this, o); this.b = this.b || {}; this.flash = 0; this.off = 0; this.fade = 1; }
  get hp() { return this.src.hp; } set hp(v) { this.src.hp = v; }
  get mp() { return this.src.mp; } set mp(v) { this.src.mp = v; }
  get alive() { return this.src.hp > 0 && (this.side === 'enemy' || this.src.alive !== false); }
  get spdE() { return this.spd * (1 - Math.min(0.6, (this.b.cold || 0) / 100)) * (this.b.slow ? 0.6 : 1); }
  get defE() { return this.def * (1 - Math.min(0.6, (this.b.exhaust || 0) / 100)) * (this.b.guard ? 1.4 : 1) * (this.b.taunt ? 1.5 : 1); }
};

BM.Scenes.battle = {
  enter(p) {
    this.p = p; this.t = 0; this.timers = []; this.floats = []; this.parts = []; this.banner = null; this.shake = 0;
    this.cmd = null; this.over = false; this.kills = 0; this.round = 0;
    const run = BM.S.run, ri = BM.rankIdx(p.rank), D = BM.diff();
    const mult = BM.RANK_MULT[ri] * D.enemy * (run.bloodMoon ? 1.25 : 1);
    const partyN = run.party.filter((c) => c.alive && c.hp > 0).length;
    this.enemies = p.pack.map((id, i) => {
      const M = BM.MONSTERS[id];
      const hpF = M.boss ? (0.35 + 0.15 * partyN) : 1.0, atkF = M.boss ? 0.7 : 0.75;
      const mhp = Math.round(M.hp * hpF * mult);
      return new BM.Unit({
        side: 'enemy', id, name: BM.L(M.name), src: { hp: mhp, mp: 0 }, mhp, mmp: 0,
        atk: M.atk * atkF * mult, def: M.def * mult, mag: M.mag * atkF * mult, spd: M.spd * (1 + ri * 0.12), crit: 5,
        boss: !!M.boss, ab: M.ab, undead: !!M.undead, xp: Math.round(M.xp * BM.RANK_MULT[ri]), gold: M.gold * Math.pow(BM.RANK_MULT[ri], 2), idx: i, fx: {},
      });
    });
    this.party = run.party.map((c, i) => {
      const s = BM.stats(c);
      c.hp = Math.min(c.hp, s.mhp); c.mp = Math.min(c.mp, s.mmp);
      return new BM.Unit({ side: 'party', c, name: c.name, src: c, mhp: s.mhp, mmp: s.mmp, atk: s.atk, def: s.def, mag: s.mag, spd: s.spd, crit: s.crit, fx: s.fx, curses: s.curses, idx: i,
        trib: BM.Loot.tributeOf(c.equip.weapon), armorTrib: BM.Loot.tributeOf(c.equip.armor), sin: BM.Loot.sinOf(c.equip.weapon) });
    });
    this.layout();
    BM.Audio.ambience(p.dtype);
    BM.Audio.music(p.boss ? 'boss' : 'battle');
    this.loop();
  },
  layout() {
    const n = this.enemies.length;
    this.enemies.forEach((e, i) => {
      if (e.boss) { e.x = 120; e.y = 90; e.size = 192; }
      else { e.size = 96; e.x = 120 + (i % 2) * 130 + (n === 1 ? 60 : 0); e.y = 60 + i * 72 + (n <= 2 ? 50 : 0); if (this.enemies[0].boss) { e.x = 330; e.y = 60 + (i - 1) * 100; } }
    });
    this.party.forEach((u, i) => { u.size = 96; u.x = 700 - (i % 2) * 60; u.y = 50 + i * 78; });
  },
  wait(sec) { return new Promise((res) => this.timers.push({ t: sec, res })); },
  say(text, color) { this.banner = { text, color: color || BM.C.ink, t: 0.9 }; },
  float(u, text, color, big) {
    this.floats.push({ x: u.x + u.size / 2 + (Math.random() - 0.5) * 20, y: u.y + u.size * 0.3, text: String(text), color, t: 1.1, big });
  },
  burst(u, kind) {
    const gore = BM.gore(), n = kind === 'crit' ? 26 : 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
      this.parts.push({ x: u.x + u.size / 2, y: u.y + u.size / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, t: 0.6 + Math.random() * 0.5,
        c: kind === 'heal' ? '#7aff9a' : kind === 'magic' ? '#9ab8ff' : gore ? (Math.random() < 0.5 ? '#a01010' : '#d02020') : (Math.random() < 0.5 ? '#ffffff' : '#ffd860'), s: gore ? 4 : 3 });
    }
  },
  aliveP() { return this.party.filter((u) => u.alive); },
  aliveE() { return this.enemies.filter((u) => u.alive); },

  async loop() {
    await this.wait(0.3);
    this.say(this.p.boss ? BM.t('dg_boss') : BM.t('bt_appear', { n: this.enemies[0].name + (this.enemies.length > 1 ? ' ×' + this.enemies.length : '') }), this.p.boss ? BM.C.blood : BM.C.ink);
    await this.wait(0.9);
    while (!this.over) {
      this.round++;
      await this.roundStart();
      if (this.checkEnd()) return;
      const order = [...this.party, ...this.enemies].filter((u) => u.alive).map((u) => ({ u, k: u.spdE * BM.rand.range(0.85, 1.15) })).sort((a, b) => b.k - a.k).map((o) => o.u);
      this.order = order;
      for (const u of order) {
        if (this.over) return;
        if (!u.alive) continue;
        this.active = u; u.defending = false;
        if (u.b.stun > 0) { u.b.stun--; this.say(BM.t('bt_stunned', { n: u.name }), '#a0c0ff'); await this.wait(0.6); continue; }
        if (u.side === 'party' && u.sin === 'sloth' && BM.rand.chance(0.2)) { this.say(BM.t('bt_sloth', { n: u.name }), '#c08060'); await this.wait(0.8); continue; }
        const act = u.side === 'party' ? await this.command(u) : this.ai(u);
        if (!act) continue;
        await this.perform(u, act);
        if (this.checkEnd()) return;
      }
      this.active = null;
    }
  },
  async roundStart() {
    for (const u of [...this.party, ...this.enemies]) {
      if (!u.alive) continue;
      for (const k of ['taunt', 'guard', 'slow']) if (u.b[k] > 0) u.b[k]--;
      if (u.side === 'party') {
        if (u.fx.regen) { this.heal(u, u.fx.regen, true); }
        if (u.fx.manaflow) u.mp = Math.min(u.mmp, u.mp + u.fx.manaflow);
        if (u.armorTrib && this.round > 1) this.payTribute(u, u.armorTrib, true);
        if (u.curses.includes('bloodlust') && this.round > 1) { const d = Math.max(1, Math.round(u.mhp * 0.03)); u.hp = Math.max(1, u.hp - d); this.float(u, '−' + d, '#c080ff'); }
      }
      for (const [k, col] of [['poison', '#8adf5a'], ['burn', '#ff8a30'], ['bleed', '#d02020']]) {
        if (u.b[k] > 0) {
          u.b[k]--;
          const dmg = Math.max(1, Math.round(u.mhp * (k === 'burn' ? 0.07 : k === 'bleed' ? 0.06 : 0.05)));
          u.hp -= dmg; this.float(u, dmg, col);
          if (u.hp <= 0) this.die(u);
        }
      }
    }
    if (this.round > 1) await this.wait(0.25);
  },
  checkEnd() {
    if (this.over) return true;
    if (!this.aliveE().length) { this.over = true; this.win(); return true; }
    if (!this.aliveP().length) { this.over = true; this.lose(); return true; }
    return false;
  },

  // ---------- Spielerbefehle ----------
  command(u) {
    return new Promise((resolve) => {
      this.cmd = { u, resolve };
      this.mainMenu();
    });
  },
  finishCmd(act) { const c = this.cmd; this.cmd = null; this.menu = null; this.targeting = null; c.resolve(act); },
  mainMenu() {
    const u = this.cmd.u, run = BM.S.run;
    this.targeting = null;
    this.menu = new BM.UI.Menu([
      { label: () => BM.t('bt_attack'), onSelect: () => this.pickTarget('enemy', (t) => this.finishCmd({ type: 'attack', target: t })) },
      { label: () => BM.t('bt_skill'), onSelect: () => this.skillMenu() },
      { label: () => BM.t('bt_item'), disabled: () => run.potions.hp + run.potions.mp <= 0, onSelect: () => this.itemMenu() },
      { label: () => BM.t('bt_defend'), disabled: () => u.sin === 'wrath', onSelect: () => this.finishCmd({ type: 'defend' }) },
      { label: () => BM.t('bt_flee'), onSelect: () => this.finishCmd({ type: 'flee' }) },
    ], { x: 28, y: 400, w: 250, rowH: 25, size: 17 });
  },
  skillMenu() {
    const u = this.cmd.u;
    const items = BM.skillsOf(u.c).map((id) => {
      const S = BM.SKILLS[id];
      return {
        label: () => BM.L(S.name), value: () => S.mp + ' MP', disabled: () => u.mp < S.mp, sk: S,
        onSelect: () => {
          const done = (t) => this.finishCmd({ type: 'skill', id, target: t });
          if (S.target === 'enemy') this.pickTarget('enemy', done);
          else if (S.target === 'ally') this.pickTarget('ally', done);
          else done(null);
        },
      };
    });
    items.push({ label: () => BM.t('back'), onSelect: () => this.mainMenu() });
    this.menu = new BM.UI.Menu(items, { x: 28, y: 400, w: 290, rowH: 25, size: 16, onCancel: () => this.mainMenu() });
  },
  itemMenu() {
    const run = BM.S.run;
    this.menu = new BM.UI.Menu([
      { label: () => BM.t('mk_hp') + ' ×' + run.potions.hp, disabled: () => run.potions.hp <= 0, onSelect: () => this.pickTarget('ally', (t) => this.finishCmd({ type: 'item', item: 'hp', target: t })) },
      { label: () => BM.t('mk_mp') + ' ×' + run.potions.mp, disabled: () => run.potions.mp <= 0, onSelect: () => this.pickTarget('ally', (t) => this.finishCmd({ type: 'item', item: 'mp', target: t })) },
      { label: () => BM.t('back'), onSelect: () => this.mainMenu() },
    ], { x: 28, y: 400, w: 290, rowH: 25, size: 16, onCancel: () => this.mainMenu() });
  },
  pickTarget(side, cb) {
    const list = side === 'enemy' ? this.aliveE() : this.aliveP();
    if (!list.length) return;
    let sel = side === 'ally' ? list.indexOf(list.reduce((a, b) => (a.hp / a.mhp <= b.hp / b.mhp ? a : b))) : 0;
    this.targeting = { side, list, sel, cb, back: this.menu };
    this.menu = null;
  },
  updateTargeting() {
    const T = this.targeting, I = BM.Input;
    if (I.repeat('up') || I.repeat('left')) { T.sel = (T.sel - 1 + T.list.length) % T.list.length; BM.Audio.sfx('select'); }
    if (I.repeat('down') || I.repeat('right')) { T.sel = (T.sel + 1) % T.list.length; BM.Audio.sfx('select'); }
    for (const c of I.clicks()) T.list.forEach((u, i) => { if (BM.UI.inRect(c, { x: u.x, y: u.y, w: u.size, h: u.size })) { if (T.sel === i) { BM.Audio.sfx('confirm'); BM.Input.consumeAll(); T.cb(u); } else T.sel = i; } });
    if (!this.targeting) return;
    if (I.pressed('confirm')) { BM.Audio.sfx('confirm'); BM.Input.consumeAll(); T.cb(T.list[T.sel]); }
    else if (I.pressed('cancel')) { BM.Audio.sfx('cancel'); this.menu = T.back; this.targeting = null; }
  },

  // ---------- Gegner-KI ----------
  ai(u) {
    const targets = this.aliveP();
    const taunt = targets.filter((t) => t.b.taunt > 0);
    const pick = () => (taunt.length && BM.rand.chance(0.85) ? BM.rand.pick(taunt) : BM.rand.pick(targets));
    if (u.boss && BM.rand.chance(0.3)) return { type: 'eall', kind: u.ab === 'magic' || u.ab === 'drain' ? 'mag' : 'phys' };
    if (u.ab === 'quake' && BM.rand.chance(0.35)) return { type: 'eall', kind: 'phys' };
    if (u.ab === 'magic' && BM.rand.chance(0.5)) return { type: 'eatk', kind: 'mag', target: pick() };
    return { type: 'eatk', kind: 'phys', target: pick() };
  },

  // ---------- Ausführung ----------
  async perform(u, a) {
    const run = BM.S.run;
    if (a.type === 'defend') { u.defending = true; this.say(u.name + ': ' + BM.t('bt_defend')); await this.wait(0.5); return; }
    if (a.type === 'flee') {
      if (this.p.boss) { this.say(BM.t('bt_noflee_boss'), BM.C.blood); await this.wait(0.8); return; }
      const ps = this.aliveP().reduce((s, x) => s + x.spdE, 0) / this.aliveP().length, es = this.aliveE().reduce((s, x) => s + x.spdE, 0) / this.aliveE().length;
      if (BM.rand.chance(BM.clamp(0.5 + (ps - es) * 0.03, 0.2, 0.9))) { this.say(BM.t('bt_fled')); await this.wait(0.7); this.over = true; this.endBattle('fled'); return; }
      this.say(BM.t('bt_noflee'), BM.C.blood); await this.wait(0.7); return;
    }
    if (a.type === 'item') {
      const t = a.target.alive ? a.target : this.aliveP()[0];
      run.potions[a.item]--;
      if (a.item === 'hp') this.heal(t, t.mhp * 0.4 + 20);
      else { const v = Math.round(t.mmp * 0.3 + 10); t.mp = Math.min(t.mmp, t.mp + v); this.float(t, '+' + v + ' MP', '#8ab0ff'); BM.Audio.sfx('heal'); }
      this.say(u.name + ': ' + (a.item === 'hp' ? BM.t('mk_hp') : BM.t('mk_mp')));
      await this.wait(0.6); return;
    }
    if (a.type === 'eatk' || a.type === 'eall') {
      const list = a.type === 'eall' ? this.aliveP() : [a.target.alive ? a.target : BM.rand.pick(this.aliveP())];
      this.say(u.name + (a.type === 'eall' ? ': ' + BM.t('bt_all_attack') : ''), a.type === 'eall' ? BM.C.blood : BM.C.ink);
      await this.lunge(u);
      for (const t of list) this.hit(u, t, a.type === 'eall' ? 0.65 : (a.kind === 'mag' ? 1.1 : 1), a.kind, {});
      await this.wait(0.55); return;
    }
    // Angriff / Fertigkeit eines Truppmitglieds
    let S = { kind: 'phys', power: 1, target: 'enemy' }, label = BM.t('bt_attack');
    if (a.type === 'skill') { S = BM.SKILLS[a.id]; label = BM.L(S.name); u.mp -= S.mp; }
    this.say(u.name + ': ' + label);
    if (S.kind === 'heal') {
      BM.Audio.sfx('heal');
      const list = S.target === 'allies' ? this.aliveP() : [a.target && a.target.alive ? a.target : u];
      for (const t of list) this.heal(t, u.mag * S.power * BM.rand.range(0.9, 1.1) + 8, false, u);
      await this.wait(0.6); return;
    }
    if (S.kind === 'buff') {
      BM.Audio.sfx('magic');
      if (S.fx === 'taunt') { u.b.taunt = 2; this.float(u, BM.t('bt_taunt'), BM.C.gold2); }
      if (S.fx === 'guard') for (const t of this.aliveP()) { t.b.guard = 3; this.float(t, BM.t('st_def') + '↑', BM.C.gold2); }
      await this.wait(0.6); return;
    }
    let targets = S.target === 'enemies' ? this.aliveE() : [a.target && a.target.alive ? a.target : this.aliveE()[0]];
    // Wahnsinn (Fluch) und Zorn (Sünde): treffen manchmal einen Verbündeten
    if (u.curses.includes('madness') && S.target === 'enemy' && this.aliveP().length > 1 && BM.rand.chance(0.15)) {
      targets = [BM.rand.pick(this.aliveP().filter((x) => x !== u))];
      this.say(BM.t('bt_madness', { n: u.name }), '#c080ff');
    } else if (u.sin === 'wrath' && S.target === 'enemy' && this.aliveP().length > 1 && BM.rand.chance(0.12)) {
      targets = [BM.rand.pick(this.aliveP().filter((x) => x !== u))];
      this.say(BM.t('bt_wrath_ally', { n: u.name }), BM.C.blood);
    }
    if (S.kind === 'mag') BM.Audio.sfx('magic');
    await this.lunge(u);
    for (const t of targets) this.hit(u, t, S.power, S.kind, S);
    await this.wait(0.45);
    if (u.alive && u.trib) this.payTribute(u, u.trib, false);
    if (u.alive && u.sin) this.applySin(u);
    await this.wait(0.25);
  },
  async lunge(u) { u.lunge = 0.25; await this.wait(0.18); },

  hit(att, tgt, power, kind, S) {
    if (!tgt.alive) return;
    let raw = (kind === 'mag' ? att.mag : att.atk) * power * BM.rand.range(0.9, 1.1);
    let def = tgt.defE * (kind === 'mag' ? 0.5 : 1) * (1 - (S.pen || 0));
    let dmg = raw * (raw / (raw + Math.max(1, def))) * 1.5;
    if (att.sin === 'wrath') dmg *= 1.3;
    if (att.sin === 'sloth') dmg *= 1.4;
    if (tgt.undead && att.fx && att.fx.holy) dmg *= 1 + att.fx.holy / 100;
    if (tgt.undead && S.holy) dmg *= 2;
    let crit = BM.rand.chance((att.crit + (S.crit || 0) + (att.sin === 'pride' ? 20 : 0) + (tgt.curses && tgt.curses.includes('misfortune') ? 10 : 0)) / 100);
    if (crit) dmg *= 1.75;
    if (tgt.defending) dmg *= 0.5;
    dmg = Math.max(1, Math.round(dmg));
    tgt.hp -= dmg; tgt.flash = 0.2;
    this.float(tgt, dmg, crit ? '#ffd040' : (tgt.side === 'party' ? '#ff7060' : '#ffffff'), crit);
    this.burst(tgt, kind === 'mag' ? 'magic' : crit ? 'crit' : 'hit');
    BM.Audio.sfx(crit ? 'crit' : 'hit');
    if (crit || tgt.boss) this.shake = crit ? 0.3 : 0.15;
    if (crit) this.say(BM.t('bt_crit'), '#ffd040');
    // Effekte des Angreifers
    const fx = att.fx || {};
    if (fx.lifesteal && att.alive) this.heal(att, dmg * fx.lifesteal / 100, true);
    if (fx.burn && BM.rand.chance(fx.burn / 100)) tgt.b.burn = 2;
    if (fx.poison && BM.rand.chance(fx.poison / 100)) tgt.b.poison = 3;
    if (S.poison) tgt.b.poison = S.poison;
    if (S.burn) tgt.b.burn = S.burn;
    if (S.slow) tgt.b.slow = S.slow;
    if (S.stun && BM.rand.chance(S.stun)) { tgt.b.stun = 1; this.float(tgt, 'Stun', '#a0c0ff'); }
    if (att.side === 'enemy') {
      if (att.ab === 'poison' && BM.rand.chance(0.3)) tgt.b.poison = 3;
      if (att.ab === 'bleed' && BM.rand.chance(0.35)) tgt.b.bleed = 2;
      if (att.ab === 'stun' && BM.rand.chance(0.2)) { tgt.b.stun = 1; this.float(tgt, 'Stun', '#a0c0ff'); }
      if (att.ab === 'drain') this.heal(att, dmg * 0.5, true);
    }
    // Dornen / Rückwurf
    const refl = (tgt.fx && tgt.fx.thorns ? tgt.fx.thorns / 100 : 0) + (tgt.ab === 'thorns' && kind === 'phys' ? 0.15 : 0);
    if (refl > 0 && kind === 'phys' && att.alive) { const r = Math.max(1, Math.round(dmg * refl)); att.hp -= r; this.float(att, r, '#c0e080'); if (att.hp <= 0) this.die(att); }
    if (tgt.hp <= 0) {
      this.die(tgt);
      if (att.sin === 'gluttony' && att.alive) this.heal(att, att.mhp * 0.15, true);
    }
  },
  die(u) {
    u.hp = 0;
    if (u.side === 'party') { u.c.alive = false; BM.Audio.sfx('death'); }
    else { this.kills++; }
  },
  heal(u, amt, quiet, healer) {
    if (!u.alive) return;
    if (healer && healer !== u && u.sin === 'pride') amt *= 0.5;
    amt = Math.max(1, Math.round(amt));
    const before = u.hp; u.hp = Math.min(u.mhp, u.hp + amt);
    if (u.hp > before) { this.float(u, '+' + Math.round(u.hp - before), '#7aff9a'); if (!quiet) this.burst(u, 'heal'); }
  },
  payTribute(u, tr, armor) {
    const name = BM.L(BM.Loot.TRIBUTES[tr.kind].name).split(':')[0];
    if (tr.kind === 'blood') { const d = Math.round(u.mhp * tr.v / 100); u.hp = Math.max(1, u.hp - d); this.float(u, '−' + d + ' ' + name, '#d04040'); if (BM.gore()) this.burst(u, 'hit'); }
    else if (tr.kind === 'heat') { u.b.cold = (u.b.cold || 0) + tr.v; this.float(u, name + ' −' + tr.v + '%', '#9ad0ff'); }
    else if (tr.kind === 'stamina') { u.b.exhaust = (u.b.exhaust || 0) + tr.v; this.float(u, name + ' −' + tr.v + '%', '#d0b070'); }
    else if (tr.kind === 'mana') { if (u.mp >= tr.v) { u.mp -= tr.v; this.float(u, '−' + tr.v + ' MP', '#8ab0ff'); } else { u.hp = Math.max(1, u.hp - tr.v * 2); this.float(u, '−' + tr.v * 2, '#d04040'); } }
  },
  applySin(u) {
    const others = this.aliveP().filter((x) => x !== u);
    if (u.sin === 'lust' && others.length) {
      let g = 0; for (const o of others) { const v = Math.min(3, o.mp); o.mp -= v; g += v; }
      if (g) this.heal(u, g * 3, true);
    }
    if (u.sin === 'envy' && others.length) {
      const o = others.reduce((a, b) => (a.hp / a.mhp >= b.hp / b.mhp ? a : b));
      const v = Math.max(1, Math.round(o.mhp * 0.04)); o.hp = Math.max(1, o.hp - v); this.float(o, '−' + v, '#a080c0'); this.heal(u, v, true);
    }
  },

  // ---------- Ende ----------
  async win() {
    const run = BM.S.run, D = BM.diff();
    BM.Audio.sfx('levelup');
    let xp = 0, gold = 0;
    for (const e of this.enemies) { xp += e.xp; gold += e.gold; }
    const alive = this.aliveP();
    let goldMult = D.gold * (1 + BM.RACES[run.party[0].race].goldBonus);
    for (const u of alive) { if (u.fx.fortune) goldMult += u.fx.fortune / 100; if (u.sin === 'greed') goldMult += 0.5; if (u.curses.includes('misfortune')) goldMult -= 0.25; }
    goldMult = Math.max(0.1, goldMult);
    for (const u of alive) if (u.sin === 'greed') run.gold = Math.floor(run.gold * 0.97);
    gold = Math.round(gold * goldMult * BM.rand.range(0.8, 1.2));
    run.gold += gold;
    const lines = [BM.t('bt_xp', { n: xp }) + '   ' + BM.t('bt_gold', { g: BM.money(gold) })];
    for (const u of alive) { const ups = BM.gainXP(u.c, xp); if (ups) { lines.push(BM.t('bt_levelup', { n: u.name, lv: u.c.level })); } }
    for (const u of alive) if (u.sin === 'gluttony') { if (run.rations > 0) run.rations--; else u.hp = Math.max(1, u.hp - Math.round(u.mhp * 0.1)); }
    // Beute
    const rng = BM.RNG(BM.newSeed());
    const drops = this.p.boss ? 1 + (rng.chance(0.5) ? 1 : 0) : (rng.chance(0.18 + this.enemies.length * 0.05) ? 1 : 0);
    for (let i = 0; i < drops; i++) { const it = BM.Loot.drop(this.p.rank, this.p.dtype, rng, this.p.boss ? 25 : 0); run.inventory.push(it); lines.push(BM.t('bt_loot', { item: BM.Loot.name(it) + ' [' + it.rank + ']' })); }
    if (this.p.boss && rng.chance(0.6)) { run.potions.hp++; }
    run.stats.kills += this.kills;
    for (const q of run.quests) if (q.kind === 'hunt' && q.accepted && !q.done) { q.progress += this.kills; if (q.progress >= q.target) { q.done = true; lines.push(BM.t('q_hunt_done')); } }
    await this.wait(0.6);
    await BM.msg(lines.join('\n'), { title: BM.t('bt_win'), color: BM.C.gold });
    this.endBattle('win');
  },
  async lose() {
    await this.wait(0.8);
    await BM.msg(BM.t('bt_defeat'), { color: BM.C.blood });
    BM.Flow.defeat();
  },
  endBattle(result) {
    for (const u of this.party) { u.c.hp = Math.max(0, Math.round(u.c.hp)); u.c.mp = Math.max(0, Math.round(u.c.mp)); if (u.c.hp <= 0) u.c.alive = false; }
    BM.go('explore', { result, monId: this.p.monId });
  },

  update(dt) {
    this.t += dt;
    BM.Flow.tick(dt);
    for (const tm of this.timers) tm.t -= dt;
    const done = this.timers.filter((tm) => tm.t <= 0); this.timers = this.timers.filter((tm) => tm.t > 0);
    for (const tm of done) tm.res();
    for (const f of this.floats) { f.t -= dt; f.y -= 40 * dt; }
    this.floats = this.floats.filter((f) => f.t > 0);
    for (const p of this.parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; }
    this.parts = this.parts.filter((p) => p.t > 0);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.shake = Math.max(0, this.shake - dt);
    for (const u of [...this.party, ...this.enemies]) { u.flash = Math.max(0, u.flash - dt); if (u.lunge > 0) u.lunge -= dt; if (!u.alive && u.side === 'enemy') u.fade = Math.max(0, u.fade - dt * 1.5); }
    if (this.targeting) this.updateTargeting();
    else if (this.menu) this.menu.update();
  },

  drawUnit(ctx, u) {
    const img = u.side === 'enemy' ? BM.Spr.monster(u.id) : BM.Spr.character(u.c);
    const g3 = (v) => Math.round(v / 3) * 3; // auf das 3×-Raster des Hintergrunds einrasten
    const bob = u.alive && Math.sin(this.t * 3 + u.idx) > 0.2 ? -3 : 0;
    let dx = 0;
    if (u.lunge > 0) dx = (u.side === 'enemy' ? 1 : -1) * Math.sin((0.25 - u.lunge) / 0.25 * Math.PI) * 30;
    const x = g3(u.x + dx), y = g3(u.y) + bob;
    BM.UI.shadow(ctx, u.x + u.size / 2, u.y + u.size * 0.95, u.size * 0.32, u.size * 0.08, 0.4);
    ctx.save();
    if (u.side === 'enemy') ctx.globalAlpha = u.fade;
    if (u.flash > 0) ctx.filter = 'brightness(3)';
    if (u.side === 'party' && !u.alive) { ctx.filter = 'grayscale(1) brightness(0.6)'; ctx.translate(x + u.size / 2, y + u.size * 0.75); ctx.rotate(Math.PI / 2); ctx.drawImage(img, -u.size / 2, -u.size / 2, u.size, u.size); }
    else if (u.side === 'party') { ctx.translate(x + u.size, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, u.size, u.size); }
    else ctx.drawImage(img, x, y, u.size, u.size);
    ctx.restore();
    ctx.filter = 'none'; ctx.globalAlpha = 1;
    if (u.side === 'enemy' && u.alive) {
      BM.UI.bar(ctx, u.x + u.size * 0.15, u.y + u.size + 2, u.size * 0.7, 6, u.hp / u.mhp, BM.C.hp);
      if (u.boss) BM.UI.text(ctx, u.name, u.x + u.size / 2, u.y - 6, { size: 16, align: 'center', color: BM.C.blood });
      this.drawStatus(ctx, u, u.x + u.size * 0.15, u.y + u.size + 10);
    }
  },
  drawStatus(ctx, u, x, y) {
    const tags = [];
    if (u.b.poison) tags.push(['☠', '#8adf5a']); if (u.b.burn) tags.push(['🔥', '#ff8a30']); if (u.b.bleed) tags.push(['✚', '#d02020']);
    if (u.b.stun) tags.push(['✱', '#a0c0ff']); if (u.b.slow) tags.push(['❄', '#9ad0ff']); if (u.b.taunt) tags.push(['⚑', BM.C.gold2]); if (u.b.guard) tags.push(['⛨', BM.C.gold2]);
    if (u.defending) tags.push(['⛉', '#e0e0e0']);
    tags.forEach(([s, c], i) => BM.UI.text(ctx, s, x + i * 15, y, { size: 12, color: c }));
  },
  draw(ctx) {
    let sx = 0, sy = 0;
    if (this.shake > 0 && BM.S.settings.shake) { sx = (Math.random() - 0.5) * 14 * this.shake * 3; sy = (Math.random() - 0.5) * 14 * this.shake * 3; }
    ctx.save(); ctx.translate(Math.round(sx / 3) * 3, Math.round(sy / 3) * 3);
    ctx.drawImage(BM.Spr.battleBg(this.p.dtype), 0, 0, BM.W, BM.H);
    if (BM.S.run && BM.S.run.bloodMoon) { ctx.fillStyle = 'rgba(150,0,0,0.12)'; ctx.fillRect(0, 0, BM.W, BM.H); }
    for (const e of this.enemies) if (e.fade > 0) this.drawUnit(ctx, e);
    for (const u of this.party) this.drawUnit(ctx, u);
    // Aktiver Kämpfer / Ziel
    const mark = (u, col) => { const y = u.y - 14 + Math.sin(this.t * 6) * 3; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(u.x + u.size / 2 - 8, y); ctx.lineTo(u.x + u.size / 2 + 8, y); ctx.lineTo(u.x + u.size / 2, y + 10); ctx.fill(); };
    if (this.active && this.active.alive && this.cmd) mark(this.active, BM.C.gold2);
    if (this.targeting) mark(this.targeting.list[this.targeting.sel], this.targeting.side === 'enemy' ? '#ff4040' : '#7aff9a');
    for (const p of this.parts) { ctx.fillStyle = p.c; ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillRect(Math.round(p.x / 3) * 3, Math.round(p.y / 3) * 3, 3, 3); }
    ctx.globalAlpha = 1;
    for (const f of this.floats) { ctx.globalAlpha = Math.min(1, f.t * 2); BM.UI.text(ctx, f.text, f.x, f.y, { size: f.big ? 28 : 20, align: 'center', color: f.color, weight: '600' }); }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Untere Leiste
    BM.UI.panel(ctx, 12, 388, 300, 144, { fill: 'rgba(12,8,7,0.92)' });
    BM.UI.panel(ctx, 320, 388, 628, 144, { fill: 'rgba(12,8,7,0.92)' });
    if (this.menu) this.menu.draw(ctx);
    else if (this.targeting) { BM.UI.text(ctx, this.targeting.side === 'enemy' ? BM.t('bt_target') : BM.t('bt_ally'), 30, 404, { size: 17, color: BM.C.gold2 }); BM.UI.text(ctx, this.targeting.list[this.targeting.sel].name, 30, 430, { size: 16 }); BM.UI.text(ctx, '◀ ▶  ·  B ' + BM.t('back'), 30, 500, { size: 13, color: BM.C.dim }); }
    else if (this.active) BM.UI.text(ctx, BM.t('bt_turn', { n: this.active.name }), 30, 404, { size: 16, color: BM.C.dim });
    const cur = this.menu && this.menu.current();
    if (cur && cur.sk) BM.UI.textBlock(ctx, BM.L(cur.sk.desc), 30, 400 + this.menu.items.length * 25 + 2, 270, { size: 12, color: BM.C.dim, lh: 15 });
    this.party.forEach((u, i) => {
      const y = 400 + i * 32, x = 336;
      const act = this.active === u;
      if (act) { ctx.fillStyle = 'rgba(139,30,26,0.35)'; ctx.fillRect(x - 6, y - 3, 604, 30); }
      BM.UI.text(ctx, u.name, x, y + 4, { size: 16, color: u.alive ? (act ? BM.C.gold2 : BM.C.ink) : BM.C.mute, maxW: 110 });
      BM.UI.text(ctx, Math.round(Math.max(0, u.hp)) + '/' + u.mhp, x + 230, y + 4, { size: 14, align: 'right', color: BM.C.dim });
      BM.UI.bar(ctx, x + 240, y + 6, 150, 10, u.hp / u.mhp, BM.C.hp);
      BM.UI.text(ctx, Math.round(u.mp) + '/' + u.mmp, x + 460, y + 4, { size: 14, align: 'right', color: BM.C.dim });
      BM.UI.bar(ctx, x + 468, y + 6, 70, 10, u.mp / Math.max(1, u.mmp), BM.C.mp);
      this.drawStatus(ctx, u, x + 548, y + 4);
      if (u.trib || u.sin) BM.UI.text(ctx, u.sin ? '⚔' : '✧', x + 118, y + 4, { size: 14, color: u.sin ? '#ff5040' : '#e07060' });
    });
    if (this.banner) {
      ctx.globalAlpha = Math.min(1, this.banner.t * 3);
      const w = BM.UI.measure(ctx, this.banner.text, 20) + 50;
      BM.UI.panel(ctx, (BM.W - w) / 2, 14, w, 42, { fill: 'rgba(12,8,7,0.9)' });
      BM.UI.text(ctx, this.banner.text, BM.W / 2, 24, { size: 20, align: 'center', color: this.banner.color });
      ctx.globalAlpha = 1;
    }
  },
};
