// Loot-Generator: Standardbild je Grundtyp, Werte, Effekte und Tribute werden je nach Rang ausgewürfelt
BM.Loot = (function () {
  // g = Genus (für deutsche Adjektivendungen)
  const BASES = {
    sword: { slot: 'weapon', g: 'n', name: { de: 'Schwert', en: 'Sword' }, atk: 1.0 },
    dagger: { slot: 'weapon', g: 'm', name: { de: 'Dolch', en: 'Dagger' }, atk: 0.72, spd: 2, crit: 6 },
    axe: { slot: 'weapon', g: 'f', name: { de: 'Axt', en: 'Axe' }, atk: 1.28, spd: -1 },
    mace: { slot: 'weapon', g: 'm', name: { de: 'Streitkolben', en: 'Mace' }, atk: 1.08, def: 1 },
    spear: { slot: 'weapon', g: 'm', name: { de: 'Speer', en: 'Spear' }, atk: 1.15 },
    staff: { slot: 'weapon', g: 'm', name: { de: 'Stab', en: 'Staff' }, atk: 0.35, mag: 1.05, mmp: 3 },
    crossbow: { slot: 'weapon', g: 'f', name: { de: 'Armbrust', en: 'Crossbow' }, atk: 1.05, crit: 3 },
    plate: { slot: 'armor', g: 'm', name: { de: 'Plattenpanzer', en: 'Plate Armor' }, def: 1.3, spd: -1, mhp: 2 },
    leather: { slot: 'armor', g: 'n', name: { de: 'Lederwams', en: 'Leather Jerkin' }, def: 0.8, spd: 1 },
    robe: { slot: 'armor', g: 'f', name: { de: 'Robe', en: 'Robe' }, def: 0.5, mag: 0.45, mmp: 4 },
    amulet: { slot: 'acc', g: 'n', name: { de: 'Amulett', en: 'Amulet' }, mag: 0.4, mmp: 3 },
    ring: { slot: 'acc', g: 'm', name: { de: 'Ring', en: 'Ring' } },
  };
  const BASE_IDS = Object.keys(BASES);
  const POWER = [3, 6, 10, 16, 25, 38];

  const PREFIX = [ // [Tier, de-Stamm, en]
    [0, 'Rostig', 'Rusty'], [0, 'Grob', 'Crude'], [0, 'Schlicht', 'Plain'], [0, 'Abgenutzt', 'Worn'],
    [1, 'Solid', 'Sturdy'], [1, 'Geschärft', 'Honed'], [1, 'Gehärtet', 'Hardened'], [1, 'Gezackt', 'Jagged'],
    [2, 'Runenbeschlagen', 'Rune-bound'], [2, 'Meisterhaft', 'Masterwork'], [2, 'Schwarz', 'Black'], [2, 'Zwergisch', 'Dwarven'],
    [3, 'Uralt', 'Ancient'], [3, 'Mondsilbern', 'Moonsilver'], [3, 'Geisterhaft', 'Ghostly'], [3, 'Blutgetränkt', 'Blood-soaked', 'Dunkelrot', 'Crimson'],
    [4, 'Sternengeschmiedet', 'Starforged'], [4, 'Verdammt', 'Damned'], [4, 'Gottlos', 'Godless'],
  ];
  const SUFFIX = [
    { de: 'der Asche', en: 'of Ash' }, { de: 'des Mondes', en: 'of the Moon' }, { de: 'der Krypta', en: 'of the Crypt' },
    { de: 'der Dornen', en: 'of Thorns' }, { de: 'des Vergessens', en: 'of Oblivion' }, { de: 'der Ewigkeit', en: 'of Eternity' },
    { de: 'des Gefallenen', en: 'of the Fallen' }, { de: 'der Tiefe', en: 'of the Depths' }, { de: 'des Raben', en: 'of the Raven' },
  ];

  const EFFECTS = {
    keen: { base: 3, name: { de: '+{v} % Krit.', en: '+{v}% crit' } },
    lifesteal: { base: 4, name: { de: '{v} % Lebensraub', en: '{v}% life steal', de_soft: '{v} % Lebensentzug', en_soft: '{v}% life drain' }, slot: ['weapon'] },
    burn: { base: 8, name: { de: '{v} % Chance auf Brand', en: '{v}% chance to burn' }, slot: ['weapon'] },
    poison: { base: 8, name: { de: '{v} % Chance auf Gift', en: '{v}% chance to poison' }, slot: ['weapon'] },
    thorns: { base: 6, name: { de: '{v} % Schaden zurückwerfen', en: 'Reflect {v}% damage' }, slot: ['armor', 'acc'] },
    regen: { base: 2, name: { de: '+{v} LP pro Runde', en: '+{v} HP per round' }, slot: ['armor', 'acc'] },
    manaflow: { base: 1, name: { de: '+{v} MP pro Runde', en: '+{v} MP per round' }, slot: ['armor', 'acc', 'weapon'] },
    vigor: { base: 5, name: { de: '+{v} % max. LP', en: '+{v}% max HP' }, slot: ['armor', 'acc'] },
    haste: { base: 4, name: { de: '+{v} % Tempo', en: '+{v}% speed' } },
    trapward: { base: 12, name: { de: '−{v} % Fallenschaden', en: '−{v}% trap damage' }, slot: ['armor', 'acc'] },
    fortune: { base: 6, name: { de: '+{v} % Münzen', en: '+{v}% coin' }, slot: ['acc', 'weapon'] },
    holy: { base: 10, name: { de: '+{v} % Schaden gegen Untote', en: '+{v}% damage vs. undead' }, slot: ['weapon'] },
  };
  const EFFECT_IDS = Object.keys(EFFECTS);

  const TRIBUTES = {
    blood: { name: { de: 'Blut: {v} % max. LP je Angriff', en: 'Blood: {v}% max HP per attack', de_soft: 'Lebenskraft: {v} % max. LP je Angriff', en_soft: 'Life force: {v}% max HP per attack' } },
    heat: { name: { de: 'Körperwärme: −{v} % Tempo je Einsatz (Kampf)', en: 'Body heat: −{v}% speed per use (battle)' } },
    stamina: { name: { de: 'Ausdauer: −{v} % Abwehr je Einsatz (Kampf)', en: 'Stamina: −{v}% defense per use (battle)' } },
    mana: { name: { de: 'Mana: {v} MP je Einsatz, sonst LP', en: 'Mana: {v} MP per use, else HP' } },
  };
  const SINS = {
    wrath: { name: { de: 'Zorn', en: 'Wrath' }, desc: { de: '+30 % Schaden, kann nicht verteidigen, 12 % Chance einen Verbündeten zu treffen', en: '+30% damage, cannot defend, 12% chance to hit an ally' } },
    lust: { name: { de: 'Wollust', en: 'Lust', de_soft: 'Verlangen', en_soft: 'Craving' }, desc: { de: 'Jeder Angriff saugt 3 MP von allen Verbündeten ab und heilt den Träger', en: 'Every attack drains 3 MP from all allies and heals the bearer' } },
    pride: { name: { de: 'Hochmut', en: 'Pride' }, desc: { de: '+20 % Krit., aber Heilung durch andere wirkt nur halb', en: '+20% crit, but healing from others is halved' } },
    greed: { name: { de: 'Habgier', en: 'Greed' }, desc: { de: '+50 % Münzen, aber jeder Kampf kostet 3 % deiner Münzen', en: '+50% coin, but each battle costs 3% of your coin' } },
    gluttony: { name: { de: 'Völlerei', en: 'Gluttony' }, desc: { de: 'Heilt 15 % LP bei jedem Sieg über einen Gegner, verbraucht nach jedem Kampf 1 Proviant', en: 'Heals 15% HP on each kill, consumes 1 ration after each battle' } },
    envy: { name: { de: 'Neid', en: 'Envy' }, desc: { de: 'Stiehlt bei jedem Angriff 4 % LP vom gesündesten Verbündeten', en: 'Steals 4% HP from the healthiest ally on each attack' } },
    sloth: { name: { de: 'Trägheit', en: 'Sloth' }, desc: { de: '+40 % Schaden, aber 20 % Chance die Runde zu verschlafen', en: '+40% damage, but 20% chance to sleep through the turn' } },
  };
  const SIN_IDS = Object.keys(SINS);

  // Sekundärflüche der Vorbesitzer (Schwarzmarkt-Ware). Die Kirche bricht sie für 10–30 Gold.
  const CURSES = {
    madness: { name: { de: 'Wahnsinn', en: 'Madness' }, desc: { de: '15 % Chance, im Kampf einen Verbündeten anzugreifen', en: '15% chance to attack an ally in battle' } },
    misfortune: { name: { de: 'Pech', en: 'Misfortune' }, desc: { de: '−10 % Krit., Gegner treffen kritischer, −25 % Münzen', en: '−10% crit, enemies crit more often, −25% coin' } },
    frailty: { name: { de: 'Siechtum', en: 'Frailty' }, desc: { de: '−25 % max. LP', en: '−25% max HP' } },
    bloodlust: { name: { de: 'Blutdurst', en: 'Bloodthirst', de_soft: 'Rastlosigkeit', en_soft: 'Restlessness' }, desc: { de: 'Verliert jede Kampfrunde 3 % max. LP', en: 'Loses 3% max HP every battle round' } },
  };
  const CURSE_IDS = Object.keys(CURSES);

  function make(o) {
    const rng = o.rng || BM.RNG(BM.newSeed());
    const base = o.base || rng.pick(BASE_IDS), B = BASES[base], rank = o.rank || 'D', ri = BM.rankIdx(rank);
    const pw = POWER[ri] * rng.range(0.88, 1.15) * (o.quality || 1);
    const st = {};
    if (B.atk) st.atk = Math.max(1, Math.round(pw * B.atk));
    if (B.def) st.def = Math.max(1, Math.round(pw * 0.7 * B.def));
    if (B.mag) st.mag = Math.max(1, Math.round(pw * B.mag));
    if (B.spd) st.spd = B.spd * (1 + Math.floor(ri / 2));
    if (B.crit) st.crit = B.crit;
    if (B.mhp) st.mhp = Math.round(B.mhp * pw);
    if (B.mmp) st.mmp = Math.round(B.mmp * (1 + ri));
    if (base === 'ring') { const k = rng.pick(['atk', 'def', 'mag', 'spd']); st[k] = Math.max(1, Math.round(pw * (k === 'spd' ? 0.3 : 0.5))); }
    const it = {
      uid: 'i' + BM.newSeed(), base, slot: B.slot, rank, stats: st, effects: [], tribute: null, sin: null,
      identified: true, damped: false, pre: -1, suf: -1, value: 0,
    };
    if (!o.plain) {
      const n = [rng.int(0, 1), 1, rng.int(1, 2), 2, rng.int(2, 3), rng.int(3, 4)][ri];
      const pool = EFFECT_IDS.filter((id) => !EFFECTS[id].slot || EFFECTS[id].slot.includes(B.slot));
      rng.shuffle(pool);
      for (let i = 0; i < n && i < pool.length; i++) {
        const E = EFFECTS[pool[i]];
        it.effects.push({ id: pool[i], v: Math.max(1, Math.round(E.base * (1 + ri * 0.45) * rng.range(0.75, 1.25))) });
      }
      if (ri >= 3 && B.slot !== 'acc') {
        if (ri >= 4 && B.slot === 'weapon') it.sin = rng.pick(SIN_IDS);
        const kinds = B.slot === 'armor' ? ['heat', 'stamina'] : ['blood', 'heat', 'stamina', 'mana'];
        const kind = rng.pick(kinds);
        const amt = { blood: rng.int(3, 6), heat: rng.int(5, 9), stamina: rng.int(4, 8), mana: rng.int(3, 7) }[kind] + (ri - 3) * 2;
        it.tribute = { kind, v: amt };
      }
      if (o.sleeping !== false && ri >= 1) it.identified = false;
      const tiers = PREFIX.map((p, i) => [i, p[0]]).filter(([, t]) => t >= Math.max(0, ri - 1) && t <= ri);
      it.pre = rng.pick(tiers)[0];
      if (ri >= 2 || rng.chance(0.4)) it.suf = rng.int(0, SUFFIX.length - 1);
    } else {
      const tiers = PREFIX.map((p, i) => [i, p[0]]).filter(([, t]) => t === Math.min(ri, 2));
      it.pre = rng.pick(tiers)[0];
    }
    it.value = Math.round([6, 25, 120, 1200, 9000, 40000][ri] * rng.range(0.85, 1.15) * (1 + it.effects.length * 0.15));
    return it;
  }

  function name(it) {
    const B = BASES[it.base], en = BM.lang() === 'en';
    let s = BM.L(B.name);
    if (it.pre >= 0) {
      const p = PREFIX[it.pre];
      let stem = en ? p[2] : p[1];
      if (!BM.gore() && p[3]) stem = en ? p[4] : p[3];
      if (en) s = stem + ' ' + s;
      else s = stem + ({ m: 'er', f: 'e', n: 'es' }[B.g]) + ' ' + s;
    }
    if (it.sin && it.identified) s += ' ' + (en ? 'of ' : (['wrath', 'pride', 'envy'].includes(it.sin) ? 'des ' : 'der ')) + sinName(it.sin, true);
    else if (it.suf >= 0) s += ' ' + BM.L(SUFFIX[it.suf]);
    return s;
  }

  function sinName(id, genitive) {
    let n = BM.L(SINS[id].name);
    if (genitive && BM.lang() === 'de') n = { Zorn: 'Zorns', Hochmut: 'Hochmuts', Neid: 'Neides' }[n] || n;
    return n;
  }

  // Beschreibungszeilen: [{t, c}]
  function describe(it) {
    const out = [];
    const C = BM.C;
    out.push({ t: BM.t('item_rank') + ' ' + it.rank + ' · ' + BM.L(BASES[it.base].name), c: BM.RANK_COLOR[it.rank] });
    const sk = { atk: 'st_atk', def: 'st_def', mag: 'st_mag', spd: 'st_spd', mhp: 'st_hp', mmp: 'st_mp', crit: 'st_crit' };
    const parts = [];
    for (const k of Object.keys(sk)) if (it.stats[k]) { const v = Math.round(it.stats[k] * (it.damped ? 0.87 : 1)); parts.push((v > 0 ? '+' : '') + v + ' ' + BM.t(sk[k])); }
    if (parts.length) out.push({ t: parts.join('  '), c: C.ink });
    if (!it.identified) { out.push({ t: BM.t('item_sleeping'), c: '#a0b0ff' }); }
    else {
      for (const e of it.effects) out.push({ t: '◆ ' + BM.L(EFFECTS[e.id].name).replace('{v}', e.v), c: C.green });
      if (it.tribute) out.push({ t: BM.t('item_tribute') + ' – ' + BM.L(TRIBUTES[it.tribute.kind].name).replace('{v}', it.tribute.v) + (it.damped ? ' (' + BM.t('item_damped') + ')' : ''), c: it.damped ? C.dim : '#e07060' });
      if (it.sin) out.push({ t: BM.t('item_sin') + ' – ' + sinName(it.sin) + ': ' + BM.L(SINS[it.sin].desc) + (it.damped ? ' (' + BM.t('item_damped') + ')' : ''), c: it.damped ? C.dim : '#ff5040' });
      if (it.black && it.curseHidden) out.push({ t: BM.t('item_curse_risk'), c: '#c080ff' });
      else if (it.curse) out.push({ t: BM.t('item_curse') + ' – ' + BM.L(CURSES[it.curse].name) + ': ' + BM.L(CURSES[it.curse].desc), c: '#c080ff' });
    }
    out.push({ t: BM.t('item_value') + ': ' + BM.money(it.value), c: C.dim });
    return out;
  }

  // Effektive Tribut-Stärke (gedämpft = 25 %)
  function tributeOf(it) { if (!it || !it.identified || !it.tribute) return null; return { kind: it.tribute.kind, v: it.damped ? Math.max(1, Math.round(it.tribute.v * 0.25)) : it.tribute.v }; }
  function sinOf(it) { if (!it || !it.identified || !it.sin || it.damped) return null; return it.sin; }

  function activationCost(it) { return [0, 20, 100, 500, 2000, 5000][BM.rankIdx(it.rank)]; }
  function dampCost(it) { const ri = BM.rankIdx(it.rank); if (ri < 3) return 0; if (ri === 3) return 5000 + Math.round(it.value * 3); return ri === 4 ? 50000 : 120000; }

  // Zufällige Beute aus einem Dungeon
  function drop(dRank, dtype, rng, bonus) {
    const ri = BM.rankIdx(dRank);
    let r = BM.clamp(ri + rng.weighted([[-1, 28], [0, 60], [1, 12 + (bonus || 0)]]), 0, 5);
    if (dtype === 'thorn' && rng.chance(0.25)) r = Math.min(5, r + 1);
    if (dtype === 'memory' && rng.chance(0.3)) r = Math.min(5, r + 1);
    return make({ rank: BM.RANKS[r], rng });
  }

  function shopStock(rank, seed) {
    const rng = BM.RNG(seed), max = Math.min(BM.rankIdx(rank), 2), out = [];
    for (let i = 0; i < 6; i++) out.push(make({ rank: BM.RANKS[rng.int(Math.max(0, max - 1), max)], rng, plain: true }));
    for (const it of out) it.value = Math.round(it.value * 1.8);
    return out;
  }

  // Die Rostige Münze: ungeklärte A–SS-Ware aus Leichenplünderung, illegal geweckt, zu 90 % verflucht
  function blackStock(rank, seed) {
    const rng = BM.RNG(seed ^ 0x9e3779b9), pr = BM.rankIdx(rank), out = [];
    for (let i = 0; i < 4; i++) {
      const r = BM.clamp(3 + rng.weighted([[0, 60], [1, 30], [2, 10]]) + (pr >= 4 ? 1 : 0), 3, 5);
      const it = make({ rank: BM.RANKS[r], rng });
      it.identified = true; it.black = true; it.curseHidden = true;
      it.curse = rng.chance(0.9) ? rng.pick(CURSE_IDS) : null;
      it.price = Math.round(it.value * 0.45);
      out.push(it);
    }
    return out;
  }
  function curseOf(it) { return it && it.curse && !it.curseHidden ? it.curse : null; }
  function uncurseCost(it) { return [1000, 1000, 1000, 1000, 2000, 3000][BM.rankIdx(it.rank)]; }

  return { BASES, EFFECTS, TRIBUTES, SINS, CURSES, make, name, describe, tributeOf, sinOf, curseOf, activationCost, dampCost, uncurseCost, drop, shopStock, blackStock, sinName };
})();
