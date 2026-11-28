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
  { sky: ['#9fd4f5', '#f2fbff'], hill1: '#e6f2fb', hill2: '#c4dcef', ground: ['#f4f8fc', '#b8cfe2'], accent: '#7fc8f0' },
  { sky: ['#ff9a6a', '#ffe2b8'], hill1: '#6b4a5c', hill2: '#4a3042', ground: ['#5c4036', '#3a2822'], accent: '#ff5a2a' },
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
  if (world === 2 || world === 3) drawPeaks(ctx, w, groundY, camX, scale);
  if (world === 3) drawAurora(ctx, w, groundY, t);
  if (world === 4) drawVolcano(ctx, w, groundY, camX, scale, t);
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
  // ambient weather: petals / leaves / snow
  const colors = [['#ffc0d8', '#fff'], ['#e8a040', '#c86a20'], ['#ffffff', '#e8f0ff'], ['#ffffff', '#dff2ff'], ['#ffb040', '#9a8a8a']][world % 5];
  for (let i = 0; i < 14; i++) {
    const sp = 18 + (i % 5) * 6;
    const x = ((i * 173 + t * sp * 0.6 - camX * scale * 0.3) % (w + 60) + w + 60) % (w + 60) - 30;
    // embers rise in the volcano world, everything else falls
    const y0 = ((i * 97 + t * sp) % (groundY + 40)) - 20;
    const y = world === 4 ? groundY - y0 : y0;
    ctx.save();
    ctx.translate(x + Math.sin(t * 2 + i) * 8, y);
    ctx.rotate(t * 2 + i);
    ctx.fillStyle = colors[i % 2];
    ctx.globalAlpha = 0.8;
    if (world >= 2) ellipse(ctx, 0, 0, 2.5, 2.5);
    else ellipse(ctx, 0, 0, 4, 2);
    ctx.fill();
    ctx.restore();
  }
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

/** Enemy fortress with a face. Base at (0,0), extends right. kind: 0 anthill, 1 crow tree, 2 rock den, 3 final palace */
export function drawEnemyBase(ctx: Ctx, hpFrac: number, t: number, hitT: number, kind: number, destroyed: number) {
  ctx.save();
  if (hitT > 0) ctx.translate(Math.sin(t * 90) * 3, 0);
  if (destroyed > 0) {
    ctx.translate(Math.sin(t * 60) * 5 * (1 - Math.min(1, destroyed)), destroyed * 60);
    ctx.rotate(destroyed * 0.15);
    ctx.globalAlpha = Math.max(0, 1 - destroyed * 0.5);
  }
  const worried = hpFrac < 0.4 || hitT > 0;
  ellipse(ctx, 70, 0, 95, 22);
  fillStroke(ctx, '#5a3a22', 3);
  let faceY = -95;
  if (kind === 0) {
    // giant anthill
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(10, -150, 70, -175);
    ctx.quadraticCurveTo(130, -150, 150, 0);
    ctx.closePath();
    fillStroke(ctx, radial(ctx, 50, -120, 140, '#c8925a', '#7a4a22'), 4);
    ctx.fillStyle = '#3a2412';
    for (const [x, y, r] of [[40, -40, 9], [105, -60, 8], [70, -140, 7], [30, -100, 6]]) {
      ellipse(ctx, x, y, r, r * 0.8);
      ctx.fill();
    }
    // ant guard antennae on top
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(62, -172);
    ctx.quadraticCurveTo(56, -195, 46, -198);
    ctx.moveTo(78, -172);
    ctx.quadraticCurveTo(84, -195, 94, -198);
    ctx.stroke();
    faceY = -100;
  } else if (kind === 1) {
    // angry tree with a crow nest
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(35, -150);
    ctx.lineTo(105, -150);
    ctx.lineTo(118, 0);
    ctx.closePath();
    fillStroke(ctx, radial(ctx, 60, -80, 100, '#8a5a32', '#4a2a12'), 4);
    for (const [x, y, r] of [[70, -185, 70], [20, -160, 40], [125, -160, 42]]) {
      ellipse(ctx, x, y, r, r * 0.6);
      fillStroke(ctx, '#2f7a3a', 3, '#1a3a1a');
    }
    // nest
    ellipse(ctx, 70, -222, 30, 12);
    fillStroke(ctx, '#a07a4a', 3);
    ctx.save();
    ctx.translate(70, -238);
    ctx.scale(0.7, 0.7);
    ellipse(ctx, 0, 0, 14, 12);
    fillStroke(ctx, '#23233a', 2);
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.lineTo(-24, 2);
    ctx.lineTo(-12, 5);
    fillStroke(ctx, '#ffb340', 2);
    ctx.restore();
    faceY = -85;
  } else if (kind === 2) {
    // rock den
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(10, -110);
    ctx.lineTo(45, -165);
    ctx.lineTo(100, -160);
    ctx.lineTo(135, -100);
    ctx.lineTo(148, 0);
    ctx.closePath();
    fillStroke(ctx, radial(ctx, 60, -110, 140, '#a8a0b8', '#5a506a'), 4);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(45, -165);
    ctx.lineTo(100, -160);
    ctx.lineTo(90, -145);
    ctx.lineTo(70, -152);
    ctx.lineTo(52, -142);
    ctx.closePath();
    ctx.fill();
    // cave mouth
    ctx.fillStyle = '#1a1020';
    ctx.beginPath();
    ctx.ellipse(70, -5, 30, 34, 0, Math.PI, 0);
    ctx.fill();
    faceY = -105;
  } else if (kind === 6 || kind === 7) {
    // volcano fortress (7 = マグマ大王の しろ)
    const big = kind === 7;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(40, big ? -200 : -170);
    ctx.lineTo(100, big ? -200 : -170);
    ctx.lineTo(146, 0);
    ctx.closePath();
    fillStroke(ctx, radial(ctx, 60, -100, 140, '#8a5a4a', '#3a2422'), 4);
    // lava pouring from the crater
    ctx.fillStyle = '#ff6a1f';
    ctx.beginPath();
    ctx.ellipse(70, big ? -200 : -170, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, len] of [[52, 60], [84, 90], [66, 40]] as [number, number][]) {
      const drip = len + Math.sin(t * 2 + x) * 8;
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath();
      ctx.moveTo(x - 5, big ? -196 : -166);
      ctx.lineTo(x + 5, big ? -196 : -166);
      ctx.lineTo(x + 2, (big ? -196 : -166) + drip);
      ctx.lineTo(x - 2, (big ? -196 : -166) + drip);
      ctx.fill();
    }
    // smoke
    ctx.fillStyle = 'rgba(90,80,80,0.5)';
    for (let i = 0; i < 3; i++) {
      const k2 = (t * 0.3 + i / 3) % 1;
      ellipse(ctx, 70 + Math.sin(t + i) * 10, (big ? -210 : -180) - k2 * 60, 14 + k2 * 14, 10 + k2 * 10);
      ctx.fill();
    }
    // dinosaur-skull gate
    ellipse(ctx, 70, -30, 26, 22);
    fillStroke(ctx, '#f2ead8', 3);
    ctx.fillStyle = '#2a1a1a';
    ctx.beginPath();
    ctx.ellipse(70, -18, 14, 12, 0, Math.PI, 0);
    ctx.fill();
    for (const ex of [60, 80]) {
      ellipse(ctx, ex, -36, 5, 6);
      ctx.fill();
    }
    if (big) {
      ctx.beginPath();
      ctx.moveTo(52, -214);
      for (let i = 0; i <= 4; i++) ctx.lineTo(52 + i * 9, i % 2 ? -236 : -218);
      ctx.closePath();
      fillStroke(ctx, '#ffd23a', 2);
    }
    faceY = big ? -120 : -105;
  } else if (kind === 4 || kind === 5) {
    // ice castle (5 = こおり大王の こおりの きゅうでん)
    const big = kind === 5;
    const top = big ? -205 : -175;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(18, top + 30);
    ctx.lineTo(122, top + 30);
    ctx.lineTo(130, 0);
    ctx.closePath();
    fillStroke(ctx, radial(ctx, 50, -100, 140, '#f4fbff', '#9cc8ec'), 4, '#3a6a9a');
    // ice bricks
    ctx.strokeStyle = 'rgba(90,140,190,0.45)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 5; r++) {
      ctx.beginPath();
      ctx.moveTo(16, -24 - r * 28);
      ctx.lineTo(126, -24 - r * 28);
      ctx.stroke();
    }
    // towers
    for (const x of big ? [8, 70, 132] : [14, 126]) {
      ctx.beginPath();
      ctx.rect(x - 14, top + 6, 28, -top - 6);
      fillStroke(ctx, '#dff0fc', 3, '#3a6a9a');
      ctx.beginPath();
      ctx.moveTo(x - 18, top + 6);
      ctx.lineTo(x, top - 30);
      ctx.lineTo(x + 18, top + 6);
      ctx.closePath();
      fillStroke(ctx, big ? '#7fc8f0' : '#bfe8ff', 3, '#3a6a9a');
    }
    // icicle teeth along the top edge
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(24 + i * 12, top + 30);
      ctx.lineTo(30 + i * 12, top + 44 + (i % 2) * 6);
      ctx.lineTo(36 + i * 12, top + 30);
      ctx.fill();
    }
    if (big) {
      // crown on the middle tower
      ctx.beginPath();
      ctx.moveTo(56, top - 26);
      for (let i = 0; i <= 4; i++) ctx.lineTo(56 + i * 7, i % 2 ? top - 46 : top - 30);
      ctx.closePath();
      fillStroke(ctx, '#ffd23a', 2);
    }
    // snow on the roof & glossy shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(70, top + 30, 56, 7, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(26, top + 40);
    ctx.lineTo(40, top + 40);
    ctx.lineTo(28, -10);
    ctx.lineTo(18, -10);
    ctx.closePath();
    ctx.fill();
    // twinkling frost
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.7 + i / 4) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(30 + i * 26, top + 50 + k * 40, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // scarf flag
    ctx.fillStyle = '#e8312f';
    ctx.fillRect(122, top - 20, 22, 8);
    faceY = big ? -110 : -95;
  } else {
    // イモクイ大王の宮殿
    ctx.beginPath();
    ctx.rect(15, -170, 110, 170);
    fillStroke(ctx, radial(ctx, 70, -100, 120, '#9a6ac8', '#4a2a6a'), 4);
    for (const x of [15, 125]) {
      ctx.beginPath();
      ctx.rect(x - 16, -200, 32, 200);
      fillStroke(ctx, '#5a3a7a', 3);
      ctx.beginPath();
      ctx.moveTo(x - 20, -200);
      ctx.lineTo(x, -235);
      ctx.lineTo(x + 20, -200);
      ctx.closePath();
      fillStroke(ctx, '#e8312f', 3);
    }
    // big fork & knife emblem
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(55, -160);
    ctx.lineTo(55, -130);
    ctx.moveTo(85, -160);
    ctx.lineTo(85, -130);
    ctx.stroke();
    faceY = -90;
  }
  // the face
  const ey = faceY;
  for (const [ex, d] of [[48, 1], [92, -1]] as [number, number][]) {
    ellipse(ctx, ex, ey, 13, 15);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ellipse(ctx, ex - 4, ey + 3, 7, 8);
    ctx.fillStyle = kind === 3 ? '#e8312f' : '#2a1a0e';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (worried) {
      ctx.moveTo(ex - 14, ey - 16 - d * 0);
      ctx.lineTo(ex + 14, ey - 24);
      ctx.moveTo(ex - 14 * d, ey - 24);
    } else {
      ctx.moveTo(ex - 15 * d, ey - 26);
      ctx.lineTo(ex + 13 * d, ey - 16);
    }
    ctx.stroke();
  }
  // mouth with fangs / worried wobble
  ctx.beginPath();
  if (worried) {
    ctx.moveTo(52, ey + 40);
    for (let i = 0; i <= 6; i++) ctx.lineTo(52 + i * 6, ey + 36 + (i % 2) * 6);
    ctx.lineWidth = 4;
    ctx.stroke();
    // sweat
    ctx.fillStyle = '#9be8ff';
    ellipse(ctx, 118, ey - 10 + ((t * 30) % 12), 5, 8);
    ctx.fill();
  } else {
    ctx.moveTo(46, ey + 30);
    ctx.quadraticCurveTo(70, ey + 52, 94, ey + 30);
    ctx.closePath();
    ctx.fillStyle = '#5a1a1a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const fx of [54, 80]) {
      ctx.beginPath();
      ctx.moveTo(fx, ey + 32);
      ctx.lineTo(fx + 4, ey + 42);
      ctx.lineTo(fx + 8, ey + 33);
      ctx.fill();
    }
  }
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
    } else if (world === 4) {
      if (kind < 0.35) fern(ctx, t + i);
      else if (kind < 0.55) bones(ctx);
      else if (kind < 0.75) lavaCrack(ctx, t + i);
      else rock(ctx, hash(i * 1.9));
    } else if (world === 3) {
      if (kind < 0.35) pine(ctx);
      else if (kind < 0.5) igloo(ctx);
      else if (kind < 0.62) snowmanProp(ctx);
      else if (kind < 0.85) iceCrystal(ctx, t + i);
      else shrub(ctx);
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

/** Decorative prop for the world map (feet at 0,0, ~40 units tall). */
export function mapProp(ctx: Ctx, world: number, k: number, t: number) {
  if (world === 4) {
    if (k < 0.45) fern(ctx, t);
    else if (k < 0.7) bones(ctx);
    else lavaCrack(ctx, t);
    return;
  }
  if (world === 3) {
    if (k < 0.45) pine(ctx);
    else if (k < 0.7) igloo(ctx);
    else snowmanProp(ctx);
    return;
  }
  if (world === 0) {
    if (k < 0.15) scarecrow(ctx, t);
    else if (k < 0.75) potatoPlant(ctx, t);
    else flower(ctx, '#ff7eb6', t);
  } else if (world === 1) {
    if (k < 0.45) {
      // round tree
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(-4, -18, 8, 18);
      ellipse(ctx, 0, -30, 18, 20);
      fillStroke(ctx, k < 0.2 ? '#3a8a4a' : '#4a9a5a', 2, '#1e4a2a');
    } else if (k < 0.75) mushroom(ctx, '#e8312f');
    else acorn(ctx);
  } else {
    if (k < 0.4) {
      // snowy mini mountain
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(0, -40);
      ctx.lineTo(26, 0);
      ctx.closePath();
      fillStroke(ctx, '#8a7ab0', 2, '#4a3a6a');
      ctx.beginPath();
      ctx.moveTo(-9, -26);
      ctx.lineTo(0, -40);
      ctx.lineTo(9, -26);
      ctx.closePath();
      ctx.fillStyle = '#fff';
      ctx.fill();
    } else if (k < 0.75) rock(ctx, k);
    else shrub(ctx);
  }
}

function drawAurora(ctx: Ctx, w: number, groundY: number, t: number) {
  ctx.save();
  for (const [c, off] of [['rgba(80,240,160,0.38)', 0], ['rgba(255,120,210,0.28)', 1.7]] as [string, number][]) {
    ctx.fillStyle = c;
    ctx.beginPath();
    const y0 = groundY * 0.22;
    ctx.moveTo(0, y0);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, y0 + Math.sin(x * 0.012 + t * 0.6 + off) * 18);
    for (let x = w; x >= 0; x -= 20) ctx.lineTo(x, y0 + 30 + Math.sin(x * 0.015 + t * 0.5 + off) * 14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function pine(ctx: Ctx) {
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(-3, -10, 6, 10);
  for (let i = 0; i < 3; i++) {
    const y = -10 - i * 12,
      r = 16 - i * 4;
    ctx.beginPath();
    ctx.moveTo(-r, y);
    ctx.lineTo(0, y - 18);
    ctx.lineTo(r, y);
    ctx.closePath();
    fillStroke(ctx, '#3a8a6a', 1.5, '#1e4a3a');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, y - 9);
    ctx.lineTo(0, y - 18);
    ctx.lineTo(r * 0.5, y - 9);
    ctx.closePath();
    ctx.fill();
  }
}

function igloo(ctx: Ctx) {
  ctx.beginPath();
  ctx.arc(0, 0, 18, Math.PI, 0);
  ctx.closePath();
  fillStroke(ctx, '#f4f9ff', 2, '#7a9ab8');
  ctx.strokeStyle = '#c4dcef';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 11, Math.PI, 0);
  ctx.moveTo(-17, -7);
  ctx.lineTo(17, -7);
  ctx.stroke();
  ctx.fillStyle = '#4a6a8a';
  ctx.beginPath();
  ctx.arc(8, 0, 6, Math.PI, 0);
  ctx.fill();
}

function snowmanProp(ctx: Ctx) {
  ellipse(ctx, 0, -8, 9, 8);
  fillStroke(ctx, '#ffffff', 1.5, '#7a9ab8');
  ellipse(ctx, 0, -21, 6, 6);
  fillStroke(ctx, '#ffffff', 1.5, '#7a9ab8');
  ctx.fillStyle = OUT;
  ellipse(ctx, -2, -22, 1, 1);
  ctx.fill();
  ellipse(ctx, 2, -22, 1, 1);
  ctx.fill();
  ctx.fillStyle = '#ff8a1f';
  ctx.fillRect(1, -20, 5, 2);
}

function iceCrystal(ctx: Ctx, t: number) {
  ctx.save();
  ctx.translate(0, -12);
  ctx.globalAlpha = 0.85 + Math.sin(t * 2) * 0.15;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  fillStroke(ctx, '#bfe8ff', 1.5, '#5a9ac8');
  ctx.restore();
}

function drawVolcano(ctx: Ctx, w: number, groundY: number, camX: number, scale: number, t: number) {
  const x = w * 0.7 - camX * scale * 0.05;
  const y = groundY - 40 * scale;
  ctx.save();
  // lava glow
  const g = ctx.createRadialGradient(x, y - 190 * scale, 4, x, y - 190 * scale, 120 * scale);
  g.addColorStop(0, 'rgba(255,140,60,0.55)');
  g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 140 * scale, y - 320 * scale, 280 * scale, 240 * scale);
  ctx.fillStyle = '#5a3a4a';
  ctx.beginPath();
  ctx.moveTo(x - 220 * scale, y);
  ctx.lineTo(x - 40 * scale, y - 190 * scale);
  ctx.lineTo(x + 40 * scale, y - 190 * scale);
  ctx.lineTo(x + 220 * scale, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff6a1f';
  ctx.beginPath();
  ctx.moveTo(x - 40 * scale, y - 190 * scale);
  ctx.lineTo(x + 40 * scale, y - 190 * scale);
  ctx.lineTo(x + 24 * scale, y - 150 * scale);
  ctx.lineTo(x + 6 * scale, y - 170 * scale);
  ctx.lineTo(x - 12 * scale, y - 140 * scale);
  ctx.lineTo(x - 22 * scale, y - 165 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(110,100,100,0.45)';
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.15 + i / 4) % 1;
    ellipse(ctx, x + Math.sin(t * 0.5 + i) * 20 * scale, y - (200 + k * 140) * scale, (24 + k * 40) * scale, (16 + k * 26) * scale);
    ctx.fill();
  }
  ctx.restore();
}

function fern(ctx: Ctx, t: number) {
  const sw = Math.sin(t * 1.5) * 0.08;
  for (const [a, l] of [[-0.7, 26], [-0.25, 32], [0.25, 32], [0.7, 26]] as [number, number][]) {
    ctx.save();
    ctx.rotate(a + sw);
    ctx.beginPath();
    ctx.ellipse(0, -l / 2, 5, l / 2, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#4a9a4a', 1.5, '#1e4a1e');
    ctx.restore();
  }
}

function bones(ctx: Ctx) {
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, -3);
  ctx.lineTo(14, -6);
  ctx.stroke();
  for (const [x, y] of [[-14, -3], [14, -6]] as [number, number][]) {
    ellipse(ctx, x, y - 2, 4, 3);
    ctx.fillStyle = '#f2ead8';
    ctx.fill();
    ellipse(ctx, x, y + 2, 4, 3);
    ctx.fill();
  }
}

function lavaCrack(ctx: Ctx, t: number) {
  ctx.strokeStyle = `rgba(255,${120 + Math.sin(t * 3) * 50},40,0.9)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.lineTo(-6, -2);
  ctx.lineTo(2, 3);
  ctx.lineTo(16, -1);
  ctx.stroke();
}
