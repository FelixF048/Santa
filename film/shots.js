'use strict';
// 時間軸：41 鏡（04-2 因插入枯田閃回拆成 a/b/c）與字幕。時間碼對應 docs/storyboard.md。
const DUR = 300;
const FH = 420;      // 室內人物高度（世界座標）
const EH = 150;      // 站在房子旁的人物高度
const extH = y => EH * (1 + Math.max(0, y - 1016) / 250);
const bobT = (t, f = 2, a = 3, ph = 0) => Math.sin(t * f * 6.283 + ph) * a;
const WARM = '#FFC27A', FIRE = '#FFB060', MOON = '#AEBEF0', GOLD = '#FFD870';
const FONT = '"Noto Serif CJK TC","Noto Serif TC","Source Han Serif TC","Songti TC","PMingLiU","Microsoft JhengHei",serif';

// ---------- 特效
function fxSmoke(K, x0, y0, n = 9, a = .34) {
  const c = K.c;
  for (let k = 0; k < n; k++) {
    const age = (K.t * .16 + k / n) % 1, px = x0 + age * age * 170 + Math.sin(age * 6 + k) * 12, py = y0 - age * 300;
    c.save(); c.globalAlpha = (1 - age) * a * Math.min(1, age * 6); c.fillStyle = '#E8E0D8'; c.beginPath(); c.arc(px, py, 14 + age * 74, 0, 7); c.fill(); c.restore();
  }
}
function fxSnow(K, n = 240, a = .85) {
  const c = K.c; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#FFFFFF';
  for (let i = 0; i < n; i++) {
    const dz = .4 + hash1(i * 3.1), x0 = hash1(i * 7.7) * W * 1.3, y0 = hash1(i * 5.3) * H;
    const y = ((y0 + K.t * (60 + dz * 90)) % (H + 40)) - 20;
    let x = (x0 + Math.sin(K.t * .7 + i) * 24 * dz - K.cam.x * dz * .6 * K.cam.z) % (W + 40); if (x < 0) x += W + 40;
    c.globalAlpha = a * (.35 + dz * .45); c.beginPath(); c.arc(x - 20, y, 1.2 + dz * 2.4, 0, 7); c.fill();
  }
  c.restore();
}
function fxHaze(K, x, y, r, col, a) { glow(K.c, x, y, r, col, a); }
function doorOpen(K, a) { const c = K.c; c.save(); c.fillStyle = rgba('#F8CC70', a); c.fillRect(1337, 852, 88, 164); c.restore(); }
function winSil(K) {   // 窗內的人影
  const c = K.c; c.save(); c.fillStyle = '#4A2E1A';
  for (const [dx, r, ph] of [[-22, 9, 0], [4, 8, 2], [26, 7, 4]]) { const bx = 1612 + dx + Math.sin(K.t * .9 + ph) * 2, by = 884 + Math.sin(K.t * 1.7 + ph) * 1.5; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill(); c.fillRect(bx - r * 1.2, by + r * .8, r * 2.4, 30); }
  c.restore();
}
function coinBag(c, x, y, s, t, seed) {
  wash(c, [[x - 16 * s, y], [x - 20 * s, y - 20 * s], [x - 8 * s, y - 34 * s], [x - 11 * s, y - 42 * s], [x + 11 * s, y - 42 * s], [x + 8 * s, y - 34 * s], [x + 20 * s, y - 20 * s], [x + 16 * s, y]], '#D8AE4A', { fast: true, smooth: true, edge: .25, pen: .7, pw: 1.3 });
  c.save(); c.globalCompositeOperation = 'screen';
  const k = .5 + .5 * Math.sin(t * 5 + seed * 3), r = (10 + 12 * k) * s;
  c.strokeStyle = rgba('#FFF2B0', .5 + .4 * k); c.lineWidth = 2 * s; c.beginPath();
  c.moveTo(x - r, y - 30 * s); c.lineTo(x + r, y - 30 * s); c.moveTo(x, y - 30 * s - r); c.lineTo(x, y - 30 * s + r); c.stroke(); c.restore();
}
function coinBags(K, g, o = {}) {   // g：金光出現的程度；o.fall：新的一袋從煙囪落下的進度
  if (g <= 0) return; const c = K.c, A = K.A;
  c.save(); c.globalAlpha = Math.min(1, g * 1.4);
  A.boots.forEach((bx, i) => coinBag(c, bx, A.bootY + 6, .95, K.t, i));
  for (const [fx, fy, i] of [[1905, 1004, 5], [1962, 1010, 6], [1880, 1014, 7]]) coinBag(c, fx, fy, 1.1, K.t, i);
  for (const [cx, cy] of [[1930, 1014], [1946, 1006], [1990, 1016], [1858, 1010]]) { c.fillStyle = '#F6D060'; c.beginPath(); c.ellipse(cx, cy, 9, 4, 0, 0, 7); c.fill(); }
  if (o.fall != null && o.fall > 0) { const k = clamp(o.fall), y = k < .75 ? lerp(700, 985, Math.pow(k / .75, 2)) : 985 - Math.sin((k - .75) / .25 * Math.PI) * 26; coinBag(c, 1690, y, 1.1, K.t, 9); if (k > .75) glow(c, 1690, 960, 220 * (1 - (k - .75) * 3), '#FFE890', .7); }
  c.restore();
}
function mapRoute(K, p, o = {}) {
  const c = K.c, RT = K.A.RT, n = 120;
  c.save(); c.strokeStyle = '#5A3A22'; c.lineWidth = 4; c.setLineDash([16, 13]); c.lineCap = 'round'; c.globalAlpha = .85;
  const end = o.full ? 1 : p; c.beginPath();
  for (let i = 0; i <= n; i++) { const u = i / n * end, q = along(RT, u); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }
  c.stroke(); c.setLineDash([]);
  const mark = (u, col) => { const q = along(RT, u); c.globalAlpha = 1; c.fillStyle = col; c.beginPath(); c.moveTo(q[0] - 11, q[1] + 4); c.lineTo(q[0], q[1] - 22); c.lineTo(q[0] + 11, q[1] + 4); c.closePath(); c.fill(); c.beginPath(); c.arc(q[0], q[1] - 28, 8, 0, 7); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke(); };
  if (o.follower) mark(clamp(p + .1), '#7F7D82');
  mark(p, '#9A6B3F');
  c.restore();
}
function fxDayNight(K, u) {   // 地圖上方日月交替三次
  const c = K.c, ph = (u * 6) % 1, sun = Math.floor(u * 6) % 2 === 0, x = lerp(880, 1680, ph), y = 300 - Math.sin(ph * Math.PI) * 110, a = Math.sin(ph * Math.PI);
  c.save(); c.globalAlpha = a * .9; c.strokeStyle = INK; c.lineWidth = 2;
  if (sun) { c.fillStyle = '#E0A848'; c.beginPath(); c.arc(x, y, 26, 0, 7); c.fill(); c.stroke(); for (let k = 0; k < 10; k++) { const an = k * Math.PI / 5; c.beginPath(); c.moveTo(x + Math.cos(an) * 34, y + Math.sin(an) * 34); c.lineTo(x + Math.cos(an) * 48, y + Math.sin(an) * 48); c.stroke(); } }
  else { c.fillStyle = '#B8C0D8'; c.beginPath(); c.arc(x, y, 26, .6, 5.1); c.quadraticCurveTo(x + 2, y, x + Math.cos(.6) * 26, y + Math.sin(.6) * 26); c.fill(); c.stroke(); }
  c.restore();
}
function titleCard(c, text, a) {
  if (a <= 0) return; c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `700 120px ${FONT}`; c.fillStyle = INK; c.fillText(text, W / 2, H * .4); c.restore();
}
const EPI = ['聖尼古拉斯（約 270–343 年），生於小亞細亞，後任米拉城主教。', '他一生暗中濟助窮人，從不留名。', '他的故事流傳千年，成為今日的「聖誕老人」。'];
function epilogue(c, lt) {
  const a0 = sm01(lt, 1.0, 2.0); if (a0 <= 0) return;
  c.save(); c.globalAlpha = a0 * .86; c.fillStyle = '#F4EAD2'; c.beginPath(); c.roundRect(W / 2 - 760, 640, 1520, 330, 18); c.fill();
  c.globalAlpha = a0 * .6; c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `600 46px ${FONT}`; c.fillStyle = INK;
  EPI.forEach((s, i) => { c.globalAlpha = sm01(lt, 1.4 + i * 3.0, 2.4 + i * 3.0); c.fillText(s, W / 2, 716 + i * 90); });
  c.restore();
}

// ---------- 共用的人物安排
const dinner = (t, o = {}) => { const q = o.q ?? 1; return [
  { who: 'sis3', x: 880, y: 1062, h: FH, pose: 'sit', face: 1, armA: .9 + bobT(t, 1.1, .25) * q, bendA: 1.3, bob: bobT(t, 1.8, 2) * q, head: -.05 },
  { who: 'sis2', x: 1050, y: 1062, h: FH, pose: 'sit', face: 1, armA: .7 + bobT(t, .9, .2, 1) * q, bendA: 1.5, bob: bobT(t, 2.1, 2, 1) * q },
  o.noS1 ? null : { who: 'sis1', x: 1230, y: 1062, h: FH, pose: 'sit', face: -1, armA: 1.0 + bobT(t, 1.3, .3, 2) * q, bendA: 1.2, bob: bobT(t, 1.9, 2.4, 2) * q },
  o.noF ? null : { who: 'father', x: 1500, y: 1062, h: FH, pose: 'sit', face: -1, head: .3, armA: .7, bendA: .8 },
  o.noM ? null : { who: 'mother', x: 1680, y: 1062, h: FH, pose: 'sit', face: -1, head: .22, armA: .7, bendA: .8 },
]; };
const lampL = () => [{ x: 1290, y: 860, r: 900, c: WARM, a: 1, fl: 1, glow: .5 }];
const lampFlame = K => flame(K.c, 1290, 874, 15, K.t, 2);
function crowd(t, n, ax, ay) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1, sp = 70 + hash1(i * 2.3) * 60, lane = 1060 + hash1(i * 4.1) * 150;
    const x = ((hash1(i * 9.7) * 3200 + dir * sp * t) % 3200 + 3200) % 3200 - 320;
    const bump = Math.exp(-Math.pow((x - ax) / 190, 2)) * 46 * (lane < ay ? -1 : 1);
    out.push({ col: CROWD[i % CROWD.length], x, y: lane + bump, h: 400 + hash1(i) * 40, face: dir, walk: t * (5 + hash1(i) * 2) + i, basket: i % 3 === 0 });
  }
  return out;
}
const fireL = (lvl = 1) => [{ x: 1720, y: 940, r: 1300 * lerp(.3, 1, lvl), c: FIRE, a: lerp(.25, 1, lvl), fl: 1, glow: .4 * lvl }];
const fireFlames = (K, lvl = 1) => { for (const [fx, s, sd] of [[1660, 70, 1], [1720, 96, 2], [1785, 74, 3]]) flame(K.c, fx, 996, s, K.t, sd, lvl); if (lvl < .5) glow(K.c, 1720, 990, 150, '#FF7030', .5); };
const nightExt = { amb: '#474878' };
const winL = (a = .75, c = WARM) => [{ x: 1612, y: 880, r: 300, c, a, fl: .6, glow: .5 }];
const hug = (t, o = {}) => [
  { who: 'father', x: 1442, y: 1018, h: EH, face: -1, armA: o.wave ? 2.5 + bobT(t, 1, .3) : 1.2, bendA: .5, armB: 1.0, bob: bobT(t, .6, 1) },
  { who: 'mother', x: 1328, y: 1018, h: EH, face: 1, armA: o.wave ? 2.4 + bobT(t, 1.1, .3, 1) : 1.2, bendA: .5, armB: 1.0, bob: bobT(t, .6, 1, 1) },
  { who: 'sis2', x: 1352, y: 1030, h: EH, face: 1, armA: o.wave ? 2.5 + bobT(t, 1.2, .3, 2) : 1.1, bendA: .6, bob: bobT(t, .7, 1, 2) },
  { who: 'sis3', x: 1414, y: 1030, h: EH, face: -1, armA: o.wave ? 2.5 + bobT(t, 1.3, .3, 3) : 1.1, bendA: .6, bob: bobT(t, .7, 1, 3) },
];

const SHOTS = [];
function S(id, t0, t1, set, v, cam, o = {}) { SHOTS.push(Object.assign({ id, t0, t1, set, v, cam }, o)); }

// 00 開場
S('00-1', 0, 8, 'map', {}, [[1280, 720, 1], [700, 940, 2.1]], { ui: K => titleCard(K.c, '西元四世紀', sm01(K.lt, .9, 1.9) * (1 - sm01(K.lt, 4.8, 6))) });

// 01 廚房
S('01-1', 8, 16, 'houseExt', { sky: 'dusk' }, [[1280, 740, 1.0], [1500, 790, 1.5]], { xf: 1.6, amb: '#F4D8C6', emis: { win: .95 },
  lights: () => [{ x: 1612, y: 880, r: 330, c: WARM, a: .6, fl: 1, glow: .5 }, { x: 420, y: 860, r: 1000, c: '#FFD8A0', a: .35 }],
  pre: K => fxSmoke(K, 1621, 438) });
const kitL = () => [{ x: 615, y: 900, r: 1600, c: FIRE, a: .95, fl: 1, glow: .45 }, { x: 2235, y: 575, r: 520, c: '#FFC090', a: .4 }];
S('01-2', 16, 24, 'kitchen', {}, [[1050, 770, 1.4], [1520, 770, 1.4]], { amb: '#8C7060', emis: { win: .6 }, lights: kitL, post: K => flame(K.c, 615, 972, 72, K.t, 1),
  fig: (u, t) => [
    { who: 'sis1', x: 1290, y: 1062, h: FH, face: 1, armA: .6 + bobT(t, 1.6, .12), bendA: .5, armB: .5 + bobT(t, 1.6, .12, 2), bendB: .6, lean: .14, bob: bobT(t, 1.6, 3) },
    { who: 'sis2', x: 1560, y: 1062, h: FH, face: -1, armA: .8 + bobT(t, 2.2, .2), bendA: .7, lean: .08, head: bobT(t, .7, .1), bob: bobT(t, 2, 2, 1) },
    { who: 'sis3', x: 1790 + Math.sin(t * .8) * 50, y: 1066, h: FH, face: Math.cos(t * .8) > 0 ? 1 : -1, walk: t * 6, armA: 1.0, bendA: .9, bob: bobT(t, 2.4, 2, 2) },
  ] });
S('01-3', 24, 30, 'kitchen', {}, [[1380, 730, 1.9], [1420, 715, 2.15]], { amb: '#8C7060', emis: { win: .6 }, lights: kitL,
  fig: (u, t) => [
    { who: 'sis1', x: 1290, y: 1062, h: FH, face: 1, lean: -.06, head: -.28, armA: 1.1 + bobT(t, .8, .15), bendA: 1.5, armB: .5, bendB: .6, bob: bobT(t, 1.2, 2) },
    { who: 'sis2', x: 1530, y: 1062, h: FH, face: -1, lean: .26, armA: .9, bendA: 1.9, armB: .85, bendB: 1.9, head: -.1, bob: bobT(t, .5, 1.5) },
    { who: 'sis3', x: 1700, y: 1064, h: FH, face: -1, lean: .3, armA: .9, bendA: 1.9, armB: .85, bendB: 1.9, head: -.12, bob: bobT(t, .5, 1.5, 2) },
  ] });

// 02 餐桌
S('02-1', 30, 38, 'dining', {}, [[1120, 770, 1.3], [1400, 770, 1.3]], { amb: '#4C3C38', lights: lampL, post: lampFlame, fig: (u, t) => dinner(t) });
S('02-2', 38, 45, 'dining', {}, [[1050, 730, 1.9], [1590, 730, 1.9]], { amb: '#4C3C38', lights: lampL, post: lampFlame, fig: (u, t) => dinner(t) });
S('02-3', 45, 50, 'dining', {}, [[1560, 750, 1.6], [1620, 750, 1.6]], { amb: '#4C3C38', lights: lampL, post: lampFlame,
  fig: (u, t) => dinner(t, { noF: 1, noM: 1 }).concat([
    { who: 'father', x: 1500 + sm01(u, .42, 1) * 820, y: 1062, h: FH, sitk: 1 - sm01(u, .12, .38), face: u < .38 ? -1 : 1, walk: u > .42 ? t * 6 : null, head: .3, armA: .3 },
    { who: 'mother', x: 1680, y: 1062, h: FH, pose: 'sit', face: u > .55 ? 1 : -1, head: .15, armA: .7, bendA: .8 },
  ]) });

// 03 屋外的父親
const fatherBench = (o = {}) => Object.assign({ who: 'father', x: 1800, y: 1030, h: EH, pose: 'sit', face: -1, head: .5, lean: .12, armA: .5, bendA: .9, sil: .3 }, o);
S('03-1', 50, 59, 'houseExt', { sky: 'night' }, [[1420, 780, 1.2], [1680, 860, 1.8]], { amb: '#474878', emis: { win: 1, sky: 1 }, lights: () => winL(),
  pre: K => fxSmoke(K, 1621, 438), post: winSil, fig: () => [fatherBench()] });
S('03-2', 59, 65, 'dining', {}, [[1860, 670, 1.9], [1900, 655, 2.1]], { amb: '#4C3C38', lights: lampL,
  post: K => { const c = K.c; c.save(); c.beginPath(); c.rect(1902, 522, 186, 226); c.clip(); c.fillStyle = 'rgba(126,146,206,.34)'; c.fillRect(1902, 522, 186, 226); drawFig(c, { who: 'father', x: 2004, y: 762, h: 118, pose: 'sit', face: -1, head: .5, sil: .8 }); c.restore(); },
  fig: (u, t) => dinner(t, { noF: 1, noM: 1 }).concat([{ who: 'mother', x: 1680, y: 1062, h: FH, pose: 'sit', face: 1, head: -.1, armA: .7, bendA: .8 }]) });
S('03-3', 65, 72, 'dining', {}, [[1200, 710, 1.9], [1240, 690, 2.1]], { amb: '#4C3C38', lights: lampL, post: lampFlame,
  fig: (u, t) => { const q = 1 - sm01(u, .25, .4), turn = u > .3 && u < .62, up = sm01(u, .6, .7);
    return dinner(t, { noF: 1, noS1: 1, noM: 1, q }).concat([
      { who: 'sis1', x: 1230, y: 1062, h: FH, sitk: 1 - sm01(u, .74, .95), face: turn ? 1 : -1, armA: u > .6 ? lerp(.3, 1.5, up) : (turn ? .4 : 1.0 + bobT(t, 1.3, .3, 2) * q), bendA: u > .6 ? .3 : 1.2, bob: bobT(t, 1.9, 2.4, 2) * q, head: turn ? -.1 : 0 },
      { who: 'mother', x: 1680, y: 1062, h: FH, pose: 'sit', face: 1, head: -.1, armA: .7, bendA: .8 }]); } });

// 04 父女對話
S('04-1', 72, 80, 'houseExt', { sky: 'night' }, [[1740, 930, 2.1], [1770, 925, 2.3]], { amb: '#474878', emis: { win: 1, sky: 1 }, lights: () => winL(), post: winSil,
  fig: (u, t) => [fatherBench({ head: lerp(.5, .35, sm01(u, .5, .8)) }),
    { who: 'sis1', x: lerp(1500, 1722, sm01(u, 0, .4)), y: lerp(1016, 1030, sm01(u, .2, .4)), h: EH, face: 1, walk: u < .4 ? t * 6 : null, sitk: sm01(u, .4, .55), armA: lerp(.14, 1.25, sm01(u, .55, .7)), bendA: .3, armB: lerp(-.1, 1.1, sm01(u, .55, .7)), bendB: .3 }] });
const fatherTalk = (u, t, h0, h1) => [fatherBench({ head: lerp(h0, h1, ease(u)), bob: bobT(t, 1.4, .8) }),
  { who: 'sis1', x: 1722, y: 1030, h: EH, face: 1, pose: 'sit', armA: 1.25, bendA: .3, armB: 1.1, bendB: .3 }];
S('04-2a', 80, 83, 'houseExt', { sky: 'night' }, [[1790, 918, 2.4], [1795, 915, 2.4]], { amb: '#474878', emis: { win: 1, sky: 1 }, lights: () => winL(), fig: (u, t) => fatherTalk(u, t, .35, .12) });
S('04-2b', 83, 85.5, 'field', {}, [[1150, 820, 1.25], [1450, 820, 1.32]], { xf: .7, amb: '#C6B4A6' });
S('04-2c', 85.5, 88, 'houseExt', { sky: 'night' }, [[1795, 915, 2.4], [1790, 918, 2.4]], { xf: .7, amb: '#474878', emis: { win: 1, sky: 1 }, lights: () => winL(), fig: (u, t) => fatherTalk(u, t, .12, .45) });
S('04-3', 88, 93, 'houseExt', { sky: 'night' }, [[1745, 905, 2.3], [1745, 885, 2.4]], { amb: '#474878', emis: { win: 1, sky: 1 }, lights: () => winL(),
  fig: (u, t) => [fatherBench({ head: lerp(.45, -.2, sm01(u, .2, .5)) }),
    { who: 'sis1', x: 1722, y: lerp(1030, 1016, sm01(u, 0, .3)), h: EH, face: 1, sitk: 1 - sm01(u, 0, .3), armA: lerp(1.25, 1.1, sm01(u, .3, .5)), bendA: lerp(.3, 1.7, sm01(u, .3, .5)), armB: .2 }] });
S('04-4', 93, 98, 'houseExt', { sky: 'night' }, [[1640, 925, 1.85], [1620, 925, 1.85]], { amb: '#474878', emis: { win: 1, sky: 1 },
  lights: () => winL().concat([{ x: 1381, y: 930, r: 240, c: WARM, a: .9 }]), pre: K => doorOpen(K, .95),
  fig: (u, t) => [fatherBench({ head: .05, sitk: .6, shake: u < .5 ? Math.sin(t * 10) * .014 : 0, armA: u < .5 ? 1.4 : .5, bendA: .6 }),
    { who: 'mother', x: 1381, y: 1018, h: EH, face: 1, shake: u < .6 ? Math.sin(t * 9 + 1) * .012 : 0, armA: .9, bendA: 1.2 },
    { who: 'sis1', x: 1722, y: 1016, h: EH, face: 1, head: sm01(u, .5, .7) * .4, armA: .3, armB: .1, lean: sm01(u, .5, .7) * .06 }] });

// 05 深夜離家
S('05-1', 98, 106, 'bedroom', {}, [[1300, 790, 1.5], [1640, 800, 1.5]], { amb: '#34364F', emis: { moon: .9 },
  lights: () => [{ x: 1150, y: 580, r: 430, c: MOON, a: .5 }, { x: 1500, y: 1100, r: 560, c: MOON, a: .42 }],
  fig: (u, t) => [
    { sleep: 1, who: 'sis2', x: 1440, y: 962, len: 330, br: Math.sin(t * 1.3) * 3, blanket: '#9C7C5E' },
    { sleep: 1, who: 'sis3', x: 1745, y: 962, len: 290, br: Math.sin(t * 1.3 + 1) * 3, blanket: '#8E8468' },
    { who: 'sis1', x: 1240 + sm01(u, 0, .3) * 70, y: 1066, h: FH, face: 1, bag: 1, walk: u < .3 ? t * 5 : null, lean: .06 + sm01(u, .3, .5) * .08, head: .22,
      armA: lerp(.14, 1.0, sm01(u, .5, .62)) - sm01(u, .86, 1) * .85, bendA: lerp(.5, 2.0, sm01(u, .5, .62)) },
  ] });
S('05-2', 106, 112, 'houseExt', { sky: 'night' }, [[1640, 905, 2.2], [1630, 930, 2.0]], { amb: '#525A8C', emis: { sky: 1 },
  fig: (u, t) => { const k = seg01(u, .4, .55); const jx = lerp(1612, 1700, ease(k)), jy = lerp(934, 1016, k * k) - Math.sin(k * Math.PI) * 26;
    return [u < .7 ? { who: 'sis1', x: jx, y: jy, h: EH, face: 1, bag: 1, crk: u < .4 ? 1 : lerp(.9, 0, sm01(u, .5, .7)) }
      : { who: 'sis1', x: lerp(1700, 1540, seg01(u, .7, 1)), y: 1018, h: EH, face: -1, bag: 1, walk: t * 6 }]; } });
S('05-3', 112, 120, 'houseExt', { sky: 'night' }, [[1000, 870, 1.5], [1280, 720, 1.0]], { amb: '#4E5484', emis: { sky: 1, win: .3 },
  lights: () => [{ x: 1612, y: 880, r: 130, c: '#FF9050', a: .35 }],
  fig: (u, t, A) => { const q = along(A.NEAR, lerp(.22, .5, sm01(u, 0, .45)));
    return [{ who: 'sis1', x: q[0], y: q[1], h: extH(q[1]), face: u > .52 ? 1 : -1, bag: 1, walk: u < .45 ? t * 5.5 : null, head: u > .52 ? -.12 : .1 }]; } });

// 06 進城
S('06-1', 120, 126, 'map', {}, [[1280, 720, 1.2], [1300, 705, 1.3]], { post: K => { mapRoute(K, sm01(K.u, .04, .96)); fxDayNight(K, K.u); } });
S('06-2', 126, 133, 'street', {}, [[980, 780, 1.25], [1440, 780, 1.25]], { amb: '#F6EADA', post: K => fxHaze(K, 300, 260, 1500, '#FFF0D0', .32),
  fig: (u, t) => crowd(t, 10, 1250, 1120).concat([{ who: 'sis1', x: 1250, y: 1120, h: FH + 10, face: 1, lean: .16, head: .35, bag: 1, armA: .9, bendA: 1.5, bob: bobT(t, .4, 1.5) }]) });
const tavL = (a = .8) => [{ x: 1900, y: 800, r: 430, c: WARM, a }, { x: 2110, y: 800, r: 430, c: WARM, a }, { x: 2320, y: 800, r: 430, c: WARM, a }];
S('06-3', 133, 139, 'street', {}, [[2060, 700, 1.9], [2090, 690, 2.1]], { amb: '#8E7480', emis: { tavern: 1 }, lights: () => tavL(),
  fig: (u, t) => [{ who: 'sis1', x: 1560, y: 1430, h: 980, face: 0, front: true, bag: 1, sil: .5, bob: bobT(t, .3, 3) }] });
S('06-4', 139, 145, 'street', {}, [[1230, 900, 1.7], [1250, 930, 2.0]], { amb: '#5E5068', emis: { tavern: 1 }, lights: () => [{ x: 2110, y: 780, r: 1200, c: WARM, a: .7 }],
  fig: (u, t) => [{ col: CROWD[2], x: 2100 - t * 60, y: 1070, h: 400, face: -1, walk: t * 6 }, { col: CROWD[1], x: 300 + t * 70, y: 1180, h: 430, face: 1, walk: t * 6 + 2, basket: 1 },
    { who: 'sis1', x: 1200, y: 1130, h: FH + 10, face: -1, pose: 'crouch', bag: 1, armA: .9, bendA: 2.1, armB: .8, bendB: 2.1, head: .3, bob: Math.abs(Math.sin(t * 5.2)) * 4 }] });
S('06-5', 145, 154, 'street', {}, [[1180, 900, 1.7], [1000, 860, 1.4]], { amb: '#55485F', emis: { tavern: 1 },
  lights: (u, t) => { const wx = u < .72 ? lerp(560, 1040, sm01(u, 0, .22)) : lerp(1040, 640, seg01(u, .72, 1)); return [{ x: wx + (u < .72 ? 70 : -70), y: 940, r: 560, c: WARM, a: .95, fl: .5, glow: .6 }, { x: 2110, y: 780, r: 1000, c: WARM, a: .45 }]; },
  fig: (u, t) => { const lv = u > .72, k = seg01(u, .72, 1), sc = 1 - k * .16, wx = lv ? lerp(1040, 640, k) : lerp(560, 1040, sm01(u, 0, .22));
    const up = sm01(u, .6, .72);
    return [
      { who: 'woman', x: wx, y: lerp(1126, 1094, k), h: (FH + 10) * sc, face: lv ? -1 : 1, walk: (u < .22 || lv) ? t * 5.5 : null, lean: sm01(u, .22, .32) * .32 * (1 - up), basket: 1, lantern: 1, armA: lv ? .5 : lerp(.5, 1.25, sm01(u, .5, .6)), bendA: .5 },
      { who: 'sis1', x: lv ? lerp(1200, 800, k) : 1200, y: lerp(1130, 1098, k), h: (FH + 10) * sc, face: -1, crk: 1 - up, bag: 1, walk: lv ? t * 5.5 + 1 : null,
        head: lerp(.3, -.22, sm01(u, .24, .34)) + (u > .5 && u < .6 ? Math.sin((u - .5) * 62.8) * .18 : 0), armA: lerp(.9, .3, sm01(u, .24, .34)), bendA: lerp(2.1, .5, sm01(u, .24, .34)), armB: lerp(.8, .1, sm01(u, .24, .34)), bendB: lerp(2.1, .4, sm01(u, .24, .34)) }]; } });

// 07 宅邸的一個月
S('07-1', 154, 162, 'mansionKitchen', {}, [[900, 780, 1.4], [1660, 780, 1.4]], { lin: 1, amb: u => mixc('#D8D0C8', '#A88A78', sm01(u, .35, .9)),
  emis: u => ({ winA: 1 - sm01(u, .35, .9), winB: sm01(u, .35, .9) }), lights: u => [{ x: 1280, y: 560, r: 1300, c: mixc('#FFF8E8', '#FFC088', sm01(u, .35, .9)), a: .6 }],
  fig: (u, t) => { const sx = 720 + u * 1100; return [
    { who: 'servA', x: 1180, y: 1066, h: FH, face: sx < 1180 ? -1 : 1, armA: .6 + bobT(t, 1.5, .14), bendA: .5, armB: .5 + bobT(t, 1.5, .14, 2), bendB: .6, lean: .12, bob: bobT(t, 1.5, 2) },
    { who: 'servB', x: 1960, y: 1066, h: FH, face: -1, armA: u > .62 ? 2.4 + bobT(t, 1.4, .25) : .8, bendA: u > .62 ? .3 : 1.0, bob: bobT(t, 1.1, 2) },
    { who: 'sis1', x: sx, y: 1068, h: FH, face: 1, walk: t * 5.5, armA: 1.0, bendA: 1.0, armB: .9, bendB: 1.0, bob: bobT(t, 1.3, 2) }]; } });
S('07-2', 162, 170, 'porch', {}, [[1500, 790, 1.5], [1560, 780, 1.65]], { amb: '#7A6A62', emis: { door: 1 }, lights: () => [{ x: 1700, y: 700, r: 1050, c: '#FFF2D8', a: .8 }],
  fig: (u, t) => { const give = sm01(u, .12, .3) * (1 - sm01(u, .44, .58)), bow = sm01(u, .54, .68) * (1 - sm01(u, .86, .98));
    return [
      { who: 'sis1', x: 1640, y: 1056, h: 400, face: -1, over: true, sil: .32, armA: lerp(.14, 1.15, sm01(u, .24, .36)) - sm01(u, .44, .56) * .5, bendA: .5, purse: u > .4, lean: bow * .85, head: bow * .3 },
      { who: 'master', x: 1280, y: 1170, h: 560, face: 0, armA: lerp(.15, 1.15, give), bendA: .3, purse: u > .1 && u <= .4 }]; } });
S('07-3', 170, 178, 'gate', {}, [[900, 800, 1.35], [1280, 720, 1.0]], { amb: '#F2E6D8', emis: { sun: 1 }, post: K => fxHaze(K, 1900, 600, 1300, '#FFF0D0', .3),
  fig: (u, t, A) => { const q = along(A.RD, lerp(.03, .6, u)), f = along(A.RD, lerp(0, .13, sm01(u, .42, 1)));
    return [u > .4 ? { who: 'follower', x: f[0] - 30, y: f[1], h: 200, face: 1, walk: u < .95 ? t * 4 : null, sil: lerp(.75, .25, sm01(u, .42, .8)) } : null,
      { who: 'sis1', x: q[0], y: q[1], h: 190 * (1 + (q[1] - 1036) / 210), face: 1, bag: 1, walk: t * 5.5, purse: 1, armA: .7, bendA: 1.2 }]; } });

// 08 返家
S('08-1', 178, 184, 'map', {}, [[1300, 705, 1.3], [1260, 730, 1.25]], { post: K => mapRoute(K, .9 - sm01(K.u, .04, .96) * .9, { full: 1, follower: 1 }) });
S('08-2', 184, 190, 'houseExt', { sky: 'day' }, [[840, 870, 1.45], [1120, 850, 1.45]], { amb: '#FBF3E6', pre: K => fxSmoke(K, 1621, 438),
  fig: (u, t, A) => { const q = along(A.NEAR, lerp(.8, .1, u)); return [{ who: 'sis1', x: q[0], y: q[1], h: extH(q[1]), face: 1, bag: 1, walk: t * (6 + u * 7), lean: .04 + u * .22 }]; } });
S('08-3', 190, 198, 'houseExt', { sky: 'day' }, [[1150, 870, 1.5], [1180, 860, 1.56]], { amb: '#FBF3E6', pre: K => fxSmoke(K, 1621, 438),
  fig: (u, t) => hug(t).concat([
    { who: 'sis1', x: 1384, y: 1022, h: EH, face: 1, armA: 1.2, bendA: .4, armB: 1.1, bendB: .4, bag: 1, bob: bobT(t, .6, 1, 4) },
    { who: 'follower', x: 860 - sm01(u, .8, 1) * 950, y: 1570, h: 1000, face: 0, front: true, head: sm01(u, .32, .46) * .25, armA: lerp(.15, .28, sm01(u, .32, .46)), bendA: 1.0 + bobT(t, 2.2, .05), tablet: u > .3, sil: .3 }]) });

// 09–10 長談、再出發、爐邊
S('09-1', 198, 204, 'bedroom', {}, [[1660, 830, 1.9], [1690, 820, 2.0]], { amb: '#2E2426', lights: () => [{ x: 1378, y: 920, r: 680, c: WARM, a: 1, fl: .8, glow: .5 }],
  pre: K => jarLamp(K.c, 1378, 948), post: K => flame(K.c, 1378, 932, 14, K.t, 4),
  fig: (u, t) => { const d = sm01(u, .35, .9); return [
    { who: 'sis1', x: 1560, y: 1052, h: FH, pose: 'sit', face: 1, lean: d * .2, head: d * .38, armA: .6, bendA: .9 },
    { who: 'sis2', x: 1745, y: 1052, h: FH, pose: 'sit', face: -1, armA: .9 + bobT(t, 1, .25), bendA: 1.3, bob: bobT(t, 1.6, 2) },
    { who: 'sis3', x: 1905, y: 1052, h: FH, pose: 'sit', face: -1, armA: .7, bendA: 1.4, bob: bobT(t, 1.4, 2, 2), head: .1 }]; } });
function jarLamp(c, x, y) { wash(c, [[x - 20, y], [x - 26, y - 14], [x - 8, y - 22], [x + 8, y - 22], [x + 26, y - 14], [x + 20, y]], '#A0623C', { fast: true, smooth: true, pen: .7 }); }
S('10-1', 204, 212, 'living', {}, [[1150, 790, 1.3], [1760, 850, 2.1]], { amb: '#4A3830', lights: () => fireL(1), post: K => fireFlames(K, 1),
  fig: (u, t) => [
    { who: 'sis1', x: 800, y: 1066, h: FH, face: 1, armA: 1.0 + bobT(t, 1.1, .3), bendA: .9, armB: .5, bob: bobT(t, 1.3, 2) },
    { who: 'mother', x: 1150, y: 1066, h: FH, face: -1, armA: .8, bendA: 1.3, head: .05 },
    { who: 'father', x: 1338, y: 1066, h: FH, pose: 'sit', face: -1, head: .12, armA: .7, bendA: .8 },
    { who: 'sis2', x: 1930, y: 1066, h: FH, face: -1, armA: 2.0 + bobT(t, .7, .15), bendA: .3, armB: 1.7, bendB: .3 },
    { who: 'sis3', x: 2050, y: 1068, h: FH, face: -1, armA: 1.4, bendA: .8, bob: bobT(t, .9, 2) }] });
S('10-2', 212, 219, 'houseExt', { sky: 'morn' }, [[1320, 850, 1.5], [1150, 830, 1.25]], { amb: '#F6ECDE', pre: K => fxSmoke(K, 1621, 438),
  fig: (u, t, A) => { const go = sm01(u, .4, 1), q = along(A.FAR, go * .6), sc = lerp(1, .58, go), back = u > .76 && u < .88;
    return hug(t, { wave: u > .5 }).concat([u < .4
      ? { who: 'sis1', x: 1384 + Math.sin(u * 22) * 22, y: 1022, h: EH, face: Math.cos(u * 22) > 0 ? 1 : -1, armA: 1.2, bendA: .4, armB: 1.1, bendB: .4, bag: 1 }
      : { who: 'sis1', x: q[0], y: q[1], h: EH * sc, face: back ? 1 : -1, bag: 1, walk: back ? null : t * 5.5, armA: back ? 2.6 + bobT(t, 1.5, .25) : undefined, bendA: back ? .2 : undefined }]); } });
S('10-3', 219, 228, 'living', {}, [[1560, 830, 1.6], [1585, 830, 1.66]], { amb: u => mixc('#4A3830', '#1C1716', sm01(u, .3, .6)),
  lights: u => fireL(1 - sm01(u, .3, .55) * .92), post: K => fireFlames(K, 1 - sm01(K.u, .3, .55) * .95),
  fig: (u, t) => { let mx, face = 1, walk = null, lean = 0, arm = .3;
    if (u < .15) mx = 1470; else if (u < .3) { mx = lerp(1470, 1560, seg01(u, .15, .3)); walk = t * 5; } else if (u < .52) { mx = 1560; lean = Math.sin(seg01(u, .3, .52) * Math.PI) * .6; arm = 1.2; }
    else if (u < .62) { mx = lerp(1560, 1425, seg01(u, .52, .62)); face = -1; walk = t * 5; } else if (u < .76) { mx = 1425; face = -1; arm = lerp(.3, 1.3, Math.sin(seg01(u, .62, .76) * Math.PI)); }
    else { mx = lerp(1425, 520, seg01(u, .76, 1)); face = -1; walk = t * 5; }
    return [{ who: 'father', x: 1338, y: 1066, h: FH, pose: 'sit', face: 1, head: .28 + sm01(u, .8, 1) * .15, lean: .1, armA: .7, bendA: .8 },
      { who: 'mother', x: mx, y: 1070, h: FH, face, walk, lean, armA: arm, bendA: .3 }]; } });

// 11 金幣與紅斗篷
S('11-1', 228, 234, 'living', {}, [[1600, 840, 1.9], [1640, 850, 2.0]], { amb: '#191516',
  lights: u => { const g = sm01(u, .25, .45); return [{ x: 1720, y: 985, r: 280, c: '#FF8040', a: .35 }, { x: 1740, y: 800, r: 640 * g, c: GOLD, a: g * .9, glow: .6 }]; },
  post: K => { fireFlames(K, .04); coinBags(K, sm01(K.u, .25, .45)); },
  fig: (u, t) => [{ who: 'father', x: 1338, y: 1066, h: FH, pose: 'sit', face: 1, head: lerp(.58, -.06, sm01(u, .5, .72)), lean: lerp(.3, .04, sm01(u, .5, .72)), armA: .7, bendA: .8 }] });
S('11-2', 234, 241, 'living', {}, [[1750, 870, 2.2], [1750, 880, 2.4]], { amb: '#221A16', lights: () => [{ x: 1740, y: 830, r: 950, c: GOLD, a: 1, glow: .55 }],
  post: K => coinBags(K, 1, { fall: seg01(K.u, .45, .75) }) });
S('11-3', 241, 245, 'chimneyUp', {}, [[1280, 720, 1.34], [1280, 720, 1.5]], { amb: '#5A4636', emis: { sky: 1 }, lights: () => [{ x: 1280, y: 1500, r: 1200, c: GOLD, a: .85 }],
  post: K => { const c = K.c, u = K.u; c.save(); c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 16; i++) { const ph = (K.t * .22 + hash1(i * 3.3)) % 1, an = hash1(i * 5.1) * 6.283, d = ph * 150; c.globalAlpha = .9 * (1 - ph); c.beginPath(); c.arc(1280 + Math.cos(an) * d * (.3 + hash1(i)), 720 + Math.sin(an) * d * (.3 + hash1(i * 2)), 2 + ph * 6, 0, 7); c.fill(); }
    c.globalAlpha = 1; c.fillStyle = '#100A07'; const hy = 1640 - sm01(u, .08, .5) * 330;
    c.beginPath(); c.ellipse(1280, hy, 190, 220, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(1280, hy + 330, 520, 240, 0, 0, 7); c.fill(); c.restore(); } });
const snowExt = { amb: '#56608E', emis: { sky: 1, win: 1 } };
S('11-4', 245, 252, 'houseExt', { sky: 'night', snow: 1 }, [[1480, 710, 1.5], [1560, 670, 1.75]], Object.assign({}, snowExt, {
  lights: () => winL(.8, GOLD).concat([{ x: 1381, y: 930, r: 220, c: GOLD, a: .8 }]),
  pre: K => { doorOpen(K, .9); const k = (K.lt * .5) % 1; if (K.u < .6) coinBag(K.c, 1621, lerp(380, 440, k), .5, K.t, 1); },
  post: K => fxSnow(K),
  fig: (u, t) => { const st = sm01(u, .6, .68); return [
    { who: 'nick', x: 1556, y: 615, h: EH * 1.05, face: 1, hood: true, sack: 1, lean: lerp(.28, -.22, st), armA: lerp(1.5 + bobT(t, .5, .2), 2.5, st), bendA: .3, armB: lerp(.2, 2.2, st) },
    { who: 'father', x: lerp(1395, 1470, sm01(u, 0, .3)), y: 1018, h: EH, face: 1, walk: u < .3 ? t * 6 : null, head: -.4, lean: -.08, armA: lerp(.3, 2.3, sm01(u, .42, .52)), bendA: .2 }]; } }));
S('11-5', 252, 264, 'houseExt', { sky: 'night', snow: 1 }, [[1660, 880, 1.8], [1620, 905, 2.25]], Object.assign({}, snowExt, {
  lights: (u) => { const fx = lerp(1470, 1580, sm01(u, .1, .4)); return winL(.8, GOLD).concat([{ x: fx + 40, y: 950, r: 340, c: WARM, a: .9, fl: .5, glow: .5 }, { x: 1381, y: 930, r: 220, c: GOLD, a: .8 }]); },
  pre: K => doorOpen(K, .9), post: K => fxSnow(K),
  fig: (u, t) => { let nx, ny, face = -1, crk = 0, walk = null;
    if (u < .18) { const k = ease(seg01(u, 0, .18)); nx = lerp(1700, 1800, k); ny = lerp(624, 782, k); face = 1; crk = .5; }
    else if (u < .28) { const k = seg01(u, .18, .28); nx = lerp(1800, 1910, k); ny = lerp(782, 1016, k * k); crk = lerp(.5, .9, k); }
    else if (u < .34) { nx = 1910; ny = 1016; crk = lerp(.9, 0, seg01(u, .28, .34)); }
    else if (u < .5) { nx = lerp(1910, 1722, seg01(u, .34, .5)); ny = 1016; walk = t * 5.5; }
    else { nx = 1722; ny = 1016; }
    return [
      { who: 'father', x: lerp(1470, 1580, sm01(u, .1, .4)), y: 1018, h: EH, face: 1, lantern: 1, walk: u > .1 && u < .4 ? t * 5 : null, lean: lerp(-.16, 0, sm01(u, .6, .8)), head: -.12, armA: 1.1, bendA: .9 },
      { who: 'nick', x: nx, y: ny, h: EH * 1.05, face, crk, walk, hood: u < .58, sack: 1, armA: u > .62 ? .9 + bobT(t, .6, .2) : .3, bendA: .8 }]; } }));

// 12 道謝與離去
S('12-1', 264, 271, 'houseExt', { sky: 'night', snow: 1 }, [[1650, 918, 2.3], [1652, 914, 2.4]], Object.assign({}, snowExt, {
  lights: () => winL(.8, GOLD).concat([{ x: 1620, y: 950, r: 340, c: WARM, a: .9, fl: .5, glow: .5 }, { x: 1381, y: 930, r: 220, c: GOLD, a: .8 }]), pre: K => doorOpen(K, .9), post: K => fxSnow(K),
  fig: (u, t) => [
    { who: 'father', x: 1580, y: 1018, h: EH, face: 1, lantern: 1, head: -.1, armA: 1.1, bendA: .9, armB: u < .45 ? 1.0 + bobT(t, 1.2, .25) : .2, bendB: .8, bob: u < .45 ? bobT(t, 1.2, .8) : 0 },
    { who: 'nick', x: 1722, y: 1016, h: EH * 1.05, face: -1, sack: 1, armA: lerp(.3, 1.35, sm01(u, .5, .66)), bendA: .15, head: .06 }] }));
S('12-2', 271, 277, 'houseExt', { sky: 'night', snow: 1 }, [[1420, 908, 2.2], [1440, 902, 2.35]], Object.assign({}, snowExt, {
  lights: () => winL(.8, GOLD).concat([{ x: 1381, y: 930, r: 520, c: GOLD, a: 1, glow: .5 }, { x: 1620, y: 950, r: 300, c: WARM, a: .8 }]),
  pre: K => doorOpen(K, 1), post: K => fxSnow(K),
  fig: (u, t) => [
    { who: 'mother', x: lerp(1375, 1392, sm01(u, 0, .3)), y: 1018, h: EH, face: 1, armA: lerp(.3, 1.3, sm01(u, .3, .5)), bendA: .3 },
    { who: 'sis2', x: 1346, y: 1026, h: EH, face: 1, lean: .12, armA: 1.0, bendA: .8, bob: bobT(t, .5, .8) },
    { who: 'sis3', x: 1362, y: 1032, h: EH, face: 1, lean: .1, armA: .9, bendA: 1.0, bob: bobT(t, .5, .8, 2) },
    { who: 'father', x: 1580, y: 1018, h: EH, face: u > .4 ? -1 : 1, lantern: 1, armA: 1.1, bendA: .9 },
    { who: 'nick', x: 1722, y: 1016, h: EH * 1.05, face: -1, sack: 1, armA: .3 }] }));
S('12-3', 277, 286, 'houseExt', { sky: 'night', snow: 1 }, [[1450, 870, 1.6], [1280, 720, 1.0]], Object.assign({}, snowExt, {
  lights: () => winL(.8, GOLD).concat([{ x: 1381, y: 930, r: 420, c: GOLD, a: .9, glow: .4 }]),
  pre: K => doorOpen(K, 1), post: K => fxSnow(K),
  fig: (u, t, A) => { const NP = [[1722, 1016], [1560, 1040], [1400, 1046]].concat(A.FAR.slice(1)), go = sm01(u, .24, 1), q = along(NP, go * .95), sc = lerp(1, .5, clamp((1400 - q[0]) / 1130));
    return [
      { who: 'father', x: 1580, y: 1018, h: EH, face: -1, lantern: 1, armA: 1.1, bendA: .9, armB: u > .3 ? 2.5 + bobT(t, 1.1, .3) : .2 },
      { who: 'mother', x: 1392, y: 1018, h: EH, face: -1, armA: u > .35 ? 2.4 + bobT(t, 1.2, .3, 1) : .3 },
      { who: 'sis2', x: 1346, y: 1026, h: EH, face: -1, armA: u > .4 ? 2.5 + bobT(t, 1.3, .3, 2) : 1.0 },
      { who: 'sis3', x: 1362, y: 1034, h: EH, face: -1, armA: u > .45 ? 2.5 + bobT(t, 1.4, .3, 3) : .9 },
      u < .24 ? { who: 'nick', x: 1722, y: 1016, h: EH * 1.05, face: -1, sack: 1, armA: 2.5 + bobT(t, 1.2, .3), bendA: .2 }
        : { who: 'nick', x: q[0], y: q[1], h: EH * 1.05 * sc, face: -1, hood: true, sack: 1, walk: t * 5 }]; } }));

// 13 片尾
S('13-1', 286, 300, 'map', {}, [[700, 940, 2.0], [1280, 720, 1.0]], { xf: 2.2,
  post: K => { const c = K.c, A = K.A, g = sm01(K.u, .12, .7); c.save(); c.strokeStyle = '#5A3A22'; c.lineWidth = 4; c.setLineDash([16, 13]); c.lineCap = 'round'; c.globalAlpha = .8;
    A.OTH.forEach((o, i) => { const k = clamp(g * 1.4 - i * .08); if (k <= 0) return; c.beginPath(); c.moveTo(A.V[0], A.V[1] - 20); c.lineTo(lerp(A.V[0], o[0], k), lerp(A.V[1] - 20, o[1], k)); c.stroke(); });
    c.setLineDash([]); const q = [lerp(A.V[0], A.OTH[0][0], clamp(g * 1.4)), lerp(A.V[1] - 20, A.OTH[0][1], clamp(g * 1.4))];
    c.globalAlpha = 1; c.fillStyle = '#B3261E'; c.beginPath(); c.moveTo(q[0] - 13, q[1] + 6); c.lineTo(q[0], q[1] - 26); c.lineTo(q[0] + 13, q[1] + 6); c.closePath(); c.fill(); c.beginPath(); c.arc(q[0], q[1] - 32, 9, 0, 7); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
    c.restore(); },
  ui: K => epilogue(K.c, K.lt) });

// ---------- 字幕（絕對時間）。who 供配音分配聲線：vo 旁白、其餘為角色
const CAPS = [
  [0.8, 7.6, 'vo', '很久以前，一個寒冬將至的村莊裡，住著一戶人家。'],
  [16.3, 23.5, 'vo', '三個女兒正值荳蔻年華。'],
  [24.3, 29.7, 'sis1', '大姐：「真希望將來能嫁給一個帥氣的好人。」'],
  [38.2, 44.8, 'vo', '父母聽著，卻笑不出來。今年歉收，連過冬的錢都不夠。'],
  [50.8, 58.5, 'vo', '他給不了女兒們想要的未來。'],
  [75.2, 79.6, 'sis1', '大姐：「爸爸，您怎麼了？」'],
  [80.3, 87.6, 'father', '父親：「今年收成不好……別說妳們的婚事，連過冬都難。」'],
  [88.8, 92.6, 'sis1', '大姐：「那我去城裡工作！」'],
  [93.1, 95.0, 'father', '父親：「不行，城裡太危險！」'],
  [95.2, 97.9, 'vo', '大姐嘴上答應，心裡卻已下定決心。'],
  [112.6, 119.6, 'vo', '那不是富麗堂皇的大宅，卻是充滿愛的家。'],
  [120.4, 125.6, 'vo', '她走了好幾天。'],
  [133.3, 138.7, 'vo', '她知道，那不是該走的路。'],
  [145.6, 151.6, 'woman', '婦人：「我工作的宅邸廚房正缺人手，做一個月，供吃住，妳願意嗎？」'],
  [151.8, 153.8, 'sis1', '大姐：「我願意！」'],
  [154.4, 161.6, 'vo', '一個月裡，她想著家人，勤奮地工作。'],
  [162.3, 169.7, 'vo', '主人聽說了她的遭遇，給了她兩個月的薪酬。'],
  [170.4, 177.6, 'vo', '她不知道的是，有人正跟在她身後。'],
  [198.3, 203.7, 'vo', '家裡的情況並沒有好轉。'],
  [204.4, 211.6, 'sis1', '大姐：「主人很仁厚，給了我雙倍的薪水。讓我再去吧。」'],
  [212.3, 218.6, 'vo', '幾天後，她再次出發。'],
  [248.6, 251.7, 'father', '父親：「是誰？」'],
  [252.4, 256.4, 'nick', '尼古拉斯：「我是你女兒工作那座宅邸的主人，尼古拉斯。」'],
  [256.6, 263.8, 'nick', '「知道你們需要幫助，帶來這些金幣，願你們度過寒冬，也讓三個女兒都能順利出嫁。」'],
  [264.3, 267.2, 'father', '父親：「您……為什麼要大老遠來幫我們？」'],
  [267.4, 271.6, 'nick', '尼古拉斯：「因為你的女兒，為了家人願意獨自走那麼遠的路。」'],
  [272.2, 276.6, 'mother', '母親：「請進來坐坐吧！」'],
  [277.3, 285.6, 'nick', '尼古拉斯：「不了，還有許多人需要幫助！今晚……喔，不只是今晚，最近還有很多地方要趕去送暖呢！」'],
].map(c => ({ t0: c[0], t1: c[1], who: c[2], text: c[3] }));
