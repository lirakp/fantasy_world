// Spieldaten: Ränge, Völker, Rollen, Fertigkeiten, Monster, Gefährten – plus Regeln für Charaktere und Spielstand
BM.RANKS = ['D', 'C', 'B', 'A', 'S', 'SS'];
BM.rankIdx = (r) => BM.RANKS.indexOf(r);
BM.RANK_MULT = [1, 1.7, 2.8, 4.5, 7, 11];
BM.RANK_METAL = {
  D: { de: 'Eisen', en: 'Iron' }, C: { de: 'Bronze', en: 'Bronze' }, B: { de: 'Silber', en: 'Silver' },
  A: { de: 'Gold', en: 'Gold' }, S: { de: 'Mithril', en: 'Mithril' }, SS: { de: 'Orichalcum', en: 'Orichalcum' },
};
BM.RANK_TITLE = {
  D: { de: 'Frischfleisch', en: 'Fresh Meat', de_soft: 'Frischling', en_soft: 'Rookie' },
  C: { de: 'Veteran', en: 'Veteran' }, B: { de: 'Klinge der Krone', en: 'Blade of the Crown' },
  A: { de: 'Meister', en: 'Master' }, S: { de: 'Lebende Katastrophe', en: 'Living Catastrophe' }, SS: { de: 'Lebende Katastrophe', en: 'Living Catastrophe' },
};
// Anforderungen für den Aufstieg AUF den jeweiligen Rang
BM.RANK_REQ = {
  C: { lv: 4, cleared: 1, fee: 50 },
  B: { lv: 8, cleared: 2, fee: 500 },
  A: { lv: 13, cleared: 3, fee: 3000 },
  S: { lv: 19, cleared: 3, fee: 20000 },
  SS: { lv: 26, cleared: 3, fee: 100000 },
};

BM.RACES = {
  human: {
    name: { de: 'Mensch', en: 'Human' }, mana: 'C',
    desc: { de: 'Schwächstes Mana, aber die herrschende Klasse. Ausgewogen; erhält mehr Münzen.', en: 'Weakest mana, yet the ruling class. Balanced; earns more coin.' },
    mult: { hp: 1, mp: 0.8, atk: 1.05, def: 1.05, mag: 0.85, spd: 1 }, crit: 0, goldBonus: 0.15,
    skins: ['#e8b896', '#c98e6b', '#8d5a3b', '#f1cfb0'], ears: 'human',
  },
  dwarf: {
    name: { de: 'Zwerg', en: 'Dwarf' }, mana: 'B',
    desc: { de: 'Dichte Manakanäle für Runen und Erdbarrieren. Zäh und schwer zu fällen.', en: 'Dense mana channels for runes and earth wards. Tough and hard to fell.' },
    mult: { hp: 1.25, mp: 0.9, atk: 1.05, def: 1.25, mag: 0.9, spd: 0.85 }, crit: 0, goldBonus: 0,
    skins: ['#e0a98a', '#c08460', '#a06a4a'], ears: 'human', beard: true, short: true,
  },
  beast: {
    name: { de: 'Tiermensch', en: 'Beastkin' }, mana: 'B',
    desc: { de: 'Instinktive Körperverstärkung, scharfe Sinne und großes Tempo.', en: 'Instinctive body reinforcement, keen senses and great speed.' },
    mult: { hp: 1.05, mp: 0.85, atk: 1.15, def: 0.95, mag: 0.8, spd: 1.2 }, crit: 4, goldBonus: 0,
    skins: ['#d9a77c', '#b98455', '#8a6a4a'], ears: 'beast', tail: true,
  },
  elf: {
    name: { de: 'Elf', en: 'Elf' }, mana: 'S',
    desc: { de: 'Naturgewalten und Hochmagie ohne Hilfsmittel. Zerbrechlicher Körper.', en: 'Forces of nature and high magic without aid. Fragile body.' },
    mult: { hp: 0.85, mp: 1.4, atk: 0.9, def: 0.9, mag: 1.3, spd: 1.05 }, crit: 2, goldBonus: 0,
    skins: ['#f3dcc4', '#e8c8a8'], ears: 'elf',
  },
  darkelf: {
    name: { de: 'Dunkelelf', en: 'Dark Elf' }, mana: 'S',
    desc: { de: 'Flüche und Schattenmagie. Hohe kritische Trefferchance.', en: 'Curses and shadow magic. High critical chance.' },
    mult: { hp: 0.9, mp: 1.3, atk: 0.95, def: 0.9, mag: 1.25, spd: 1.08 }, crit: 7, goldBonus: 0,
    skins: ['#6f6a8a', '#5a5470', '#80789a'], ears: 'elf',
  },
  half: {
    name: { de: 'Halbwesen', en: 'Half-blood' }, mana: 'C + B/S',
    desc: { de: 'Zwei getrennte Manaflüsse. Kann zugleich schützen und heilen.', en: 'Two separate mana flows. Can shield and heal at once.' },
    mult: { hp: 1, mp: 1.15, atk: 1, def: 1, mag: 1.1, spd: 1 }, crit: 2, goldBonus: 0,
    skins: ['#e0b090', '#c99a78', '#b28066'], ears: 'elf',
  },
};
BM.RACE_IDS = Object.keys(BM.RACES);

BM.ROLES = {
  bulwark: {
    name: { de: 'Bollwerk', en: 'Bulwark' },
    desc: { de: 'Frontkämpfer mit Turmschild. Zieht Angriffe auf sich und hält die Gänge.', en: 'Front fighter with tower shield. Draws attacks and holds the corridors.' },
    base: { hp: 62, mp: 12, atk: 9, def: 9, mag: 2, spd: 5 }, grow: { hp: 13, mp: 2, atk: 2.1, def: 2.6, mag: 0.4, spd: 0.55 },
    skills: ['taunt', 'shieldbash', 'fortress'], weapon: 'mace', armor: 'plate', color: '#7a8088',
  },
  spear: {
    name: { de: 'Speerkämpfer', en: 'Spear Fighter' },
    desc: { de: 'Mittellinie. Sticht über den Schild hinweg und kontrolliert den Raum.', en: 'Middle line. Strikes over the shield and controls the space.' },
    base: { hp: 46, mp: 14, atk: 11, def: 6, mag: 3, spd: 8 }, grow: { hp: 9.5, mp: 2.2, atk: 2.7, def: 1.6, mag: 0.6, spd: 1 },
    skills: ['pierce', 'sweep', 'skewer'], weapon: 'spear', armor: 'leather', color: '#8a4a3a',
  },
  cleric: {
    name: { de: 'Kleriker', en: 'Cleric' },
    desc: { de: 'Seelenhüter. Heilt, schützt den Geist und erstickt Schreie mit Stille.', en: 'Soul warden. Heals, guards the mind and smothers screams with silence.' },
    base: { hp: 38, mp: 32, atk: 5, def: 5, mag: 10, spd: 6 }, grow: { hp: 7, mp: 5, atk: 1.2, def: 1.4, mag: 2.4, spd: 0.8 },
    skills: ['heal', 'smite', 'bless'], weapon: 'staff', armor: 'robe', color: '#d8d0b8',
  },
  scout: {
    name: { de: 'Pfadfinder', en: 'Scout' },
    desc: { de: 'Fallenbrecher. Entdeckt Fallen und trifft mit der Armbrust präzise.', en: 'Trap breaker. Spots traps and strikes precisely with the crossbow.' },
    base: { hp: 36, mp: 16, atk: 10, def: 4, mag: 4, spd: 11 }, grow: { hp: 7, mp: 2.5, atk: 2.5, def: 1.2, mag: 0.8, spd: 1.3 },
    skills: ['aimshot', 'poisonbolt', 'volley'], weapon: 'crossbow', armor: 'leather', color: '#4a6a3a',
  },
  arcanist: {
    name: { de: 'Arkaner Geschützmeister', en: 'Arcane Gunner' },
    desc: { de: 'Nachhut. Flächenvernichtung durch Magie, aber zerbrechlich.', en: 'Rearguard. Area destruction through magic, but fragile.' },
    base: { hp: 30, mp: 36, atk: 4, def: 3, mag: 13, spd: 7 }, grow: { hp: 6, mp: 5.5, atk: 1, def: 1, mag: 3, spd: 0.9 },
    skills: ['arcbolt', 'firestorm', 'frost'], weapon: 'staff', armor: 'robe', color: '#4a3a8a',
  },
};
BM.ROLE_IDS = Object.keys(BM.ROLES);

// target: enemy | enemies | ally | allies | self
BM.SKILLS = {
  taunt: { name: { de: 'Provokation', en: 'Provoke' }, mp: 4, target: 'self', kind: 'buff', fx: 'taunt',
    desc: { de: 'Zieht 2 Runden alle Angriffe auf sich, Abwehr +50 %.', en: 'Draws all attacks for 2 rounds, defense +50%.' } },
  shieldbash: { name: { de: 'Schildstoß', en: 'Shield Bash' }, mp: 5, target: 'enemy', kind: 'phys', power: 1.1, stun: 0.35,
    desc: { de: 'Schaden, 35 % Chance zu betäuben.', en: 'Damage, 35% chance to stun.' } },
  fortress: { name: { de: 'Festung', en: 'Fortress' }, mp: 10, target: 'allies', kind: 'buff', fx: 'guard', lv: 6,
    desc: { de: 'Ganzer Trupp: Abwehr +40 % für 3 Runden.', en: 'Whole party: defense +40% for 3 rounds.' } },
  pierce: { name: { de: 'Durchbohren', en: 'Pierce' }, mp: 5, target: 'enemy', kind: 'phys', power: 1.5, pen: 0.5,
    desc: { de: 'Starker Stich, ignoriert halbe Abwehr.', en: 'Strong thrust, ignores half of defense.' } },
  sweep: { name: { de: 'Hellebardenschwung', en: 'Halberd Sweep' }, mp: 9, target: 'enemies', kind: 'phys', power: 0.75,
    desc: { de: 'Trifft alle Gegner.', en: 'Hits all enemies.' } },
  skewer: { name: { de: 'Aufspießen', en: 'Skewer' }, mp: 12, target: 'enemy', kind: 'phys', power: 2.4, lv: 6,
    desc: { de: 'Verheerender Stoß gegen ein Ziel.', en: 'Devastating thrust against one target.' } },
  heal: { name: { de: 'Heilung', en: 'Heal' }, mp: 6, target: 'ally', kind: 'heal', power: 1.7,
    desc: { de: 'Heilt einen Verbündeten stark.', en: 'Strongly heals one ally.' } },
  smite: { name: { de: 'Bannstrahl', en: 'Smite' }, mp: 5, target: 'enemy', kind: 'mag', power: 1.3, holy: true,
    desc: { de: 'Heiliger Schaden, doppelt gegen Untote und Schemen.', en: 'Holy damage, double against undead and wraiths.' } },
  bless: { name: { de: 'Segen', en: 'Blessing' }, mp: 13, target: 'allies', kind: 'heal', power: 0.85, lv: 6,
    desc: { de: 'Heilt den ganzen Trupp.', en: 'Heals the whole party.' } },
  aimshot: { name: { de: 'Gezielter Schuss', en: 'Aimed Shot' }, mp: 4, target: 'enemy', kind: 'phys', power: 1.3, crit: 40,
    desc: { de: 'Präziser Schuss, +40 % Krit.', en: 'Precise shot, +40% crit.' } },
  poisonbolt: { name: { de: 'Giftbolzen', en: 'Poison Bolt' }, mp: 6, target: 'enemy', kind: 'phys', power: 0.8, poison: 3,
    desc: { de: 'Vergiftet das Ziel für 3 Runden.', en: 'Poisons the target for 3 rounds.' } },
  volley: { name: { de: 'Bolzenhagel', en: 'Bolt Volley' }, mp: 11, target: 'enemies', kind: 'phys', power: 0.9, lv: 6,
    desc: { de: 'Trifft alle Gegner.', en: 'Hits all enemies.' } },
  arcbolt: { name: { de: 'Arkanpfeil', en: 'Arcane Bolt' }, mp: 5, target: 'enemy', kind: 'mag', power: 1.6,
    desc: { de: 'Starker Magieschaden.', en: 'Strong magic damage.' } },
  firestorm: { name: { de: 'Feuersturm', en: 'Firestorm' }, mp: 12, target: 'enemies', kind: 'mag', power: 1.0, burn: 2,
    desc: { de: 'Magieschaden gegen alle, setzt in Brand.', en: 'Magic damage to all, sets ablaze.' } },
  frost: { name: { de: 'Frostlanze', en: 'Frost Lance' }, mp: 14, target: 'enemy', kind: 'mag', power: 2.3, slow: 2, lv: 6,
    desc: { de: 'Gewaltiger Frostschaden, verlangsamt.', en: 'Massive frost damage, slows.' } },
};

// Monster. types: Gewicht je Dungeon-Art. ab: Fähigkeit
BM.MONSTERS = {
  rat: { name: { de: 'Kanalratte', en: 'Sewer Rat' }, hp: 18, atk: 6, def: 2, mag: 0, spd: 9, xp: 6, gold: 3, types: { physical: 5, blood: 2 } },
  slime: { name: { de: 'Grubenschleim', en: 'Pit Slime' }, hp: 26, atk: 5, def: 5, mag: 0, spd: 4, xp: 7, gold: 3, ab: 'poison', types: { physical: 4, thorn: 1 } },
  bat: { name: { de: 'Höhlenflatterer', en: 'Cave Flutter' }, hp: 14, atk: 6, def: 1, mag: 0, spd: 13, xp: 6, gold: 2, ab: 'drain', types: { physical: 3, blood: 3 } },
  skeleton: { name: { de: 'Skelettwächter', en: 'Skeleton Guard' }, hp: 30, atk: 8, def: 5, mag: 0, spd: 6, xp: 10, gold: 5, undead: true, types: { physical: 4, memory: 1 } },
  spider: { name: { de: 'Höhlenspinne', en: 'Cave Spider' }, hp: 22, atk: 7, def: 3, mag: 0, spd: 10, xp: 9, gold: 4, ab: 'poison', types: { physical: 3, thorn: 3 } },
  ghoul: { name: { de: 'Ghul', en: 'Ghoul' }, hp: 40, atk: 10, def: 4, mag: 0, spd: 5, xp: 13, gold: 6, ab: 'drain', undead: true, types: { physical: 2, blood: 4 }, minRank: 1 },
  thornling: { name: { de: 'Dornling', en: 'Thornling' }, hp: 24, atk: 8, def: 6, mag: 0, spd: 7, xp: 10, gold: 5, ab: 'thorns', types: { thorn: 6 } },
  thornbeast: { name: { de: 'Dornenbestie', en: 'Thorn Beast' }, hp: 50, atk: 12, def: 7, mag: 0, spd: 6, xp: 18, gold: 8, ab: 'thorns', types: { thorn: 3 }, minRank: 1 },
  hound: { name: { de: 'Bluthund', en: 'Blood Hound' }, hp: 34, atk: 11, def: 3, mag: 0, spd: 12, xp: 14, gold: 6, ab: 'bleed', types: { blood: 5 } },
  cultist: { name: { de: 'Blutkultist', en: 'Blood Cultist' }, hp: 30, atk: 6, def: 3, mag: 12, spd: 8, xp: 15, gold: 9, ab: 'magic', types: { blood: 3, physical: 1 } },
  wraith: { name: { de: 'Erinnerungsschemen', en: 'Memory Wraith' }, hp: 32, atk: 5, def: 2, mag: 12, spd: 9, xp: 15, gold: 6, ab: 'magic', undead: true, types: { memory: 6 } },
  echo: { name: { de: 'Zeit-Echo', en: 'Time Echo' }, hp: 40, atk: 10, def: 6, mag: 6, spd: 8, xp: 16, gold: 7, ab: 'stun', types: { memory: 4 } },
  knight: { name: { de: 'Hohler Ritter', en: 'Hollow Knight' }, hp: 62, atk: 13, def: 10, mag: 0, spd: 5, xp: 24, gold: 12, undead: true, types: { physical: 2, memory: 1 }, minRank: 2 },
  // Bosse
  golem: { name: { de: 'Grubenkoloss', en: 'Pit Colossus' }, hp: 230, atk: 15, def: 10, mag: 0, spd: 5, xp: 120, gold: 60, ab: 'quake', boss: true },
  thornmother: { name: { de: 'Dornenmutter', en: 'Thorn Mother' }, hp: 210, atk: 14, def: 9, mag: 8, spd: 7, xp: 130, gold: 80, ab: 'thorns', boss: true },
  bloodlord: { name: { de: 'Blutfürst', en: 'Blood Lord' }, hp: 220, atk: 13, def: 7, mag: 15, spd: 9, xp: 140, gold: 80, ab: 'drain', boss: true },
  forgotten: { name: { de: 'Wächter des Vergessens', en: 'Warden of Oblivion' }, hp: 200, atk: 10, def: 8, mag: 16, spd: 8, xp: 150, gold: 90, ab: 'magic', undead: true, boss: true },
};
BM.BOSS_FOR = { physical: 'golem', thorn: 'thornmother', blood: 'bloodlord', memory: 'forgotten' };

// Mögliche Gefährten über Anwerbe-Aufträge
BM.RECRUITS = [
  { id: 'holt', name: 'Holt', race: 'human', role: 'bulwark',
    pitch: { de: 'Holt, ein Bollwerk mit zerbeultem Turmschild, sucht einen Trupp, nachdem seiner im Dungeon blieb.', en: 'Holt, a bulwark with a dented tower shield, seeks a party after his own stayed in a dungeon.' } },
  { id: 'saya', name: 'Saya', race: 'beast', role: 'spear',
    pitch: { de: 'Saya, eine freigekaufte Tiermensch-Speerkämpferin, will beweisen, dass sie mehr ist als Fallenfutter.', en: 'Saya, a beastkin spear fighter who bought her freedom, wants to prove she is more than trap fodder.' } },
  { id: 'ilian', name: 'Ilian', race: 'half', role: 'cleric',
    pitch: { de: 'Bruder Ilian, ein Halbwesen im Dienst der Kirche, darf sich einem Trupp anschließen – wenn dieser sich bewährt.', en: 'Brother Ilian, a half-blood in the church\'s service, may join a party – if it proves itself.' } },
  { id: 'wren', name: 'Wren', race: 'human', role: 'scout',
    pitch: { de: 'Wren, eine Pfadfinderin mit flinken Fingern, bricht Fallen lieber als Knochen.', en: 'Wren, a scout with quick fingers, would rather break traps than bones.' } },
  { id: 'ysera', name: 'Ysera', race: 'elf', role: 'arcanist',
    pitch: { de: 'Ysera, eine Elfe, die ihre Ketten hinter sich ließ, bietet ihre Magie einem Trupp an, der ihr vertraut.', en: 'Ysera, an elf who left her chains behind, offers her magic to a party that trusts her.' } },
  { id: 'brann', name: 'Brann', race: 'dwarf', role: 'bulwark',
    pitch: { de: 'Brann, ein Zwerg mit Runenschild, sucht Erze in Dungeons – und Gesellschaft.', en: 'Brann, a dwarf with a rune shield, seeks ore in dungeons – and company.' } },
  { id: 'nyx', name: 'Nyx', race: 'darkelf', role: 'scout',
    pitch: { de: 'Nyx, eine Dunkelelfe, kennt jede Falle, weil sie einst selbst welche baute.', en: 'Nyx, a dark elf, knows every trap because she once built them.' } },
];

BM.DUNGEON_PLACES = [
  { de: 'Kanalgewölbe', en: 'Sewer Vault' }, { de: 'Aschenmine', en: 'Ash Mine' }, { de: 'Krähenkrypta', en: 'Crow Crypt' },
  { de: 'Versunkene Kapelle', en: 'Sunken Chapel' }, { de: 'Wurzelhöhle', en: 'Root Cave' }, { de: 'Eisengrube', en: 'Iron Pit' },
  { de: 'Mühlenkeller', en: 'Mill Cellar' }, { de: 'Galgenhügel', en: 'Gallows Hill' }, { de: 'Nebelschacht', en: 'Mist Shaft' },
  { de: 'Alte Zisterne', en: 'Old Cistern' }, { de: 'Schwarzer Turm', en: 'Black Tower' }, { de: 'Weidenschlucht', en: 'Willow Gorge' },
  { de: 'Knochenstollen', en: 'Bone Tunnels' }, { de: 'Salzgrotte', en: 'Salt Grotto' }, { de: 'Totenmoor', en: 'Dead Moor' },
];
BM.DUNGEON_SUFFIX = [
  { de: 'von Varn', en: 'of Varn' }, { de: 'am Grauen Fluss', en: 'by the Grey River' }, { de: 'von Ulmhain', en: 'of Elmgrove' },
  { de: 'unter Aschenfurt', en: 'beneath Ashford' }, { de: 'der Witwe', en: 'of the Widow' }, { de: 'am Rabenpass', en: 'at Raven Pass' },
  { de: 'von Kessel', en: 'of Kessel' }, { de: 'im Dornwald', en: 'in the Thornwood' },
];
BM.dungeonName = (d) => BM.L(BM.DUNGEON_PLACES[d.place]) + ' ' + BM.L(BM.DUNGEON_SUFFIX[d.suffix]);

BM.RUMORS = [
  { de: '„Ein Dungeon, der wie Rang D aussieht, hat letzte Woche einen ganzen Silbertrupp gefressen. Die Gilde sagt, es war Pech.“', en: '"A dungeon that looked like rank D swallowed a whole silver party last week. The guild says it was bad luck."' },
  { de: '„Wer eine Sündenklinge trägt und den Tribut selbst zahlt, lockt den Wolf an. Sagt man.“', en: '"Whoever carries a sin blade and pays the tribute himself lures the wolf. So they say."' },
  { de: '„Die Kirche dämpft Flüche für Gold. Wohin die Flüche gehen? Frag lieber nicht.“', en: '"The church dampens curses for gold. Where do the curses go? Better not ask."' },
  { de: '„In Dorn-Dungeons alle zwanzig Schritte eine Falle. Nimm einen Pfadfinder mit, oder einen Dummen an einer langen Kette.“', en: '"In thorn dungeons, a trap every twenty steps. Take a scout, or a fool on a long chain."' },
  { de: '„Solange ein Trupp lebend drin ist, steht die Frist still. Stirbt er, läuft sie weiter. Darum schickt die Gilde manchmal Fristhalter.“', en: '"As long as a party is alive inside, the deadline stands still. If it dies, it runs on. That is why the guild sometimes sends deadline keepers."' },
  { de: '„In Erinnerungsschleifen: niemals schreien. Wer schreit, wird Teil der Szene.“', en: '"In memory loops: never scream. Whoever screams becomes part of the scene."' },
  { de: '„Die Blut-Schatten altern seit 150 Jahren nicht. Niemand weiß warum. Niemand erinnert sich.“', en: '"The Blood Shadows have not aged in 150 years. Nobody knows why. Nobody remembers."' },
  { de: '„Das Konsortium nimmt zwei von hundert Teilen bei jedem Wechsel. Selbst der Tod ist bei denen gebührenpflichtig.“', en: '"The Consortium takes two parts in a hundred on every exchange. Even death carries a fee with them."' },
];

// ---------- Charaktere ----------
BM.makeChar = (o) => {
  const race = BM.RACES[o.race], rng = BM.RNG(o.seed || BM.newSeed());
  const c = {
    id: o.id || ('c' + BM.newSeed()), name: o.name, race: o.race, role: o.role, level: o.level || 1, xp: 0,
    equip: { weapon: null, armor: null, acc: null }, isPlayer: !!o.isPlayer, alive: true,
    look: o.look || {
      skin: rng.pick(race.skins),
      hair: rng.pick(['#2a1c14', '#5a3a22', '#a8703a', '#d8c08a', '#e8e8e0', '#1a1a2a', '#8a2a1a']),
      hairStyle: rng.int(0, 3),
      eye: rng.pick(['#3a6ab0', '#4a8a3a', '#6a4a2a', '#a03030', '#b08a20']),
    },
  };
  const s = BM.stats(c); c.hp = s.mhp; c.mp = s.mmp;
  return c;
};

BM.stats = (c) => {
  const role = BM.ROLES[c.role], race = BM.RACES[c.race], L = c.level - 1;
  const g = (k) => (role.base[k] + role.grow[k] * L) * race.mult[k];
  const s = { mhp: g('hp'), mmp: g('mp'), atk: g('atk'), def: g('def'), mag: g('mag'), spd: g('spd'), crit: 5 + race.crit, fx: {}, curses: [] };
  for (const slot of ['weapon', 'armor', 'acc']) {
    const it = c.equip[slot];
    if (!it) continue;
    const pw = it.damped ? 0.87 : 1;
    for (const k of ['atk', 'def', 'mag', 'spd', 'mhp', 'mmp', 'crit']) if (it.stats[k]) s[k] += it.stats[k] * pw;
    if (it.identified) for (const e of it.effects) s.fx[e.id] = (s.fx[e.id] || 0) + e.v;
    const cu = BM.Loot.curseOf(it); if (cu && !s.curses.includes(cu)) s.curses.push(cu);
  }
  if (s.fx.vigor) s.mhp *= 1 + s.fx.vigor / 100;
  if (s.curses.includes('frailty')) s.mhp *= 0.75;
  if (s.curses.includes('misfortune')) s.crit -= 10;
  if (s.fx.haste) s.spd *= 1 + s.fx.haste / 100;
  if (s.fx.keen) s.crit += s.fx.keen;
  for (const k of ['mhp', 'mmp', 'atk', 'def', 'mag', 'spd']) s[k] = Math.max(1, Math.round(s[k]));
  return s;
};

BM.xpNext = (lv) => Math.floor(16 * Math.pow(lv, 1.65));

BM.gainXP = (c, n) => {
  let ups = 0;
  c.xp += n;
  while (c.xp >= BM.xpNext(c.level) && c.level < 60) {
    c.xp -= BM.xpNext(c.level); c.level++; ups++;
  }
  if (ups) { const s = BM.stats(c); c.hp = s.mhp; c.mp = s.mmp; }
  return ups;
};

BM.skillsOf = (c) => BM.ROLES[c.role].skills.filter((id) => (BM.SKILLS[id].lv || 1) <= c.level);

// ---------- Spielstand ----------
BM.newRun = (p) => {
  const run = {
    version: 1, seed: BM.newSeed(), nextId: 1,
    party: [], inventory: [], gold: 40, rations: 6, potions: { hp: 3, mp: 1 },
    rank: 'D', cleared: { D: 0, C: 0, B: 0, A: 0, S: 0, SS: 0 },
    dungeons: [], quests: [], recruited: [], bloodMoon: null,
    inDungeon: null, stats: { kills: 0, steps: 0, dungeons: 0 }, playTime: 0,
  };
  const hero = BM.makeChar({ name: p.name, race: p.race, role: p.role, isPlayer: true, look: p.look });
  run.party.push(hero);
  BM.S.run = run;
  BM.giveStarterGear(hero);
  for (let i = 0; i < 5; i++) run.dungeons.push(BM.makeDungeonEntry(run));
  BM.refreshQuests(run);
  return run;
};

BM.giveStarterGear = (c) => {
  const role = BM.ROLES[c.role], rng = BM.RNG(BM.newSeed());
  c.equip.weapon = BM.Loot.make({ base: role.weapon, rank: 'D', rng, plain: true });
  c.equip.armor = BM.Loot.make({ base: role.armor, rank: 'D', rng, plain: true });
  const s = BM.stats(c); c.hp = s.mhp; c.mp = s.mmp;
};

BM.uid = () => { const r = BM.S.run; return r.nextId++; };

// Neuer Eintrag am Dungeon-Aushang
BM.makeDungeonEntry = (run) => {
  const rng = BM.RNG(BM.newSeed());
  const pr = BM.rankIdx(run.rank);
  let type = rng.weighted([['physical', 64], ['thorn', 16], ['blood', 10], ['memory', 10]]);
  let real = BM.clamp(pr + rng.weighted([[-1, 20], [0, 50], [1, 25], [2, 5]]), 0, 5);
  let apparent = real;
  if (type === 'memory') { real = rng.weighted([[3, 60], [4, 30], [5, 10]]); apparent = rng.int(0, 1); }
  if (run.bloodMoon && type === 'physical') type = 'blood';
  return {
    id: BM.uid(), seed: rng.int(1, 2147483646), type, realRank: BM.RANKS[real], apparentRank: BM.RANKS[apparent],
    place: rng.int(0, BM.DUNGEON_PLACES.length - 1), suffix: rng.int(0, BM.DUNGEON_SUFFIX.length - 1),
    timeLeft: 3600, floors: type === 'memory' ? 2 : (real <= 1 ? 1 : real <= 3 ? 2 : 3),
    revealed: false, state: null, outbreak: false,
  };
};

// Aufträge der Gilde neu würfeln (angenommene bleiben)
BM.refreshQuests = (run) => {
  run.quests = run.quests.filter((q) => q.accepted && !q.claimed && (q.done || q.kind === 'hunt' || run.dungeons.some((d) => d.id === q.dungeonId)));
  const rng = BM.RNG(BM.newSeed());
  const pr = BM.rankIdx(run.rank);
  const open = run.dungeons.filter((d) => !run.quests.some((q) => q.dungeonId === d.id) && BM.rankIdx(d.apparentRank) <= pr + 1);
  // Anwerbung
  const roles = run.party.map((c) => c.role);
  const avail = BM.RECRUITS.filter((r) => !run.recruited.includes(r.id) && !roles.includes(r.role) && !run.quests.some((q) => q.recruit === r.id));
  if (avail.length && open.length && run.party.length < 4) {
    const r = rng.pick(avail), d = open.splice(rng.int(0, open.length - 1), 1)[0];
    run.quests.push({ id: BM.uid(), kind: 'recruit', recruit: r.id, dungeonId: d.id, reward: Math.round(20 * BM.RANK_MULT[BM.rankIdx(d.apparentRank)]), accepted: false, done: false, claimed: false });
  }
  while (open.length && run.quests.filter((q) => q.kind === 'clear' && !q.claimed).length < 2) {
    const d = open.splice(rng.int(0, open.length - 1), 1)[0];
    const ri = BM.rankIdx(d.apparentRank);
    run.quests.push({ id: BM.uid(), kind: 'clear', dungeonId: d.id, reward: Math.round(rng.int(50, 90) * Math.pow(BM.RANK_MULT[ri], 2)), accepted: false, done: false, claimed: false });
  }
  if (!run.quests.some((q) => q.kind === 'hunt' && !q.claimed)) {
    const n = rng.int(6, 12);
    run.quests.push({ id: BM.uid(), kind: 'hunt', target: n, progress: 0, reward: Math.round(n * 5 * Math.pow(BM.RANK_MULT[pr], 2)), accepted: false, done: false, claimed: false });
  }
};
