// 主程式：window.render(t) 畫出第 t 秒的畫面（確定性，任何一格可單獨重繪）。
// 頁面約定與 Lemo-Opuscar 相同：window.READY / window.DUR / window.render(t) / window.TEXTS(t)。
// 流程：場景的每一層 → 參考圖 → 刀筆筆觸（只做一次、快取）；每格把筆觸畫進「顏色」與「厚度」兩張圖，
// 再用斜射光照亮厚度（engine/impasto.js）；字幕與字卡是疊在上面的清晰文字。
import { Impasto, Strokes, F } from './engine/impasto.js';
import { Ref, paintRef } from './engine/plate.js';
window.IMP = { Ref };

const Q = new URLSearchParams(location.search);
let E, glc, cv, ctx;
const LIT = new Strokes(2048), EM = new Strokes(1024), SCR = new Strokes(512);

// ---------- 場景：參考圖 → 筆觸，快取最近用過的 5 個
const setCache = new Map();
function buildLayer(L, seed) {
  const ref = L.c.ref;
  const s = paintRef(ref, { R: [17, 9, 4.5, 2.6], T: 14, seed, app: (x, y, lvl) => x / WW + lvl * .012 + hash1(x * .37 + y * 1.31) * .035 });
  for (const e of L.c.extra) { e.app = e.x / WW + .06; s.push(e); }
  return { p: L.p, front: !!L.front, id: L.id, sky: !!L.sky, n: s.n, batch: E.batch(s.data().slice()), tex: E.texture(ref.ctx.canvas), w: WW, h: WH };
}
function getSet(name, v) {
  const key = name + JSON.stringify(v || {});
  if (setCache.has(key)) { const s = setCache.get(key); setCache.delete(key); setCache.set(key, s); return s; }
  const raw = SETS[name](v || {});
  const s = { A: raw.A, layers: raw.layers.map((L, i) => buildLayer(L, 11 + i)), emis: raw.emis.map((L, i) => buildLayer(L, 51 + i)) };
  setCache.set(key, s);
  if (setCache.size > 5) { const k = setCache.keys().next().value, old = setCache.get(k); setCache.delete(k); for (const L of old.layers.concat(old.emis)) { E.free(L.batch); E.free(L.tex); } }
  return s;
}
function camAt(sh, u) {
  const a = sh.cam[0], b = sh.cam[1] || a, e = sh.lin ? u : ease(u);
  const z = lerp(a[2], b[2], e), hw = WW / 2 / z, hh = WH / 2 / z;
  return { x: clamp(lerp(a[0], b[0], e), hw, WW - hw), y: clamp(lerp(a[1], b[1], e), hh, WH - hh), z };
}
// 唯一的世界→畫面轉換；p 是視差（1 = 主平面）
const layerCam = (cam, p) => ({ x: WW / 2 + (cam.x - WW / 2) * p, y: WH / 2 + (cam.y - WH / 2) * p, zoom: (1 + (cam.z - 1) * clamp(p, .3, 1.3)) * S0, rot: 0 });

// 調色：場景越暗，曝光與彩度拉得越多，夜景才不會糊成一片
function gradeOf(sh, u) {
  const amb = C(typeof sh.amb === 'function' ? sh.amb(u) : (sh.amb || '#FFFFFF')), la = amb[0] * .3 + amb[1] * .59 + amb[2] * .11, k = clamp((la - .2) / .6);
  return Object.assign({ expo: 1, sat: lerp(1.25, 1.06, k), vig: lerp(.34, .22, k), spec: .2, contrast: 1.04 }, sh.grade || {});
}
const mixGrade = (a, b, t) => { const o = {}; for (const k in b) o[k] = typeof b[k] === 'number' ? lerp(a[k] ?? b[k], b[k], t) : b[k]; return o; };

// 畫一個鏡頭的全部筆觸。sweep = { T }：正在把這一鏡「刷」到上一鏡上面，T 由 0 到 1.3
function drawShot(sh, t, sweep) {
  const lt = t - sh.t0, u = clamp(lt / (sh.t1 - sh.t0));
  const set = getSet(sh.set, sh.v), cam = camAt(sh, u), A = set.A, z = cam.z * S0;
  const K = { u, lt, t, cam, A, set, z, sh, lit: LIT, em: EM, scr: SCR };
  // 光：環境色 + 光源（位置換算成畫面座標），每一筆依筆心位置受光
  const lights = sh.lights ? sh.lights(u, t, A) : [], Ls = E.L;
  // 暗場景把環境色提亮（最多 1.45 倍），而不是整張加曝光：這樣被燈照到的地方不會過曝
  const a0 = C(typeof sh.amb === 'function' ? sh.amb(u) : (sh.amb || '#FFFFFF')), bo = sh.boost ?? lerp(1.45, 1, clamp((a0[0] * .3 + a0[1] * .59 + a0[2] * .11 - .2) / .6));
  Ls.amb = a0.map(v => Math.min(1, v * bo)); Ls.n = 0;
  for (const l of lights) {
    if (Ls.n >= 8) break;
    const fl = l.fl ? 1 + (Math.sin(t * 9.1 + l.x) * .04 + Math.sin(t * 15.7 + l.y) * .03) * l.fl : 1, r = l.r * z * fl, a = Math.min(1, (l.a ?? 1) * fl), c = C(l.c);
    if (r <= 0 || a <= 0) continue;
    const i = Ls.n++; Ls.P[i * 4] = W / 2 + (l.x - cam.x) * z; Ls.P[i * 4 + 1] = H / 2 + (l.y - cam.y) * z; Ls.P[i * 4 + 2] = r; Ls.C[i * 3] = c[0] * a; Ls.C[i * 3 + 1] = c[1] * a; Ls.C[i * 3 + 2] = c[2] * a;
  }
  const em = typeof sh.emis === 'function' ? sh.emis(u) : (sh.emis || {}), grey = sh.grey ?? 0, rv = grey ? 1e6 : -1e6;
  const opt = (p, o) => {   // 刷上去的進度：每一筆的 app 是它在世界裡的橫向位置，換算成「目前畫面」由左到右
    const lc = layerCam(cam, p), k = (W / lc.zoom) / WW;
    return Object.assign({ cam: lc, grey, reveal: rv, run: .8 }, sweep ? { t: sweep.T * k + (lc.x - W / 2 / lc.zoom) / WW, appear: 0, appDur: .22 * k } : null, o);
  };
  const layer = (L, o) => { const q = opt(L.p, o); if (!sweep) E.under(L.tex, L.w, L.h, q); E.draw(L.batch, q); };
  const emis = sky => { for (const L of set.emis) if (L.sky === sky && em[L.id] > 0) layer(L, { lit: 0, alpha: Math.min(1, em[L.id]), wet: .6, grey: 0 }); };
  const flush = (lk = 1) => {
    if (sweep) for (const S of [LIT, EM]) { const d = S.data(); for (let i = 0; i < S.n; i++) d[i * F + 14] = d[i * F] / WW + .08; }
    if (LIT.n) E.drawNow(LIT.data(), opt(1, { run: .04, lit: lk })); if (EM.n) E.drawNow(EM.data(), opt(1, { run: .1, lit: 0, wet: .7, grey: 0 }));
    if (SCR.n && (!sweep || sweep.T > 1)) E.drawNow(SCR.data(), { grey: 0, run: 0, lit: 0 });
    LIT.clear(); EM.clear(); SCR.clear();
  };
  const fig = f => f.sleep ? drawSleeper(LIT, f) : drawFig(LIT, EM, f);
  const figs = (sh.fig ? sh.fig(u, t, A) : []).filter(Boolean); figs.forEach((f, i) => { if (f.seed == null) f.seed = i + 1; });

  LIT.clear(); EM.clear(); SCR.clear();
  for (const L of set.layers) if (!L.front && L.p <= .2) layer(L);   // 天空
  emis(true);                                                         // 星月太陽：會被後面的山與房子蓋住
  for (const L of set.layers) if (!L.front && L.p > .2) layer(L);
  emis(false);                                                        // 亮著的窗與門
  if (sh.pre) sh.pre(K); flush();
  const figLit = f => f.lit ?? (f.who === 'nick' ? .5 : 1);   // 紅斗篷只吃一半的環境光：全片最純的顏色留給他
  for (const f of figs.filter(f => !f.front).sort((a, b) => (a.zo ?? a.y) - (b.zo ?? b.y))) { fig(f); flush(figLit(f)); }
  for (const L of set.layers) if (L.front) layer(L);
  for (const f of figs) if (f.front) { fig(f); flush(figLit(f)); }
  if (sh.post) sh.post(K); flush();
  return K;
}

function wrapCap(s) {
  if (s.length <= 28) return [s];
  const mid = s.length / 2; let best = -1, bd = 1e9;
  for (let i = 4; i < s.length - 4; i++) if ('，。！？…、'.includes(s[i]) && s[i + 1] !== '」' && !'…。！？，'.includes(s[i + 1])) { const d = Math.abs(i + 1 - mid); if (d < bd) { bd = d; best = i + 1; } }
  if (best < 0) best = Math.round(mid);
  return [s.slice(0, best), s.slice(best)];
}
const capAt = t => CAPS.find(q => t >= q.t0 && t < q.t1);
function drawCaption(c, t) {   // 小字不交給刀筆：清晰的襯線字疊在畫上
  const cap = capAt(t); if (!cap) return;
  const a = Math.min(1, (t - cap.t0) / .25, (cap.t1 - t) / .25), lines = wrapCap(cap.text);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const g = c.createLinearGradient(0, H - 250, 0, H); g.addColorStop(0, 'rgba(26,16,10,0)'); g.addColorStop(1, `rgba(26,16,10,${.55 * a})`);
  c.fillStyle = g; c.fillRect(0, H - 250, W, 250);
  c.globalAlpha = a; c.font = `600 48px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  lines.forEach((s, i) => { const y = H - 70 - (lines.length - 1 - i) * 64; c.strokeStyle = 'rgba(30,18,10,.9)'; c.lineWidth = 8; c.strokeText(s, W / 2, y); c.fillStyle = '#FBF3DE'; c.fillText(s, W / 2, y); });
  c.restore();
}

window.DUR = DUR;
window.CAPS = CAPS;
window.SHOTS_INFO = () => SHOTS.map(s => ({ id: s.id, t0: s.t0, t1: s.t1, set: s.set }));
window.render = function (t) {
  t = clamp(t, 0, DUR - 1e-4);
  let i = SHOTS.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = SHOTS.length - 1;
  const sh = SHOTS[i], u = clamp((t - sh.t0) / (sh.t1 - sh.t0));
  E.begin();
  let K, g = gradeOf(sh, u);
  if (sh.xf && i > 0 && t - sh.t0 < sh.xf) {   // 用刀把新的一鏡由左到右刷上去
    const k = (t - sh.t0) / sh.xf, pv = SHOTS[i - 1];
    drawShot(pv, t, null); K = drawShot(sh, t, { T: k * 1.3 }); g = mixGrade(gradeOf(pv, 1), g, ease(k));
  } else K = drawShot(sh, t, null);
  E.finish(Object.assign(g, window.POST || {}));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(glc, 0, 0);
  K.c = ctx;
  if (sh.ov) { ctx.setTransform(K.z, 0, 0, K.z, W / 2 - K.cam.x * K.z, H / 2 - K.cam.y * K.z); sh.ov(K); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (sh.ui) sh.ui(K);
  drawCaption(ctx, t);
  const f = Math.min(1, t / 1.0, (DUR - t) / 1.5);
  if (f < 1) { ctx.fillStyle = rgba('#120C0A', 1 - f); ctx.fillRect(0, 0, W, H); }
  return sh.id;
};
window.TEXTS = function (t) {
  const out = [], cap = capAt(t);
  if (cap) out.push({ id: 'cap' + cap.t0, text: cap.text, x0: 100, y0: H - 170, x1: W - 100, y1: H - 30 });
  if (t > 0.9 && t < 6) out.push({ id: 'title', text: '西元四世紀', x0: 600, y0: 360, x1: 1320, y1: 500 });
  if (t > 287) EPI.forEach((s, i) => { if (t - 286 > 1.4 + i * 3) out.push({ id: 'epi' + i, text: s, x0: 200, y0: 680 + i * 90, x1: 1720, y1: 750 + i * 90 }); });
  return out;
};

async function initFilm() {
  cv = document.getElementById('cv'); ctx = cv.getContext('2d');
  glc = document.createElement('canvas');
  E = new Impasto(glc, { W, H, ss: parseFloat(Q.get('ss') || '2') });   // ss：內部超取樣倍數
  window.GLINFO = (() => { const gl = E.gl, x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown'; })();
  try { await document.fonts.load(`600 48px ${FONT}`, '西元四世紀聖尼古拉斯'); await document.fonts.ready; } catch (e) { }
  window.render(0);
  window.READY = true;
  if (Q.has('bare')) return;
  // 預覽用的播放列（渲染時加上 ?bare 就不會出現）
  const bar = document.getElementById('bar'), rng = document.getElementById('rng'), lab = document.getElementById('lab'), btn = document.getElementById('play');
  bar.style.display = 'flex'; rng.max = DUR;
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const show = t => { const id = window.render(t); lab.textContent = `${fmt(t)}  ·  ${id}`; rng.value = t; };
  let cur = parseFloat(Q.get('t') || '0'); show(cur);
  rng.oninput = () => { cur = parseFloat(rng.value); show(cur); };
  let playing = false, last = 0;
  const step = now => { if (!playing) return; cur += (now - last) / 1000; last = now; if (cur >= DUR) { cur = 0; } show(cur); requestAnimationFrame(step); };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '暫停' : '播放'; if (playing) { last = performance.now(); requestAnimationFrame(step); } };
  window.SHOW = show;
}
if (document.readyState === 'complete') initFilm(); else window.addEventListener('load', initFilm);
