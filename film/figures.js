'use strict';
// 人物：用十幾到三十幾刀畫成，每格用固定種子重建，所以顏料不會抖。
// 靠輪廓與姿勢表演；臉只有膚色一刀、鬍子一刀，大比例的側臉才多一個眼點。
const SKIN = '#E0B28A';
const WHO = {
  sis1: { h: 1.0, tunic: '#C9A877', sash: '#9A6B3F', hair: '#3B2A1E', braid: true, long: true },
  sis2: { h: .9, tunic: '#D6BE96', sash: '#7C8A5A', hair: '#4A3524', bun: true, long: true },
  sis3: { h: .8, tunic: '#DECBA8', sash: '#B08A4A', hair: '#5A4030', bun: true, long: true },
  father: { h: 1.08, tunic: '#8A6E50', sash: '#4E3B2A', hair: '#4A4038', beard: '#4A4038', hunch: .1 },
  mother: { h: 1.0, tunic: '#8F8B84', sash: '#6A5A4A', hair: '#4A3A30', scarf: '#E2D4B6', long: true },
  woman: { h: 1.02, tunic: '#A68C60', sash: '#6A5238', hair: '#4A3A30', scarf: '#C99A4A', long: true },
  servA: { h: 1.0, tunic: '#B9A27E', sash: '#7A6248', hair: '#3E3026', long: true, bun: true },
  servB: { h: 1.06, tunic: '#9A8468', sash: '#5A4634', hair: '#3A2E28' },
  master: { h: 1.14, cloak: '#3F3B46', hair: '#3A2E28' },
  nick: { h: 1.14, cloak: '#C4281E', hi: '#EA5A3C', dk: '#7C1713', hair: '#4A3A30', beard: '#4A3A30' },   // 全片唯一的紅
  follower: { h: 1.06, cloak: '#7F7D82', hair: '#3A2E28', hood: true },
};
const CROWD = [
  { h: 1.04, tunic: '#B49A78', sash: '#6E5A44', hair: '#3A2E28' },
  { h: .98, tunic: '#C4B49A', sash: '#8A6A4A', hair: '#4A3A30', scarf: '#B8A27A', long: true },
  { h: 1.08, tunic: '#8E8272', sash: '#4E4238', hair: '#2E2622', beard: '#2E2622' },
  { h: 1.0, tunic: '#A89A8A', sash: '#6A5A4A', hair: '#4A3A30', long: true, bun: true },
  { h: 1.1, cloak: '#6E6A5E', hair: '#3A2E28' },
  { h: .96, tunic: '#BCA684', sash: '#7C6A4E', hair: '#5A4636', scarf: '#D2C4A4', long: true },
];

// S：受光的筆觸；EM：自發光的筆觸（提燈）。f 的欄位和水彩版相同：
// who/col, x, y, h, face(1 右, -1 左, 0 背面, 2 正面), pose 'sit'|'crouch', sitk, crk, lean, head, shake, walk, bob,
// armA/armB/bendA/bendB（0=垂下，π/2=向前平舉，π=舉高）, bag, sack, basket, lantern, tablet, purse, hood, sil
function drawFig(S, EM, f) {
  const d = f.col || WHO[f.who];
  const u = (f.h || 420) * (d.h || 1), big = u > 250;
  const dir = f.face == null ? 1 : f.face, back = dir === 0, front = dir === 2, flat = back || front, m = dir === -1 ? -1 : 1;
  const tc = c => f.sil ? mixc(c, '#1E1612', f.sil) : c;
  const X = v => f.x + m * v, Y = v => f.y + (f.bob || 0) + v;
  let sd = (f.seed || 0) * 100;
  const K = (ax, ay, bx, by, wid, c, c2, o = {}) => kn(S, X(ax), Y(ay), X(bx), Y(by), wid, tc(c), tc(c2 || c), Object.assign({ seed: ++sd, over: 1.08 }, o));
  const D = (x, y, len, wid, c, c2, o = {}) => db(S, X(x), Y(y), len, wid, tc(c), tc(c2 || c), Object.assign({ seed: ++sd, hgt: .55 }, o, o.ang != null ? { ang: m === 1 ? o.ang : Math.PI - o.ang } : {}));

  const sitk = f.pose === 'sit' ? 1 : (f.sitk || 0), cr = f.pose === 'crouch' ? 1 : (f.crk || 0);
  const hipY = -0.47 * u + 0.2 * u * sitk + 0.3 * u * cr;
  const lean = (f.lean || 0) + (d.hunch || 0) + 0.5 * cr;
  const TL = 0.33 * u;
  const sx = Math.sin(lean) * TL, sy = hipY - Math.cos(lean) * TL;
  const ha = lean + (f.head || 0);
  const hx = sx + Math.sin(ha) * 0.115 * u + (f.shake || 0) * u, hy = sy - Math.cos(ha) * 0.115 * u;
  const w = f.walk, swing = w == null ? 0 : Math.sin(w) * 0.13 * u;
  const body = d.cloak || d.tunic, hi = d.hi || light(body, .22), dk = d.dk || dark(body, .38);

  D(0, .012 * u, .46 * u, .07 * u, '#2E2422', '#2E2422', { type: BRUSH, alpha: .3, hgt: .3 });   // 腳下的影子

  const arm = (ang, bend, isFront) => {
    const shx = sx + (flat ? (isFront ? 0.115 : -0.115) * u : (isFront ? 0.03 : -0.03) * u), shy = sy + 0.04 * u;
    const ex = shx + Math.sin(ang) * 0.16 * u, ey = shy + Math.cos(ang) * 0.16 * u;
    const a2 = ang + bend, hxn = ex + Math.sin(a2) * 0.15 * u, hyn = ey + Math.cos(a2) * 0.15 * u;
    const c = isFront ? body : dark(body, .22), c2 = isFront ? hi : body;
    K(shx, shy, ex, ey, .075 * u, c, c2, { over: 1.15 }); K(ex, ey, hxn, hyn, .066 * u, c, c2, { over: 1.02 });
    D(hxn, hyn, .066 * u, .066 * u, SKIN, light(SKIN, .2), { type: BRUSH });
    return [hxn, hyn];
  };
  const aA = (f.armA ?? 0.14) - (w == null ? 0 : Math.sin(w) * .45), aB = (f.armB ?? -0.1) + (w == null ? 0 : Math.sin(w) * .45);
  const bendA = f.bendA ?? 0.5, bendB = f.bendB ?? 0.4;

  if (f.sack) { D(sx - .23 * u, sy + .23 * u, .4 * u, .29 * u, '#9A8262', '#C2AC84', { ang: 1.45 }); K(sx - .3 * u, sy + .1 * u, sx - .34 * u, sy + .3 * u, .075 * u, '#D2BC90', '#B8A074', { hgt: 1.3, over: 1, bend: .25 }); K(sx - .17 * u, sy + .04 * u, sx - .08 * u, sy + .02 * u, .04 * u, '#5E4A34', '#7A6244', { over: 1 }); }
  if (f.bag) D(sx - .13 * u, sy + .15 * u, .15 * u, .19 * u, '#A08A64', '#BEA882');
  const hB = arm(aB, bendB, false);
  if (f.basket) { D(hB[0], hB[1] + .055 * u, .16 * u, .115 * u, '#9A7A4A', '#BC9A62'); K(hB[0] - .07 * u, hB[1] + .03 * u, hB[0] + .07 * u, hB[1] + .03 * u, .02 * u, '#6E5430', '#6E5430', { over: 1 }); }

  // 腿與腳
  if (!cr) {
    const legs = sitk > .5 ? [[0.03 * u, hipY, 0.24 * u, hipY + 0.02 * u, 0.26 * u, 0]] :
      [[0.045 * u, hipY, 0.05 * u + swing * .5, hipY * .5, swing + 0.03 * u, 0], [-0.045 * u, hipY, -0.03 * u - swing * .5, hipY * .5, -swing - 0.03 * u, 0]];
    if (!(d.long || d.cloak)) for (const l of legs) { K(l[0], l[1], l[2], l[3], .07 * u, dark(body, .5), dark(body, .35)); K(l[2], l[3], l[4], l[5] - .01 * u, .06 * u, dark(body, .5), dark(body, .35), { over: 1.02 }); }
    for (const l of legs) K(l[4] - .02 * u, l[5] - .012 * u, l[4] + .075 * u, l[5] - .012 * u, .042 * u, '#32241C', '#4A382C', { over: 1 });
  }

  // 身體
  if (d.cloak) {
    K(sx, sy - .03 * u, 0, -.025 * u, .45 * u, body, dk, { taper: .46, hgt: 1.3, over: 1.02 });       // 主體：一刀由肩到下襬
    K(sx + .01 * u, sy, .03 * u, hipY + .06 * u, .25 * u, hi, body, { taper: .25, hgt: 1.2, over: 1 });   // 胸前較亮的一片
    K(sx - .115 * u, sy + .03 * u, -.2 * u, -.04 * u, .05 * u, hi, light(hi, .25), { hgt: 1.5, over: 1 });   // 受光的邊
    K(sx + .12 * u, sy + .06 * u, .2 * u, -.04 * u, .07 * u, dk, dark(dk, .3), { over: 1 });               // 背光的邊
    K(sx + .02 * u, hipY - .08 * u, .055 * u, -.05 * u, .028 * u, dk, dk, { over: 1 });                    // 衣褶
    if (big) { K(sx - .05 * u, hipY - .1 * u, -.09 * u, -.05 * u, .03 * u, dk, dk, { over: 1 }); K(sx + .08 * u, hipY, .13 * u, -.05 * u, .026 * u, hi, hi, { over: 1, hgt: 1.3 }); }
  } else {
    const sw = flat ? 0.125 * u : 0.098 * u, hw = d.long ? 0.165 * u : 0.14 * u;
    const hemY = cr ? -.01 * u : (d.long ? -0.06 * u : lerp(-0.3 * u, hipY + 0.1 * u, sitk));
    const fx = lerp(hw, d.long ? 0.3 * u : 0.27 * u, sitk);
    const R = cr ? .24 * u : fx, Lx = cr ? -.22 * u : -hw * (1 - .25 * sitk), hipW = .255 * u + .1 * u * sitk, hipC = .05 * u * sitk, hemW = R - Lx, hemC = (R + Lx) / 2;
    const b2 = dark(body, .14), sh = hemY - hipY + .05 * u, wide = hemW > sh * 1.25;
    if (wide) K(Lx, hipY - .05 * u + sh / 2, R, hipY - .05 * u + sh / 2, sh, body, b2, { hgt: 1.2, over: 1 });   // 坐著或蹲著：下半身比高還寬，橫著一刀
    else K(hipC, hipY - .05 * u, hemC, hemY, hemW, body, b2, { taper: clamp(1 - hipW / hemW, 0, .6), hgt: 1.2, over: 1.02 });   // 下半身（裙或衣襬）
    K(sx, sy - .025 * u, hipC, hipY + .01 * u, hipW, hi, body, { taper: clamp(1 - sw * 2 / hipW, 0, .6), hgt: 1.25, over: 1.02 });   // 上身
    if (!wide) K(sx - sw * .9, sy + .04 * u, Lx + .01 * u, hemY - .02 * u, .035 * u, dk, dk, { over: 1 });                // 背後的暗邊
    if (big && !wide) {
      K(hipC + .02 * u, hipY + .02 * u, hemC + hemW * .18, hemY - .02 * u, .028 * u, dk, dk, { over: 1 }); K(hipC - .05 * u, hipY + .04 * u, hemC - hemW * .2, hemY - .02 * u, .024 * u, dk, dk, { over: 1 });
      K(sx + sw * .75, sy + .05 * u, hipC + hipW * .36, hipY - .04 * u, .034 * u, light(hi, .2), hi, { over: 1, hgt: 1.4 });
    }
    K(-0.122 * u, hipY - 0.045 * u, 0.122 * u + 0.08 * u * sitk, hipY - 0.045 * u, 0.036 * u, d.sash, dark(d.sash, .2), { over: 1 });
  }

  // 頭
  const hood = d.cloak && (f.hood ?? d.hood ?? false);
  const capC = hood ? d.cloak : (d.scarf || d.hair), capHi = hood ? hi : light(capC, .2);
  K(sx, sy + .01 * u, hx, hy + .03 * u, .052 * u, SKIN, dark(SKIN, .15), { over: 1 });
  if (d.braid && !front) K(hx - (back ? 0 : .06 * u), hy + .04 * u, sx - (back ? .01 * u : .1 * u), sy + .21 * u, .042 * u, d.hair, light(d.hair, .15), { bend: back ? 0 : -.3 * m, over: 1 });
  if ((d.scarf || hood) && !front) K(hx - .075 * u, hy - .01 * u, sx - (back ? 0 : .09 * u), sy + .075 * u, (back ? .19 : .1) * u, dark(capC, .25), capC);
  D(hx - (flat ? 0 : .018 * u), hy - .014 * u, (hood ? .225 : .182) * u, (hood ? .215 : .174) * u, capC, capHi);
  if (hood && !back) K(hx - .09 * u, hy - .07 * u, hx + .045 * u, hy - .098 * u, .06 * u, capHi, light(capHi, .2), { hgt: 1.4, over: 1 });
  if (d.bun && !hood) D(hx - (flat ? 0 : .078 * u), hy - (flat ? .088 * u : .052 * u), .08 * u, .074 * u, capC, capHi);
  if (!back) {
    if (front) { D(hx, hy + .016 * u, .118 * u, .13 * u, SKIN, light(SKIN, .15), { hgt: .3 }); if (d.beard) K(hx, hy + .14 * u, hx, hy + .05 * u, .105 * u, d.beard, dark(d.beard, .2), { taper: .5, over: 1 }); }
    else {
      D(hx + .04 * u, hy + .012 * u, (hood ? .088 : .1) * u, .122 * u, SKIN, light(SKIN, .15), { hgt: .3 });
      if (d.beard) K(hx + .085 * u, hy + .125 * u, hx + .03 * u, hy + .045 * u, .08 * u, light(d.beard, .12), d.beard, { over: 1, taper: .6 });
      if (big) D(hx + .062 * u, hy - .002 * u, .02 * u, .024 * u, '#2A1A10', '#2A1A10', { type: BRUSH, hgt: 1 });
    }
  }

  const hA = arm(aA, bendA, true);
  if (f.lantern) { K(hA[0], hA[1] + .01 * u, hA[0], hA[1] + .095 * u, .055 * u, '#4A3426', '#6A4E38', { over: 1 }); db(EM, X(hA[0]), Y(hA[1] + .055 * u), .05 * u, .058 * u, '#FFE9A0', '#FFC860', { seed: ++sd, hgt: 1.5, type: BRUSH }); }
  if (f.tablet) K(hA[0] - .01 * u, hA[1] - .02 * u, hA[0] + .085 * u, hA[1] - .02 * u, .07 * u, '#6A5238', '#86694A', { over: 1 });
  if (f.purse) D(hA[0] + .01 * u, hA[1] + .04 * u, .075 * u, .085 * u, '#8E6E3C', '#BE9A56');
}

// 睡著的人：枕頭、頭、被子隆起
function drawSleeper(S, s) {
  const d = WHO[s.who], L = s.len, br = s.br || 0, x = s.x, y = s.y, bl = s.blanket || '#9C7C5E';
  let sd = 900 + Math.round(x);
  db(S, x + 34, y - 14, 96, 34, '#E6DAC0', '#CFC2A6', { seed: ++sd, hgt: .5 });
  kn(S, x + 56, y - 24 - br * .5, x + L + 4, y - 14, 54 + br, bl, dark(bl, .25), { seed: ++sd, taper: .12, hgt: 1.2, over: 1 });
  kn(S, x + 72, y - 44 - br, x + L * .62, y - 50 - br, 11, light(bl, .25), bl, { seed: ++sd, hgt: 1.4, over: 1 });
  kn(S, x + L * .62, y - 49 - br, x + L, y - 30, 10, light(bl, .15), bl, { seed: ++sd, hgt: 1.3, over: 1 });
  db(S, x + 34, y - 30, 56, 52, d.hair, light(d.hair, .15), { seed: ++sd, hgt: .5 });
  kn(S, x + 44, y - 40, x + 45, y - 14, 30, light(SKIN, .15), SKIN, { seed: ++sd, over: 1 });
}
