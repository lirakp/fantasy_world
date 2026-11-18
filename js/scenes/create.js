// Charaktererstellung: Name, Volk, Rolle, Aussehen
BM.Scenes.create = {
  NAMES: ['Aldric', 'Mira', 'Kael', 'Liora', 'Torben', 'Isra', 'Garrik', 'Selene', 'Rurik', 'Thea', 'Varek', 'Elin', 'Corvin', 'Nessa'],
  HAIR: ['#2a1c14', '#5a3a22', '#a8703a', '#d8c08a', '#e8e8e0', '#1a1a2a', '#8a2a1a', '#4a5a6a'],
  EYES: ['#3a6ab0', '#4a8a3a', '#6a4a2a', '#a03030', '#b08a20', '#8a5ab0'],
  enter() {
    this.t = 0;
    const r = BM.rand;
    this.c = { name: r.pick(this.NAMES), race: 'human', role: 'spear', skin: 0, hair: r.int(0, 7), style: r.int(0, 3), eye: r.int(0, 5) };
    const c = this.c, cyc = (key, n, d) => () => { c[key] = (c[key] + d + n()) % n(); };
    const cycList = (key, list, d) => () => { const i = list.indexOf(c[key]); c[key] = list[(i + d + list.length) % list.length]; if (key === 'race') c.skin = 0; };
    this.menu = new BM.UI.Menu([
      { label: () => BM.t('cr_name'), value: () => c.name, onLeft: () => { c.name = r.pick(this.NAMES); }, onRight: () => { c.name = r.pick(this.NAMES); }, onSelect: () => this.askName() },
      { label: () => BM.t('cr_race'), value: () => BM.L(BM.RACES[c.race].name), onLeft: cycList('race', BM.RACE_IDS, -1), onRight: cycList('race', BM.RACE_IDS, 1), onSelect: cycList('race', BM.RACE_IDS, 1) },
      { label: () => BM.t('cr_role'), value: () => BM.L(BM.ROLES[c.role].name), onLeft: cycList('role', BM.ROLE_IDS, -1), onRight: cycList('role', BM.ROLE_IDS, 1), onSelect: cycList('role', BM.ROLE_IDS, 1) },
      { label: () => BM.t('cr_skin'), value: () => (c.skin + 1) + '/' + BM.RACES[c.race].skins.length, onLeft: cyc('skin', () => BM.RACES[c.race].skins.length, -1), onRight: cyc('skin', () => BM.RACES[c.race].skins.length, 1), onSelect: cyc('skin', () => BM.RACES[c.race].skins.length, 1) },
      { label: () => BM.t('cr_hair'), value: () => (c.hair + 1) + '/' + this.HAIR.length, onLeft: cyc('hair', () => this.HAIR.length, -1), onRight: cyc('hair', () => this.HAIR.length, 1), onSelect: cyc('hair', () => this.HAIR.length, 1) },
      { label: () => BM.t('cr_style'), value: () => (c.style + 1) + '/4', onLeft: cyc('style', () => 4, -1), onRight: cyc('style', () => 4, 1), onSelect: cyc('style', () => 4, 1) },
      { label: () => BM.t('cr_eyes'), value: () => (c.eye + 1) + '/' + this.EYES.length, onLeft: cyc('eye', () => this.EYES.length, -1), onRight: cyc('eye', () => this.EYES.length, 1), onSelect: cyc('eye', () => this.EYES.length, 1) },
      { label: () => BM.t('cr_start'), color: BM.C.gold2, onSelect: () => this.start() },
      { label: () => BM.t('back'), onSelect: () => BM.go('title') },
    ], { x: 500, y: 110, w: 420, rowH: 36, size: 20, onCancel: () => BM.go('title') });
  },
  askName() {
    let n = null;
    try { n = window.prompt(BM.t('cr_enter_name'), this.c.name); } catch (e) { n = null; }
    if (n && n.trim()) this.c.name = n.trim().slice(0, 16);
    BM.Input.consumeAll();
  },
  look() {
    const c = this.c;
    return { skin: BM.RACES[c.race].skins[c.skin], hair: this.HAIR[c.hair], hairStyle: c.style, eye: this.EYES[c.eye] };
  },
  preview() {
    const c = this.c, role = BM.ROLES[c.role];
    const key = JSON.stringify([c.race, c.role, this.look()]);
    if (this._pk !== key) {
      this._pk = key;
      const rng = BM.RNG(7);
      this._pc = { race: c.race, role: c.role, look: this.look(), equip: {
        weapon: BM.Loot.make({ base: role.weapon, rank: 'D', rng, plain: true }),
        armor: BM.Loot.make({ base: role.armor, rank: 'D', rng, plain: true }), acc: null } };
    }
    return this._pc;
  },
  async start() {
    const c = this.c;
    BM.newRun({ name: c.name, race: c.race, role: c.role, look: this.look() });
    BM.saveGame(true);
    BM.go('town');
    await BM.msg(BM.t('cr_intro'), { title: BM.t('t_town') });
  },
  update(dt) { this.t += dt; this.menu.update(); },
  draw(ctx) {
    ctx.drawImage(BM.Spr.titleScene(), 0, 0, BM.W, BM.H);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, BM.W, BM.H);
    BM.UI.text(ctx, BM.t('cr_title'), BM.W / 2, 24, { size: 30, align: 'center', color: BM.C.gold2 });
    // Vorschau
    BM.UI.panel(ctx, 30, 80, 440, 440);
    ctx.fillStyle = 'rgba(139,30,26,0.18)'; ctx.beginPath(); ctx.ellipse(250, 330, 110, 22, 0, 0, Math.PI * 2); ctx.fill();
    const bob = Math.round(Math.sin(this.t * 2) * 3);
    ctx.drawImage(BM.Spr.character(this.preview()), 138, 100 + bob, 224, 224);
    const race = BM.RACES[this.c.race], role = BM.ROLES[this.c.role];
    BM.UI.text(ctx, BM.L(race.name) + ' · ' + BM.L(role.name), 250, 350, { size: 20, align: 'center', color: BM.C.gold2 });
    BM.UI.text(ctx, BM.t('cr_mana') + ': ' + race.mana, 250, 376, { size: 15, align: 'center', color: '#8ab0ff' });
    BM.UI.textBlock(ctx, BM.L(race.desc), 54, 404, 392, { size: 14, color: BM.C.ink });
    BM.UI.textBlock(ctx, BM.L(role.desc), 54, 450, 392, { size: 14, color: BM.C.dim });
    BM.UI.panel(ctx, 490, 80, 440, 440);
    this.menu.draw(ctx);
    // Werte-Vorschau
    const s = BM.stats({ race: this.c.race, role: this.c.role, level: 1, equip: { weapon: null, armor: null, acc: null } });
    const parts = [[BM.t('st_hp'), s.mhp], [BM.t('st_mp'), s.mmp], [BM.t('st_atk'), s.atk], [BM.t('st_def'), s.def], [BM.t('st_mag'), s.mag], [BM.t('st_spd'), s.spd]];
    parts.forEach(([k, v], i) => BM.UI.text(ctx, k + ' ' + v, 516 + (i % 3) * 136, 450 + Math.floor(i / 3) * 24, { size: 15, color: BM.C.dim }));
  },
};
