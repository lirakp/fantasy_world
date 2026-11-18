// Globaler Namensraum und seeded Zufall
window.BM = window.BM || {};

BM.RNG = function (seed) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),     // a..b inklusiv
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    range: (a, b) => a + next() * (b - a),
    shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
    weighted: (entries) => { // [[value, weight], ...]
      let total = 0; for (const e of entries) total += e[1];
      let r = next() * total;
      for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
      return entries[entries.length - 1][0];
    },
  };
};

BM.rand = BM.RNG((Date.now() ^ (Math.random() * 1e9)) >>> 0);
BM.newSeed = () => (Math.random() * 4294967295) >>> 0;
BM.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
