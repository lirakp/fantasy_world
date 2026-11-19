// Stadt Aschenfurt: Gilde, Aushang, Markt, Sanktuarium, Taverne – plus Spielablauf (Dungeon betreten/verlassen, Niederlage, Blutmond)
BM.Flow = {
  // Blutmond-Fristen laufen in Echtzeit, solange gespielt wird (nicht für den Dungeon, in dem der Trupp lebt)
  tick(dt) {
    const run = BM.S.run; if (!run) return;
    run.playTime += dt;
    for (const d of run.dungeons) {
      if (d.outbreak || run.inDungeon === d.id) continue;
      d.timeLeft -= dt;
      if (d.timeLeft <= 0) this.outbreak(d);
    }
  },
  outbreak(d) {
    const run = BM.S.run;
    d.timeLeft = 0; d.outbreak = true;
    if (d.type === 'physical') d.type = 'blood';
    d.revealed = true;
    const first = !run.bloodMoon;
    run.bloodMoon = run.bloodMoon || { since: run.playTime };
    if (first) for (const o of run.dungeons) if (o.type === 'physical' && !o.state) o.type = 'blood';
    BM.Audio.sfx('scream');
    BM.msg(BM.t('bm_outbreak', { name: BM.dungeonName(d) }) + '\n' + BM.t('bm_info'), { title: BM.t('bm_active'), color: BM.C.blood, top: true });
    BM.saveGame(true);
  },
  enterDungeon(d) {
    const run = BM.S.run;
    if (!d.state) BM.Dungeon.prepare(d);
    run.inDungeon = d.id;
    BM.saveGame(true);
    BM.go('explore', { fresh: true });
  },
  finishDungeon(d) {
    const run = BM.S.run;
    run.cleared[d.realRank] = (run.cleared[d.realRank] || 0) + 1;
    run.stats.dungeons++;
    for (const q of run.quests) if (q.dungeonId === d.id && q.accepted) q.done = true;
    run.quests = run.quests.filter((q) => !(q.dungeonId === d.id && !q.accepted));
    run.dungeons = run.dungeons.filter((x) => x.id !== d.id);
    run.inDungeon = null;
    let ended = false;
    if (run.bloodMoon && !run.dungeons.some((x) => x.outbreak)) { run.bloodMoon = null; ended = true; }
    while (run.dungeons.length < 5) run.dungeons.push(BM.makeDungeonEntry(run));
    run.shopSeed = BM.newSeed();
    BM.refreshQuests(run);
    BM.saveGame(true);
    BM.go('town', { at: 'gate' });
    if (ended) BM.msg(BM.t('bm_end'), { title: BM.t('bm_active'), color: BM.C.gold });
  },
  async defeat() {
    const run = BM.S.run, D = BM.diff();
    BM.Audio.sfx('death');
    const d = run.dungeons.find((x) => x.id === run.inDungeon);
    if (D.permadeath) {
      BM.deleteSave(); BM.S.run = null;
      BM.go('title');
      await BM.msg(BM.t('bt_permadeath'), { title: BM.t('bt_defeat'), color: BM.C.blood });
      return;
    }
    if (d) d.state = null; // Der Dungeon bleibt bestehen, die Frist läuft weiter
    run.inDungeon = null;
    const lost = Math.floor(run.gold * D.goldLoss);
    run.gold -= lost;
    if (D.lootLoss) run.inventory = [];
    for (const c of run.party) { c.alive = true; const s = BM.stats(c); c.hp = Math.max(1, Math.round(s.mhp * 0.5)); c.mp = Math.round(s.mmp * 0.5); }
    BM.saveGame(true);
    BM.go('town', { at: 'church' });
    let txt = BM.t('bt_wake_church');
    if (lost) txt += ' (−' + BM.money(lost) + ')';
    if (D.lootLoss) txt += '\n' + BM.t('bt_lost_loot');
    await BM.msg(txt, { title: BM.t('bt_defeat'), color: BM.C.blood });
  },
  pay(cost) { const run = BM.S.run; if (run.gold < cost) { BM.toast(BM.t('mk_nomoney'), '#e07060'); BM.Audio.sfx('cancel'); return false; } run.gold -= cost; BM.Audio.sfx('coin'); return true; },
  recruit(id) {
    const run = BM.S.run, R = BM.RECRUITS.find((r) => r.id === id);
    if (!R) return;
    if (run.party.length >= 4) { BM.toast(BM.t('party_full')); return; }
    const hero = run.party[0];
    const c = BM.makeChar({ name: R.name, race: R.race, role: R.role, level: Math.max(1, hero.level - 1), seed: BM.hash(R.id) });
    BM.giveStarterGear(c);
    run.party.push(c); run.recruited.push(R.id);
    BM.Audio.sfx('levelup');
    BM.msg(BM.t('recruit_join', { n: R.name }), { color: BM.C.gold });
  },
  timeStr(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); },
  questTitle(q) {
    const run = BM.S.run, d = run.dungeons.find((x) => x.id === q.dungeonId);
    const dn = d ? BM.dungeonName(d) : (q.dname || '?');
    if (d) q.dname = dn;
    if (q.kind === 'recruit') { const R = BM.RECRUITS.find((r) => r.id === q.recruit); return BM.t('q_recruit_t', { n: R.name, r: BM.L(BM.ROLES[R.role].name) }); }
    if (q.kind === 'clear') return BM.t('q_clear_t', { d: dn });
    return BM.t('q_hunt_t', { n: q.target });
  },
  questDesc(q) {
    const run = BM.S.run, d = run.dungeons.find((x) => x.id === q.dungeonId);
    const dn = d ? BM.dungeonName(d) + ' (' + BM.t('t_rank') + ' ' + d.apparentRank + ')' : (q.dname || '?');
    let s = '';
    if (q.kind === 'recruit') { const R = BM.RECRUITS.find((r) => r.id === q.recruit); s = BM.L(R.pitch) + '\n' + BM.t('q_cond_clear', { d: dn }); }
    else if (q.kind === 'clear') s = BM.t('q_clear_d', { d: dn });
    else s = BM.t('q_hunt_d', { n: q.target, p: Math.min(q.progress, q.target) });
    s += '\n' + BM.t('q_reward') + ': ' + BM.money(q.reward);
    s += '\n' + (q.done ? BM.t('q_st_done') : q.accepted ? BM.t('q_st_acc') : BM.t('q_st_open'));
    return s;
  },
};

BM.Scenes.town = {
  // p.at: 'gate' (aus dem Dungeon) oder 'church' (nach Niederlage); sonst gespeicherte Position
  enter(p) {
    const run = BM.S.run, TM = BM.TownMap;
    if (!run.shopSeed) run.shopSeed = BM.newSeed();
    if (!run.shop || run.shopFor !== run.shopSeed) { run.shop = BM.Loot.shopStock(run.rank, run.shopSeed); run.shopFor = run.shopSeed; }
    this.t = 0; this.view = null; this.sub = null; this.anim = null; this.cam = null;
    const spot = p && p.at ? TM.SPOTS[p.at] : null;
    if (spot || !run.townPos || !TM.passable(run.townPos.x, run.townPos.y)) run.townPos = Object.assign({ face: 1 }, spot || TM.SPOTS.start);
    this.trail = [];
    BM.Audio.ambience('town');
  },
  async gameMenu() {
    this.busy = true;
    const v = await BM.choice(BM.t('t_menu'), [
      { label: BM.t('menu_resume'), value: 0 }, { label: BM.t('t_party'), value: 4 }, { label: BM.t('menu_save'), value: 3 }, { label: BM.t('menu_settings'), value: 1 }, { label: BM.t('menu_title'), value: 2 },
    ], { cancelValue: 0 });
    this.busy = false;
    if (v === 4) BM.openParty();
    if (v === 1) BM.go('settings', { back: () => BM.go('town'), bg: (ctx) => this.drawBg(ctx) });
    if (v === 3) { BM.saveGame(true); BM.toast(BM.t('tv_saved')); }
    if (v === 2) { BM.saveGame(true); BM.go('title'); }
  },
  open(view) {
    const run = BM.S.run, F = BM.Flow, self = this;
    const back = () => this.open(null);
    this.view = view; this.detail = null; this.info = null;
    if (!view) { this.sub = null; return; }
    let items = [];
    const mk = (items, onCancel) => new BM.UI.Menu(items, { x: 354, y: 140, w: 572, rowH: 34, size: 18, maxRows: 7, onCancel: onCancel || back });
    if (view === 'guild') {
      this.title = BM.t('t_guild');
      this.info = () => {
        const next = BM.RANKS[BM.rankIdx(run.rank) + 1];
        let s = BM.t('g_plaque', { r: run.rank, metal: BM.L(BM.RANK_METAL[run.rank]), title: BM.L(BM.RANK_TITLE[run.rank]) });
        if (next) { const q = BM.RANK_REQ[next]; s += '\n' + BM.t('g_rank_req', { r: next, lv: q.lv, n: q.cleared, cur: run.rank, fee: BM.money(q.fee) }) + '\n' + BM.t('g_progress', { lv: run.party[0].level, n: this.clearedAtRank() }); }
        else s += '\n' + BM.t('g_rank_max');
        return s;
      };
      items = [
        { label: () => BM.t('g_rankup'), onSelect: () => this.rankUp() },
        { label: () => BM.t('g_quests'), onSelect: () => this.open('quests') },
        { label: () => BM.t('g_activate'), onSelect: () => this.open('activate') },
        { label: () => BM.t('back'), onSelect: back },
      ];
      this.sub = mk(items);
    } else if (view === 'quests') {
      this.title = BM.t('g_quests');
      items = run.quests.filter((q) => !q.claimed).map((q) => ({
        label: () => (q.done ? '✔ ' : q.accepted ? '• ' : '') + F.questTitle(q), q,
        color: q.done ? BM.C.green : null,
        onSelect: () => {
          if (!q.accepted) { q.accepted = true; BM.toast(BM.t('q_accepted')); this.open('quests'); }
          else if (q.done) {
            const pay = Math.round(q.reward * 0.9);
            run.gold += pay; q.claimed = true; BM.Audio.sfx('coin');
            if (q.kind === 'recruit') F.recruit(q.recruit);
            BM.msg(BM.t('g_quest_done', { reward: BM.money(pay) }));
            BM.refreshQuests(run); BM.saveGame(true); this.open('quests');
          } else BM.toast(BM.t('q_st_acc'));
        },
      }));
      if (!items.length) this.info = () => BM.t('g_noquests');
      items.push({ label: () => BM.t('back'), onSelect: () => this.open('guild') });
      this.sub = mk(items, () => this.open('guild'));
      this.detail = () => { const it = this.sub.current(); return it && it.q ? F.questDesc(it.q) : null; };
    } else if (view === 'activate') {
      this.title = BM.t('g_activate');
      const list = this.allItems().filter((e) => !e.it.identified);
      items = list.map((e) => ({
        label: () => BM.Loot.name(e.it), icon: BM.Spr.item(e.it.base, e.it.rank), it: e.it, value: () => BM.money(BM.Loot.activationCost(e.it)),
        onSelect: async () => {
          const cost = BM.Loot.activationCost(e.it);
          if (!(await BM.confirmBox(BM.t('g_activate_cost', { item: BM.Loot.name(e.it), cost: BM.money(cost) })))) return;
          if (!F.pay(cost)) return;
          e.it.identified = true;
          await BM.msg(BM.t('g_activated', { item: BM.Loot.name(e.it) }));
          this.open('activate');
        },
      }));
      if (!items.length) this.info = () => BM.t('g_activate_none');
      items.push({ label: () => BM.t('back'), onSelect: () => this.open('guild') });
      this.sub = mk(items, () => this.open('guild'));
      this.detail = () => { const it = this.sub.current(); return it && it.it ? it.it : null; };
    } else if (view === 'board') {
      this.title = BM.t('b_title');
      items = run.dungeons.map((d) => ({
        d, label: () => BM.dungeonName(d),
        color: d.outbreak ? BM.C.blood : null,
        value: () => (d.outbreak ? BM.t('b_outbreak') : F.timeStr(d.timeLeft)) + '  ' + (d.revealed && d.type === 'memory' ? d.realRank : d.apparentRank),
        onSelect: async () => {
          const lim = BM.rankIdx(run.rank) + 1;
          if (BM.rankIdx(d.apparentRank) > lim) { BM.msg(BM.t('b_rank_lock', { r: BM.RANKS[Math.min(5, lim)] })); return; }
          if (run.rations <= 0 && d.type !== 'memory') { BM.msg(BM.t('b_needfood')); return; }
          if (!run.party.some((c) => c.alive && c.hp > 0)) { BM.msg(BM.t('b_needheal')); return; }
          if (await BM.confirmBox(BM.t('b_enter_confirm', { name: BM.dungeonName(d) }), { title: BM.t('b_enter') })) { BM.Audio.sfx('door'); F.enterDungeon(d); }
        },
      }));
      items.push({ label: () => BM.t('back'), onSelect: back });
      this.sub = mk(items);
      this.detail = () => {
        const it = this.sub.current(); if (!it || !it.d) return BM.t('b_hint');
        const d = it.d;
        let s = BM.t('t_rank') + ': ' + d.apparentRank + (d.revealed && d.type === 'memory' ? ' → ' + BM.t('b_real', { r: d.realRank }) : '') + '\n';
        s += d.revealed ? BM.t('dg_type_' + d.type) : BM.t('b_type_unknown');
        s += '  ·  ' + BM.t('b_floors', { n: d.revealed || d.state ? d.floors : '?' }) + '\n';
        s += d.outbreak ? BM.t('b_bloodmoon_src') : BM.t('b_timer') + ' ' + F.timeStr(d.timeLeft) + ' (' + BM.t('b_realtime') + ')';
        const q = run.quests.find((x) => x.dungeonId === d.id && x.accepted && !x.done);
        if (q) s += '\n' + BM.t('b_quest') + ': ' + F.questTitle(q);
        return s;
      };
    } else if (view === 'buy') {
      this.title = BM.t('t_market') + ' – ' + BM.t('mk_buy');
      const cons = [
        { k: 'ration', n: 1, p: 2 }, { k: 'ration', n: 5, p: 10 }, { k: 'hp', n: 1, p: 12 }, { k: 'mp', n: 1, p: 15 },
      ];
      items = cons.map((c) => ({
        label: () => (c.k === 'ration' ? BM.t('mk_ration') : c.k === 'hp' ? BM.t('mk_hp') : BM.t('mk_mp')) + (c.n > 1 ? ' ×' + c.n : ''),
        value: () => BM.money(c.p),
        onSelect: () => { if (!F.pay(c.p)) return; if (c.k === 'ration') run.rations += c.n; else run.potions[c.k] += c.n; BM.toast(BM.t('mk_bought', { item: this.sub.current().label() })); },
      }));
      items.push({ label: () => '— ' + BM.t('mk_smith') + ' —', disabled: true });
      for (const it of run.shop) items.push({
        label: () => BM.Loot.name(it), icon: BM.Spr.item(it.base, it.rank), it, value: () => BM.money(it.value),
        onSelect: () => { if (!F.pay(it.value)) return; run.shop.splice(run.shop.indexOf(it), 1); const c = Object.assign({}, it, { value: Math.round(it.value / 1.8) }); run.inventory.push(c); BM.toast(BM.t('mk_bought', { item: BM.Loot.name(it) })); this.open('buy'); },
      });
      items.push({ label: () => BM.t('mk_sell') + ' →', onSelect: () => this.open('sell') });
      items.push({ label: () => BM.t('back'), onSelect: back });
      this.sub = mk(items);
      this.detail = () => { const it = this.sub.current(); return it && it.it ? it.it : BM.t('mk_fee'); };
    } else if (view === 'sell') {
      this.title = BM.t('t_market') + ' – ' + BM.t('mk_sell');
      const price = (it) => Math.max(1, Math.round(it.value * 0.5 * 0.98));
      items = run.inventory.map((it) => ({
        label: () => BM.Loot.name(it), icon: BM.Spr.item(it.base, it.rank), it, value: () => BM.money(price(it)),
        onSelect: () => { run.inventory.splice(run.inventory.indexOf(it), 1); run.gold += price(it); BM.Audio.sfx('coin'); BM.toast(BM.t('mk_sold', { p: BM.money(price(it)) })); this.open('sell'); },
      }));
      if (!items.length) this.info = () => BM.t('mk_nothing');
      items.push({ label: () => BM.t('back'), onSelect: () => this.open('buy') });
      this.sub = mk(items, () => this.open('buy'));
      this.detail = () => { const it = this.sub.current(); return it && it.it ? it.it : BM.t('mk_fee'); };
    } else if (view === 'church') {
      this.title = BM.t('t_church');
      const mult = BM.RANK_MULT[BM.rankIdx(run.rank)];
      const healCost = Math.round(4 * mult), revCost = Math.round(25 * mult);
      this.info = () => BM.t('ch_info');
      items = [
        { label: () => BM.t('ch_heal'), value: () => BM.money(healCost), onSelect: () => { if (!F.pay(healCost)) return; this.healParty(false); BM.msg(BM.t('ch_healed')); } },
        { label: () => BM.t('ch_revive'), value: () => BM.money(revCost), disabled: () => !run.party.some((c) => !c.alive || c.hp <= 0),
          onSelect: () => { if (!F.pay(revCost)) return; this.healParty(true); BM.msg(BM.t('ch_healed')); } },
        { label: () => BM.t('ch_damp'), onSelect: () => this.open('damp') },
        { label: () => BM.t('back'), onSelect: back },
      ];
      this.sub = mk(items);
    } else if (view === 'damp') {
      this.title = BM.t('ch_damp');
      const list = this.allItems().filter((e) => e.it.identified && (e.it.tribute || e.it.sin) && !e.it.damped);
      items = list.map((e) => ({
        label: () => BM.Loot.name(e.it), icon: BM.Spr.item(e.it.base, e.it.rank), it: e.it, value: () => BM.money(BM.Loot.dampCost(e.it)),
        onSelect: async () => {
          const cost = BM.Loot.dampCost(e.it);
          if (!(await BM.confirmBox(BM.t('ch_damp_confirm', { item: BM.Loot.name(e.it), cost: BM.money(cost) })))) return;
          if (!F.pay(cost)) return;
          const sin = !!e.it.sin; e.it.damped = true;
          await BM.msg(BM.t(sin ? 'ch_damped_sin' : 'ch_damped', { item: BM.Loot.name(e.it) }));
          this.open('damp');
        },
      }));
      if (!items.length) this.info = () => BM.t('ch_nodamp');
      items.push({ label: () => BM.t('back'), onSelect: () => this.open('church') });
      this.sub = mk(items, () => this.open('church'));
      this.detail = () => { const it = this.sub.current(); return it && it.it ? it.it : null; };
    } else if (view === 'tavern') {
      this.title = BM.t('t_tavern');
      const cost = Math.round(5 * BM.RANK_MULT[BM.rankIdx(run.rank)]);
      items = [
        { label: () => BM.t('tv_rest'), value: () => BM.money(cost), onSelect: () => { if (!F.pay(cost)) return; this.healParty(false); BM.saveGame(true); BM.msg(BM.t('tv_rested') + ' ' + BM.t('tv_saved')); } },
        { label: () => BM.t('tv_save'), onSelect: () => { BM.saveGame(true); BM.toast(BM.t('tv_saved')); } },
        { label: () => BM.t('tv_rumor'), onSelect: () => BM.msg(BM.L(BM.rand.pick(BM.RUMORS))) },
        { label: () => BM.t('back'), onSelect: back },
      ];
      this.sub = mk(items);
    }
  },
  healParty(revive) {
    for (const c of BM.S.run.party) {
      if (!c.alive || c.hp <= 0) { if (!revive) continue; c.alive = true; }
      const s = BM.stats(c); c.hp = s.mhp; c.mp = s.mmp;
    }
    BM.Audio.sfx('heal');
  },
  allItems() {
    const run = BM.S.run, out = run.inventory.map((it) => ({ it }));
    for (const c of run.party) for (const k of ['weapon', 'armor', 'acc']) if (c.equip[k]) out.push({ it: c.equip[k], c });
    return out;
  },
  clearedAtRank() { const run = BM.S.run, ri = BM.rankIdx(run.rank); let n = 0; BM.RANKS.forEach((r, i) => { if (i >= ri) n += run.cleared[r] || 0; }); return n; },
  async rankUp() {
    const run = BM.S.run, next = BM.RANKS[BM.rankIdx(run.rank) + 1];
    if (!next) { BM.msg(BM.t('g_rank_max')); return; }
    const q = BM.RANK_REQ[next];
    if (run.party[0].level < q.lv || this.clearedAtRank() < q.cleared) { BM.msg(BM.t('g_rank_no')); return; }
    if (!(await BM.confirmBox(BM.t('g_rank_req', { r: next, lv: q.lv, n: q.cleared, cur: run.rank, fee: BM.money(q.fee) })))) return;
    if (!BM.Flow.pay(q.fee)) return;
    run.rank = next;
    run.shopSeed = BM.newSeed(); run.shop = BM.Loot.shopStock(run.rank, run.shopSeed); run.shopFor = run.shopSeed;
    BM.refreshQuests(run);
    BM.Audio.sfx('levelup');
    BM.saveGame(true);
    await BM.msg(BM.t('g_rank_ok', { r: next, metal: BM.L(BM.RANK_METAL[next]) }), { color: BM.RANK_COLOR[next] });
  },
  update(dt) {
    this.t += dt;
    BM.Flow.tick(dt);
    const run = BM.S.run;
    if (!run || BM.scene !== this) return;
    if (this.anim) { this.anim.t += dt / 0.13; if (this.anim.t >= 1) this.anim = null; }
    if (this.sub) { this.sub.update(); return; }
    if (this.busy) return;
    const I = BM.Input;
    if (I.pressed('menu') || I.pressed('cancel')) { this.gameMenu(); return; }
    if (this.anim) return;
    for (const [a, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) if (I.held(a)) { this.walk(dx, dy, I.pressed(a)); return; }
    const c = I.takeClick();
    if (c && this.cam) {
      const p = run.townPos, TS = BM.TownMap.TS;
      const tx = Math.floor((c.x + this.cam.x) / TS), ty = Math.floor((c.y + this.cam.y) / TS);
      const dx = tx - p.x, dy = ty - p.y;
      if (dx || dy) { if (Math.abs(dx) >= Math.abs(dy)) this.walk(Math.sign(dx), 0, true); else this.walk(0, Math.sign(dy), true); }
    }
    // Bestätigen vor einer Tür/einem Stand: ebenfalls betreten
    if (I.pressed('confirm')) {
      const p = run.townPos;
      for (const [dx, dy] of [[0, -1], [p.face, 0], [0, 1], [-p.face, 0]]) if (BM.TownMap.actionAt(p.x + dx, p.y + dy)) { this.walk(dx, dy, true); break; }
    }
  },
  // Ein Schritt. Anstoßen an Tür, Stand, Aushang oder Tor öffnet die Aktion –
  // aber nur bei frischem Tastendruck/Klick, damit eine gehaltene Taste nach dem Verlassen nicht sofort wieder öffnet
  walk(dx, dy, fresh) {
    const run = BM.S.run, p = run.townPos, TM = BM.TownMap;
    if (dx) p.face = dx;
    const nx = p.x + dx, ny = p.y + dy;
    const a = TM.actionAt(nx, ny);
    if (a) {
      if (!fresh) return;
      if (a.view) { BM.Audio.sfx('door'); this.open(a.view); }
      else BM.toast(BM.t('t_locked'), BM.C.dim);
      return;
    }
    if (!TM.passable(nx, ny)) return;
    this.trail.unshift({ x: p.x, y: p.y, face: p.face });
    if (this.trail.length > 5) this.trail.pop();
    this.anim = { fx: p.x, fy: p.y, t: 0 };
    p.x = nx; p.y = ny;
    BM.Audio.sfx('step');
  },
  drawBg(ctx) { this.drawTown(ctx); },
  drawTown(ctx) {
    const run = BM.S.run, p = run.townPos, TM = BM.TownMap, TS = TM.TS;
    const k = this.anim ? this.anim.t : 1;
    const lerp = (a, b) => a + (b - a) * k;
    const hx = (this.anim ? lerp(this.anim.fx, p.x) : p.x) * TS, hy = (this.anim ? lerp(this.anim.fy, p.y) : p.y) * TS;
    const tx = BM.clamp(hx + 16 - BM.W / 2, 0, TM.W * TS - BM.W), ty = BM.clamp(hy + 16 - BM.H / 2 + 20, -46, TM.H * TS - BM.H);
    if (!this.cam) this.cam = { x: tx, y: ty };
    this.cam.x += (tx - this.cam.x) * 0.2; this.cam.y += (ty - this.cam.y) * 0.2;
    const cam = { x: Math.round(this.cam.x), y: Math.round(this.cam.y) };
    // Held vorne, Gefährten folgen auf seiner Spur
    const actors = [];
    const alive = run.party.filter((c) => c.alive);
    const hero = run.party[0];
    actors.push({ img: BM.Spr.character(hero), x: hx, y: hy, flip: p.face < 0 });
    run.party.slice(1).forEach((c, i) => {
      const to = this.trail[i], from = this.trail[i + 1] || to;
      if (!to) return;
      const fx = this.anim ? from.x + (to.x - from.x) * k : to.x, fy = this.anim ? from.y + (to.y - from.y) * k : to.y;
      actors.push({ img: BM.Spr.character(c), x: fx * TS, y: fy * TS, flip: (to.x - from.x || to.face) < 0, dim: !c.alive });
    });
    TM.draw(ctx, cam, actors, this.t, !!run.bloodMoon);
    if (run.bloodMoon) {
      ctx.fillStyle = 'rgba(120,0,0,0.22)'; ctx.fillRect(0, 0, BM.W, BM.H);
      const g = ctx.createRadialGradient(BM.W / 2, BM.H / 2, 200, BM.W / 2, BM.H / 2, 560);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, BM.W, BM.H);
    } else {
      const g = ctx.createRadialGradient(BM.W / 2, BM.H / 2, 260, BM.W / 2, BM.H / 2, 620);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, BM.W, BM.H);
    }
  },
  draw(ctx) {
    const run = BM.S.run; if (!run) return;
    this.drawTown(ctx);
    BM.drawHud(ctx);
    // Trupp-Leiste unten links
    run.party.forEach((c, i) => {
      const x = 10 + i * 150, y = BM.H - 54, s = BM.stats(c);
      BM.UI.panel(ctx, x, y, 144, 46, { fill: 'rgba(10,7,6,0.82)', edge: c.alive ? BM.C.edge : '#3a1a1a' });
      BM.UI.text(ctx, c.name + '  ' + BM.t('p_lv') + ' ' + c.level, x + 10, y + 7, { size: 12, color: c.alive ? BM.C.ink : BM.C.mute, maxW: 124 });
      BM.UI.bar(ctx, x + 10, y + 24, 124, 7, c.hp / s.mhp, BM.C.hp);
      BM.UI.bar(ctx, x + 10, y + 33, 124, 5, c.mp / s.mmp, BM.C.mp);
    });
    if (!this.sub) {
      const hint = BM.t('t_walk_hint'), w = BM.UI.measure(ctx, hint, 13) + 24;
      BM.UI.panel(ctx, BM.W - w - 10, BM.H - 40, w, 32, { fill: 'rgba(10,7,6,0.75)', edge: BM.C.edge });
      BM.UI.text(ctx, hint, BM.W - w / 2 - 10, BM.H - 31, { size: 13, align: 'center', color: BM.C.dim });
    }
    if (this.sub) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 47, BM.W, BM.H - 47);
      BM.UI.panel(ctx, 340, 60, 600, 466);
      BM.UI.text(ctx, this.title, 360, 76, { size: 22, color: BM.C.gold2 });
      let y0 = 112;
      if (this.info) { const h = BM.UI.textBlock(ctx, this.info(), 360, 112, 560, { size: 15, color: BM.C.ink }); y0 = 112 + h + 8; }
      this.sub.o.y = Math.max(140, y0);
      this.sub.draw(ctx);
      const det = this.detail ? this.detail() : null;
      if (det) {
        ctx.fillStyle = 'rgba(184,149,90,0.35)'; ctx.fillRect(356, 384, 568, 1);
        if (typeof det === 'string') BM.UI.textBlock(ctx, det, 360, 394, 560, { size: 15, color: BM.C.dim });
        else BM.drawItemDetail(ctx, det, 360, 392, 560);
      }
    }
  },
};

// Kopfzeile: Rang, Münzen, Proviant, Tränke, Blutmond
BM.drawHud = (ctx, extra) => {
  const run = BM.S.run;
  ctx.fillStyle = 'rgba(10,7,6,0.82)'; ctx.fillRect(0, 0, BM.W, 46);
  ctx.fillStyle = BM.C.gold; ctx.fillRect(0, 46, BM.W, 1);
  const rc = BM.RANK_COLOR[run.rank];
  ctx.fillStyle = rc; ctx.fillRect(14, 9, 28, 28); ctx.fillStyle = '#120a08'; ctx.fillRect(16, 11, 24, 24);
  BM.UI.text(ctx, run.rank, 28, 14, { size: 16, align: 'center', color: rc, weight: '600' });
  BM.UI.text(ctx, run.party[0].name + ' · ' + BM.L(BM.RANK_METAL[run.rank]), 52, 14, { size: 16 });
  BM.UI.text(ctx, '◉ ' + BM.money(run.gold), 330, 14, { size: 16, color: BM.C.gold2 });
  BM.UI.text(ctx, '🍞 ' + run.rations, 520, 14, { size: 16 });
  BM.UI.text(ctx, '♥ ' + run.potions.hp + '  ✦ ' + run.potions.mp, 600, 14, { size: 16, color: '#e08a8a' });
  let next = null;
  for (const d of run.dungeons) if (!d.outbreak && (!next || d.timeLeft < next.timeLeft)) next = d;
  if (run.bloodMoon) {
    const pulse = 0.6 + Math.sin(performance.now() / 300) * 0.4;
    ctx.globalAlpha = pulse; BM.UI.text(ctx, '● ' + BM.t('bm_active'), BM.W - 14, 14, { size: 16, align: 'right', color: BM.C.blood, weight: '600' }); ctx.globalAlpha = 1;
  } else if (next) {
    const warn = next.timeLeft < 300;
    BM.UI.text(ctx, BM.t('b_timer') + ' ' + BM.Flow.timeStr(next.timeLeft), BM.W - 14, 14, { size: 16, align: 'right', color: warn ? BM.C.blood : BM.C.dim });
  }
};

BM.drawItemDetail = (ctx, it, x, y, w) => {
  BM.Spr.drawItemIcon(ctx, it, x, y, 48);
  BM.UI.text(ctx, BM.Loot.name(it), x + 60, y + 2, { size: 17, color: BM.RANK_COLOR[it.rank], maxW: w - 60 });
  let yy = y + 24;
  for (const l of BM.Loot.describe(it)) {
    const h = BM.UI.textBlock(ctx, l.t, x + 60, yy, w - 60, { size: 13, color: l.c, lh: 16 });
    yy += h;
  }
};

// ---------------- Trupp & Ausrüstung (Overlay, in Stadt und Dungeon) ----------------
BM.openParty = () => {
  const run = BM.S.run;
  const ov = { mi: 0, mode: 'slots', t: 0 };
  const SLOTS = ['weapon', 'armor', 'acc'];
  const close = () => BM.Overlays.pop(ov);
  ov.build = () => {
    const c = run.party[ov.mi];
    if (ov.mode === 'slots') {
      ov.menu = new BM.UI.Menu([
        ...SLOTS.map((k) => ({
          label: () => BM.t('p_' + k) + ': ' + (c.equip[k] ? BM.Loot.name(c.equip[k]) : BM.t('p_empty')),
          icon: c.equip[k] ? BM.Spr.item(c.equip[k].base, c.equip[k].rank) : null, it: c.equip[k], slot: k,
          onSelect: () => { ov.mode = 'pick'; ov.slot = k; ov.build(); },
        })),
        { label: () => BM.t('p_use_hp', { n: run.potions.hp }), disabled: () => run.potions.hp <= 0 || !c.alive, onSelect: () => { const s = BM.stats(c); c.hp = Math.min(s.mhp, c.hp + Math.round(s.mhp * 0.4 + 20)); run.potions.hp--; BM.Audio.sfx('heal'); } },
        { label: () => BM.t('p_use_mp', { n: run.potions.mp }), disabled: () => run.potions.mp <= 0 || !c.alive, onSelect: () => { const s = BM.stats(c); c.mp = Math.min(s.mmp, c.mp + Math.round(s.mmp * 0.3 + 10)); run.potions.mp--; BM.Audio.sfx('heal'); } },
        { label: () => BM.t('close'), onSelect: close },
      ], { x: 556, y: 84, w: 370, rowH: 34, size: 15, onCancel: close });
    } else {
      const k = ov.slot;
      const list = run.inventory.filter((it) => it.slot === k);
      const items = list.map((it) => ({
        label: () => BM.Loot.name(it), icon: BM.Spr.item(it.base, it.rank), it,
        onSelect: () => {
          run.inventory.splice(run.inventory.indexOf(it), 1);
          if (c.equip[k]) run.inventory.push(c.equip[k]);
          c.equip[k] = it;
          const s = BM.stats(c); c.hp = Math.min(c.hp, s.mhp); c.mp = Math.min(c.mp, s.mmp);
          ov.mode = 'slots'; ov.build();
        },
      }));
      if (c.equip[k]) items.unshift({ label: () => BM.t('p_unequip'), onSelect: () => { run.inventory.push(c.equip[k]); c.equip[k] = null; const s = BM.stats(c); c.hp = Math.min(c.hp, s.mhp); c.mp = Math.min(c.mp, s.mmp); ov.mode = 'slots'; ov.build(); } });
      items.push({ label: () => BM.t('back'), onSelect: () => { ov.mode = 'slots'; ov.build(); } });
      ov.menu = new BM.UI.Menu(items, { x: 556, y: 84, w: 370, rowH: 34, size: 15, maxRows: 6, onCancel: () => { ov.mode = 'slots'; ov.build(); } });
    }
  };
  ov.update = (dt) => {
    ov.t += dt;
    if (ov.mode === 'slots' && run.party.length > 1) {
      if (BM.Input.repeat('left')) { ov.mi = (ov.mi - 1 + run.party.length) % run.party.length; BM.Audio.sfx('select'); ov.build(); return; }
      if (BM.Input.repeat('right')) { ov.mi = (ov.mi + 1) % run.party.length; BM.Audio.sfx('select'); ov.build(); return; }
      for (const cl of BM.Input.clicks()) run.party.forEach((_, i) => { if (BM.UI.inRect(cl, { x: 40, y: 90 + i * 100, w: 150, h: 92 })) { ov.mi = i; ov.build(); } });
    }
    if (BM.Input.pressed('menu')) { close(); return; }
    ov.menu.update();
  };
  ov.draw = (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, BM.W, BM.H);
    BM.UI.panel(ctx, 24, 24, 912, 496);
    BM.UI.text(ctx, BM.t('p_title'), 44, 40, { size: 22, color: BM.C.gold2 });
    if (run.party.length > 1) BM.UI.text(ctx, '◀ ▶', 150, 44, { size: 14, color: BM.C.dim });
    run.party.forEach((c, i) => {
      const y = 90 + i * 100, sel = i === ov.mi;
      ctx.fillStyle = sel ? 'rgba(139,30,26,0.45)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(40, y, 150, 92);
      if (sel) { ctx.fillStyle = BM.C.gold; ctx.fillRect(40, y, 3, 92); }
      ctx.globalAlpha = c.alive ? 1 : 0.35; ctx.drawImage(BM.Spr.character(c), 46, y + 14, 64, 64); ctx.globalAlpha = 1;
      BM.UI.text(ctx, c.name, 114, y + 18, { size: 15, maxW: 74 });
      BM.UI.text(ctx, BM.t('p_lv') + ' ' + c.level, 114, y + 40, { size: 13, color: BM.C.dim });
    });
    const c = run.party[ov.mi], s = BM.stats(c);
    const bob = Math.round(Math.sin(ov.t * 2) * 2);
    ctx.drawImage(BM.Spr.character(c), 210, 70 + bob, 128, 128);
    BM.UI.text(ctx, c.name, 350, 80, { size: 22, color: BM.C.gold2 });
    BM.UI.text(ctx, BM.L(BM.RACES[c.race].name) + ' · ' + BM.L(BM.ROLES[c.role].name), 350, 108, { size: 14, color: BM.C.dim, maxW: 200 });
    BM.UI.text(ctx, BM.t('p_level') + ' ' + c.level, 350, 130, { size: 15 });
    BM.UI.bar(ctx, 350, 152, 190, 8, c.xp / BM.xpNext(c.level), BM.C.xp);
    BM.UI.text(ctx, BM.t('st_hp') + ' ' + Math.round(c.hp) + '/' + s.mhp, 214, 214, { size: 15 }); BM.UI.bar(ctx, 214, 236, 320, 10, c.hp / s.mhp, BM.C.hp);
    BM.UI.text(ctx, BM.t('st_mp') + ' ' + Math.round(c.mp) + '/' + s.mmp, 214, 254, { size: 15 }); BM.UI.bar(ctx, 214, 276, 320, 10, c.mp / s.mmp, BM.C.mp);
    const st = [['st_atk', s.atk], ['st_def', s.def], ['st_mag', s.mag], ['st_spd', s.spd], ['st_crit', Math.round(s.crit) + ' %']];
    st.forEach(([k, v], i) => BM.UI.text(ctx, BM.t(k) + ': ' + v, 214 + (i % 2) * 170, 300 + Math.floor(i / 2) * 24, { size: 15 }));
    BM.UI.text(ctx, BM.t('p_skills') + ': ' + BM.skillsOf(c).map((id) => BM.L(BM.SKILLS[id].name)).join(', '), 214, 376, { size: 13, color: '#8ab0ff', maxW: 330 });
    ov.menu.draw(ctx);
    const cur = ov.menu.current();
    if (cur && cur.it) BM.drawItemDetail(ctx, cur.it, 556, 326, 370);
    else if (ov.mode === 'pick' && ov.menu.items.length <= 2) BM.UI.text(ctx, BM.t('p_noitems'), 556, 330, { size: 15, color: BM.C.dim });
  };
  ov.build();
  BM.Overlays.push(ov);
};
