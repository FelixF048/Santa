'use strict';
// 人物：小比例、以輪廓與姿勢表演，不畫五官（只有側臉的一個眼點）。每格重畫。
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
  nick: { h: 1.14, cloak: '#B3261E', hair: '#4A3A30', beard: '#4A3A30' },
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

function drawFig(x, f) {
  const d = f.col || WHO[f.who];
  const u = (f.h || 420) * (d.h || 1);
  const dir = f.face == null ? 1 : f.face;
  const back = dir === 0, front = dir === 2, flat = back || front;
  const tint = c => f.sil ? mixc(c, '#1E1612', f.sil) : c;
  const O = { fast: true, smooth: true, edge: .2, ew: Math.max(1.5, u * .012), pen: .72, pw: Math.max(1.1, u * .0042) };
  x.save(); x.translate(f.x, f.y + (f.bob || 0)); if (dir === -1) x.scale(-1, 1);
  const sitk = f.pose === 'sit' ? 1 : (f.sitk || 0), cr = f.pose === 'crouch' ? 1 : (f.crk || 0);
  const hipY = -0.47 * u + 0.2 * u * sitk + 0.3 * u * cr;
  const lean = (f.lean || 0) + (d.hunch || 0) + 0.5 * cr;
  const TL = 0.33 * u;
  const sx = Math.sin(lean) * TL, sy = hipY - Math.cos(lean) * TL;
  const ha = lean + (f.head || 0);
  const hx = sx + Math.sin(ha) * 0.115 * u + (f.shake || 0) * u, hy = sy - Math.cos(ha) * 0.115 * u;
  const w = f.walk, swing = w == null ? 0 : Math.sin(w) * 0.13 * u;
  const body = d.cloak || d.tunic;

  // 地面影子
  x.save(); x.globalAlpha = .2; x.fillStyle = '#24150B'; x.beginPath(); x.ellipse(0, 0, 0.2 * u, 0.032 * u, 0, 0, 7); x.fill(); x.restore();

  // 手臂：ang 0=垂下，π/2=向前平舉，π=舉高
  const arm = (ang, bend, isFront) => {
    const shx = sx + (flat ? (isFront ? 0.115 : -0.115) * u : (isFront ? 0.03 : -0.03) * u), shy = sy + 0.04 * u;
    const ex = shx + Math.sin(ang) * 0.16 * u, ey = shy + Math.cos(ang) * 0.16 * u;
    const a2 = ang + bend, hxn = ex + Math.sin(a2) * 0.15 * u, hyn = ey + Math.cos(a2) * 0.15 * u;
    x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = INK; x.globalAlpha = .7; x.lineWidth = 0.068 * u + O.pw * 2;
    x.beginPath(); x.moveTo(shx, shy); x.lineTo(ex, ey); x.lineTo(lerp(ex, hxn, .82), lerp(ey, hyn, .82)); x.stroke();
    x.globalAlpha = 1; x.strokeStyle = tint(isFront ? body : dark(body, .2)); x.lineWidth = 0.068 * u;
    x.beginPath(); x.moveTo(shx, shy); x.lineTo(ex, ey); x.lineTo(lerp(ex, hxn, .82), lerp(ey, hyn, .82)); x.stroke();
    x.fillStyle = tint(SKIN); x.beginPath(); x.arc(hxn, hyn, 0.03 * u, 0, 7); x.fill();
    x.restore();
    return [hxn, hyn];
  };
  const aA = (f.armA ?? 0.14) - (w == null ? 0 : Math.sin(w) * .45), aB = (f.armB ?? -0.1) + (w == null ? 0 : Math.sin(w) * .45);
  const bendA = f.bendA ?? 0.5, bendB = f.bendB ?? 0.4;

  if (f.sack) wash(x, ell(sx - 0.2 * u, sy + 0.17 * u, 0.15 * u, 0.2 * u, 12), tint('#BBA47C'), O);
  if (f.bag) wash(x, ell(sx - 0.13 * u, sy + 0.15 * u, 0.07 * u, 0.09 * u, 10), tint('#A08A64'), O);
  const hB = arm(aB, bendB, false);
  if (f.basket) wash(x, ell(hB[0], hB[1] + 0.05 * u, 0.075 * u, 0.055 * u, 10), tint('#9A7A4A'), O);

  // 腿與腳
  if (!cr) {
    x.save(); x.lineCap = 'round'; x.strokeStyle = tint(dark(body, .45)); x.lineWidth = 0.06 * u;
    const legs = sitk > .5 ? [[0.03 * u, hipY, 0.24 * u, hipY + 0.02 * u, 0.26 * u, 0]] :
      [[0.045 * u, hipY, 0.05 * u + swing * .5, hipY * .5, swing + 0.03 * u, 0], [-0.045 * u, hipY, -0.03 * u - swing * .5, hipY * .5, -swing - 0.03 * u, 0]];
    if (!(d.long || d.cloak)) for (const l of legs) { x.beginPath(); x.moveTo(l[0], l[1]); x.lineTo(l[2], l[3]); x.lineTo(l[4], l[5]); x.stroke(); }
    x.fillStyle = tint('#3E2C20');
    for (const l of legs) { x.beginPath(); x.ellipse(l[4] + 0.02 * u, l[5] - 0.012 * u, 0.045 * u, 0.02 * u, 0, 0, 7); x.fill(); }
    x.restore();
  }

  // 身體
  let pts;
  if (d.cloak) {
    pts = [[sx - 0.135 * u, sy + .01 * u], [sx, sy - 0.04 * u], [sx + 0.135 * u, sy + .01 * u], [0.17 * u, hipY], [0.215 * u, -0.03 * u], [-0.215 * u, -0.03 * u], [-0.17 * u, hipY]];
  } else {
    const sw = flat ? 0.125 * u : 0.098 * u, hw = d.long ? 0.165 * u : 0.14 * u;
    const hemY = d.long ? -0.06 * u : lerp(-0.3 * u, hipY + 0.1 * u, sitk);
    const fx = lerp(hw, d.long ? 0.3 * u : 0.27 * u, sitk);
    pts = [[sx - sw, sy + .012 * u], [sx, sy - 0.03 * u], [sx + sw, sy + .012 * u], [0.125 * u + 0.1 * u * sitk, hipY - 0.02 * u],
      [cr ? 0.24 * u : fx, cr ? -0.01 * u : hemY], [cr ? -0.22 * u : -hw * (1 - .25 * sitk), cr ? -0.01 * u : hemY], [-0.13 * u, hipY]];
  }
  wash(x, pts, tint(body), O);
  if (!d.cloak) { x.save(); x.strokeStyle = tint(d.sash); x.lineWidth = 0.032 * u; x.lineCap = 'round'; x.beginPath(); x.moveTo(-0.118 * u, hipY - 0.045 * u); x.lineTo(0.118 * u + 0.08 * u * sitk, hipY - 0.045 * u); x.stroke(); x.restore(); }

  // 頭
  const hood = d.cloak && (f.hood ?? d.hood ?? false);
  x.save(); x.strokeStyle = tint(SKIN); x.lineWidth = 0.05 * u; x.lineCap = 'round'; x.beginPath(); x.moveTo(sx, sy); x.lineTo(hx, hy); x.stroke(); x.restore();
  const capC = tint(hood ? d.cloak : (d.scarf || d.hair));
  if (d.braid && !front) { x.save(); x.strokeStyle = tint(d.hair); x.lineWidth = 0.036 * u; x.lineCap = 'round'; x.beginPath(); x.moveTo(hx - (back ? 0 : 0.06 * u), hy + 0.04 * u); x.quadraticCurveTo(sx - (back ? 0 : 0.12 * u), sy + 0.05 * u, sx - (back ? 0.01 * u : 0.1 * u), sy + 0.21 * u); x.stroke(); x.restore(); }
  if ((d.scarf || hood) && !front) wash(x, [[hx - 0.085 * u, hy - 0.03 * u], [hx - 0.11 * u, sy + 0.07 * u], [sx + (back ? 0.11 * u : 0.02 * u), sy + 0.04 * u], [hx + (back ? 0.085 * u : 0.0), hy + 0.05 * u]], capC, O);
  wash(x, ell(hx - (flat ? 0 : 0.016 * u), hy - 0.012 * u, (hood ? 0.098 : 0.084) * u, (hood ? 0.1 : 0.082) * u, 12), capC, O);
  if (d.bun && !hood) wash(x, ell(hx - (flat ? 0 : 0.075 * u), hy - (flat ? 0.085 * u : 0.05 * u), 0.036 * u, 0.034 * u, 8), capC, O);
  if (!back) {
    const fxo = front ? 0 : 0.024 * u;
    x.save(); x.fillStyle = tint(SKIN); x.beginPath(); x.ellipse(hx + fxo, hy + 0.016 * u, (hood ? 0.05 : 0.058) * u, 0.062 * u, 0, 0, 7); x.fill();
    if (d.beard) { x.fillStyle = tint(d.beard); x.beginPath(); x.ellipse(hx + (front ? 0 : 0.04 * u), hy + 0.068 * u, 0.042 * u, 0.034 * u, 0, 0, 7); x.fill(); }
    if (u > 240 && !front) { x.fillStyle = '#2A1A10'; x.beginPath(); x.arc(hx + 0.05 * u, hy + 0.004 * u, Math.max(1.3, 0.008 * u), 0, 7); x.fill(); }
    x.restore();
  }

  const hA = arm(aA, bendA, true);
  if (f.lantern) { x.save(); x.fillStyle = tint('#5A4030'); x.fillRect(hA[0] - 0.022 * u, hA[1] + 0.01 * u, 0.044 * u, 0.075 * u); x.restore(); }
  if (f.tablet) { x.save(); x.fillStyle = tint('#6A5238'); x.fillRect(hA[0] - 0.01 * u, hA[1] - 0.05 * u, 0.09 * u, 0.065 * u); x.restore(); }
  if (f.purse) wash(x, ell(hA[0] + 0.01 * u, hA[1] + 0.035 * u, 0.034 * u, 0.04 * u, 8), tint('#8E6E3C'), O);
  x.restore();
}

// 睡著的人：枕頭、頭、被子隆起
function drawSleeper(x, s) {
  const d = WHO[s.who], L = s.len, O = { fast: true, smooth: true, edge: .2, ew: 3, pen: .7, pw: 1.4 };
  x.save(); x.translate(s.x, s.y);
  wash(x, ell(34, -14, 46, 16, 10), '#E6DAC0', O);
  wash(x, [[50, -4], [70, -44 - (s.br || 0)], [L * .5, -52 - (s.br || 0)], [L, -30], [L + 10, 0], [50, 6]], s.blanket || '#9C7C5E', O);
  wash(x, ell(34, -30, 27, 25, 10), d.hair, O);
  x.fillStyle = SKIN; x.beginPath(); x.ellipse(40, -26, 17, 18, 0, 0, 7); x.fill();
  x.restore();
}
