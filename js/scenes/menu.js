// Startmenü, Einstellungen, Steuerung, Beenden
BM.Scenes = BM.Scenes || {};

BM.Scenes.title = {
  enter() {
    this.t = 0;
    BM.Audio.ambience('menu');
    this.build();
  },
  build() {
    const has = BM.hasSave();
    this.menu = new BM.UI.Menu([
      { label: () => BM.t('m_continue'), disabled: () => !BM.hasSave(), onSelect: () => this.cont() },
      { label: () => BM.t('m_new'), onSelect: () => this.newGame() },
      { label: () => BM.t('m_settings'), onSelect: () => BM.go('settings', { back: () => BM.go('title'), fromTitle: true }) },
      { label: () => BM.t('m_codex'), onSelect: () => BM.msg(BM.t('controls_text'), { title: BM.t('m_codex') }) },
      { label: () => BM.t('m_quit'), onSelect: () => this.quit() },
    ], { x: BM.W / 2 - 150, y: 300, w: 300, rowH: 38, size: 22, align: 'center' });
    if (!has) this.menu.sel = 1;
  },
  cont() {
    if (!BM.loadGame()) return;
    const r = BM.S.run;
    if (r.inDungeon && r.dungeons.some((d) => d.id === r.inDungeon && d.state)) BM.go('explore');
    else { r.inDungeon = null; BM.go('town'); }
  },
  async newGame() {
    if (BM.hasSave() && !(await BM.confirmBox(BM.t('overwrite_confirm')))) return;
    BM.go('create');
  },
  async quit() {
    if (!(await BM.confirmBox(BM.t('quit_confirm')))) return;
    BM.Audio.stopAmbience();
    try { window.close(); } catch (e) {}
    BM.go('quit');
  },
  update(dt) { this.t += dt; this.menu.update(); },
  draw(ctx) {
    ctx.drawImage(BM.Spr.titleScene(), 0, 0, BM.W, BM.H);
    const a = 0.5 + Math.sin(this.t * 1.3) * 0.08;
    ctx.fillStyle = 'rgba(120,0,0,' + (a * 0.15) + ')'; ctx.fillRect(0, 0, BM.W, BM.H);
    BM.UI.text(ctx, BM.lang() === 'en' ? 'Codex of the Blood Moon' : 'Codex des Blutmondes', BM.W / 2, 110, { size: 72, font: 'goth', align: 'center', color: '#d8b070' });
    BM.UI.text(ctx, BM.t('title_sub'), BM.W / 2, 200, { size: 18, align: 'center', color: BM.C.dim });
    BM.UI.panel(ctx, BM.W / 2 - 170, 284, 340, 222, { fill: 'rgba(10,6,5,0.8)' });
    this.menu.draw(ctx);
    BM.UI.text(ctx, 'v0.1', BM.W - 12, BM.H - 22, { size: 12, align: 'right', color: BM.C.mute });
  },
};

BM.Scenes.quit = {
  enter() { this.t = 0; },
  update(dt) { this.t += dt; if (this.t > 1 && (BM.Input.pressed('confirm') || BM.Input.clicks().length)) BM.go('title'); },
  draw(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, BM.W, BM.H);
    BM.UI.text(ctx, BM.t('quit_done'), BM.W / 2, BM.H / 2 - 10, { size: 20, align: 'center', color: BM.C.dim });
  },
};

BM.Scenes.settings = {
  enter(p) {
    this.p = p || {};
    const S = BM.S.settings;
    const cyc = (arr, key, dir, after) => () => { const i = arr.indexOf(S[key]); S[key] = arr[(i + dir + arr.length) % arr.length]; BM.saveSettings(); if (after) after(); };
    const vol = (key, d) => () => { S[key] = Math.round(BM.clamp(S[key] + d, 0, 1) * 10) / 10; BM.saveSettings(); BM.Audio.applyVolume(); };
    const diffs = ['easy', 'normal', 'hard', 'nightmare'], touches = ['auto', 'on', 'off'];
    const toggleContent = async () => {
      if (S.content === 'u18') {
        if (!(await BM.confirmBox(BM.t('adult_confirm')))) return;
        S.content = 'adult';
      } else S.content = 'u18';
      BM.saveSettings(); BM.Spr.clear();
    };
    const items = [
      { label: () => BM.t('s_lang'), value: () => (S.lang === 'de' ? 'Deutsch' : 'English'), onLeft: cyc(['de', 'en'], 'lang', -1), onRight: cyc(['de', 'en'], 'lang', 1), onSelect: cyc(['de', 'en'], 'lang', 1) },
      { label: () => BM.t('s_diff'), value: () => BM.t('d_' + S.difficulty), onLeft: cyc(diffs, 'difficulty', -1), onRight: cyc(diffs, 'difficulty', 1), onSelect: cyc(diffs, 'difficulty', 1), hint: () => BM.t('d_' + S.difficulty + '_h') },
      { label: () => BM.t('s_content'), value: () => BM.t(S.content === 'adult' ? 'c_adult' : 'c_u18'), onLeft: toggleContent, onRight: toggleContent, onSelect: toggleContent },
      { label: () => BM.t('s_sfx'), value: () => Math.round(S.sfx * 100) + ' %', onLeft: vol('sfx', -0.1), onRight: vol('sfx', 0.1), onSelect: vol('sfx', 0.1) },
      { label: () => BM.t('s_music'), value: () => Math.round(S.music * 100) + ' %', onLeft: vol('music', -0.1), onRight: vol('music', 0.1), onSelect: vol('music', 0.1) },
      { label: () => BM.t('s_shake'), value: () => BM.t(S.shake ? 'on' : 'off'), onLeft: () => { S.shake = !S.shake; BM.saveSettings(); }, onRight: () => { S.shake = !S.shake; BM.saveSettings(); }, onSelect: () => { S.shake = !S.shake; BM.saveSettings(); } },
      { label: () => BM.t('s_touch'), value: () => BM.t(S.touch), onLeft: cyc(touches, 'touch', -1), onRight: cyc(touches, 'touch', 1), onSelect: cyc(touches, 'touch', 1) },
      { label: () => BM.t('s_full'), value: () => BM.t(document.fullscreenElement ? 'on' : 'off'), onSelect: () => {
        try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {}
      } },
    ];
    if (this.p.fromTitle) items.push({ label: () => BM.t('s_delete'), disabled: () => !BM.hasSave(), color: '#e07060', onSelect: async () => {
      if (await BM.confirmBox(BM.t('s_delete_confirm'))) { BM.deleteSave(); BM.toast(BM.t('s_deleted')); }
    } });
    items.push({ label: () => BM.t('back'), onSelect: () => this.back() });
    this.menu = new BM.UI.Menu(items, { x: BM.W / 2 - 300, y: 100, w: 600, rowH: 34, size: 20, onCancel: () => this.back() });
  },
  back() { BM.saveSettings(); (this.p.back || (() => BM.go('title')))(); },
  update() { this.menu.update(); },
  draw(ctx) {
    if (this.p.bg) this.p.bg(ctx); else ctx.drawImage(BM.Spr.titleScene(), 0, 0, BM.W, BM.H);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, BM.W, BM.H);
    BM.UI.panel(ctx, BM.W / 2 - 330, 30, 660, 490);
    BM.UI.text(ctx, BM.t('s_title'), BM.W / 2, 50, { size: 28, align: 'center', color: BM.C.gold2 });
    this.menu.draw(ctx);
    const it = this.menu.current();
    if (it && it.hint) BM.UI.textBlock(ctx, it.hint(), BM.W / 2 - 300, 462, 600, { size: 15, color: BM.C.dim });
  },
};
