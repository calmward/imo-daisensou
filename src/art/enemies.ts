// Enemy art. Drawn facing RIGHT like allies; the renderer mirrors them.
import { arm, blob, blush, ellipse, eye, feet, fillStroke, motion, mouth, OUT, radial, type Ctx, type Pose } from './kit';

type Drawer = (ctx: Ctx, p: Pose) => void;

function legs6(ctx: Ctx, x: number, y: number, spread: number, len: number, phase: number, moving: boolean, color = OUT) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ox = x + (i - 1) * spread;
    const sw = moving ? Math.sin(phase + i * 2) * 4 : 0;
    ctx.beginPath();
    ctx.moveTo(ox, y - len);
    ctx.lineTo(ox + sw, y);
    ctx.stroke();
  }
}

const ari: Drawer = (ctx, p) => {
  const m = motion(p, 14);
  legs6(ctx, 0, 0, 9, 10, p.walk * 14, m.moving);
  ctx.save();
  ctx.translate(0, -m.bob * 0.5);
  ctx.rotate(m.lean);
  ellipse(ctx, -14, -14, 10, 8);
  fillStroke(ctx, radial(ctx, -14, -14, 10, '#5a4a4a', '#1e1515'), 2.5);
  ellipse(ctx, 0, -14, 6, 5);
  fillStroke(ctx, '#2a1e1e', 2.5);
  ellipse(ctx, 13, -20, 10, 9);
  fillStroke(ctx, radial(ctx, 13, -20, 10, '#5a4a4a', '#1e1515'), 2.5);
  // antennae
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, -28);
  ctx.quadraticCurveTo(22, -40, 28, -36);
  ctx.moveTo(11, -28);
  ctx.quadraticCurveTo(12, -42, 18, -42);
  ctx.stroke();
  eye(ctx, 17, -21, 4, { look: 0.7, angry: true, closed: p.state === 'kb' });
  mouth(ctx, 18, -13, 5, p.state === 'attack' ? 'open' : 'grr');
  ctx.restore();
};

const nezumi: Drawer = (ctx, p) => {
  const m = motion(p, 16);
  feet(ctx, 0, 0, 8, 4, p.walk * 16, m.moving, '#c48a9a');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean);
  // tail
  ctx.strokeStyle = '#c48a9a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, -12);
  ctx.quadraticCurveTo(-34, -6 + Math.sin(p.t * 8) * 6, -36, -24);
  ctx.stroke();
  ellipse(ctx, -2, -16, 20, 14);
  fillStroke(ctx, radial(ctx, -2, -16, 20, '#c9c9d6', '#8a8a9e'));
  // ear
  ellipse(ctx, 6, -32, 8, 8);
  fillStroke(ctx, '#b0b0c2', 2.5);
  ellipse(ctx, 6, -32, 4.5, 4.5);
  ctx.fillStyle = '#f2a8b8';
  ctx.fill();
  // nose
  ellipse(ctx, 20, -16, 3, 2.5);
  ctx.fillStyle = '#e86a8a';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, -14);
  ctx.lineTo(28, -12);
  ctx.moveTo(18, -16);
  ctx.lineTo(28, -18);
  ctx.stroke();
  eye(ctx, 10, -20, 4, { look: 0.8, closed: p.state === 'kb', angry: true });
  ctx.restore();
};

const kemushi: Drawer = (ctx, p) => {
  const m = motion(p, 6);
  ctx.save();
  ctx.rotate(m.lean * 0.5);
  for (let i = 4; i >= 0; i--) {
    const x = -28 + i * 12;
    const wave = m.moving ? Math.sin(p.walk * 6 - i * 0.9) * 3 : Math.sin(p.t * 2 - i) * 1;
    ellipse(ctx, x, -10 - Math.max(0, wave), 9, 9);
    fillStroke(ctx, radial(ctx, x, -12, 9, i === 4 ? '#b8ef6a' : '#9be05a', '#4f9a2a'), 2.5);
    // spikes
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 3, -18 - Math.max(0, wave));
    ctx.lineTo(x - 4, -24 - Math.max(0, wave));
    ctx.moveTo(x + 3, -18 - Math.max(0, wave));
    ctx.lineTo(x + 4, -24 - Math.max(0, wave));
    ctx.stroke();
  }
  eye(ctx, 21, -13, 3.6, { look: 0.6, closed: p.state === 'kb' });
  eye(ctx, 15, -13, 3.2, { look: 0.6, closed: p.state === 'kb' });
  mouth(ctx, 19, -5, 4, p.state === 'attack' ? 'open' : 'smile');
  ctx.restore();
};

const karasu: Drawer = (ctx, p) => {
  const m = motion(p, 10);
  const flap = Math.sin(p.t * 14) * 0.7;
  ctx.save();
  const fly = 6 + Math.sin(p.t * 5) * 3;
  ctx.translate(0, -fly);
  ctx.rotate(m.lean);
  // legs
  ctx.strokeStyle = '#e8b23a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.lineTo(-4, 4);
  ctx.moveTo(4, -8);
  ctx.lineTo(4, 4);
  ctx.stroke();
  ellipse(ctx, 0, -22, 18, 15);
  fillStroke(ctx, radial(ctx, 0, -22, 18, '#4a4a60', '#141420'));
  // wing
  ctx.save();
  ctx.translate(-4, -26);
  ctx.rotate(-0.4 + flap);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-28, -10, -30, 6);
  ctx.quadraticCurveTo(-16, 4, 0, 8);
  ctx.closePath();
  fillStroke(ctx, '#23233a', 2.5);
  ctx.restore();
  // beak
  ctx.beginPath();
  ctx.moveTo(14, -28);
  ctx.lineTo(30, -24 + (p.state === 'attack' ? 4 : 0));
  ctx.lineTo(14, -20);
  ctx.closePath();
  fillStroke(ctx, '#ffb340', 2);
  eye(ctx, 9, -30, 4.5, { look: 0.8, angry: true, closed: p.state === 'kb', color: '#c0392b' });
  ctx.restore();
};

const hachi: Drawer = (ctx, p) => {
  const m = motion(p, 10);
  ctx.save();
  const fly = 14 + Math.sin(p.t * 6) * 4;
  ctx.translate(0, -fly);
  ctx.rotate(m.lean);
  // wings
  ctx.globalAlpha = 0.7;
  const fl = Math.sin(p.t * 40) * 0.4;
  ellipse(ctx, -4, -26, 8, 13, -0.6 + fl);
  fillStroke(ctx, '#e6f6ff', 2);
  ellipse(ctx, 4, -26, 7, 11, 0.3 - fl);
  fillStroke(ctx, '#e6f6ff', 2);
  ctx.globalAlpha = 1;
  ellipse(ctx, -6, -14, 14, 10);
  fillStroke(ctx, '#ffd23a', 2.5);
  ctx.fillStyle = OUT;
  ctx.fillRect(-12, -23, 4, 18);
  ctx.fillRect(-4, -24, 4, 20);
  // stinger
  ctx.beginPath();
  ctx.moveTo(-20, -14);
  ctx.lineTo(-28, -12);
  ctx.lineTo(-19, -10);
  ctx.closePath();
  fillStroke(ctx, '#3b2412', 1.5);
  ellipse(ctx, 11, -16, 9, 9);
  fillStroke(ctx, '#ffd23a', 2.5);
  eye(ctx, 14, -18, 3.5, { look: 0.8, angry: true, closed: p.state === 'kb' });
  ctx.restore();
};

const mogura: Drawer = (ctx, p) => {
  if (p.state === 'burrow') {
    // dirt mound moving
    const w = Math.sin(p.walk * 12) * 2;
    ellipse(ctx, 0, -4, 24 + w, 10);
    fillStroke(ctx, '#8a5a32', 2.5);
    ctx.fillStyle = '#6b4224';
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, -14 + i * 9, -12 - Math.abs(Math.sin(p.walk * 10 + i)) * 8, 3, 3);
      ctx.fill();
    }
    return;
  }
  const m = motion(p, 8);
  feet(ctx, 0, 0, 10, 5, p.walk * 8, m.moving, '#f2a8b8');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean);
  blob(ctx, 0, -24, 22, 22, 0.03, 1);
  fillStroke(ctx, radial(ctx, 0, -24, 22, '#8a6a5a', '#4a3226'));
  // round little glasses (moles can't see well!)
  for (const gx of [7, 18]) {
    ellipse(ctx, gx, -31, 5, 5);
    ctx.fillStyle = 'rgba(200,235,255,0.7)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ellipse(ctx, gx + 1, -30.5, 1.8, 1.8);
    ctx.fillStyle = OUT;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(12, -31);
  ctx.lineTo(13, -31);
  ctx.stroke();
  ellipse(ctx, 22, -22, 5, 4);
  ctx.fillStyle = '#ff8aa8';
  ctx.fill();
  ctx.stroke();
  mouth(ctx, 16, -14, 5, p.state === 'attack' ? 'open' : 'smile');
  // claws
  const a = p.state === 'attack' ? (p.atk < 0.5 ? -6 : 10) : 0;
  ellipse(ctx, 18 + a, -10, 7, 5);
  fillStroke(ctx, '#f2a8b8', 2);
  ctx.restore();
};

const katatsumuri: Drawer = (ctx, p) => {
  const m = motion(p, 3);
  ctx.save();
  ctx.rotate(m.lean * 0.3);
  // body
  ctx.beginPath();
  ctx.moveTo(-32, 0);
  ctx.lineTo(24, 0);
  ctx.quadraticCurveTo(34, 0, 32, -14);
  ctx.quadraticCurveTo(28, -26, 22, -22);
  ctx.lineTo(18, -8);
  ctx.lineTo(-32, -6);
  ctx.closePath();
  fillStroke(ctx, radial(ctx, 10, -8, 24, '#d6e8b0', '#9ab070'));
  // shell
  ellipse(ctx, -6, -24, 22, 22);
  fillStroke(ctx, radial(ctx, -6, -24, 22, '#ffb36a', '#b8641a'));
  ctx.strokeStyle = '#7a3e0e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const a = i * 0.32;
    const r = 2 + i * 0.45;
    ctx.lineTo(-6 + Math.cos(a) * r, -24 + Math.sin(a) * r);
  }
  ctx.stroke();
  // eye stalks
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(26, -18);
  ctx.lineTo(30, -34);
  ctx.moveTo(22, -18);
  ctx.lineTo(22, -34);
  ctx.stroke();
  eye(ctx, 31, -36, 3.5, { look: 0.6, closed: p.state === 'kb' });
  eye(ctx, 22, -36, 3.5, { look: 0.6, closed: p.state === 'kb' });
  mouth(ctx, 29, -8, 4, 'smile');
  ctx.restore();
};

const tanuki: Drawer = (ctx, p) => {
  const m = motion(p, 8);
  feet(ctx, 0, 0, 12, 6, p.walk * 8, m.moving, '#4a3020');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean);
  // tail
  ellipse(ctx, -24, -18, 10, 8, 0.5);
  fillStroke(ctx, '#9a6a3a', 2.5);
  ellipse(ctx, 0, -24, 24, 24);
  fillStroke(ctx, radial(ctx, 0, -24, 24, '#c48a52', '#8a5a2a'));
  // belly
  ellipse(ctx, 4, -16, 14, 13);
  fillStroke(ctx, '#f2dcb4', 2);
  // ears
  for (const ex of [-10, 10]) {
    ellipse(ctx, ex, -46, 6, 6);
    fillStroke(ctx, '#8a5a2a', 2.5);
  }
  // mask
  ellipse(ctx, 6, -32, 14, 6);
  ctx.fillStyle = '#4a3020';
  ctx.fill();
  eye(ctx, 1, -32, 3.6, { look: 0.6, closed: p.state === 'kb', angry: true });
  eye(ctx, 12, -32, 3.6, { look: 0.6, closed: p.state === 'kb', angry: true });
  ellipse(ctx, 8, -26, 3, 2.4);
  ctx.fillStyle = OUT;
  ctx.fill();
  // drumming hands
  const a = p.state === 'attack' ? Math.sin(p.atk * 20) * 5 : 0;
  ellipse(ctx, 18, -18 + a, 5, 5);
  fillStroke(ctx, '#8a5a2a', 2);
  ctx.restore();
};

const kamakiri: Drawer = (ctx, p) => {
  const m = motion(p, 8);
  legs6(ctx, -6, 0, 10, 12, p.walk * 8, m.moving, '#3a7a1a');
  ctx.save();
  ctx.translate(0, -m.bob * 0.5);
  ctx.rotate(m.lean);
  ellipse(ctx, -16, -16, 16, 7, -0.2);
  fillStroke(ctx, radial(ctx, -16, -16, 16, '#a6e86a', '#5aa82a'));
  arm(ctx, 0, -18, 8, -44, 6, '#7ac84a');
  // head (triangle)
  ctx.beginPath();
  ctx.moveTo(2, -50);
  ctx.lineTo(22, -48);
  ctx.lineTo(12, -36);
  ctx.closePath();
  fillStroke(ctx, '#8ad85a', 2.5);
  eye(ctx, 6, -48, 4, { look: 0.6, angry: true, closed: p.state === 'kb', color: '#1a5a1a' });
  eye(ctx, 18, -47, 4, { look: 0.6, angry: true, closed: p.state === 'kb', color: '#1a5a1a' });
  // scythes
  const a = p.state === 'attack' ? (p.atk < 0.5 ? -0.8 : 0.9) : -0.2;
  for (const off of [0, 5]) {
    ctx.save();
    ctx.translate(6 + off, -36);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(16, -4);
    ctx.quadraticCurveTo(26, 4, 22, 14);
    ctx.quadraticCurveTo(20, 4, 14, 2);
    ctx.lineTo(0, 4);
    ctx.closePath();
    fillStroke(ctx, '#b8f08a', 2);
    ctx.restore();
  }
  ctx.restore();
};

const hebi: Drawer = (ctx, p) => {
  const m = motion(p, 5);
  ctx.save();
  // S body segments
  ctx.lineCap = 'round';
  const pts: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const x = -50 + i * 5;
    const y = -8 - Math.sin(i * 0.7 + (m.moving ? p.walk * 6 : p.t)) * 5;
    pts.push([x, y]);
  }
  const strike = p.state === 'attack' ? (p.atk < 0.5 ? -6 : 18 * (1 - p.atk)) : 0;
  pts.push([16 + strike, -26], [26 + strike, -34]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 15;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = '#7ac84a';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = '#e8d84a';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ellipse(ctx, 30 + strike, -36, 12, 9);
  fillStroke(ctx, '#8ad85a', 2.5);
  eye(ctx, 32 + strike, -40, 3.8, { look: 0.7, angry: true, closed: p.state === 'kb', color: '#c0392b' });
  // tongue
  if (Math.sin(p.t * 6) > 0.3 || p.state === 'attack') {
    ctx.strokeStyle = '#e8312f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(41 + strike, -34);
    ctx.lineTo(50 + strike, -34);
    ctx.lineTo(54 + strike, -37);
    ctx.moveTo(50 + strike, -34);
    ctx.lineTo(54 + strike, -31);
    ctx.stroke();
  }
  ctx.restore();
};

const inoshishi: Drawer = (ctx, p) => {
  const m = motion(p, 12);
  feet(ctx, -6, 0, 16, 5, p.walk * 12, m.moving, '#3a2416');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 1.2);
  ellipse(ctx, -4, -22, 30, 19);
  fillStroke(ctx, radial(ctx, -4, -24, 30, '#9a7050', '#5a3a22'));
  // mane
  ctx.fillStyle = '#3a2416';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-22 + i * 7, -38);
    ctx.lineTo(-18 + i * 7, -46);
    ctx.lineTo(-14 + i * 7, -38);
    ctx.fill();
  }
  // snout
  ellipse(ctx, 28, -18, 8, 7);
  fillStroke(ctx, '#d89a7a', 2.5);
  ctx.fillStyle = OUT;
  ellipse(ctx, 30, -19, 1.5, 2.5);
  ctx.fill();
  // tusk
  ctx.beginPath();
  ctx.moveTo(22, -12);
  ctx.quadraticCurveTo(30, -10, 30, -22);
  ctx.quadraticCurveTo(26, -14, 20, -15);
  fillStroke(ctx, '#fff8e0', 1.5);
  eye(ctx, 15, -28, 4.2, { look: 0.8, angry: true, closed: p.state === 'kb' });
  ctx.restore();
  if (m.moving) {
    ctx.fillStyle = 'rgba(160,120,80,0.5)';
    ellipse(ctx, -36 - (p.walk * 60) % 10, -4, 6, 4);
    ctx.fill();
  }
};

const fukurou: Drawer = (ctx, p) => {
  const m = motion(p, 6);
  ctx.save();
  const fly = 4 + Math.sin(p.t * 3) * 2;
  ctx.translate(0, -fly - m.bob * 0.5);
  ctx.rotate(m.lean * 0.5);
  ellipse(ctx, 0, -26, 20, 24);
  fillStroke(ctx, radial(ctx, 0, -26, 22, '#c4a070', '#7a5a32'));
  ellipse(ctx, 2, -18, 12, 13);
  fillStroke(ctx, '#f2e2c0', 2);
  // feather marks
  ctx.strokeStyle = '#a07a4a';
  ctx.lineWidth = 1.5;
  for (const [x, y] of [[-2, -20], [6, -16], [0, -12]]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // ear tufts
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 10, -44);
    ctx.lineTo(s * 16, -56);
    ctx.lineTo(s * 4, -48);
    ctx.closePath();
    fillStroke(ctx, '#7a5a32', 2);
  }
  const glare = p.state === 'attack';
  eye(ctx, -6, -34, 7, { look: 0.3, closed: p.state === 'kb', color: glare ? '#e8312f' : '#2a1a0e' });
  eye(ctx, 9, -34, 7, { look: 0.3, closed: p.state === 'kb', color: glare ? '#e8312f' : '#2a1a0e' });
  ctx.beginPath();
  ctx.moveTo(1, -28);
  ctx.lineTo(5, -28);
  ctx.lineTo(3, -22);
  ctx.closePath();
  fillStroke(ctx, '#ffb340', 1.5);
  ctx.restore();
  ctx.strokeStyle = '#e8b23a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -4 - fly);
  ctx.lineTo(-4, 0);
  ctx.moveTo(4, -4 - fly);
  ctx.lineTo(4, 0);
  ctx.stroke();
};

const kabuto: Drawer = (ctx, p) => {
  const m = motion(p, 6);
  legs6(ctx, -4, 0, 14, 12, p.walk * 6, m.moving);
  ctx.save();
  ctx.translate(0, -m.bob * 0.5);
  ctx.rotate(m.lean * 0.8);
  ellipse(ctx, -8, -24, 30, 20);
  fillStroke(ctx, radial(ctx, -12, -30, 30, '#a0603a', '#3a1a0a'));
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -44);
  ctx.lineTo(-8, -6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ellipse(ctx, -18, -34, 10, 4, -0.3);
  ctx.fill();
  // head + horn
  ellipse(ctx, 20, -22, 11, 10);
  fillStroke(ctx, '#4a2410', 2.5);
  const a = p.state === 'attack' ? (p.atk < 0.5 ? 0.3 : -0.5) : 0;
  ctx.save();
  ctx.translate(26, -26);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(20, -4, 26, -24);
  ctx.lineTo(32, -26);
  ctx.lineTo(28, -20);
  ctx.quadraticCurveTo(22, 4, 2, 6);
  ctx.closePath();
  fillStroke(ctx, '#5a2a12', 2.5);
  ctx.restore();
  eye(ctx, 24, -22, 3.6, { look: 0.8, angry: true, closed: p.state === 'kb', color: '#e8312f' });
  ctx.restore();
};

const okarasu: Drawer = (ctx, p) => {
  ctx.save();
  ctx.scale(1.15, 1.15);
  karasu(ctx, p);
  // crown-ish crest
  ctx.beginPath();
  ctx.moveTo(-2, -38);
  ctx.lineTo(2, -48);
  ctx.lineTo(6, -40);
  ctx.lineTo(10, -50);
  ctx.lineTo(12, -38);
  ctx.closePath();
  fillStroke(ctx, '#c0392b', 2);
  ctx.restore();
};

const kuma: Drawer = (ctx, p) => {
  const m = motion(p, 6);
  feet(ctx, 0, 0, 16, 7, p.walk * 6, m.moving, '#3a2416');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 0.8);
  blob(ctx, 0, -28, 28, 28, 0.03, 2);
  fillStroke(ctx, radial(ctx, 0, -30, 30, '#8a5a3a', '#4a2a16'));
  ellipse(ctx, 4, -20, 15, 14);
  fillStroke(ctx, '#d8a878', 2);
  for (const ex of [-14, 14]) {
    ellipse(ctx, ex, -54, 8, 8);
    fillStroke(ctx, '#5a3a22', 2.5);
    ellipse(ctx, ex, -54, 4, 4);
    ctx.fillStyle = '#d8a878';
    ctx.fill();
  }
  // scar
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -46);
  ctx.lineTo(0, -34);
  ctx.stroke();
  eye(ctx, -2, -38, 4, { look: 0.7, angry: true, closed: p.state === 'kb' });
  eye(ctx, 13, -38, 4, { look: 0.7, angry: true, closed: p.state === 'kb' });
  ellipse(ctx, 10, -28, 4, 3);
  ctx.fillStyle = OUT;
  ctx.fill();
  mouth(ctx, 10, -20, 7, p.state === 'attack' ? 'open' : 'grr');
  const a = p.state === 'attack' ? (p.atk < 0.5 ? -14 : 14) : 0;
  arm(ctx, 18, -28, 30 + a, -36 + Math.abs(a) * 0.4, 9, '#6a4226');
  ctx.restore();
};

const daiou: Drawer = (ctx, p) => {
  const m = motion(p, 5);
  feet(ctx, 0, 0, 18, 8, p.walk * 5, m.moving, '#3a1a4a');
  ctx.save();
  ctx.translate(0, -m.bob);
  ctx.rotate(m.lean * 0.6);
  // cape
  ctx.beginPath();
  ctx.moveTo(-10, -60);
  ctx.quadraticCurveTo(-50, -40 + Math.sin(p.t * 3) * 4, -42, 0);
  ctx.lineTo(10, -2);
  ctx.closePath();
  fillStroke(ctx, '#5a1a7a', 2.5);
  blob(ctx, 0, -32, 30, 32, 0.04, 4);
  fillStroke(ctx, radial(ctx, 0, -34, 30, '#7a5aa8', '#3a2a5a'));
  // bib (napkin)
  ctx.beginPath();
  ctx.moveTo(-10, -24);
  ctx.lineTo(22, -24);
  ctx.lineTo(6, -2);
  ctx.closePath();
  fillStroke(ctx, '#fff', 2);
  ctx.fillStyle = '#e8312f';
  ellipse(ctx, 6, -16, 3, 3);
  ctx.fill();
  // horns
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 10 + 4, -60);
    ctx.quadraticCurveTo(s * 22 + 4, -72, s * 18 + 4, -84);
    ctx.quadraticCurveTo(s * 12 + 4, -70, s * 2 + 4, -62);
    ctx.closePath();
    fillStroke(ctx, '#fff3d0', 2);
  }
  // crown
  ctx.beginPath();
  ctx.moveTo(-8, -62);
  ctx.lineTo(-6, -74);
  ctx.lineTo(0, -66);
  ctx.lineTo(6, -76);
  ctx.lineTo(12, -66);
  ctx.lineTo(18, -74);
  ctx.lineTo(18, -62);
  ctx.closePath();
  fillStroke(ctx, '#ffd23a', 2);
  eye(ctx, 0, -44, 6, { look: 0.7, angry: true, closed: p.state === 'kb', color: '#e8312f' });
  eye(ctx, 18, -44, 6, { look: 0.7, angry: true, closed: p.state === 'kb', color: '#e8312f' });
  mouth(ctx, 10, -32, 12, p.state === 'attack' ? 'open' : 'grr');
  blush(ctx, -8, -34, 3, 'rgba(200,80,180,0.5)');
  // giant fork
  const a = p.state === 'attack' ? (p.atk < 0.5 ? -0.9 : 0.6) : -0.2;
  ctx.save();
  ctx.translate(24, -34);
  ctx.rotate(a);
  arm(ctx, 0, 0, 0, -48, 4, '#c9d2e0');
  for (const fx of [-6, 0, 6]) arm(ctx, fx, -48, fx, -62, 3, '#c9d2e0');
  arm(ctx, -6, -48, 6, -48, 3, '#c9d2e0');
  ctx.restore();
  ctx.restore();
};

const kaeru: Drawer = (ctx, p) => {
  const m = motion(p, 8);
  ctx.save();
  ctx.translate(0, -m.bob * 0.5);
  ctx.rotate(m.lean);
  // back legs
  ellipse(ctx, -14, -6, 12, 7);
  fillStroke(ctx, '#4fa83a', 2.5);
  ellipse(ctx, 0, -18, 22, 16);
  fillStroke(ctx, radial(ctx, 0, -20, 22, '#9be05a', '#4f9a2a'));
  ellipse(ctx, 4, -12, 13, 8);
  fillStroke(ctx, '#e8f6c8', 2);
  // eye bumps
  for (const ex of [2, 16]) {
    ellipse(ctx, ex, -34, 8, 8);
    fillStroke(ctx, '#7ac84a', 2.5);
    eye(ctx, ex + 1, -34, 4.5, { look: 0.6, angry: p.state === 'attack' });
  }
  mouth(ctx, 12, -20, 9, p.state === 'attack' ? 'open' : 'smile');
  blush(ctx, -6, -22, 3);
  // front feet
  ellipse(ctx, 14, -2, 6, 3);
  fillStroke(ctx, '#4fa83a', 2);
  if (p.state === 'attack' && p.atk > 0.4) {
    ctx.strokeStyle = '#ff7eb6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(18, -18);
    ctx.lineTo(18 + 30 * (1 - p.atk) * 2, -18);
    ctx.stroke();
  }
  ctx.restore();
};

const metal: Drawer = (ctx, p) => {
  const m = motion(p, 12);
  legs6(ctx, 0, 0, 8, 8, p.walk * 12, m.moving);
  ctx.save();
  ctx.translate(0, -m.bob * 0.5);
  ctx.rotate(m.lean);
  ctx.beginPath();
  ctx.arc(-2, -10, 18, Math.PI, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(-20, -28, 16, -8);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#b8c4d8');
  g.addColorStop(0.6, '#e8eef8');
  g.addColorStop(1, '#7a8aa8');
  fillStroke(ctx, g, 2.5);
  ctx.fillStyle = '#4a5a78';
  for (const [x, y] of [[-10, -18], [4, -20], [-4, -13]]) {
    ellipse(ctx, x, y, 3, 3);
    ctx.fill();
  }
  ellipse(ctx, 16, -13, 8, 7);
  fillStroke(ctx, '#5a6a88', 2.5);
  eye(ctx, 18, -14, 3.2, { look: 0.8, angry: true });
  // shine glint
  const gl = (p.t * 0.8) % 1;
  ctx.fillStyle = `rgba(255,255,255,${1 - gl})`;
  ctx.beginPath();
  ctx.ellipse(-14 + gl * 22, -22 + gl * 6, 2, 6, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const ENEMY_ART: Record<string, Drawer> = {
  kaeru, metal,
  ari, nezumi, kemushi, karasu, hachi, mogura, katatsumuri, tanuki, kamakiri, hebi, inoshishi, fukurou, kabuto, okarasu, kuma, daiou,
};

