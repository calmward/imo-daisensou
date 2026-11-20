import { blob, ellipse, eye, fillStroke, mouth, OUT, radial, type Ctx } from './kit';

export interface WorldTheme {
  sky: [string, string];
  hill1: string;
  hill2: string;
  ground: [string, string];
  accent: string;
}

export const THEMES: WorldTheme[] = [
  { sky: ['#8fd8ff', '#e6f8ff'], hill1: '#a6e07a', hill2: '#7cc85a', ground: ['#c9925a', '#a06a3a'], accent: '#6ccf4a' },
  { sky: ['#ffcf9a', '#fff1d6'], hill1: '#5aa86a', hill2: '#3a8a4a', ground: ['#a07a4a', '#7a5a32'], accent: '#e8792a' },
  { sky: ['#b8a6ff', '#ffe0f0'], hill1: '#9a90b8', hill2: '#7a6a9a', ground: ['#a08a7a', '#7a6a5a'], accent: '#c0b0e0' },
];

/** Parallax background. camX in world units, scale = px per world unit. */
export function drawBackground(ctx: Ctx, w: number, h: number, groundY: number, camX: number, scale: number, world: number, t: number) {
  const th = THEMES[world % THEMES.length];
  const g = ctx.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, groundY + 2);
  // sun
  ctx.fillStyle = world === 2 ? 'rgba(255,240,200,0.9)' : 'rgba(255,250,200,0.95)';
  ellipse(ctx, w * 0.82 - camX * scale * 0.02, groundY * 0.28, 26 * Math.max(0.6, scale), 26 * Math.max(0.6, scale));
  ctx.fill();
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 380 + t * 8 - camX * scale * 0.15) % (w + 400) + w + 400) % (w + 400) - 200;
    const cy = groundY * (0.15 + (i % 3) * 0.12);
    const s = (0.7 + (i % 2) * 0.4) * Math.max(0.6, scale);
    for (const [dx, dy, r] of [[0, 0, 22], [24, -8, 26], [50, 0, 20], [24, 6, 22]]) {
      ellipse(ctx, cx + dx * s, cy + dy * s, r * s, r * s * 0.8);
      ctx.fill();
    }
  }
  // far hills
  const hillLayer = (color: string, par: number, amp: number, base: number, freq: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w + 20; x += 20) {
      const wx = (x + camX * scale * par) / Math.max(0.3, scale);
      const y = groundY - base * scale - Math.sin(wx * freq) * amp * scale - Math.sin(wx * freq * 2.3 + 1) * amp * 0.4 * scale;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();
  };
  hillLayer(th.hill1, 0.25, 30, 90, 0.004);
  if (world === 1) drawTrees(ctx, w, groundY, camX, scale, 0.4);
  if (world === 2) drawPeaks(ctx, w, groundY, camX, scale);
  hillLayer(th.hill2, 0.5, 18, 40, 0.007);
  // ground
  const gg = ctx.createLinearGradient(0, groundY, 0, h);
  gg.addColorStop(0, th.ground[0]);
  gg.addColorStop(1, th.ground[1]);
  ctx.fillStyle = gg;
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = th.accent;
  ctx.fillRect(0, groundY - 2, w, Math.max(4, 7 * scale));
  drawGroundProps(ctx, w, groundY, camX, scale, world, t);
  // grass tufts & furrows scroll with camera
  ctx.strokeStyle = 'rgba(80,50,20,0.25)';
  ctx.lineWidth = Math.max(1, 3 * scale);
  for (let i = -1; i < w / (60 * scale) + 2; i++) {
    const wx = Math.floor(camX / 60) * 60 + i * 60;
    const x = (wx - camX) * scale;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 22 * scale);
    ctx.lineTo(x + 26 * scale, groundY + 22 * scale);
    ctx.stroke();
    if ((wx / 60) % 3 === 0) {
      ctx.beginPath();
      ctx.moveTo(x + 30 * scale, groundY + 48 * scale);
      ctx.lineTo(x + 60 * scale, groundY + 48 * scale);
      ctx.stroke();
    }
  }
}

function drawTrees(ctx: Ctx, w: number, groundY: number, camX: number, scale: number, par: number) {
  for (let i = -1; i < 12; i++) {
    const wx = i * 220 + 40;
    const x = ((wx - camX * par) * scale) % (w + 300);
    const xx = x < -150 ? x + w + 300 : x;
    const y = groundY - 40 * scale;
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(xx - 6 * scale, y - 40 * scale, 12 * scale, 50 * scale);
    ctx.fillStyle = i % 2 ? '#3a8a4a' : '#4a9a5a';
    ellipse(ctx, xx, y - 70 * scale, 40 * scale, 46 * scale);
    ctx.fill();
  }
}

function drawPeaks(ctx: Ctx, w: number, groundY: number, camX: number, scale: number) {
  for (let i = -1; i < 10; i++) {
    const wx = i * 380;
    const x = ((wx - camX * 0.2) * scale) % (w + 500);
    const xx = x < -250 ? x + w + 500 : x;
    const y = groundY - 60 * scale;
    ctx.fillStyle = '#8a7ab0';
    ctx.beginPath();
    ctx.moveTo(xx - 160 * scale, y);
    ctx.lineTo(xx, y - 200 * scale);
    ctx.lineTo(xx + 160 * scale, y);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(xx - 40 * scale, y - 150 * scale);
    ctx.lineTo(xx, y - 200 * scale);
    ctx.lineTo(xx + 40 * scale, y - 150 * scale);
    ctx.lineTo(xx + 15 * scale, y - 160 * scale);
    ctx.lineTo(xx, y - 145 * scale);
    ctx.lineTo(xx - 15 * scale, y - 160 * scale);
    ctx.fill();
  }
}

/** Player castle: a big sweet-potato fortress on a farm mound. Drawn with base at (0,0), extends left. */
export function drawPlayerBase(ctx: Ctx, hpFrac: number, t: number, hitT: number, destroyed: number) {
  ctx.save();
  if (hitT > 0) ctx.translate(Math.sin(t * 90) * 3, 0);
  if (destroyed > 0) {
    ctx.translate(Math.sin(t * 60) * 4 * (1 - Math.min(1, destroyed)), destroyed * 30);
    ctx.globalAlpha = Math.max(0, 1 - destroyed * 0.6);
  }
  // mound
  ellipse(ctx, -70, 0, 90, 22);
  fillStroke(ctx, '#7a4a22', 3);
  // tower body: giant sweet potato standing up
  ctx.save();
  ctx.translate(-70, -78);
  blob(ctx, 0, 0, 48, 80, 0.04, 2);
  fillStroke(ctx, radial(ctx, 0, 0, 70, '#e6648a', '#9a1f48'), 4);
  ctx.restore();
  // windows/door
  ctx.fillStyle = '#5a1a2a';
  ctx.beginPath();
  ctx.moveTo(-86, -2);
  ctx.lineTo(-86, -30);
  ctx.quadraticCurveTo(-70, -48, -54, -30);
  ctx.lineTo(-54, -2);
  ctx.fill();
  ctx.fillStyle = '#ffd86a';
  for (const [x, y] of [[-88, -96], [-60, -110]]) {
    ellipse(ctx, x, y, 7, 9);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // face on the tower
  eye(ctx, -82, -128, 6, { look: 0.8, closed: hitT > 0 });
  eye(ctx, -58, -128, 6, { look: 0.8, closed: hitT > 0 });
  mouth(ctx, -70, -114, 8, hpFrac < 0.3 ? 'sad' : 'smile');
  // leaves crown
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.translate(-70 + i * 9, -156);
    ctx.rotate(i * 0.35 + Math.sin(t * 2 + i) * 0.06);
    ctx.beginPath();
    ctx.ellipse(0, -16, 7, 18, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#6ccf4a', 2.5);
    ctx.restore();
  }
  // flag
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-30, -150);
  ctx.lineTo(-30, -200);
  ctx.stroke();
  ctx.beginPath();
  const wv = Math.sin(t * 5) * 4;
  ctx.moveTo(-30, -200);
  ctx.quadraticCurveTo(-10, -196 + wv, 8, -192);
  ctx.lineTo(-30, -176);
  ctx.closePath();
  fillStroke(ctx, '#ffd23a', 2);
  // cracks
  drawCracks(ctx, -70, -80, 40, hpFrac);
  ctx.restore();
}

const ENEMY_BASE_COLORS = [
  { body: ['#9a7a5a', '#5a3a22'], roof: '#3a2a1a' },
  { body: ['#7a5a3a', '#3a2412'], roof: '#2a5a2a' },
  { body: ['#9a90a8', '#5a506a'], roof: '#3a2a4a' },
];

/** Enemy fortress — a spiky stump tower. Base at (0,0), extends right. */
export function drawEnemyBase(ctx: Ctx, hpFrac: number, t: number, hitT: number, world: number, destroyed: number) {
  const c = ENEMY_BASE_COLORS[world % 3];
  ctx.save();
  if (hitT > 0) ctx.translate(Math.sin(t * 90) * 3, 0);
  if (destroyed > 0) {
    ctx.translate(Math.sin(t * 60) * 5 * (1 - Math.min(1, destroyed)), destroyed * 60);
    ctx.rotate(destroyed * 0.15);
    ctx.globalAlpha = Math.max(0, 1 - destroyed * 0.5);
  }
  ellipse(ctx, 70, 0, 90, 22);
  fillStroke(ctx, '#5a3a22', 3);
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(30, -150);
  ctx.lineTo(110, -150);
  ctx.lineTo(116, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(24, 0, 116, 0);
  g.addColorStop(0, c.body[0]);
  g.addColorStop(1, c.body[1]);
  fillStroke(ctx, g, 4);
  // wood rings / stones
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(28, -20 - i * 28);
    ctx.lineTo(112, -24 - i * 28);
    ctx.stroke();
  }
  // spiky roof
  ctx.beginPath();
  ctx.moveTo(18, -146);
  for (let i = 0; i <= 6; i++) ctx.lineTo(18 + i * 17, i % 2 ? -186 : -158);
  ctx.lineTo(122, -146);
  ctx.closePath();
  fillStroke(ctx, c.roof, 3);
  // angry face window
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.moveTo(44, -112);
  ctx.lineTo(62, -104);
  ctx.lineTo(44, -98);
  ctx.closePath();
  ctx.moveTo(96, -112);
  ctx.lineTo(78, -104);
  ctx.lineTo(96, -98);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a1a0e';
  ctx.beginPath();
  ctx.moveTo(46, -72);
  for (let i = 0; i <= 6; i++) ctx.lineTo(46 + i * 8, i % 2 ? -80 : -64);
  ctx.lineTo(94, -56);
  ctx.lineTo(46, -56);
  ctx.closePath();
  ctx.fill();
  // flag (skull-ish bug flag)
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, -180);
  ctx.lineTo(70, -230);
  ctx.stroke();
  const wv = Math.sin(t * 5 + 1) * 4;
  ctx.beginPath();
  ctx.moveTo(70, -230);
  ctx.quadraticCurveTo(92, -226 + wv, 110, -222);
  ctx.lineTo(70, -206);
  ctx.closePath();
  fillStroke(ctx, '#5a2a6a', 2);
  drawCracks(ctx, 70, -80, 44, hpFrac);
  ctx.restore();
}

function drawCracks(ctx: Ctx, cx: number, cy: number, r: number, hpFrac: number) {
  if (hpFrac > 0.75) return;
  ctx.strokeStyle = '#1a0e06';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const n = hpFrac > 0.5 ? 1 : hpFrac > 0.25 ? 2 : 4;
  const sets = [
    [[-0.6, -1.2], [-0.3, -0.7], [-0.5, -0.3], [-0.1, 0.1]],
    [[0.7, -0.4], [0.3, 0], [0.5, 0.4], [0.1, 0.8]],
    [[-0.8, 0.6], [-0.4, 0.5], [-0.3, 0.9]],
    [[0.2, -1.4], [0.4, -1.0], [0.1, -0.6]],
  ];
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    sets[i].forEach(([x, y], j) => (j ? ctx.lineTo(cx + x * r, cy + y * r) : ctx.moveTo(cx + x * r, cy + y * r)));
    ctx.stroke();
  }
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** World-locked decorations along the horizon + butterflies. */
function drawGroundProps(ctx: Ctx, w: number, groundY: number, camX: number, scale: number, world: number, t: number) {
  const step = 90;
  const first = Math.floor((camX - 100) / step);
  const last = Math.ceil((camX + w / scale + 100) / step);
  for (let i = first; i <= last; i++) {
    const hsh = hash(i + world * 1000);
    if (hsh < 0.35) continue;
    const wx = i * step + hash(i * 3.3) * 50;
    const x = (wx - camX) * scale;
    const y = groundY - 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const kind = hash(i * 7.7);
    if (world === 0) {
      if (kind < 0.05) scarecrow(ctx, t + i);
      else if (kind < 0.7) potatoPlant(ctx, t + i);
      else flower(ctx, ['#ff7eb6', '#ffe14d', '#fff'][i % 3], t + i);
    } else if (world === 1) {
      if (kind < 0.4) mushroom(ctx, i % 2 ? '#e8312f' : '#c8783a');
      else if (kind < 0.7) acorn(ctx);
      else flower(ctx, '#c49bff', t + i);
    } else {
      if (kind < 0.5) rock(ctx, hash(i * 1.9));
      else if (kind < 0.8) shrub(ctx);
      else flower(ctx, '#9be8ff', t + i);
    }
    ctx.restore();
  }
  // butterflies
  for (let k = 0; k < 3; k++) {
    const bx = ((k * 420 + t * 30 - camX * scale * 0.9) % (w + 200) + w + 200) % (w + 200) - 100;
    const by = groundY - (60 + Math.sin(t * 2 + k) * 25 + k * 20) * scale;
    const flap = Math.abs(Math.sin(t * 14 + k));
    ctx.fillStyle = ['#ffb0d8', '#fff36a', '#b0e0ff'][k];
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(bx + d * 4 * scale * flap, by, 5 * scale * flap + 1, 4 * scale + 1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function potatoPlant(ctx: Ctx, t: number) {
  const sw = Math.sin(t * 2) * 0.08;
  for (const [a, l] of [[-0.6, 18], [0, 24], [0.6, 18]]) {
    ctx.save();
    ctx.rotate(a + sw);
    ctx.beginPath();
    ctx.ellipse(0, -l / 2, 5, l / 2, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#5cb83a', 1.5, '#2a6a1e');
    ctx.restore();
  }
  // tiny potato peeking out of the soil
  ellipse(ctx, 6, 2, 7, 5);
  fillStroke(ctx, '#d9a75b', 1.5);
}

function scarecrow(ctx: Ctx, t: number) {
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -60);
  ctx.moveTo(-22, -42);
  ctx.lineTo(22, -42);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -66);
  ctx.rotate(Math.sin(t) * 0.05);
  ellipse(ctx, 0, 0, 10, 10);
  fillStroke(ctx, '#f2dcb0', 2);
  ctx.beginPath();
  ctx.moveTo(-16, -4);
  ctx.lineTo(0, -20);
  ctx.lineTo(16, -4);
  ctx.closePath();
  fillStroke(ctx, '#e8b23a', 2);
  ctx.fillStyle = OUT;
  ellipse(ctx, -3, 1, 1.5, 1.5);
  ctx.fill();
  ellipse(ctx, 4, 1, 1.5, 1.5);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#5a8ad8';
  ctx.fillRect(-8, -50, 16, 18);
}

function flower(ctx: Ctx, color: string, t: number) {
  ctx.strokeStyle = '#3a8a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(Math.sin(t) * 3, -8, 0, -14);
  ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ellipse(ctx, Math.cos(a) * 4, -14 + Math.sin(a) * 4, 3, 3);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd23a';
  ellipse(ctx, 0, -14, 2.2, 2.2);
  ctx.fill();
}

function mushroom(ctx: Ctx, cap: string) {
  ctx.fillStyle = '#f6ecd6';
  ctx.fillRect(-4, -14, 8, 14);
  ctx.beginPath();
  ctx.ellipse(0, -14, 13, 9, 0, Math.PI, 0);
  ctx.closePath();
  fillStroke(ctx, cap, 2);
  ctx.fillStyle = '#fff';
  ellipse(ctx, -5, -18, 2.5, 2);
  ctx.fill();
  ellipse(ctx, 4, -20, 2, 1.6);
  ctx.fill();
}

function acorn(ctx: Ctx) {
  ellipse(ctx, 0, -7, 7, 8);
  fillStroke(ctx, '#c8783a', 2);
  ctx.beginPath();
  ctx.ellipse(0, -13, 8, 4, 0, Math.PI, 0);
  ctx.closePath();
  fillStroke(ctx, '#7a4a22', 2);
}

function rock(ctx: Ctx, r: number) {
  const s = 10 + r * 12;
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.lineTo(-s * 0.7, -s * 0.8);
  ctx.lineTo(s * 0.2, -s);
  ctx.lineTo(s, -s * 0.3);
  ctx.lineTo(s, 0);
  ctx.closePath();
  fillStroke(ctx, '#9a90a8', 2);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(-s * 0.7, -s * 0.8);
  ctx.lineTo(s * 0.2, -s);
  ctx.lineTo(-s * 0.1, -s * 0.7);
  ctx.fill();
}

function shrub(ctx: Ctx) {
  for (const [x, r] of [[-8, 9], [0, 12], [9, 8]]) {
    ellipse(ctx, x, -r * 0.8, r, r * 0.9);
    fillStroke(ctx, '#6a8a6a', 1.5, '#2a4a2a');
  }
  ctx.fillStyle = '#fff';
  ellipse(ctx, 0, -18, 8, 3);
  ctx.fill();
}
