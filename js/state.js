// Einstellungen und Spielstand (localStorage, immer abgesichert)
BM.S = {
  settings: { lang: 'de', difficulty: 'normal', content: 'u18', sfx: 0.6, music: 0.5, amb: 0.5, shake: true, touch: 'auto' },
  run: null,
};

BM.store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

BM.SAVE_KEY = 'blutmond_save_v1';
BM.SETTINGS_KEY = 'blutmond_settings_v1';

BM.loadSettings = () => {
  const s = BM.store.get(BM.SETTINGS_KEY);
  if (s) Object.assign(BM.S.settings, s);
  if (!s && navigator.language && !navigator.language.startsWith('de')) BM.S.settings.lang = 'en';
};
BM.saveSettings = () => BM.store.set(BM.SETTINGS_KEY, BM.S.settings);

BM.hasSave = () => !!BM.store.get(BM.SAVE_KEY);
BM.saveGame = (silent) => {
  if (!BM.S.run) return false;
  const ok = BM.store.set(BM.SAVE_KEY, BM.S.run);
  if (ok && !silent) BM.toast(BM.t('autosave'), BM.C.dim);
  return ok;
};
BM.loadGame = () => { const r = BM.store.get(BM.SAVE_KEY); if (r) BM.S.run = r; return !!r; };
BM.deleteSave = () => BM.store.del(BM.SAVE_KEY);

BM.DIFF = {
  easy: { enemy: 0.75, gold: 1.2, permadeath: false, goldLoss: 0, lootLoss: false },
  normal: { enemy: 1.0, gold: 1.0, permadeath: false, goldLoss: 0.15, lootLoss: false },
  hard: { enemy: 1.3, gold: 0.9, permadeath: false, goldLoss: 0.3, lootLoss: true },
  nightmare: { enemy: 1.6, gold: 0.8, permadeath: true, goldLoss: 1, lootLoss: true },
};
BM.diff = () => BM.DIFF[BM.S.settings.difficulty] || BM.DIFF.normal;

// Münzen werden intern in Silber gezählt. 100 Silber = 1 Gold, 100 Gold = 1 Platin
BM.money = (silver) => {
  silver = Math.max(0, Math.floor(silver));
  const p = Math.floor(silver / 10000), g = Math.floor((silver % 10000) / 100), s = silver % 100;
  const en = BM.lang() === 'en';
  const parts = [];
  if (p) parts.push(p + (en ? ' Pt' : ' Pl'));
  if (g) parts.push(g + ' G');
  if (s || !parts.length) parts.push(s + ' S');
  return parts.join(' ');
};
