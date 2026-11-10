'use strict';
// 基礎工具與水彩筆觸。所有隨機都有種子：任何一格都能單獨、以任何順序重繪。
const W = 1920, H = 1080;          // 畫面
const WW = 2560, WH = 1440;        // 每個場景的世界座標
const S0 = W / WW;
const INK = '#3A2418';             // 鉛筆線的深褐色

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const seg01 = (u, a, b) => clamp((u - a) / (b - a));       // u 在 [a,b] 內的進度
const sm01 = (u, a, b) => ease(seg01(u, a, b));
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgba(h, a) { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function mixc(a, b, t) { const A = rgb(a), B = rgb(b); return '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); }
const dark = (c, f = .4) => mixc(c, '#24150B', f);
const light = (c, f = .4) => mixc(c, '#FFF6E0', f);

// ---------- 紙紋與顆粒
const TEX = {};
function noiseCanvas(w, h, cell, seed, lo, hi) {
  const gw = Math.ceil(w / cell) + 3, gh = Math.ceil(h / cell) + 3;
  const c = mk(gw, gh), x = c.getContext('2d'), d = x.createImageData(gw, gh), r = mulberry(seed);
  for (let i = 0; i < gw * gh; i++) { const v = lerp(lo, hi, r()) * 255 | 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
  x.putImageData(d, 0, 0);
  const o = mk(w, h), ox = o.getContext('2d');
  ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
  ox.drawImage(c, 0, 0, gw, gh, -cell, -cell, gw * cell, gh * cell);
  return o;
}
function buildTextures() {
  const p = mk(W, H), x = p.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'multiply';
  x.drawImage(noiseCanvas(W, H, 260, 11, .86, 1), 0, 0);
  x.drawImage(noiseCanvas(W, H, 36, 12, .93, 1), 0, 0);
  x.drawImage(noiseCanvas(W, H, 3, 13, .91, 1), 0, 0);
  x.fillStyle = '#F6ECD8'; x.fillRect(0, 0, W, H);
  TEX.paper = p;
  const g = mk(512, 512), gx = g.getContext('2d');
  gx.fillStyle = '#fff'; gx.fillRect(0, 0, 512, 512);
  gx.globalCompositeOperation = 'multiply';
  gx.drawImage(noiseCanvas(512, 512, 2, 21, .64, 1), 0, 0);
  gx.drawImage(noiseCanvas(512, 512, 34, 22, .78, 1), 0, 0);
  TEX.gran = g;
  const v = mk(W, H), vx = v.getContext('2d');
  const gr = vx.createRadialGradient(W / 2, H / 2, H * .42, W / 2, H / 2, H * 1.08);
  gr.addColorStop(0, 'rgba(50,30,20,0)'); gr.addColorStop(1, 'rgba(50,30,20,.46)');
  vx.fillStyle = gr; vx.fillRect(0, 0, W, H);
  TEX.vig = v;
}

// ---------- 路徑
const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function ell(cx, cy, rx, ry, n = 16, a0 = 0, a1 = Math.PI * 2) {
  const o = []; const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6; const m = full ? n : n + 1;
  for (let i = 0; i < m; i++) { const a = a0 + (a1 - a0) * (i / n); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return o;
}
// 把直線邊細分並抖動，畫出手繪的不穩線條
function seg(pts, close, step, j, rng) {
  const out = [], n = pts.length, m = close ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const k = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let s = 0; s < k; s++) { const t = s / k; out.push([lerp(a[0], b[0], t) + (rng() - .5) * 2 * j, lerp(a[1], b[1], t) + (rng() - .5) * 2 * j]); }
  }
  if (!close) out.push(pts[n - 1].slice());
  return out;
}
function trace(x, pts, close, smooth) {
  const n = pts.length;
  x.beginPath();
  if (smooth && n > 2) {
    if (close) {
      x.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; x.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      x.closePath();
    } else {
      x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) { const a = pts[i], b = pts[i + 1]; x.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      x.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  } else {
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) x.lineTo(pts[i][0], pts[i][1]);
    if (close) x.closePath();
  }
}
function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; }

// ---------- 水彩色塊：平塗 + 顆粒沉澱 + 邊緣積色 + 鉛筆輪廓
// o: a 透明度, g 垂直漸層的下方顏色, gran 顆粒, edge 邊緣積色, ew 積色寬, pen 鉛筆線, pw 線寬, smooth, fast(每格重畫的人物用)
function wash(x, pts, col, o = {}) {
  const sm = !!o.smooth;
  x.save();
  trace(x, pts, true, sm);
  let fs = col;
  if (o.g) { const b = bbox(pts); const g = x.createLinearGradient(0, b[1], 0, b[3]); g.addColorStop(0, col); g.addColorStop(1, o.g); fs = g; }
  x.globalAlpha = o.a ?? 0.95; x.fillStyle = fs; x.fill();
  const e = o.edge ?? 0.28;
  if (!o.fast) {
    x.save(); x.clip();
    const b = bbox(pts);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = o.gran ?? 0.42;
    x.fillStyle = x.createPattern(TEX.gran, 'repeat');
    x.fillRect(b[0] - 4, b[1] - 4, b[2] - b[0] + 8, b[3] - b[1] + 8);
    x.globalCompositeOperation = 'source-over';
    if (e > 0) { x.globalAlpha = e; x.strokeStyle = dark(col, .5); x.lineWidth = (o.ew ?? 7) * 2; x.filter = 'blur(2.5px)'; trace(x, pts, true, sm); x.stroke(); x.filter = 'none'; }
    x.restore();
  } else if (e > 0) {
    x.save(); x.clip(); x.globalAlpha = e; x.strokeStyle = dark(col, .5); x.lineWidth = (o.ew ?? 4) * 2; trace(x, pts, true, sm); x.stroke(); x.restore();
  }
  const pa = o.pen ?? 0.7;
  if (pa > 0) { x.globalAlpha = pa; x.strokeStyle = o.pc || INK; x.lineWidth = o.pw ?? 1.6; x.lineJoin = 'round'; trace(x, pts, true, sm); x.stroke(); }
  x.restore();
}
function pen(x, pts, o = {}) {
  x.save(); x.globalAlpha = o.a ?? .7; x.strokeStyle = o.c || INK; x.lineWidth = o.w ?? 1.6; x.lineCap = 'round'; x.lineJoin = 'round';
  trace(x, pts, !!o.close, !!o.smooth); x.stroke(); x.restore();
}
function hatch(x, bx, by, bw, bh, n, ang, len, rng, o = {}) {
  x.save(); x.globalAlpha = o.a ?? .32; x.strokeStyle = o.c || INK; x.lineWidth = o.w ?? 1.2; x.lineCap = 'round';
  x.beginPath(); const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let i = 0; i < n; i++) { const px = bx + rng() * bw, py = by + rng() * bh, l = len * (.6 + rng() * .8); x.moveTo(px, py); x.lineTo(px + dx * l, py + dy * l); }
  x.stroke(); x.restore();
}
function radial(x, cx, cy, r, col, a) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [s, k] of [[0, 1], [.15, .9], [.3, .7], [.45, .48], [.6, .28], [.75, .13], [.9, .035], [1, 0]]) g.addColorStop(s, rgba(col, a * k));
  return g;
}
function glow(x, cx, cy, r, col, a, comp) {
  if (r <= 0 || a <= 0) return;
  x.save(); x.globalCompositeOperation = comp || 'screen';
  x.fillStyle = radial(x, cx, cy, r, col, a); x.fillRect(cx - r, cy - r, r * 2, r * 2); x.restore();
}
// 火焰：三片會晃動的水滴形，放在光照之後畫（自發光）
function flame(x, fx, fy, sz, t, seed = 0, lvl = 1) {
  if (lvl <= 0.02) return;
  const cols = ['#B23A1E', '#E07A2E', '#F6C860'];
  x.save(); x.globalCompositeOperation = 'screen';
  for (let k = 0; k < 3; k++) {
    const s = sz * lvl * (1 - k * .26), wob = Math.sin(t * (7 + k * 2.3) + seed + k) * .12 + Math.sin(t * 13.7 + k * 5 + seed) * .06;
    const hgt = s * (1.25 + Math.sin(t * 9 + k * 2 + seed) * .16);
    x.fillStyle = rgba(cols[k], .82);
    x.beginPath();
    x.moveTo(fx - s * .42, fy);
    x.quadraticCurveTo(fx - s * .5, fy - hgt * .5, fx + wob * s, fy - hgt);
    x.quadraticCurveTo(fx + s * .5, fy - hgt * .5, fx + s * .42, fy);
    x.closePath(); x.fill();
  }
  x.restore();
}
// 沿折線取點：u 0..1，回傳 [x, y]
function along(pts, u) {
  u = clamp(u); let tot = 0; const L = [];
  for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(d); tot += d; }
  let d = u * tot;
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const t = L[i] ? clamp(d / L[i]) : 0; return [lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)]; } d -= L[i]; }
  return pts[pts.length - 1].slice();
}
