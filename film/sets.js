'use strict';
// 場景：每個場景畫成幾層參考圖（世界座標 2560×1440），main.js 再把每一層轉成刀筆筆觸；鏡頭在上面移動，不同層有視差。
// 都用「白天的固有色」畫，夜晚與火光由引擎的逐筆光照算出來。Lr()、wash、pen、glow 在 lib.js。
let R_ = mulberry(1);
function wb(x, pts, col, o = {}) { wash(x, seg(pts, true, o.step || 90, o.j ?? 2.5, R_), col, o); }
function ws(x, pts, col, o = {}) { wash(x, pts, col, Object.assign({ smooth: true }, o)); }
function ln(x, a, b, o = {}) { pen(x, seg([a, b], false, o.step || 70, o.j ?? 2, R_), o); }
function ribbon(c, w0, w1) { const n = c.length, top = [], bot = []; for (let i = 0; i < n; i++) { const hw = lerp(w0, w1, i / (n - 1)); top.push([c[i][0], c[i][1] - hw]); bot.unshift([c[i][0], c[i][1] + hw]); } return top.concat(bot); }
function grain() { }
function skyWash(x, top, bot, mid) {
  x.ref.fill(c => c.rect(0, 0, WW, WH), c => { const g = c.createLinearGradient(0, 0, 0, WH * .78); g.addColorStop(0, top); if (mid) g.addColorStop(.62, mid); g.addColorStop(1, bot); return g; },
    { dir: -10, maxR: 32, aj: .55, jit: .08, bleed: true });
  for (let i = 0; i < 26; i++) glow(x, R_() * WW, R_() * WH * .7, 140 + R_() * 320, R_() < .5 ? light(top, .5) : bot, .1 + R_() * .12, 'source-over');
  grain(x);
}
function hill(x, y0, amp, col, o = {}) {
  const pts = [[-30, WH + 30]], n = 26, ph = R_() * 10;
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([u * (WW + 60) - 30, y0 - amp * (.5 + .5 * Math.sin(u * Math.PI * (o.f || 2.3) + ph)) * (.6 + .4 * Math.sin(u * 9 + ph * 2)) - R_() * amp * .1]); }
  pts.push([WW + 30, WH + 30]);
  wash(x, pts, col, { smooth: true, g: o.g || light(col, .3), pen: o.pen ?? .45, edge: .2 });
}
function tree(x, bx, by, h, col = '#5A4636') {
  wb(x, [[bx - h * .035, by], [bx - h * .02, by - h * .5], [bx + h * .02, by - h * .5], [bx + h * .04, by]], col, { j: 2, step: 50 });
  const br = (px, py, ang, len, w, dep) => {
    const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
    pen(x, seg([[px, py], [ex, ey]], false, 30, 2.5, R_), { w, a: .8, c: dark(col, .3), smooth: true });
    if (dep > 0) { br(ex, ey, ang - .35 - R_() * .3, len * .68, w * .7, dep - 1); br(ex, ey, ang + .3 + R_() * .35, len * .66, w * .7, dep - 1); }
  };
  br(bx, by - h * .48, -Math.PI / 2 - .25, h * .26, h * .022, 3); br(bx, by - h * .45, -Math.PI / 2 + .3, h * .24, h * .02, 3); br(bx, by - h * .3, -Math.PI / 2 - .7, h * .16, h * .014, 2);
}
function jar(x, cx, by, w, h, col) {
  ws(x, [[cx - w * .28, by - h], [cx + w * .28, by - h], [cx + w * .5, by - h * .62], [cx + w * .4, by], [cx - w * .4, by], [cx - w * .5, by - h * .62]], col, { g: dark(col, .25) });
  pen(x, [[cx - w * .3, by - h + 4], [cx + w * .3, by - h + 4]], { w: 2.4, a: .6 });
}
function room(x, o = {}) {
  const wall = o.wall || '#CBA67A', floor = o.floor || '#93704C', fy = o.fy || 1000;
  wb(x, box(-10, -10, WW + 20, fy + 10), wall, { g: dark(wall, .12), j: 0, pen: 0, edge: 0 });
  for (let i = 0; i < 40; i++) glow(x, R_() * WW, R_() * fy, 80 + R_() * 220, R_() < .5 ? light(wall, .35) : dark(wall, .25), .12 + R_() * .1, 'source-over');
  hatch(x, 0, 0, WW, fy, 260, .9, 26, R_, { a: .16 });
  wb(x, box(-10, fy, WW + 20, WH - fy + 10), floor, { g: dark(floor, .3), j: 3, pen: .5 });
  hatch(x, 0, fy + 10, WW, WH - fy, 200, 0.02, 60, R_, { a: .2 });
  if (o.beam !== false) { const bc = o.beamC || '#6E5238'; wb(x, box(-10, 110, WW + 20, 46), bc, { j: 2 }); wb(x, box(250, 156, 44, fy - 156), bc, { j: 2 }); wb(x, box(2270, 156, 44, fy - 156), bc, { j: 2 }); }
}
function archPts(cx, by, hw, hSide, hTop) { return [[cx - hw, by], [cx - hw, by - hSide], [cx - hw * .75, by - hSide - (hTop - hSide) * .7], [cx, by - hTop], [cx + hw * .75, by - hSide - (hTop - hSide) * .7], [cx + hw, by - hSide], [cx + hw, by]]; }
function boot(x, bx, by, col) {   // 掛著的長筒鞋：鞋筒 + 鞋頭
  ws(x, [[bx - 20, by], [bx + 20, by], [bx + 21, by + 108], [bx + 56, by + 122], [bx + 58, by + 148], [bx - 20, by + 150]], col, { g: dark(col, .3) });
  pen(x, [[bx - 20, by + 12], [bx + 20, by + 12]], { w: 2, a: .6 });
  pen(x, [[bx, by], [bx, by - 26]], { w: 1.6, a: .7 });
}

const SETS = {};

// ---------- 家的外觀（最常用）  v: { sky: 'dusk'|'night'|'day'|'morn', snow }
SETS.houseExt = v => {
  R_ = mulberry(101);
  const snow = !!v.snow, layers = [], emis = [];
  let [c, x] = Lr();
  if (v.sky === 'dusk') skyWash(x, '#8E86B0', '#F6C878', '#E8B08A');
  else if (v.sky === 'night') skyWash(x, '#8086AE', '#AEAAC8');
  else if (v.sky === 'morn') skyWash(x, '#B4C2D2', '#F8DDB0', '#F0D8C0');
  else skyWash(x, '#A9C0D0', '#F1E6CC');
  hill(x, 800, 170, snow ? '#D2D0E0' : '#B8A8C8', { f: 1.7 });
  layers.push({ c, p: .15 });
  [c, x] = Lr();
  hill(x, 930, 130, snow ? '#C6C8DA' : (v.sky === 'dusk' ? '#9A8A78' : '#94997C'), { f: 2.9 });
  for (let i = 0; i < 9; i++) tree(x, 150 + i * 300 + R_() * 120, 900 + R_() * 40, 120 + R_() * 80, '#6A5A52');
  layers.push({ c, p: .5 });
  [c, x] = Lr();
  const gcol = snow ? '#E6E8F0' : '#A98A62';
  ws(x, [[-30, 975], [600, 962], [1200, 985], [1900, 975], [2590, 965], [2590, WH + 30], [-30, WH + 30]], gcol, { g: snow ? '#C4C8DA' : '#8A6C48', pen: .5 });
  hatch(x, 0, 1000, WW, 420, 320, 0.05, 40, R_, { a: snow ? .1 : .22 });
  const FAR = [[1381, 1024], [1250, 1042], [1050, 1038], [850, 1022], [650, 1004], [450, 988], [270, 976]];
  const NEAR = [[1250, 1042], [1050, 1088], [800, 1142], [500, 1188], [150, 1232], [-80, 1252]];
  const pcol = snow ? '#CDD0DE' : '#CDB68E';
  ws(x, ribbon(NEAR, 24, 62), pcol, { pen: .35, edge: .15 });
  ws(x, ribbon(FAR, 26, 7), pcol, { pen: .35, edge: .15 });
  tree(x, 1010, 1005, 360); tree(x, 2010, 1000, 250);
  for (let i = 0; i < 7; i++) { const fx = 1900 + i * 90; wb(x, box(fx, 940 - R_() * 12, 12, 78), '#6E5238', { j: 1.5, step: 40 }); }
  ln(x, [1900, 962], [2460, 958], { w: 2.4 }); ln(x, [1900, 992], [2460, 990], { w: 2.4 });
  // 房子：泥牆、綠色斜屋頂、棕色長煙囪、朝路的窗
  wb(x, box(1250, 770, 500, 246), '#C9A377', { g: '#A9865E' });
  hatch(x, 1255, 780, 490, 230, 90, 1.0, 22, R_, { a: .22 });
  wb(x, box(1594, 452, 54, 200), '#6B4A2E', { g: '#553820', j: 2 });
  wb(x, box(1582, 440, 78, 20), '#5A3D25', { j: 1.5 });
  for (let i = 0; i < 7; i++) ln(x, [1596, 480 + i * 24], [1646, 480 + i * 24], { a: .35, w: 1.2 });
  wb(x, [[1203, 780], [1298, 612], [1702, 612], [1797, 780]], '#4F6B3A', { g: '#3F5830', j: 3 });
  for (let i = 1; i < 7; i++) { const yy = 612 + i * 24, k = i / 7; ln(x, [1298 - 95 * k + 6, yy], [1702 + 95 * k - 6, yy], { a: .4, w: 1.3 }); }
  hatch(x, 1240, 620, 520, 150, 150, 1.45, 18, R_, { a: .3 });
  if (snow) {
    ws(x, [[1290, 622], [1298, 606], [1702, 606], [1712, 624], [1650, 640], [1560, 630], [1470, 644], [1380, 632]], '#F2F3F8', { edge: .12, pen: .3 });
    ws(x, [[1203, 772], [1260, 764], [1380, 774], [1520, 766], [1680, 776], [1797, 772], [1800, 786], [1200, 786]], '#F2F3F8', { edge: .12, pen: .3 });
    ws(x, [[1578, 436], [1662, 436], [1662, 446], [1578, 446]], '#F2F3F8', { edge: .1, pen: .3 });
  }
  wb(x, box(1335, 850, 92, 166), '#6A4A30', { g: '#553A24', j: 2 });
  ln(x, [1366, 852], [1366, 1014], { a: .4 }); ln(x, [1397, 852], [1397, 1014], { a: .4 });
  wb(x, box(1554, 822, 116, 104), '#7A5A3C', { j: 2 });
  wb(x, box(1563, 831, 98, 86), '#4A3A32', { j: 1.5 });
  ln(x, [1612, 831], [1612, 917], { a: .6 }); ln(x, [1563, 874], [1661, 874], { a: .6 });
  wb(x, box(1700, 986, 190, 24), '#7A5A3C', { j: 2 }); wb(x, box(1712, 1010, 16, 22), '#5A4028', { j: 1 }); wb(x, box(1862, 1010, 16, 22), '#5A4028', { j: 1 });
  for (let i = 0; i < 5; i++) ws(x, ell(1110 + i * 34, 1000 - (i % 2) * 20, 20, 19, 9), '#8A6A48', { edge: .2 });
  if (snow) for (let i = 0; i < 9; i++) ws(x, ell(200 + i * 290 + R_() * 100, 1010 + R_() * 300, 90 + R_() * 80, 16 + R_() * 12, 10), '#F4F5FA', { pen: .15, edge: .1, a: .8 });
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  for (let i = 0; i < 26; i++) { const gx = R_() * WW, gy = 1340 + R_() * 90; for (let k = 0; k < 6; k++) pen(x, [[gx + k * 7, gy + 40], [gx + k * 7 + (R_() - .5) * 26, gy - 30 - R_() * 40]], { w: 2.2, a: .75, c: snow ? '#8E90A4' : '#5A4A32' }); }
  tree(x, 90, 1500, 900, '#4A3A30');
  layers.push({ c, p: 1.28, front: true });
  // 自發光：亮著的窗
  [c, x] = Lr();
  wb(x, box(1563, 831, 98, 86), '#F6C060', { g: '#E89A3A', pen: 0, edge: 0, j: 1 });
  ln(x, [1612, 831], [1612, 917], { a: .7, w: 2.4 }); ln(x, [1563, 874], [1661, 874], { a: .7, w: 2.4 });
  emis.push({ id: 'win', c, p: 1 });
  if (v.sky === 'night') {
    [c, x] = Lr();
    for (let i = 0; i < 150; i++) { const sx = R_() * WW, sy = R_() * 700, r = .8 + R_() * 1.8; dot(x, sx, sy, r, '#FFF6DC', .45 + R_() * .5); }
    if (!snow) {   // 月亮：兩圈月暈、月面、三個淺坑
      ws(x, ell(520, 300, 200, 200, 22), '#C6D0F4', { a: .08, alpha: .08, maxR: 22 }); ws(x, ell(520, 300, 112, 112, 20), '#DCE4FC', { a: .14, alpha: .14, maxR: 16 });
      ws(x, ell(520, 300, 44, 44, 18), '#F6F2E2', { maxR: 11 });
      for (const [mx, my, mr] of [[506, 290, 11], [532, 312, 8], [528, 284, 6]]) ws(x, ell(mx, my, mr, mr, 10), '#CDD2E2', { maxR: 4 });
    }
    emis.push({ id: 'sky', c, p: .15, sky: true });
  }
  return { layers, emis, A: { FAR, NEAR, door: [1381, 1016], win: [1612, 874], bench: [1790, 1012], chim: [1621, 440] } };
};

// ---------- 自家廚房
SETS.kitchen = () => {
  R_ = mulberry(202);
  const layers = [], emis = [];
  let [c, x] = Lr();
  room(x);
  ws(x, [[380, 1012], [400, 770], [470, 704], [760, 704], [830, 770], [850, 1012]], '#B58A5E', { g: '#94683E' });
  ws(x, ell(615, 905, 96, 84, 14), '#2A1810', { edge: 0 });
  ws(x, [[500, 704], [520, 640], [710, 640], [730, 704]], '#5A4638', { g: '#3E3028' });
  wb(x, box(1000, 430, 780, 20), '#7A5636'); wb(x, box(1000, 610, 780, 20), '#7A5636');
  const cs = ['#B0603C', '#C48A5A', '#8E6A4E', '#B98A60', '#A0502E', '#C9A070'];
  for (let i = 0; i < 6; i++) jar(x, 1070 + i * 125, 430, 70 + R_() * 30, 80 + R_() * 50, cs[i]);
  for (let i = 0; i < 7; i++) jar(x, 1050 + i * 108, 610, 60 + R_() * 24, 50 + R_() * 44, cs[(i + 3) % 6]);
  for (let i = 0; i < 6; i++) { const hx = 1880 + i * 44; ln(x, [hx, 156], [hx, 230 + (i % 3) * 30], { a: .6 }); ws(x, ell(hx, 262 + (i % 3) * 30, 15, 34, 8), i % 2 ? '#C9B27A' : '#8E9A62', { edge: .2 }); }
  wb(x, box(2140, 470, 190, 210), '#7A5A3C', { j: 2 }); wb(x, box(2152, 482, 166, 186), '#E8B88A', { g: '#D8946A', j: 1 });
  jar(x, 930, 1010, 110, 170, '#A0623C');
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  wb(x, box(1080, 902, 840, 36), '#8A6238', { g: '#6E4C2A' });
  wb(x, box(1112, 938, 32, 160), '#6E4C2A', { j: 2 }); wb(x, box(1856, 938, 32, 160), '#6E4C2A', { j: 2 });
  ws(x, ell(1290, 892, 62, 20, 10), '#EAD9B4', { edge: .2 });
  ws(x, [[1480, 902], [1500, 868], [1600, 868], [1620, 902]], '#B98A60');
  jar(x, 1830, 902, 60, 84, '#B0603C');
  for (let i = 0; i < 4; i++) ws(x, ell(1680 + i * 26, 892, 13, 11, 8), i % 2 ? '#8E9A62' : '#C9A050', { edge: .2 });
  layers.push({ c, p: 1, front: true });
  [c, x] = Lr();
  jar(x, 170, 1470, 420, 560, '#5A3A26'); wb(x, box(2420, -10, 160, WH + 20), '#4A3424', { j: 4 });
  layers.push({ c, p: 1.25, front: true });
  [c, x] = Lr();
  wb(x, box(2152, 482, 166, 186), '#F2B880', { g: '#E08A5A', pen: 0, edge: 0, j: 1 });
  emis.push({ id: 'win', c, p: 1 });
  return { layers, emis, A: { fire: [615, 940] } };
};

// ---------- 餐桌
SETS.dining = () => {
  R_ = mulberry(303);
  const layers = [], emis = [];
  let [c, x] = Lr();
  room(x);
  wb(x, box(1890, 510, 210, 250), '#7A5A3C', { j: 2 }); wb(x, box(1902, 522, 186, 226), '#6A7096', { g: '#8A8EAE', j: 1 });
  ln(x, [1995, 522], [1995, 748], { a: .6, w: 2 }); ln(x, [1902, 635], [2088, 635], { a: .6, w: 2 });
  wb(x, box(2290, 540, 230, 462), '#6A4A30', { g: '#553A24', j: 2 });
  wb(x, box(430, 520, 420, 20), '#7A5636');
  jar(x, 500, 520, 70, 90, '#B0603C'); jar(x, 610, 520, 60, 60, '#C48A5A'); jar(x, 720, 520, 80, 110, '#8E6A4E');
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  wb(x, box(760, 906, 1080, 38), '#8A6238', { g: '#6E4C2A' });
  wb(x, box(800, 944, 34, 170), '#6E4C2A', { j: 2 }); wb(x, box(1766, 944, 34, 170), '#6E4C2A', { j: 2 });
  for (const bx of [880, 1050, 1230, 1500, 1680]) ws(x, [[bx - 34, 906], [bx - 26, 884], [bx + 26, 884], [bx + 34, 906]], '#B98A60', { edge: .2 });
  ws(x, ell(1390, 894, 54, 16, 10), '#D9B070', { edge: .25 });
  ws(x, [[1262, 906], [1268, 884], [1312, 884], [1318, 906]], '#A0623C'); pen(x, [[1290, 884], [1290, 872]], { w: 2.4 });
  layers.push({ c, p: 1, front: true });
  [c, x] = Lr();
  jar(x, 2440, 1480, 300, 460, '#5A3A26');
  layers.push({ c, p: 1.25, front: true });
  return { layers, emis, A: { lamp: [1290, 868], win: [1995, 635] } };
};

// ---------- 臥房
SETS.bedroom = () => {
  R_ = mulberry(404);
  const layers = [], emis = [];
  let [c, x] = Lr();
  room(x);
  wb(x, box(1040, 460, 220, 240), '#7A5A3C', { j: 2 }); wb(x, box(1052, 472, 196, 216), '#6A7096', { g: '#8A8EAE', j: 1 });
  ln(x, [1150, 472], [1150, 688], { a: .6, w: 2 });
  wb(x, box(1400, 962, 660, 64), '#C9B07A', { g: '#A88E5A' });
  wb(x, box(1390, 1026, 680, 26), '#6E4C2A', { j: 2 });
  hatch(x, 1400, 966, 660, 56, 80, .2, 24, R_, { a: .3 });
  wb(x, box(1330, 948, 96, 14), '#7A5636'); wb(x, box(1344, 962, 12, 90), '#5A4028', { j: 1 }); wb(x, box(1400, 962, 12, 90), '#5A4028', { j: 1 });
  jar(x, 620, 1010, 120, 190, '#A0623C');
  wb(x, box(420, 560, 30, 30), '#5A4028', { j: 1 }); ws(x, [[400, 590], [470, 590], [500, 900], [380, 900]], '#B8A27E', { g: '#9A8462' });
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  wb(x, box(-10, -10, 200, WH + 20), '#4A3424', { j: 4 });
  layers.push({ c, p: 1.25, front: true });
  [c, x] = Lr();
  wb(x, box(1052, 472, 196, 216), '#C9D6F4', { g: '#A8B8E0', pen: 0, edge: 0, j: 1 });
  wash(x, [[1052, 688], [1248, 688], [1520, 1010], [1130, 1010]], '#C8D6FA', { a: .11, alpha: .11, dir: 52, maxR: 24 });   // 月光斜斜照進來
  wash(x, [[1130, 1010], [1520, 1010], [1760, 1300], [1200, 1300]], '#C8D6FA', { a: .05, alpha: .05, dir: 52, maxR: 26 });
  emis.push({ id: 'moon', c, p: 1 });
  return { layers, emis, A: { win: [1150, 580], lamp: [1378, 930] } };
};

// ---------- 客廳與火爐（長筒鞋掛在爐口上方）
SETS.living = () => {
  R_ = mulberry(505);
  const layers = [], emis = [];
  let [c, x] = Lr();
  room(x);
  wb(x, [[1545, 712], [1585, 156], [1855, 156], [1895, 712]], '#B9A283', { g: '#A08A6C' });
  wb(x, box(1480, 740, 480, 270), '#A8937A', { g: '#8C7860' });
  for (let i = 0; i < 5; i++) ln(x, [1484, 790 + i * 48], [1956, 790 + i * 48], { a: .28 });
  wb(x, box(1580, 800, 280, 210), '#241610', { edge: 0, j: 2 });
  wb(x, box(1450, 712, 540, 34), '#6E5238');
  for (let i = 0; i < 3; i++) ws(x, ell(1660 + i * 60, 990, 44, 13, 9), '#4A3020', { edge: .2 });
  wb(x, box(140, 540, 220, 462), '#6A4A30', { g: '#553A24', j: 2 });
  wb(x, box(520, 882, 420, 30), '#8A6238'); wb(x, box(546, 912, 28, 170), '#6E4C2A', { j: 2 }); wb(x, box(886, 912, 28, 170), '#6E4C2A', { j: 2 });
  jar(x, 640, 882, 70, 96, '#B0603C'); ws(x, [[760, 882], [770, 862], [830, 862], [840, 882]], '#B98A60', { edge: .2 });
  ln(x, [1080, 560], [1450, 610], { w: 2, a: .7 });
  const cl = ['#D8CBB0', '#B9A27E', '#C9B48E'];
  for (let i = 0; i < 3; i++) { const cx = 1130 + i * 100, cy = 568 + i * 13; ws(x, [[cx - 34, cy], [cx + 34, cy + 9], [cx + 30, cy + 130], [cx - 30, cy + 122]], cl[i], { g: dark(cl[i], .2) }); }
  wb(x, box(1290, 946, 96, 16), '#7A5636'); wb(x, box(1300, 962, 12, 96), '#5A4028', { j: 1 }); wb(x, box(1364, 962, 12, 96), '#5A4028', { j: 1 });
  jar(x, 2140, 1010, 110, 170, '#8E6A4E');
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  const bx = [1640, 1700, 1770, 1830];
  for (let i = 0; i < 4; i++) boot(x, bx[i], 772, i < 2 ? '#7A4E2E' : '#8A5E3A');
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  wb(x, box(-10, -10, 150, WH + 20), '#4A3424', { j: 4 });
  layers.push({ c, p: 1.25, front: true });
  return { layers, emis, A: { fire: [1720, 990], boots: bx, bootY: 772 } };
};

// ---------- 從爐膛仰望煙囪
SETS.chimneyUp = () => {
  R_ = mulberry(606);
  const layers = [], emis = [];
  let [c, x] = Lr();
  const I = [[1130, 570], [1430, 570], [1430, 870], [1130, 870]], O = [[-10, -10], [WW + 10, -10], [WW + 10, WH + 10], [-10, WH + 10]];
  const cols = ['#6A4C34', '#553A28', '#4A3222', '#5A4030'];
  for (let k = 0; k < 4; k++) wb(x, [O[k], O[(k + 1) % 4], I[(k + 1) % 4], I[k]], cols[k], { g: dark(cols[k], .35), j: 4, step: 160 });
  for (let r = 1; r < 9; r++) { const t = Math.pow(r / 9, 1.6); const q = O.map((o, k) => [lerp(I[k][0], o[0], t), lerp(I[k][1], o[1], t)]); pen(x, seg(q, true, 120, 3, R_), { close: true, a: .4, w: 1.6 + t * 2 }); }
  for (let k = 0; k < 4; k++) for (let m = 1; m < 5; m++) { const a = [lerp(I[k][0], I[(k + 1) % 4][0], m / 5), lerp(I[k][1], I[(k + 1) % 4][1], m / 5)], b = [lerp(O[k][0], O[(k + 1) % 4][0], m / 5), lerp(O[k][1], O[(k + 1) % 4][1], m / 5)]; ln(x, a, b, { a: .22, w: 1.4 }); }
  wb(x, box(1130, 570, 300, 300), '#2A3050', { edge: 0, j: 1 });
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  wb(x, box(1132, 572, 296, 296), '#3A4672', { g: '#2A3258', pen: 0, edge: 0, j: 1 });
  for (let i = 0; i < 16; i++) { const a = .5 + R_() * .5; dot(x, 1150 + R_() * 260, 590 + R_() * 260, 1.6 + R_() * 2.2, '#FFF6DC', a); }
  emis.push({ id: 'sky', c, p: 1 });
  return { layers, emis, A: { sky: [1280, 720] } };
};

// ---------- 城裡的大街與酒樓
SETS.street = () => {
  R_ = mulberry(707);
  const layers = [], emis = [];
  let [c, x] = Lr();
  skyWash(x, '#A9BCC8', '#F2DDB8');
  for (let i = 0; i < 11; i++) { const bx = i * 250 - 60 + R_() * 60, top = 520 + R_() * 190, bw = 190 + R_() * 90; wb(x, box(bx, top, bw, 600), '#BDB0CA', { g: '#D6CCD8', pen: .3, edge: .12 }); if (i % 3 === 1) ws(x, ell(bx + bw / 2, top, bw * .32, bw * .3, 12, Math.PI, Math.PI * 2), '#B4A6C4', { pen: .3, edge: .1 }); }
  layers.push({ c, p: .25 });
  [c, x] = Lr();
  const pl = ['#D8BE96', '#C9A882', '#BFA07A', '#D2B48A'];
  for (let i = 0; i < 9; i++) {
    const bx = i * 320 - 120, top = 380 + R_() * 170;
    wb(x, box(bx, top, 300, 720), pl[i % 4], { g: dark(pl[i % 4], .15) });
    for (let k = 0; k < 2; k++) for (let m = 0; m < 3; m++) wb(x, box(bx + 40 + m * 86, top + 70 + k * 150, 40, 62), '#5A4636', { j: 1.5, step: 40 });
    if (i % 2) ws(x, [[bx + 10, 800], [bx + 290, 800], [bx + 310, 850], [bx - 10, 850]], i % 4 === 1 ? '#A0623C' : '#C8A060', { edge: .2 });
    wb(x, archPts(bx + 150, 1010, 60, 110, 170), '#4A3828', { j: 2, step: 50 });
  }
  layers.push({ c, p: .7 });
  [c, x] = Lr();
  ws(x, [[-30, 1010], [2590, 1010], [2590, WH + 30], [-30, WH + 30]], '#B89A72', { g: '#9A7E58', pen: .5 });
  for (let i = 0; i < 9; i++) ln(x, [0, 1040 + i * i * 6], [WW, 1040 + i * i * 6], { a: .16, step: 160 });
  hatch(x, 0, 1020, WW, 400, 260, 1.5, 22, R_, { a: .16 });
  wb(x, box(-30, 300, 540, 716), '#CDB48C', { g: '#B49A72' });
  wb(x, archPts(250, 1014, 110, 260, 360), '#4A3828', { j: 2 });
  for (let m = 0; m < 3; m++) wb(x, box(40 + m * 160, 380, 70, 100), '#5A4636', { j: 1.5, step: 40 });
  wb(x, box(1760, 400, 780, 616), '#C2A27A', { g: '#A8885E' });
  wb(x, box(1740, 388, 820, 26), '#8A6238');
  for (let m = 0; m < 5; m++) wb(x, box(1820 + m * 140, 470, 70, 96), '#4A3828', { j: 1.5, step: 40 });
  wb(x, box(1790, 596, 720, 14), '#7A5636'); for (let m = 0; m < 19; m++) ln(x, [1800 + m * 39, 560], [1800 + m * 39, 596], { a: .5 });
  for (const ax of [1900, 2110, 2320]) wb(x, archPts(ax, 912, 82, 210, 290), '#3A2418', { j: 2, step: 50 });
  wb(x, box(650, 770, 14, 246), '#6E5238', { j: 1 }); wb(x, box(950, 770, 14, 246), '#6E5238', { j: 1 });
  ws(x, [[620, 770], [990, 770], [1020, 836], [590, 836]], '#C8A060', { g: '#A8824A' });
  wb(x, box(640, 930, 330, 22), '#7A5636');
  const fr = ['#C9A050', '#8E9A62', '#B98A60', '#D8B878'];
  for (let i = 0; i < 4; i++) { ws(x, [[660 + i * 80, 930], [668 + i * 80, 900], [726 + i * 80, 900], [734 + i * 80, 930]], '#9A7A4A', { edge: .2 }); for (let k = 0; k < 5; k++) ws(x, ell(676 + i * 80 + k * 11, 896 - (k % 2) * 7, 8, 8, 7), fr[i], { pen: .4, edge: .1 }); }
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  ws(x, [[-40, -40], [900, -40], [820, 120], [-40, 260]], '#5A3E2A', { g: '#3E2A1C' });
  layers.push({ c, p: 1.28, front: true });
  // 酒樓亮起的窗：暖光、賓客剪影、絲綢色塊
  [c, x] = Lr();
  const silk = ['#9A5A8A', '#4E9494', '#E0B040'];
  let n = 0;
  for (const ax of [1900, 2110, 2320]) {
    const ap = archPts(ax, 912, 78, 208, 286);
    ws(x, ap, '#F6C860', { g: '#E08A3A', pen: 0, edge: 0, smooth: false });
    x.save(); trace(x, ap, true, false); x.clip();
    for (let k = 0; k < 2; k++) {
      const px = ax - 38 + k * 76, wom = (n++) % 2 === 0;
      const col = wom ? silk[(n >> 1) % 3] : '#3A2418';
      x.fillStyle = col; x.beginPath(); x.moveTo(px - 30, 850); x.quadraticCurveTo(px - 26, 770, px, 764); x.quadraticCurveTo(px + 26, 770, px + 30, 850); x.closePath(); x.fill();
      x.fillStyle = '#3A2418'; x.beginPath(); x.arc(px, 746, 17, 0, 7); x.fill();
      if (wom) { x.fillStyle = '#FFF2C8'; for (let b = 0; b < 5; b++) { x.beginPath(); x.arc(px - 10 + b * 5, 770 + Math.abs(b - 2) * -2 + 4, 2.2, 0, 7); x.fill(); } }
    }
    x.fillStyle = '#3A2418'; x.fillRect(ax - 80, 850, 160, 70);
    x.fillStyle = '#5A3A22'; for (let b = 0; b < 4; b++) { x.beginPath(); x.ellipse(ax - 48 + b * 32, 848, 13, 7, 0, 0, 7); x.fill(); }
    x.restore();
  }
  for (let m = 0; m < 5; m++) wb(x, box(1822 + m * 140, 472, 66, 92), '#F2B860', { g: '#E08A3A', pen: 0, edge: 0, j: 1 });
  emis.push({ id: 'tavern', c, p: 1 });
  return { layers, emis, A: { tavern: [2110, 760] } };
};

// ---------- 富人宅邸的廚房
SETS.mansionKitchen = () => {
  R_ = mulberry(808);
  const layers = [], emis = [];
  let [c, x] = Lr();
  room(x, { wall: '#D9CDB6', floor: '#A89A86', beam: false });
  const ap = archPts(1280, 720, 190, 300, 420);
  wb(x, archPts(1280, 730, 206, 306, 440), '#B9A88C', { j: 2 });
  wb(x, ap, '#A8AEB8', { j: 1.5 });
  wb(x, box(400, 100, 80, 904), '#C4B498', { g: '#A8987C' }); wb(x, box(2080, 100, 80, 904), '#C4B498', { g: '#A8987C' });
  wb(x, box(380, 100, 120, 30), '#A8987C'); wb(x, box(2060, 100, 120, 30), '#A8987C');
  ln(x, [560, 250], [2000, 250], { w: 3, a: .7 });
  for (let i = 0; i < 9; i++) { const px = 620 + i * 160 + (i > 3 ? 60 : 0); if (px > 1040 && px < 1520) continue; ln(x, [px, 250], [px, 300], { a: .6 }); ws(x, ell(px, 330, 40, 30, 10, 0, Math.PI), '#B87A4A', { g: '#8A5A34' }); }
  for (const jx of [570, 680, 1880, 1990]) jar(x, jx, 1004, 100, 210, jx % 20 ? '#B98A60' : '#A0623C');
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  wb(x, box(480, 906, 1640, 42), '#8A6A46', { g: '#6E5234' });
  wb(x, box(520, 948, 1560, 210), '#9A7C58', { g: '#7A6040' });
  for (let i = 1; i < 6; i++) ln(x, [520 + i * 260, 952], [520 + i * 260, 1154], { a: .35 });
  ws(x, ell(700, 896, 70, 18, 10), '#D9B070', { edge: .25 }); ws(x, ell(1120, 894, 56, 20, 10), '#EAD9B4', { edge: .2 });
  ws(x, [[880, 906], [892, 872], [980, 872], [992, 906]], '#B98A60');
  for (let i = 0; i < 7; i++) ws(x, ell(1400 + i * 30, 894 - (i % 2) * 6, 14, 12, 8), ['#7A9A5A', '#D08A4A', '#C9A050'][i % 3], { edge: .2 });
  jar(x, 1700, 906, 70, 100, '#B0603C'); ws(x, [[1880, 906], [1892, 880], [1968, 880], [1980, 906]], '#B98A60');
  layers.push({ c, p: 1, front: true });
  [c, x] = Lr();
  wb(x, ap, '#FFF6DC', { g: '#F6E6BC', pen: 0, edge: 0, j: 1.5 }); emis.push({ id: 'winA', c, p: 1 });
  [c, x] = Lr();
  wb(x, ap, '#F6B870', { g: '#E08A4A', pen: 0, edge: 0, j: 1.5 }); emis.push({ id: 'winB', c, p: 1 });
  return { layers, emis, A: { win: [1280, 540] } };
};

// ---------- 宅邸門廊
SETS.porch = () => {
  R_ = mulberry(909);
  const layers = [], emis = [];
  let [c, x] = Lr();
  room(x, { wall: '#CDBB9E', floor: '#A8977E', beam: false, fy: 1010 });
  for (let i = 0; i < 8; i++) ln(x, [0, 1030 + i * i * 7], [WW, 1030 + i * i * 7], { a: .2, step: 160 });
  for (let i = 0; i < 12; i++) ln(x, [1280 + (i - 6) * 150, 1012], [1280 + (i - 6) * 330, WH], { a: .2, step: 120 });
  const ap = archPts(1700, 1012, 200, 540, 690);
  wb(x, archPts(1700, 1014, 222, 548, 714), '#B9A88C', { j: 2 });
  wb(x, ap, '#D8D0BC', { j: 1.5 });
  wb(x, box(1370, 300, 76, 712), '#C4B498', { g: '#A8987C' }); wb(x, box(1954, 300, 76, 712), '#C4B498', { g: '#A8987C' });
  wb(x, box(1352, 286, 112, 28), '#A8987C'); wb(x, box(1936, 286, 112, 28), '#A8987C');
  wb(x, [[2030, 470], [2150, 520], [2150, 1040], [2030, 1012]], '#6E5238', { g: '#553A24' });
  wb(x, archPts(760, 760, 130, 220, 310), '#B4A286', { g: '#9A8A70', j: 2 });
  jar(x, 760, 760, 110, 190, '#A0623C');
  wb(x, box(440, 930, 520, 26), '#8A6A46'); wb(x, box(470, 956, 26, 58), '#6E5234', { j: 1 }); wb(x, box(904, 956, 26, 58), '#6E5234', { j: 1 });
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  wb(x, box(-10, -10, 240, WH + 20), '#5A4636', { j: 4 });
  layers.push({ c, p: 1.25, front: true });
  [c, x] = Lr();
  wb(x, ap, '#FFF6DC', { g: '#F2E2B8', pen: 0, edge: 0, j: 1.5 });
  x.save(); trace(x, ap, true, false); x.clip();
  ws(x, [[1480, 1012], [1480, 900], [1620, 880], [1780, 895], [1920, 880], [1920, 1012]], '#C9D0A8', { pen: .3, edge: .1 });
  for (const tx of [1560, 1790, 1850]) ws(x, [[tx - 22, 900], [tx - 14, 720], [tx, 640], [tx + 14, 720], [tx + 22, 900]], '#7E9470', { pen: .4, edge: .15 });
  x.restore();
  emis.push({ id: 'door', c, p: 1 });
  return { layers, emis, A: { door: [1700, 700] } };
};

// ---------- 城門
SETS.gate = () => {
  R_ = mulberry(1010);
  const layers = [], emis = [];
  let [c, x] = Lr();
  skyWash(x, '#B4C2D2', '#F8DDB0', '#F0D8C0');
  hill(x, 840, 150, '#B8A8C8', { f: 1.9 });
  layers.push({ c, p: .15 });
  [c, x] = Lr();
  hill(x, 960, 110, '#9AA07E', { f: 2.6 });
  wb(x, box(-30, 440, 1520, 600), '#C8B08C', { g: '#B09870' });
  for (let i = 0; i < 20; i++) wb(x, box(-20 + i * 78, 404, 44, 40), '#C8B08C', { j: 1.5, step: 40 });
  for (let r = 0; r < 8; r++) ln(x, [-20, 500 + r * 68], [1486, 500 + r * 68], { a: .22, step: 140 });
  wb(x, box(110, 300, 220, 740), '#BCA480', { g: '#A48C68' }); wb(x, box(1170, 300, 220, 740), '#BCA480', { g: '#A48C68' });
  for (const tx of [110, 1170]) { for (let i = 0; i < 4; i++) wb(x, box(tx + i * 62, 266, 34, 36), '#BCA480', { j: 1.5, step: 40 }); wb(x, box(tx + 88, 420, 44, 80), '#4A3828', { j: 1.5, step: 40 }); }
  wb(x, archPts(720, 1034, 180, 320, 470), '#3A2A20', { j: 2 });
  layers.push({ c, p: .9 });
  [c, x] = Lr();
  ws(x, [[-30, 1008], [800, 1014], [1600, 1000], [2590, 990], [2590, WH + 30], [-30, WH + 30]], '#B09C70', { g: '#8E7A52', pen: .5 });
  const RD = [[720, 1036], [1000, 1066], [1400, 1136], [1900, 1236], [2600, 1350]];
  ws(x, ribbon(RD, 84, 190), '#D2BE98', { pen: .35, edge: .15 });
  hatch(x, 0, 1020, WW, 400, 300, .1, 44, R_, { a: .2 });
  tree(x, 2240, 1040, 480); tree(x, 1700, 1010, 220);
  wb(x, box(1560, 1030, 34, 60), '#A89A86', { j: 1.5, step: 40 });
  layers.push({ c, p: 1 });
  [c, x] = Lr();
  ws(x, ell(1980, 560, 460, 460, 26), '#FFF2D0', { a: .12, alpha: .12, maxR: 30 }); ws(x, ell(1980, 560, 290, 290, 24), '#FFF2D0', { a: .2, alpha: .2, maxR: 26 });   // 太陽：兩圈光暈加日面
  ws(x, ell(1980, 560, 130, 130, 22), '#FFFBEA', { maxR: 20 });
  emis.push({ id: 'sun', c, p: .15, sky: true });
  return { layers, emis, A: { RD, gate: [720, 1036] } };
};

// ---------- 歉收的田（閃回）
SETS.field = () => {
  R_ = mulberry(1111);
  const layers = [];
  let [c, x] = Lr();
  skyWash(x, '#B8B0B8', '#E8D0A8', '#D8C4B0');
  hill(x, 820, 110, '#B8A8C0', { f: 2.1 });
  layers.push({ c, p: .2 });
  [c, x] = Lr();
  ws(x, [[-30, 860], [1300, 846], [2590, 862], [2590, WH + 30], [-30, WH + 30]], '#B89E70', { g: '#8E744A', pen: .5 });
  for (let r = 0; r < 9; r++) {
    const yy = 880 + r * r * 7.2, sc = .35 + r * .12;
    ln(x, [0, yy + 6], [WW, yy + 6], { a: .25, step: 150 });
    for (let i = 0; i < 46; i++) { const sx = (i + R_()) * (WW / 44), lean = (R_() - .3) * 60 * sc, hh = (40 + R_() * 70) * sc; pen(x, [[sx, yy], [sx + lean * .4, yy - hh * .6], [sx + lean, yy - hh]], { w: 1.4 + sc * 1.6, a: .75, c: '#6A5232', smooth: true }); if (R_() < .5) pen(x, [[sx + lean * .4, yy - hh * .6], [sx + lean * .4 + 16 * sc, yy - hh * .45]], { w: 1.2 + sc, a: .6, c: '#7A6240' }); }
  }
  for (let i = 0; i < 30; i++) { const cx = R_() * WW, cy = 1000 + R_() * 400; pen(x, seg([[cx, cy], [cx + 60 + R_() * 80, cy + (R_() - .5) * 40], [cx + 150, cy + (R_() - .5) * 70]], false, 30, 6, R_), { a: .4, w: 1.6 }); }
  tree(x, 2050, 880, 300, '#5A4A3E');
  layers.push({ c, p: 1 });
  return { layers, emis: [], A: {} };
};

// ---------- 羊皮紙地圖
SETS.map = () => {
  R_ = mulberry(1212);
  const layers = [];
  const [c, x] = Lr();
  wb(x, box(0, 0, WW, WH), '#E8D6B0', { maxR: 34, dir: 8, j: 0 });
  for (let i = 0; i < 60; i++) glow(x, R_() * WW, R_() * WH, 100 + R_() * 320, R_() < .6 ? '#D8C49C' : '#F4EAD2', .14 + R_() * .14, 'source-over');
  grain(x);
  pen(x, seg(box(70, 70, WW - 140, WH - 140), true, 160, 2, R_), { close: true, w: 3, a: .7 });
  pen(x, seg(box(90, 90, WW - 180, WH - 180), true, 160, 2, R_), { close: true, w: 1.4, a: .6 });
  const RV = [[200, 300], [520, 420], [760, 560], [900, 760], [1180, 1000], [1500, 1140], [1900, 1220], [2380, 1300]];
  pen(x, RV, { smooth: true, w: 16, a: .5, c: '#9AAAB8' }); pen(x, RV, { smooth: true, w: 1.6, a: .5 });
  const V = [620, 980], C = [1960, 470];
  const RT = [[620, 980], [800, 900], [980, 930], [1160, 820], [1300, 700], [1480, 720], [1640, 600], [1800, 560], [1960, 470]];
  const OTH = [[1120, 380], [1560, 1040], [2240, 960], [380, 470], [2180, 240]];
  const mtn = (mx, my, s) => { pen(x, [[mx - 34 * s, my], [mx - 6 * s, my - 44 * s], [mx + 8 * s, my - 26 * s], [mx + 20 * s, my - 38 * s], [mx + 40 * s, my]], { w: 1.8, a: .75 }); for (let k = 0; k < 4; k++) pen(x, [[mx - 4 * s + k * 5 * s, my - 34 * s + k * 7 * s], [mx + 4 * s + k * 5 * s, my - 6 * s]], { w: 1, a: .45 }); };
  for (let i = 0; i < 46; i++) { const mx = 200 + R_() * 2160, my = 220 + R_() * 1050; let ok = true; for (const p of RT.concat(OTH)) if (Math.hypot(p[0] - mx, p[1] - my) < 130) ok = false; if (ok) mtn(mx, my, .7 + R_() * .7); }
  for (let i = 0; i < 70; i++) { const tx = 200 + R_() * 2160, ty = 200 + R_() * 1080; let ok = true; for (const p of RT.concat(OTH)) if (Math.hypot(p[0] - tx, p[1] - ty) < 90) ok = false; if (ok) { pen(x, [[tx, ty], [tx, ty - 14]], { w: 1.2, a: .6 }); ws(x, ell(tx, ty - 20, 8, 10, 7), '#9AA27E', { pen: .5, edge: .1, a: .7 }); } }
  const hut = (hx, hy, s, main) => {
    wb(x, box(hx - 22 * s, hy - 20 * s, 44 * s, 22 * s), '#D8BE96', { j: 1, step: 30, pw: 1.3 });
    wb(x, [[hx - 28 * s, hy - 20 * s], [hx - 16 * s, hy - 40 * s], [hx + 16 * s, hy - 40 * s], [hx + 28 * s, hy - 20 * s]], main ? '#4F6B3A' : '#A08A68', { j: 1, step: 30, pw: 1.3 });
    if (main) wb(x, box(hx + 6 * s, hy - 62 * s, 8 * s, 26 * s), '#6B4A2E', { j: .8, step: 30, pw: 1.2 });
  };
  hut(V[0], V[1], 1.5, true); hut(V[0] - 96, V[1] + 26, .8); hut(V[0] + 100, V[1] + 34, .8);
  for (const o of OTH) { hut(o[0], o[1], .9); hut(o[0] + 52, o[1] + 16, .7); }
  wb(x, box(C[0] - 110, C[1] - 46, 220, 60), '#D2BE9C', { j: 1.5, step: 50 });
  for (let i = 0; i < 9; i++) wb(x, box(C[0] - 108 + i * 25, C[1] - 60, 14, 14), '#D2BE9C', { j: 1, step: 30, pw: 1.2 });
  wb(x, box(C[0] - 132, C[1] - 96, 40, 112), '#C4AE8A', { j: 1.5, step: 50 }); wb(x, box(C[0] + 92, C[1] - 96, 40, 112), '#C4AE8A', { j: 1.5, step: 50 });
  ws(x, ell(C[0], C[1] - 50, 44, 46, 12, Math.PI, Math.PI * 2), '#BCA6C0', { edge: .15 });
  wb(x, archPts(C[0], C[1] + 14, 16, 22, 36), '#5A4636', { j: 1, step: 30, pw: 1.2 });
  x.save(); x.translate(2280, 1180); pen(x, ell(0, 0, 64, 64, 28), { close: true, a: .6 }); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 40 : 84; wash(x, [[Math.cos(a) * r, Math.sin(a) * r], [Math.cos(a + 1.57) * 9, Math.sin(a + 1.57) * 9], [Math.cos(a - 1.57) * 9, Math.sin(a - 1.57) * 9]], k % 2 ? '#C9B48E' : '#6A5238', { edge: 0, pw: 1.1 }); } x.restore();
  layers.push({ c, p: 1 });
  return { layers, emis: [], A: { V, C, RT, OTH } };
};
