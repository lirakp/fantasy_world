// Pixel-Painter: zeichnet Sprites Pixel für Pixel in einen Puffer
BM.Color = {
  parse(hex) {
    if (hex[0] !== '#') return [0, 0, 0, 255];
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    const n = parseInt(hex.slice(1, 7), 16);
    const a = hex.length >= 9 ? parseInt(hex.slice(7, 9), 16) : 255;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  },
  hex(r, g, b) { return '#' + [r, g, b].map((v) => BM.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); },
  shade(hex, f) { // f>0 heller, f<0 dunkler
    const [r, g, b] = this.parse(hex);
    if (f >= 0) return this.hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
    return this.hex(r * (1 + f), g * (1 + f), b * (1 + f));
  },
  mix(a, b, t) { const A = this.parse(a), B = this.parse(b); return this.hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); },
};

BM.Painter = class {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, col, alpha) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return;
    const c = BM.Color.parse(col), i = (y * this.w + x) * 4;
    const a = (alpha !== undefined ? alpha : c[3] / 255);
    if (a >= 1) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; return; }
    const da = this.d[i + 3] / 255, oa = a + da * (1 - a);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) this.d[i + k] = (c[k] * a + this.d[i + k] * da * (1 - a)) / oa;
    this.d[i + 3] = oa * 255;
  }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  rgb(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  rect(x, y, w, h, col, a) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col, a); }
  hline(x1, x2, y, col) { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) this.set(x, y, col); }
  vline(x, y1, y2, col) { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) this.set(x, y, col); }
  line(x0, y0, x1, y1, col, a) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, col, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  ellipse(cx, cy, rx, ry, col, a) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, col, a);
      }
  }
  circle(cx, cy, r, col, a) { this.ellipse(cx, cy, r, r, col, a); }
  ring(cx, cy, r, col, a) {
    for (let t = 0; t < 360; t += 2) { const rad = t * Math.PI / 180; this.set(Math.round(cx + Math.cos(rad) * r - 0.5), Math.round(cy + Math.sin(rad) * r - 0.5), col, a); }
  }
  poly(pts, col, a) { // gefülltes Polygon
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5)) xs.push(x1 + (y + 0.5 - y1) / (y2 - y1) * (x2 - x1));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k < xs.length - 1; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, col, a);
    }
  }
  // Rauschen in vorhandene Pixel einstreuen
  noise(rng, amount, x0, y0, w, h) {
    x0 = x0 || 0; y0 = y0 || 0; w = w || this.w; h = h || this.h;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (!this.get(x, y)) continue;
      const i = (y * this.w + x) * 4, f = (rng.next() - 0.5) * amount;
      for (let k = 0; k < 3; k++) this.d[i + k] = this.d[i + k] + f * 255;
    }
  }
  // Umriss um alle undurchsichtigen Pixel
  outline(col) {
    const src = new Uint8ClampedArray(this.d);
    const op = (x, y) => (x >= 0 && y >= 0 && x < this.w && y < this.h) ? src[(y * this.w + x) * 4 + 3] > 40 : false;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (op(x, y)) continue;
      if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) this.set(x, y, col);
    }
  }
  // Licht von oben links: Ränder unten/rechts abdunkeln
  shadeEdges(f) {
    const src = new Uint8ClampedArray(this.d);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4;
      if (src[i + 3] < 40) continue;
      const below = y + 1 < this.h ? src[((y + 1) * this.w + x) * 4 + 3] : 0;
      const right = x + 1 < this.w ? src[(y * this.w + x + 1) * 4 + 3] : 0;
      if (below < 40 || right < 40) for (let k = 0; k < 3; k++) this.d[i + k] = src[i + k] * (1 - f);
    }
  }
  canvas() {
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    const ctx = c.getContext('2d'); const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.d); ctx.putImageData(img, 0, 0);
    return c;
  }
};
