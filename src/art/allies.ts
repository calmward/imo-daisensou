// Potato army art. Each drawer paints a ~64-unit-tall character, feet at (0,0), facing right.
import { arm, blob, blush, ellipse, eye, feet, fillStroke, motion, mouth, OUT, radial, star, type Ctx, type Pose } from './kit';

type Drawer = (ctx: Ctx, p: Pose) => void;

function face(ctx: Ctx, x: number, y: number, s: number, p: Pose, opts: { angry?: boolean; mouthKind?: Parameters<typeof mouth>[4]; sleepy?: boolean; sparkle?: boolean; sad?: boolean } = {}) {
  const atk = p.state === 'attack';
  const closed = p.state === 'kb' || p.state === 'dead';
  const eo = { look: 0.6, closed, angry: opts.angry || atk, sleepy: opts.sleepy && !atk, sparkle: opts.sparkle, sad: opts.sad && !atk };
  eye(ctx, x - s * 0.58, y, s * 0.48, eo);
  eye(ctx, x + s * 0.58, y, s * 0.48, eo);
  blush(ctx, x - s * 0.95, y + s * 0.55, s * 0.3);
  blush(ctx, x + s * 0.98, y + s * 0.55, s * 0.3);
  mouth(ctx, x + s * 0.05, y + s * 0.75, s * 0.6, closed ? 'o' : atk ? 'open' : opts.mouthKind ?? 'smile');
}

function potatoDots(ctx: Ctx, pts: [number, number][], r = 1.6, color = 'rgba(110,70,30,0.6)') {
  ctx.fillStyle = color;
  for (const [x, y] of pts) {
    ellipse(ctx, x, y, r, r * 0.7);
    ctx.fill();
  }
}

const jaga: Drawer = (ctx, p) => {
  const m = motion(p);
  feet(ctx, 0, 0, 9, 5, p.walk * 10, m.moving);
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean);
  ctx.scale(1 / m.squash, m.squash);
  blob(ctx, 0, -26, 24, 24, 0.07, 2);
  fillStroke(ctx, radial(ctx, 0, -26, 24, '#f6d79a', '#d9a75b'));
  potatoDots(ctx, [[-14, -38], [12, -12], [-8, -10], [16, -40]]);
  face(ctx, 4, -28, 10, p);
  // tiny arm with fist
  const a = p.state === 'attack' ? (p.atk < 0.5 ? -6 : 14) : 0;
  arm(ctx, 16, -20, 26 + a, -18 + (a ? -4 : 0), 5, '#e9c07a');
  ellipse(ctx, 27 + a, -19, 5, 5);
  fillStroke(ctx, '#e9c07a', 2.5);
  ctx.restore();
};

const sato: Drawer = (ctx, p) => {
  const m = motion(p, 7);
  feet(ctx, 0, 0, 11, 6, p.walk * 7, m.moving, '#5b3a22');
  ctx.save();
  ctx.translate(0, -m.bob * 0.6);
  ctx.rotate(m.lean * 0.6);
  ctx.scale(1 / m.squash, m.squash);
  blob(ctx, 0, -29, 27, 28, 0.04, 1);
  fillStroke(ctx, radial(ctx, 0, -29, 28, '#a77a52', '#6e4a2c'));
  // rings
  ctx.strokeStyle = 'rgba(60,35,15,0.7)';
  ctx.lineWidth = 2;
  for (const yy of [-46, -36, -14]) {
    ctx.beginPath();
    ctx.ellipse(0, yy, 24 - Math.abs(yy + 29) * 0.4, 4, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  // hairs
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI + (i / 11) * Math.PI;
    const x = Math.cos(a) * 27,
      y = -29 + Math.sin(a) * 28;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x * 1.12, -29 + (y + 29) * 1.12);
    ctx.stroke();
  }
  // sprout on top
  ctx.beginPath();
  ctx.moveTo(0, -56);
  ctx.quadraticCurveTo(6, -66, 14, -64);
  ctx.quadraticCurveTo(8, -58, 0, -56);
  fillStroke(ctx, '#6ccf4a', 2);
  face(ctx, 4, -28, 9.5, p, { sleepy: true, mouthKind: 'flat' });
  ctx.restore();
};

const chips: Drawer = (ctx, p) => {
  const m = motion(p, 14);
  const hop = m.moving ? Math.abs(Math.sin(p.walk * 9)) * 8 : 0;
  ctx.save();
  ctx.translate(0, -hop);
  ctx.rotate(m.lean + (m.moving ? Math.sin(p.walk * 9) * 0.12 : 0));
  ctx.beginPath();
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 20 + Math.sin(a * 7) * 1.6;
    const x = Math.cos(a) * r,
      y = -22 + Math.sin(a) * r * 0.92;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  fillStroke(ctx, radial(ctx, 0, -22, 20, '#fff2a6', '#f4c542'));
  // salt specks
  ctx.fillStyle = '#fff';
  for (const [x, y] of [[-10, -32], [10, -12], [-6, -8], [13, -33]]) {
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = 'rgba(200,140,30,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-4, -18, 12, 0.3, 1.6);
  ctx.stroke();
  face(ctx, 3, -23, 8, p, { mouthKind: 'grin' });
  ctx.restore();
  // little legs
  arm(ctx, -6, -3 - hop, -7, 0, 3, '#e8b23a');
  arm(ctx, 6, -3 - hop, 7, 0, 3, '#e8b23a');
};

const satsu: Drawer = (ctx, p) => {
  const m = motion(p, 9);
  feet(ctx, 0, 0, 14, 6, p.walk * 9, m.moving, '#6b2340');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean);
  ctx.scale(1 / m.squash, m.squash);
  // long sweet potato body, slightly diagonal
  ctx.save();
  ctx.translate(0, -30);
  ctx.rotate(-0.12);
  blob(ctx, 0, 0, 22, 32, 0.05, 3);
  fillStroke(ctx, radial(ctx, 0, 0, 30, '#e0577f', '#a3244e'));
  ctx.restore();
  // tail tips
  ctx.beginPath();
  ctx.moveTo(-6, -60);
  ctx.quadraticCurveTo(-10, -70, -4, -72);
  fillStroke(ctx, '#a3244e', 2);
  // headband
  ctx.beginPath();
  ctx.moveTo(-22, -46);
  ctx.quadraticCurveTo(0, -52, 22, -48);
  ctx.lineTo(22, -41);
  ctx.quadraticCurveTo(0, -45, -22, -39);
  ctx.closePath();
  fillStroke(ctx, '#fff', 2);
  ellipse(ctx, 6, -45, 4, 3.4);
  ctx.fillStyle = '#e8312f';
  ctx.fill();
  // ribbon tails flutter
  const fl = Math.sin(p.t * 12) * 3;
  ctx.beginPath();
  ctx.moveTo(-21, -43);
  ctx.lineTo(-34, -48 + fl);
  ctx.lineTo(-32, -40 + fl);
  ctx.closePath();
  fillStroke(ctx, '#fff', 2);
  face(ctx, 4, -28, 10, p, { angry: true });
  // big punching arm
  const a = p.state === 'attack' ? (p.atk < 0.5 ? -8 : 20) : 0;
  arm(ctx, 18, -22, 30 + a, -24, 7, '#d0466e');
  ellipse(ctx, 32 + a, -24, 7.5, 7);
  fillStroke(ctx, '#d0466e', 3);
  ctx.restore();
};

const kenpi: Drawer = (ctx, p) => {
  const m = motion(p, 16);
  ctx.save();
  ctx.translate(0, -m.bob * 0.5);
  ctx.rotate(0.35 + m.lean * 1.4);
  // stick body
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(6, -2);
  ctx.lineTo(9, -56);
  ctx.lineTo(-3, -58);
  ctx.closePath();
  fillStroke(ctx, radial(ctx, 0, -30, 30, '#ffc163', '#d9771a'));
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1, -6);
  ctx.lineTo(2, -50);
  ctx.stroke();
  // sugar sparkles
  ctx.fillStyle = '#fff';
  for (const [x, y] of [[0, -20], [4, -35], [-1, -44]]) ctx.fillRect(x, y, 2, 2);
  eye(ctx, 0, -46, 4.2, { look: 0.8, angry: true, closed: p.state === 'kb' });
  eye(ctx, 8, -46, 4.2, { look: 0.8, angry: true, closed: p.state === 'kb' });
  mouth(ctx, 5, -37, 5, p.state === 'attack' ? 'open' : 'grr');
  ctx.restore();
  if (m.moving) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-14 - i * 3, -18 - i * 12);
      ctx.lineTo(-28 - i * 3, -18 - i * 12);
      ctx.stroke();
    }
  }
  feet(ctx, 0, 0, 5, 4, p.walk * 16, m.moving, '#b55f12');
};

const fry: Drawer = (ctx, p) => {
  const m = motion(p, 8);
  feet(ctx, 0, 0, 8, 5, p.walk * 8, m.moving, '#c8901f');
  ctx.save();
  ctx.translate(0, -m.bob);
  // lance (ketchup tipped fry)
  const thrust = p.state === 'attack' ? (p.atk < 0.5 ? -10 : 26 * (1 - (p.atk - 0.5) * 1.2)) : 0;
  ctx.save();
  ctx.translate(thrust, 0);
  ctx.beginPath();
  ctx.moveTo(4, -30);
  ctx.lineTo(52, -36);
  ctx.lineTo(52, -31);
  ctx.lineTo(4, -25);
  ctx.closePath();
  fillStroke(ctx, '#f7d35c', 2);
  ctx.beginPath();
  ctx.moveTo(52, -38);
  ctx.lineTo(64, -33.5);
  ctx.lineTo(52, -29);
  ctx.closePath();
  fillStroke(ctx, '#e8312f', 2);
  ctx.restore();
  ctx.rotate(m.lean * 0.5);
  // body: tall fry rectangle
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.lineTo(10, -2);
  ctx.lineTo(12, -60);
  ctx.lineTo(-8, -62);
  ctx.closePath();
  fillStroke(ctx, radial(ctx, 0, -30, 30, '#ffe58a', '#e8b23a'));
  ctx.strokeStyle = 'rgba(190,120,20,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(-2, -56);
  ctx.stroke();
  // helmet: ketchup cup
  ctx.beginPath();
  ctx.moveTo(-12, -58);
  ctx.lineTo(14, -56);
  ctx.lineTo(10, -70);
  ctx.lineTo(-8, -71);
  ctx.closePath();
  fillStroke(ctx, '#e8312f', 2.5);
  face(ctx, 4, -40, 7.5, p);
  ctx.restore();
};

const yaki: Drawer = (ctx, p) => {
  const m = motion(p, 7);
  feet(ctx, 0, 0, 14, 6, p.walk * 7, m.moving, '#4d2a14');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean);
  ctx.scale(1 / m.squash, m.squash);
  ctx.save();
  ctx.translate(0, -30);
  ctx.rotate(-0.25);
  blob(ctx, 0, 0, 34, 24, 0.05, 4);
  fillStroke(ctx, radial(ctx, 0, 0, 34, '#8a3b3b', '#4a1a1f'));
  // split showing golden inside
  ctx.beginPath();
  ctx.moveTo(-20, -12);
  ctx.quadraticCurveTo(0, -26, 22, -14);
  ctx.quadraticCurveTo(0, -4, -20, -12);
  fillStroke(ctx, radial(ctx, 0, -14, 20, '#ffe680', '#f2b322'), 2);
  ctx.restore();
  // char marks
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, -24);
  ctx.lineTo(-18, -20);
  ctx.moveTo(-22, -14);
  ctx.lineTo(-14, -11);
  ctx.stroke();
  face(ctx, 8, -26, 9.5, p, { angry: false });
  ctx.restore();
  // steam
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = p.t * 2 + i * 2.1;
    const yy = -62 - ((ph * 8) % 18);
    ctx.globalAlpha = 1 - ((ph * 8) % 18) / 18;
    ctx.beginPath();
    ctx.moveTo(-10 + i * 10, yy);
    ctx.quadraticCurveTo(-4 + i * 10 + Math.sin(ph) * 4, yy - 6, -10 + i * 10, yy - 12);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (p.state === 'attack' && p.atk > 0.45) {
    // fire breath
    const k = 1 - (p.atk - 0.45) / 0.55;
    ctx.globalAlpha = k;
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, 40 + i * 14, -26 + Math.sin(p.t * 30 + i) * 3, 12 - i * 1.5, 9 - i);
      ctx.fillStyle = i % 2 ? '#ffcf3a' : '#ff6a1f';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

const murasaki: Drawer = (ctx, p) => {
  const m = motion(p, 8);
  feet(ctx, 0, 0, 10, 5, p.walk * 8, m.moving, '#3e2160');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 0.6);
  ctx.scale(1 / m.squash, m.squash);
  blob(ctx, 0, -26, 22, 25, 0.05, 5);
  fillStroke(ctx, radial(ctx, 0, -26, 24, '#b98ae8', '#6a3aa8'));
  // wizard hat
  ctx.beginPath();
  ctx.moveTo(-24, -44);
  ctx.quadraticCurveTo(0, -52, 24, -44);
  ctx.lineTo(4, -50);
  ctx.quadraticCurveTo(-2, -80 + Math.sin(p.t * 3) * 2, -16, -86);
  ctx.quadraticCurveTo(-10, -70, -10, -50);
  ctx.closePath();
  fillStroke(ctx, '#3b2a8a', 2.5);
  ctx.fillStyle = '#ffe14d';
  ctx.save();
  ctx.translate(-4, -62);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 2.5 : 5.5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.fill();
  ctx.restore();
  face(ctx, 4, -24, 9, p, { sparkle: true, mouthKind: 'cat' });
  // wand
  const wa = p.state === 'attack' ? (p.atk < 0.5 ? -0.8 : 0.5) : -0.2;
  ctx.save();
  ctx.translate(18, -22);
  ctx.rotate(wa);
  arm(ctx, 0, 0, 22, -10, 3, '#8a5a22');
  ellipse(ctx, 23, -10, 5, 5);
  fillStroke(ctx, '#ff9cf0', 2);
  ctx.restore();
  ctx.restore();
};

const konnyaku: Drawer = (ctx, p) => {
  const m = motion(p, 12);
  const wob = Math.sin(p.t * 9) * 0.06 + (p.state === 'attack' ? Math.sin(p.atk * 12) * 0.12 : 0);
  ctx.save();
  ctx.translate(0, -m.bob * 1.3);
  ctx.scale(1 + wob, 1 - wob);
  ctx.beginPath();
  const r = 8;
  const w = 46,
    h = 44;
  ctx.moveTo(-w / 2 + r, -h);
  ctx.lineTo(w / 2 - r, -h);
  ctx.quadraticCurveTo(w / 2, -h, w / 2, -h + r);
  ctx.lineTo(w / 2, -r);
  ctx.quadraticCurveTo(w / 2, 0, w / 2 - r, 0);
  ctx.lineTo(-w / 2 + r, 0);
  ctx.quadraticCurveTo(-w / 2, 0, -w / 2, -r);
  ctx.lineTo(-w / 2, -h + r);
  ctx.quadraticCurveTo(-w / 2, -h, -w / 2 + r, -h);
  fillStroke(ctx, radial(ctx, 0, -22, 30, '#a6a6b6', '#6c6c80'));
  ctx.fillStyle = 'rgba(40,40,50,0.55)';
  for (const [x, y] of [[-14, -36], [-6, -10], [14, -8], [16, -38], [-16, -18], [2, -40]]) {
    ellipse(ctx, x, y, 1.5, 1.5);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ellipse(ctx, -10, -38, 8, 3);
  ctx.fill();
  face(ctx, 4, -24, 9, p, { mouthKind: 'cat' });
  ctx.restore();
};

const butter: Drawer = (ctx, p) => {
  const m = motion(p, 6);
  feet(ctx, 0, 0, 16, 7, p.walk * 6, m.moving);
  ctx.save();
  ctx.translate(0, -m.bob * 0.7);
  ctx.rotate(m.lean * 0.5);
  ctx.scale(1 / m.squash, m.squash);
  blob(ctx, 0, -30, 32, 29, 0.06, 7);
  fillStroke(ctx, radial(ctx, 0, -30, 32, '#f6d79a', '#d4a050'));
  // cross cut
  ctx.strokeStyle = '#b37a2e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, -58);
  ctx.lineTo(8, -50);
  ctx.moveTo(8, -60);
  ctx.lineTo(-10, -50);
  ctx.stroke();
  // butter pat melting
  ctx.beginPath();
  ctx.moveTo(-12, -60);
  ctx.lineTo(10, -64);
  ctx.lineTo(14, -54);
  ctx.quadraticCurveTo(16, -44, 12, -46);
  ctx.lineTo(10, -52);
  ctx.lineTo(-8, -50);
  ctx.quadraticCurveTo(-14, -42, -14, -52);
  ctx.closePath();
  fillStroke(ctx, '#ffe866', 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(-6, -60, 8, 2.5);
  face(ctx, 6, -28, 11, p, { mouthKind: 'smile', sparkle: true });
  ctx.restore();
};

const naga: Drawer = (ctx, p) => {
  const m = motion(p, 6);
  feet(ctx, 0, 0, 7, 5, p.walk * 6, m.moving, '#9d8a6a');
  ctx.save();
  ctx.translate(0, -m.bob * 0.5);
  ctx.rotate(m.lean * 0.4 + Math.sin(p.t * 1.5) * 0.03);
  ctx.beginPath();
  ctx.moveTo(-11, -2);
  ctx.bezierCurveTo(-16, -40, -12, -78, 0, -86);
  ctx.bezierCurveTo(12, -80, 15, -40, 11, -2);
  ctx.closePath();
  fillStroke(ctx, radial(ctx, 0, -40, 40, '#f4ead2', '#c9b48a'));
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const yy = -10 - i * 7.5;
    ctx.beginPath();
    ctx.moveTo(-8, yy);
    ctx.lineTo(-11, yy - 3);
    ctx.moveTo(8, yy - 3);
    ctx.lineTo(11, yy - 6);
    ctx.stroke();
  }
  // round glasses
  for (const ex of [-4, 7]) {
    ellipse(ctx, ex, -62, 5.5, 5.5);
    ctx.fillStyle = 'rgba(200,240,255,0.6)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  ctx.fillStyle = OUT;
  for (const ex of [-3, 8]) {
    ellipse(ctx, ex, -61.5, 2, 2.4);
    ctx.fill();
  }
  mouth(ctx, 3, -50, 6, p.state === 'attack' ? 'open' : 'smile');
  blush(ctx, -7, -54, 2.5);
  blush(ctx, 11, -54, 2.5);
  ctx.restore();
  if (p.state === 'attack' && p.atk > 0.5) {
    // sticky beam charge glow
    ctx.globalAlpha = (1 - p.atk) * 2;
    ellipse(ctx, 18, -60, 10, 10);
    ctx.fillStyle = '#fffbe0';
    ctx.fill();
    ctx.globalAlpha = 1;
  }
};

const sweet: Drawer = (ctx, p) => {
  const m = motion(p, 9);
  feet(ctx, 0, 0, 10, 5, p.walk * 9, m.moving, '#b8732a');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 0.6);
  ctx.scale(1 / m.squash, m.squash);
  // paper cup
  ctx.beginPath();
  ctx.moveTo(-24, -20);
  ctx.lineTo(24, -20);
  ctx.lineTo(18, -2);
  ctx.lineTo(-18, -2);
  ctx.closePath();
  fillStroke(ctx, '#fff', 2.5);
  ctx.strokeStyle = '#f2a0b8';
  ctx.lineWidth = 2;
  for (let i = -18; i <= 18; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, -18);
    ctx.lineTo(i * 0.8, -4);
    ctx.stroke();
  }
  blob(ctx, 0, -32, 24, 17, 0.03, 2);
  fillStroke(ctx, radial(ctx, 0, -36, 24, '#ffd77a', '#d98b20'));
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ellipse(ctx, -8, -42, 9, 3.5);
  ctx.fill();
  face(ctx, 3, -32, 8.5, p, { mouthKind: 'cat' });
  ctx.restore();
  if (p.state === 'attack') {
    ctx.fillStyle = '#ff7eb6';
    for (let i = 0; i < 3; i++) {
      const hx = 30 + i * 12 + p.atk * 20,
        hy = -40 - Math.sin(p.atk * 6 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(hx, hy + 3);
      ctx.bezierCurveTo(hx - 6, hy - 3, hx - 3, hy - 7, hx, hy - 3);
      ctx.bezierCurveTo(hx + 3, hy - 7, hx + 6, hy - 3, hx, hy + 3);
      ctx.fill();
    }
  }
};

const youkan: Drawer = (ctx, p) => {
  const m = motion(p, 5);
  feet(ctx, 0, 0, 14, 6, p.walk * 5, m.moving, '#2a1020');
  ctx.save();
  ctx.translate(0, -m.bob * 0.5);
  ctx.rotate(m.lean * 0.3);
  ctx.beginPath();
  ctx.rect(-26, -54, 52, 50);
  const g = ctx.createLinearGradient(-26, -54, 26, 0);
  g.addColorStop(0, '#8a3a6a');
  g.addColorStop(1, '#4a1838');
  fillStroke(ctx, g, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-22, -50, 44, 8);
  // gold leaf
  ctx.fillStyle = '#ffd34a';
  ctx.beginPath();
  ctx.moveTo(-14, -48);
  ctx.lineTo(-6, -50);
  ctx.lineTo(-8, -44);
  ctx.closePath();
  ctx.fill();
  face(ctx, 4, -30, 9.5, p, { angry: true, mouthKind: 'flat' });
  // bamboo-leaf wrapper + wooden pick on top (和菓子)
  ctx.beginPath();
  ctx.moveTo(-28, -6);
  ctx.quadraticCurveTo(0, 6, 28, -6);
  ctx.lineTo(30, 0);
  ctx.quadraticCurveTo(0, 12, -30, 0);
  ctx.closePath();
  fillStroke(ctx, '#6ab04c', 2);
  arm(ctx, 10, -54, 18, -74, 3, '#e9c98a');
  ctx.restore();
};

const ninja: Drawer = (ctx, p) => {
  const m = motion(p, 18);
  feet(ctx, 0, 0, 9, 5, p.walk * 18, m.moving, '#2a2a3a');
  ctx.save();
  ctx.translate(0, -m.bob * 0.6);
  ctx.rotate(m.lean + (m.moving ? 0.25 : 0));
  blob(ctx, 0, -25, 22, 23, 0.06, 3);
  fillStroke(ctx, radial(ctx, 0, -25, 24, '#e8c48a', '#b88a4a'));
  // hood/mask
  ctx.beginPath();
  ctx.moveTo(-22, -30);
  ctx.quadraticCurveTo(-24, -52, 0, -50);
  ctx.quadraticCurveTo(24, -50, 22, -30);
  ctx.lineTo(22, -22);
  ctx.quadraticCurveTo(0, -18, -22, -22);
  ctx.closePath();
  fillStroke(ctx, '#2f3150', 2.5);
  ctx.fillStyle = '#f6e2b8';
  ctx.fillRect(-14, -36, 32, 9);
  eye(ctx, -2, -31.5, 3.8, { look: 0.9, angry: true, closed: p.state === 'kb' });
  eye(ctx, 9, -31.5, 3.8, { look: 0.9, angry: true, closed: p.state === 'kb' });
  // scarf tails
  const fl = Math.sin(p.t * 14) * 4;
  ctx.beginPath();
  ctx.moveTo(-20, -26);
  ctx.lineTo(-40, -30 + fl);
  ctx.lineTo(-38, -22 + fl);
  ctx.closePath();
  fillStroke(ctx, '#e8312f', 2);
  // shuriken
  if (p.state === 'attack') {
    ctx.save();
    ctx.translate(24 + p.atk * 40, -28);
    ctx.rotate(p.t * 30);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 2 : 7;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    fillStroke(ctx, '#c9d2e0', 1.5);
    ctx.restore();
  }
  ctx.restore();
};

const hash: Drawer = (ctx, p) => {
  const m = motion(p, 8);
  feet(ctx, 0, 0, 12, 6, p.walk * 8, m.moving, '#9a5a14');
  ctx.save();
  ctx.translate(0, -m.bob * 0.7);
  ctx.rotate(m.lean * 0.5);
  ctx.beginPath();
  const w = 48,
    h = 54;
  ctx.moveTo(-w / 2 + 10, -h);
  ctx.lineTo(w / 2 - 10, -h);
  ctx.quadraticCurveTo(w / 2, -h, w / 2, -h + 12);
  ctx.lineTo(w / 2, -12);
  ctx.quadraticCurveTo(w / 2, -2, w / 2 - 10, -2);
  ctx.lineTo(-w / 2 + 10, -2);
  ctx.quadraticCurveTo(-w / 2, -2, -w / 2, -12);
  ctx.lineTo(-w / 2, -h + 12);
  ctx.quadraticCurveTo(-w / 2, -h, -w / 2 + 10, -h);
  fillStroke(ctx, radial(ctx, 0, -28, 32, '#ffd36a', '#d98a1c'));
  ctx.strokeStyle = 'rgba(160,90,20,0.55)';
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-20 + i * 2, -50);
    ctx.lineTo(-4 + i * 6, -6);
    ctx.stroke();
  }
  face(ctx, 4, -30, 9.5, p);
  ctx.restore();
};

const daigaku: Drawer = (ctx, p) => {
  const m = motion(p, 8);
  feet(ctx, 0, 0, 16, 6.5, p.walk * 8, m.moving, '#6b2340');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 0.7);
  // stick through three chunks
  ctx.save();
  ctx.rotate(-0.15);
  arm(ctx, 0, -2, 0, -86, 3.5, '#e9d3a3');
  const chunks: [number, number, number][] = [[0, -18, 17], [0, -46, 19], [0, -72, 15]];
  chunks.forEach(([x, y, r], i) => {
    blob(ctx, x, y, r * 1.15, r, 0.08, i + 2);
    fillStroke(ctx, radial(ctx, x, y, r, '#ffd25a', '#e07a1a'));
    // purple skin edge
    ctx.beginPath();
    ctx.arc(x, y, r * 1.0, Math.PI * 1.05, Math.PI * 1.55);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#a3244e';
    ctx.stroke();
    // shine & sesame
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ellipse(ctx, x - r * 0.4, y - r * 0.45, r * 0.35, r * 0.15, -0.4);
    ctx.fill();
    ctx.fillStyle = '#2a1a0e';
    for (const [sx, sy] of [[-0.3, 0.2], [0.4, -0.1], [0.1, 0.5]]) {
      ellipse(ctx, x + sx * r, y + sy * r, 1.5, 0.8, 0.5);
      ctx.fill();
    }
  });
  ctx.restore();
  face(ctx, 0, -48, 9, p, { angry: p.state === 'attack' });
  ctx.restore();
  // honey drip
  ctx.fillStyle = 'rgba(255,190,40,0.85)';
  const d = (p.t * 20) % 30;
  ellipse(ctx, -12, -8 + d * 0.3, 2.5, 3.5);
  ctx.fill();
};

const king: Drawer = (ctx, p) => {
  const m = motion(p, 6);
  feet(ctx, 0, 0, 18, 7, p.walk * 6, m.moving, '#6b2340');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 0.5);
  // cape
  const fl = Math.sin(p.t * 4) * 3;
  ctx.beginPath();
  ctx.moveTo(-8, -58);
  ctx.quadraticCurveTo(-46, -40 + fl, -40, -2);
  ctx.lineTo(4, -4);
  ctx.closePath();
  fillStroke(ctx, '#d32f3a', 2.5);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-42, -8, 46, 5);
  ctx.save();
  ctx.translate(0, -34);
  ctx.rotate(-0.08);
  blob(ctx, 0, 0, 26, 34, 0.05, 6);
  fillStroke(ctx, radial(ctx, 0, 0, 34, '#e6648a', '#9a1f48'));
  ctx.restore();
  // crown
  ctx.beginPath();
  ctx.moveTo(-16, -62);
  ctx.lineTo(-18, -80);
  ctx.lineTo(-8, -70);
  ctx.lineTo(0, -84);
  ctx.lineTo(8, -70);
  ctx.lineTo(18, -80);
  ctx.lineTo(16, -62);
  ctx.closePath();
  fillStroke(ctx, radial(ctx, 0, -72, 16, '#fff3a0', '#f2b322'), 2.5);
  ellipse(ctx, 0, -68, 3, 3);
  ctx.fillStyle = '#3d97f0';
  ctx.fill();
  // mustache
  face(ctx, 6, -36, 11, p, { angry: p.state === 'attack' });
  ctx.beginPath();
  ctx.moveTo(6, -24);
  ctx.quadraticCurveTo(-6, -30, -12, -20);
  ctx.quadraticCurveTo(-2, -24, 6, -21);
  ctx.quadraticCurveTo(14, -24, 24, -20);
  ctx.quadraticCurveTo(18, -30, 6, -24);
  fillStroke(ctx, '#5a3a1a', 1.5);
  // scepter
  const a = p.state === 'attack' ? (p.atk < 0.5 ? -1.0 : 0.6) : -0.3;
  ctx.save();
  ctx.translate(22, -30);
  ctx.rotate(a);
  arm(ctx, 0, 0, 0, -40, 4, '#f2b322');
  star(ctx, 0, -44, 9);
  fillStroke(ctx, '#ffe14d', 2);
  ctx.restore();
  ctx.restore();
};

const korokke: Drawer = (ctx, p) => {
  const m = motion(p, 9);
  feet(ctx, 0, 0, 11, 5, p.walk * 9, m.moving, '#8a5a1a');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 0.6);
  ctx.scale(1 / m.squash, m.squash);
  blob(ctx, 0, -26, 26, 21, 0.09, 8);
  fillStroke(ctx, radial(ctx, 0, -28, 26, '#f6c45a', '#c8781a'));
  // bread crumbs
  ctx.fillStyle = '#ffe08a';
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4,
      r = 6 + (i % 4) * 4.5;
    ctx.fillRect(Math.cos(a) * r - 1.5, -26 + Math.sin(a) * r * 0.8 - 1.5, 3, 3);
  }
  face(ctx, 4, -26, 9, p, { mouthKind: 'grin' });
  ctx.restore();
  // thrown croquette
  if (p.state === 'attack') {
    const k = p.atk;
    const hx = k < 0.5 ? 14 : 14 + (k - 0.5) * 120;
    const hy = k < 0.5 ? -40 - k * 20 : -50 - Math.sin((k - 0.5) * Math.PI * 2) * 30;
    ellipse(ctx, hx, hy, 8, 6);
    fillStroke(ctx, '#e8a53a', 2);
  }
};

const potesala: Drawer = (ctx, p) => {
  const m = motion(p, 8);
  feet(ctx, 0, 0, 12, 5, p.walk * 8, m.moving, '#5a8ab0');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 0.5);
  // bowl
  ctx.beginPath();
  ctx.moveTo(-28, -24);
  ctx.quadraticCurveTo(0, 8, 28, -24);
  ctx.closePath();
  fillStroke(ctx, '#e6f2ff', 2.5);
  ctx.strokeStyle = '#7cc8ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-22, -16);
  ctx.quadraticCurveTo(0, 0, 22, -16);
  ctx.stroke();
  // salad mound
  blob(ctx, 0, -32, 25, 15, 0.12, 3);
  fillStroke(ctx, radial(ctx, 0, -34, 24, '#fffbe6', '#f0dca0'), 2.5);
  // veggie bits
  const bits: [number, number, string][] = [[-14, -36, '#ff8a3a'], [10, -42, '#6ccf4a'], [16, -30, '#ff8a3a'], [-6, -44, '#6ccf4a'], [-18, -28, '#9be05a']];
  for (const [x, y, c] of bits) {
    ctx.fillStyle = c;
    ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
  }
  face(ctx, 2, -32, 8, p, { mouthKind: 'smile', sparkle: true });
  ctx.restore();
  if (p.state === 'attack') {
    ctx.strokeStyle = `rgba(125,255,125,${1 - p.atk})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -30, 30 + p.atk * 30, 0, Math.PI * 2);
    ctx.stroke();
  }
};

const mash: Drawer = (ctx, p) => {
  const m = motion(p, 6);
  ctx.save();
  ctx.translate(0, -m.bob * 0.6);
  ctx.rotate(m.lean * 0.4);
  ctx.scale(1 / m.squash, m.squash);
  // cloud-like fluffy body
  ctx.beginPath();
  const pts = 12;
  for (let i = 0; i <= pts; i++) {
    const a = Math.PI + (i / pts) * Math.PI;
    const r = 30 + (i % 2 ? 4 : -1) + Math.sin(p.t * 3 + i) * 1;
    const x = Math.cos(a) * r * 1.15,
      y = -6 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(x * 1.08, y * 1.08, x, y);
  }
  ctx.lineTo(34, 0);
  ctx.lineTo(-34, 0);
  ctx.closePath();
  fillStroke(ctx, radial(ctx, -6, -24, 36, '#fffdf0', '#efd9a0'));
  // butter & pepper
  ctx.beginPath();
  ctx.rect(-6, -40, 14, 9);
  fillStroke(ctx, '#ffe866', 2);
  ctx.fillStyle = '#3b2412';
  for (const [x, y] of [[-18, -22], [14, -26], [-4, -12], [20, -12], [-24, -10]]) ctx.fillRect(x, y, 2, 2);
  face(ctx, 4, -20, 10, p, { mouthKind: 'cat', sleepy: true });
  ctx.restore();
};

export const ALLY_ART: Record<string, Drawer> = { korokke, potesala, mash, jaga, sato, chips, satsu, kenpi, fry, yaki, murasaki, konnyaku, butter, naga, sweet, youkan, ninja, hash, daigaku, king };
