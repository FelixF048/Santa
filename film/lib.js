'use strict';
// 基礎：常數、數學、顏色、路徑，以及「把場景畫成厚塗參考圖」的畫筆。
// 場景（sets.js）仍然用 wash / pen / glow 這些名字描述形狀，但現在它們不直接上色，
// 而是把形狀記到參考圖（Ref）裡：每個形狀有自己的編號，之後由 engine/plate.js 轉成不會越界的刀筆筆觸。
const W = 1920, H = 1080;          // 輸出畫面
const WW = 2560, WH = 1440;        // 場景的世界座標
const S0 = W / WW;
const INK = '#3A2418';             // 深褐色的細線
const LSC = .6;                    // 參考圖解析度（每個世界單位幾個像素）
const KNIFE = 0, BRUSH = 1, DAB = 2, LINE = 3;   // 筆觸種類，和 engine/impasto.js 相同

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
const _cc = new Map();
function C(h) { if (typeof h !== 'string') return h; let c = _cc.get(h); if (!c) { const v = rgb(h); c = [v[0] / 255, v[1] / 255, v[2] / 255]; _cc.set(h, c); } return c; }   // '#RRGGBB' → [r,g,b] 0..1

// ---------- 路徑
const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function ell(cx, cy, rx, ry, n = 16, a0 = 0, a1 = Math.PI * 2) {
  const o = []; const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6; const m = full ? n : n + 1;
  for (let i = 0; i < m; i++) { const a = a0 + (a1 - a0) * (i / n); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return o;
}
// 把直線邊細分並抖動，讓形狀的邊不那麼死板
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
// 沿折線取點：u 0..1，回傳 [x, y]
function along(pts, u) {
  u = clamp(u); let tot = 0; const L = [];
  for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(d); tot += d; }
  let d = u * tot;
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const t = L[i] ? clamp(d / L[i]) : 0; return [lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)]; } d -= L[i]; }
  return pts[pts.length - 1].slice();
}
function pathLen(pts) { let t = 0; for (let i = 0; i < pts.length - 1; i++) t += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return t; }

// ---------- 參考圖的畫布代理：同一個路徑同時畫到「顏色圖」與「形狀編號圖」
// 場景裡直接呼叫 x.fill() 的形狀也會拿到自己的編號，所以筆觸不會跨過它的邊。
class Px {
  constructor(ref) { this.ref = ref; this.c = ref.ctx; this.d = ref.idc; this.extra = []; this.sd = 0; }
  _id(props) { const k = this.ref._id(Object.assign({ maxR: 8 }, props)); this.d.fillStyle = this.ref._idStyle(k); }
  fill() { this.c.fill(); this._id(); this.d.fill(); }
  fillRect(x, y, w, h) { this.c.fillRect(x, y, w, h); this._id(); this.d.fillRect(x, y, w, h); }
  stroke() { this.c.stroke(); }
  createLinearGradient(...a) { return this.c.createLinearGradient(...a); }
  createRadialGradient(...a) { return this.c.createRadialGradient(...a); }
}
for (const m of ['save', 'restore', 'translate', 'scale', 'rotate', 'clip', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'ellipse', 'rect', 'closePath'])
  Px.prototype[m] = function (...a) { this.c[m](...a); this.d[m](...a); };
for (const p of ['fillStyle', 'strokeStyle', 'globalAlpha', 'globalCompositeOperation', 'lineWidth', 'lineCap', 'lineJoin', 'filter'])
  Object.defineProperty(Px.prototype, p, { get() { return this.c[p]; }, set(v) { this.c[p] = v; } });
function Lr() { const x = new Px(new IMP.Ref(WW, WH, LSC)); return [x, x]; }   // 一層布景；IMP 由 main.js 提供

// ---------- 色塊：一個形狀 = 一組不越界的刀筆
// o: g 垂直漸層的下方顏色, a 顏料透明度, alpha 筆觸透明度（畫在空白圖層上的半透明形狀要兩個都給）,
//    dir 筆觸方向（度）, maxR 最大筆觸半徑, smooth 圓滑邊。舊的水彩參數（pen、edge、gran…）會被忽略。
function wash(x, pts, col, o = {}) {
  const ref = x.ref; if (!ref) return;
  const b = bbox(pts), bw = b[2] - b[0], bh = b[3] - b[1], sm = !!o.smooth;
  const props = { maxR: o.maxR ?? clamp(Math.min(bw, bh) * .32, 3.5, 30), aj: o.aj ?? .42, jit: o.jit ?? .07, bleed: true, fallback: 0 };
  if (o.dir != null) props.dir = o.dir; else if (bw > bh * 1.7) props.dir = 0; else if (bh > bw * 1.7) props.dir = 90;
  if (o.alpha != null) props.alpha = o.alpha;
  if (o.detail != null) props.detail = o.detail;
  const fill = o.g ? (c => { const g = c.createLinearGradient(0, b[1], 0, b[3]); g.addColorStop(0, col); g.addColorStop(1, o.g); return g; }) : col;
  const ga = x.c.globalAlpha; x.c.globalAlpha = ga * (o.a ?? 1);
  ref.fill(c => trace(c, pts, true, sm), fill, props);
  x.c.globalAlpha = ga;
}
// 細線：改成手放的細筆觸，畫在該層所有色塊之上
function pen(x, pts, o = {}) {
  if (!x.extra) return;
  const w = o.w ?? 1.6, wid = Math.max(2.4, w * 1.5), col = C(o.c || INK), a = Math.min(1, (o.a ?? .7) * 1.15);
  const T = x.c.getTransform(), s = x.ref.scale, P = pts.map(p => [(T.a * p[0] + T.c * p[1] + T.e) / s, (T.b * p[0] + T.d * p[1] + T.f) / s]);
  const n = P.length, m = o.close ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const A = P[i], B = P[(i + 1) % n], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < .5) continue;
    x.extra.push({ x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2, ang: Math.atan2(B[1] - A[1], B[0] - A[0]), len: L * 1.25 + wid * .4, wid, c: col, c2: col, type: wid < 5 ? BRUSH : KNIFE, alpha: a, seed: ++x.sd, hgt: .9 });
  }
}
// 小亮點（星星）：手放的小圓筆
function dot(x, cx, cy, r, col, a = 1) { x.extra.push({ x: cx, y: cy, ang: 0, len: r * 3.4, wid: r * 3.4, c: C(col), c2: [1, 1, .95], type: DAB, alpha: a, seed: ++x.sd, hgt: 1.5 }); }
function hatch() { }   // 水彩版的排線；厚塗的筆觸本身就是肌理
function radial(x, cx, cy, r, col, a) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [s, k] of [[0, 1], [.15, .9], [.3, .7], [.45, .48], [.6, .28], [.75, .13], [.9, .035], [1, 0]]) g.addColorStop(s, rgba(col, a * k));
  return g;
}
// 柔和的色暈：只改顏色、不產生新形狀，筆觸會一刀一階地把它畫出來
function glow(x, cx, cy, r, col, a) {
  if (r <= 0 || a <= 0 || !x.ref) return;
  x.ref.tint(c => c.rect(cx - r, cy - r, r * 2, r * 2), c => radial(c, cx, cy, r, col, a), 'source-atop');
}

// ---------- 每格重建的筆觸（人物、特效）。S 是 engine 的 Strokes；顏色可給 '#RRGGBB' 或 [r,g,b]
// kn：由 A 畫到 B 的一刀（taper 讓起點變窄）；db：一坨圓筆
function kn(S, ax, ay, bx, by, wid, c, c2, o = {}) {
  S.push({ x: (ax + bx) / 2, y: (ay + by) / 2, ang: Math.atan2(by - ay, bx - ax), len: Math.max(1, Math.hypot(bx - ax, by - ay) * (o.over ?? 1.1)), wid, c: C(c), c2: C(c2 || c),
    type: o.type ?? KNIFE, taper: o.taper ?? 0, seed: o.seed ?? (S.sd = (S.sd || 0) + 1), hgt: o.hgt ?? 1, alpha: o.alpha ?? 1, skew: o.skew ?? 0, bend: o.bend ?? 0 });
}
function db(S, x, y, len, wid, c, c2, o = {}) {
  S.push({ x, y, ang: o.ang ?? 0, len, wid, c: C(c), c2: C(c2 || c), type: o.type ?? DAB, seed: o.seed ?? (S.sd = (S.sd || 0) + 1), hgt: o.hgt ?? 1, alpha: o.alpha ?? 1, skew: o.skew ?? 0 });
}
// 火焰：三片會晃動的尖刀筆（自發光，推進 K.em）
function flame(K, fx, fy, sz, t, seed = 0, lvl = 1) {
  if (lvl <= 0.02) return;
  const cols = [['#B23A1E', '#E0602A'], ['#E07A2E', '#F2A040'], ['#F6C860', '#FFF0B0']];
  for (let k = 0; k < 3; k++) {
    const s = sz * lvl * (1 - k * .26), wob = Math.sin(t * (7 + k * 2.3) + seed + k) * .12 + Math.sin(t * 13.7 + k * 5 + seed) * .06;
    const hgt = s * (1.25 + Math.sin(t * 9 + k * 2 + seed) * .16);
    kn(K.em, fx + wob * s, fy - hgt, fx, fy, s * .8, cols[k][1], cols[k][0], { taper: .88, seed: 700 + seed * 10 + k, hgt: 1.5, over: 1, alpha: .92 });
  }
}
