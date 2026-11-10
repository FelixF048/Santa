'use strict';
// 主程式：window.render(t) 畫出第 t 秒的畫面（確定性，任何一格可單獨重繪）。
// 頁面約定與 Lemo-Opuscar 相同：window.READY / window.DUR / window.render(t) / window.TEXTS(t)。
let cv, ctx, tmp, tmpx, LM, LMx, sk2, sk2x;
const setCache = new Map();
function getSet(name, v) {
  const key = name + JSON.stringify(v || {});
  if (setCache.has(key)) { const s = setCache.get(key); setCache.delete(key); setCache.set(key, s); return s; }
  const s = SETS[name](v || {});
  setCache.set(key, s);
  if (setCache.size > 3) setCache.delete(setCache.keys().next().value);
  return s;
}
function camAt(sh, u) {
  const a = sh.cam[0], b = sh.cam[1] || a, e = sh.lin ? u : ease(u);
  const z = lerp(a[2], b[2], e), hw = WW / 2 / z, hh = WH / 2 / z;
  return { x: clamp(lerp(a[0], b[0], e), hw, WW - hw), y: clamp(lerp(a[1], b[1], e), hh, WH - hh), z };
}
// 唯一的世界→畫面轉換；p 是視差（1 = 主平面）
function setLayerT(c, cam, p) {
  const zz = (1 + (cam.z - 1) * clamp(p, .3, 1.3)) * S0;
  const cx = WW / 2 + (cam.x - WW / 2) * p, cy = WH / 2 + (cam.y - WH / 2) * p;
  c.setTransform(zz, 0, 0, zz, W / 2 - cx * zz, H / 2 - cy * zz);
}

function drawShot(c, sh, t) {
  const lt = t - sh.t0, u = clamp(lt / (sh.t1 - sh.t0));
  const set = getSet(sh.set, sh.v), cam = camAt(sh, u), A = set.A;
  const K = { c, u, lt, t, cam, A, set, z: cam.z * S0 };
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#E9DCC0'; c.fillRect(0, 0, W, H);
  const figs = (sh.fig ? sh.fig(u, t, A) : []).filter(Boolean);
  const drawL = L => { setLayerT(c, cam, L.p); c.drawImage(L.c, 0, 0); };
  for (const L of set.layers) if (!L.front) drawL(L);
  setLayerT(c, cam, 1);
  if (sh.pre) sh.pre(K);
  const back = figs.filter(f => !f.front && !f.over).sort((a, b) => (a.zo ?? a.y) - (b.zo ?? b.y));
  for (const f of back) f.sleep ? drawSleeper(c, f) : drawFig(c, f);
  for (const L of set.layers) if (L.front) drawL(L);
  setLayerT(c, cam, 1);
  for (const f of figs) if (f.front) drawFig(c, f);

  // 光照圖：環境色 + 光源（相加），再整張相乘到畫面上
  const amb = typeof sh.amb === 'function' ? sh.amb(u) : (sh.amb || '#FFFFFF');
  const lights = sh.lights ? sh.lights(u, t, A) : [];
  if (amb.toUpperCase() !== '#FFFFFF' || lights.length) {
    const k = LM.width / W;
    LMx.setTransform(1, 0, 0, 1, 0, 0); LMx.globalCompositeOperation = 'source-over'; LMx.fillStyle = amb; LMx.fillRect(0, 0, LM.width, LM.height);
    LMx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const sx = (W / 2 + (l.x - cam.x) * K.z) * k, sy = (H / 2 + (l.y - cam.y) * K.z) * k;
      const fl = l.fl ? 1 + (Math.sin(t * 9.1 + l.x) * .04 + Math.sin(t * 15.7 + l.y) * .03) * l.fl : 1;
      const r = l.r * K.z * k * fl, a = Math.min(1, (l.a ?? 1) * fl);
      if (r <= 0 || a <= 0) continue;
      LMx.fillStyle = radial(LMx, sx, sy, r, l.c, a); LMx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.imageSmoothingEnabled = true;
    c.drawImage(LM, 0, 0, W, H); c.globalCompositeOperation = 'source-over';
  }
  // 自發光（窗、月亮、火焰、金幣）不受光照圖影響
  const em = typeof sh.emis === 'function' ? sh.emis(u) : (sh.emis || {});
  for (const E of set.emis) {
    const a = em[E.id] || 0; if (a <= 0) continue;
    // 自發光層要被前面的東西擋住：天空類（星月太陽）被所有前景層與人物擋住，其餘（亮窗）被人物與最前景擋住
    sk2x.setTransform(1, 0, 0, 1, 0, 0); sk2x.globalCompositeOperation = 'source-over'; sk2x.clearRect(0, 0, W, H);
    setLayerT(sk2x, cam, E.p); sk2x.drawImage(E.c, 0, 0);
    sk2x.globalCompositeOperation = 'destination-out';
    for (const L of set.layers) if (E.sky ? L.p > .2 : L.front) { setLayerT(sk2x, cam, L.p); sk2x.drawImage(L.c, 0, 0); }
    setLayerT(sk2x, cam, 1); for (const f of figs) if (!f.sleep && !f.over) drawFig(sk2x, f);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = Math.min(1, a); c.drawImage(sk2, 0, 0); c.globalAlpha = 1;
  }
  setLayerT(c, cam, 1);
  for (const f of figs) if (f.over) drawFig(c, f);
  for (const l of lights) if (l.glow) glow(c, l.x, l.y, l.r * .5, l.c, .35 * Math.min(1, l.a ?? 1) * l.glow);
  if (sh.post) sh.post(K);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  if (sh.ui) sh.ui(K);
}

function wrapCap(s) {
  if (s.length <= 28) return [s];
  const mid = s.length / 2; let best = -1, bd = 1e9;
  for (let i = 4; i < s.length - 4; i++) if ('，。！？…、'.includes(s[i]) && s[i + 1] !== '」' && !'…。！？，'.includes(s[i + 1])) { const d = Math.abs(i + 1 - mid); if (d < bd) { bd = d; best = i + 1; } }
  if (best < 0) best = Math.round(mid);
  return [s.slice(0, best), s.slice(best)];
}
function capAt(t) { return CAPS.find(q => t >= q.t0 && t < q.t1); }
function drawCaption(c, t) {
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
  const sh = SHOTS[i];
  if (sh.xf && i > 0 && t - sh.t0 < sh.xf) {
    drawShot(ctx, SHOTS[i - 1], t); drawShot(tmpx, sh, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ease((t - sh.t0) / sh.xf); ctx.drawImage(tmp, 0, 0); ctx.globalAlpha = 1;
  } else drawShot(ctx, sh, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(TEX.paper, 0, 0); ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(TEX.vig, 0, 0);
  drawCaption(ctx, t);
  const f = Math.min(1, t / 1.0, (DUR - t) / 1.5);
  if (f < 1) { ctx.fillStyle = rgba('#1A120C', 1 - f); ctx.fillRect(0, 0, W, H); }
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
  tmp = mk(W, H); tmpx = tmp.getContext('2d');
  LM = mk(480, 270); LMx = LM.getContext('2d');
  sk2 = mk(W, H); sk2x = sk2.getContext('2d');
  buildTextures();
  try { await document.fonts.load(`600 48px ${FONT}`, '西元四世紀聖尼古拉斯'); await document.fonts.ready; } catch (e) { }
  window.render(0);
  window.READY = true;
  if (new URLSearchParams(location.search).has('bare')) return;
  // 預覽用的播放列（渲染時加上 ?bare 就不會出現）
  const bar = document.getElementById('bar'), rng = document.getElementById('rng'), lab = document.getElementById('lab'), btn = document.getElementById('play');
  bar.style.display = 'flex'; rng.max = DUR;
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const show = t => { const id = window.render(t); lab.textContent = `${fmt(t)}  ·  ${id}`; rng.value = t; };
  const q = new URLSearchParams(location.search); let cur = parseFloat(q.get('t') || '0'); show(cur);
  rng.oninput = () => { cur = parseFloat(rng.value); show(cur); };
  let playing = false, last = 0;
  const step = now => { if (!playing) return; cur += (now - last) / 1000; last = now; if (cur >= DUR) { cur = 0; } show(cur); requestAnimationFrame(step); };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '暫停' : '播放'; if (playing) { last = performance.now(); requestAnimationFrame(step); } };
  window.SHOW = show;
}
window.addEventListener('load', initFilm);
