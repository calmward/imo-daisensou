// Lightweight particle system in world coordinates (x along field, y up = negative).
import { ellipse, star } from '../art/kit';
import { font } from '../core/ui';

export type PKind = 'smear' | 'spark' | 'puff' | 'text' | 'coin' | 'debris' | 'soul' | 'ring' | 'confetti' | 'dirt' | 'flash';

export interface Particle {
  kind: PKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  text?: string;
  rot: number;
  vr: number;
  grav: number;
  stroke?: string;
}

export class FX {
  list: Particle[] = [];
  add(p: Partial<Particle> & { kind: PKind; x: number; y: number }) {
    if (this.list.length > 400) this.list.shift();
    this.list.push({ vx: 0, vy: 0, life: 0, max: 0.6, size: 10, color: '#fff', rot: 0, vr: 0, grav: 0, ...p });
  }
  update(dt: number) {
    for (const p of this.list) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.rot += p.vr * dt;
      if ((p.kind === 'debris' || p.kind === 'confetti' || p.kind === 'coin' || p.kind === 'dirt') && p.y > 0) {
        p.y = 0;
        p.vy *= -0.35;
        p.vx *= 0.6;
      }
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }
  render(ctx: CanvasRenderingContext2D, toX: (x: number) => number, toY: (y: number) => number, scale: number) {
    for (const p of this.list) {
      const k = p.life / p.max;
      const x = toX(p.x),
        y = toY(p.y);
      ctx.save();
      switch (p.kind) {
        case 'spark': {
          ctx.globalAlpha = 1 - k;
          ctx.translate(x, y);
          ctx.rotate(p.rot);
          const s = p.size * scale * (0.6 + k * 0.8);
          star(ctx, 0, 0, s, 4, 0.35);
          ctx.fillStyle = p.color;
          ctx.fill();
          break;
        }
        case 'smear': {
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.translate(x, y);
          ctx.scale(p.rot, 1);
          const R = p.size * scale;
          ctx.beginPath();
          ctx.arc(0, 0, R, -1.2 + k * 0.8, 1.0 + k * 0.8);
          ctx.arc(-R * 0.25, 0, R * 0.8, 1.0 + k * 0.8, -1.2 + k * 0.8, true);
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.fill();
          break;
        }
        case 'puff': {
          ctx.globalAlpha = (1 - k) * 0.7;
          ellipse(ctx, x, y, p.size * scale * (0.5 + k), p.size * scale * (0.5 + k) * 0.8);
          ctx.fillStyle = p.color;
          ctx.fill();
          break;
        }
        case 'flash': {
          ctx.globalAlpha = (1 - k) * 0.9;
          ellipse(ctx, x, y, p.size * scale * (0.6 + k * 0.6), p.size * scale * (0.6 + k * 0.6));
          ctx.fillStyle = p.color;
          ctx.fill();
          break;
        }
        case 'ring': {
          ctx.globalAlpha = 1 - k;
          ctx.lineWidth = Math.max(2, 10 * scale * (1 - k));
          ctx.strokeStyle = p.color;
          ellipse(ctx, x, y, p.size * scale * (0.2 + k * 1.5), p.size * scale * (0.2 + k * 1.5) * 0.35);
          ctx.stroke();
          break;
        }
        case 'text': {
          const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5);
          ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
          ctx.translate(x, y);
          ctx.rotate(p.rot);
          ctx.scale(pop, pop);
          const sz = Math.max(10, p.size * scale);
          ctx.font = font(sz);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(3, sz * 0.25);
          ctx.strokeStyle = p.stroke ?? '#3b2412';
          ctx.strokeText(p.text ?? '', 0, 0);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text ?? '', 0, 0);
          break;
        }
        case 'coin': {
          ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
          ctx.translate(x, y);
          ctx.scale(Math.cos(p.life * 12), 1);
          ellipse(ctx, 0, 0, p.size * scale, p.size * scale);
          ctx.fillStyle = '#ffd23a';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#a36a00';
          ctx.stroke();
          break;
        }
        case 'debris':
        case 'confetti':
        case 'dirt': {
          ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
          ctx.translate(x, y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          const s = p.size * scale;
          if (p.kind === 'dirt') {
            ellipse(ctx, 0, 0, s, s * 0.8);
            ctx.fill();
          } else ctx.fillRect(-s / 2, -s / 3, s, p.kind === 'confetti' ? s * 0.5 : s * 0.7);
          break;
        }
        case 'soul': {
          ctx.globalAlpha = (1 - k) * 0.85;
          const s = p.size * scale;
          ctx.translate(x + Math.sin(p.life * 6) * 6 * scale, y);
          ctx.beginPath();
          ctx.arc(0, 0, s, Math.PI, 0);
          ctx.lineTo(s, s * 1.2);
          ctx.quadraticCurveTo(s * 0.5, s * 0.8, 0, s * 1.2);
          ctx.quadraticCurveTo(-s * 0.5, s * 0.8, -s, s * 1.2);
          ctx.closePath();
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#8ab8e0';
          ctx.stroke();
          ctx.fillStyle = '#3b2412';
          ellipse(ctx, -s * 0.35, -s * 0.1, s * 0.12, s * 0.18);
          ctx.fill();
          ellipse(ctx, s * 0.35, -s * 0.1, s * 0.12, s * 0.18);
          ctx.fill();
          // halo
          ctx.strokeStyle = '#ffd23a';
          ctx.lineWidth = 2;
          ellipse(ctx, 0, -s * 1.25, s * 0.6, s * 0.18);
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }
}
