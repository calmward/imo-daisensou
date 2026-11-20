import { audio } from './audio';
import { UI } from './ui';
import { loadSave, writeSave, type SaveData } from '../game/save';

export interface Scene {
  name: string;
  enter?(): void;
  leave?(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  onDrag?(dx: number, dy: number, x: number, y: number): void;
  onPointerDown?(x: number, y: number): void;
  onPointerUp?(x: number, y: number, dragged: boolean): void;
  onWheel?(dy: number): void;
  onBack?(): boolean; // return true if handled
}

interface PtrState {
  id: number;
  sx: number;
  sy: number;
  lx: number;
  ly: number;
  dragging: boolean;
  regionId: string | null;
  downFired: boolean;
}

export class App {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  dpr = 1;
  ui = new UI();
  save: SaveData;
  scene!: Scene;
  next: Scene | null = null;
  fade = 0; // 0..1 transition
  fadeDir = 0;
  t = 0;
  private ptrs = new Map<number, PtrState>();
  private last = 0;
  private factories: Record<string, (arg?: any) => Scene> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.save = loadSave();
    audio.muted = this.save.muted;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.ptrs.delete(e.pointerId));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scene.onWheel?.(e.deltaY);
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.persist();
    });
    window.addEventListener('popstate', () => {
      // Android back button: let the scene handle it, keep the app open
      if (this.scene.onBack?.()) history.pushState(null, '');
    });
    history.pushState(null, '');
  }

  register(name: string, f: (arg?: any) => Scene) {
    this.factories[name] = f;
  }

  go(name: string, arg?: any, instant = false) {
    const s = this.factories[name](arg);
    if (instant || !this.scene) {
      this.scene?.leave?.();
      this.scene = s;
      s.enter?.();
      this.fade = 1;
      this.fadeDir = -1;
      return;
    }
    this.next = s;
    this.fadeDir = 1;
  }

  persist() {
    writeSave(this.save);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  private pos(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: PointerEvent) {
    audio.unlock();
    const { x, y } = this.pos(e);
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const reg = this.fadeDir !== 0 ? null : this.ui.hit(x, y);
    const st: PtrState = { id: e.pointerId, sx: x, sy: y, lx: x, ly: y, dragging: false, regionId: reg?.id ?? null, downFired: false };
    this.ptrs.set(e.pointerId, st);
    if (reg?.onDown) {
      st.downFired = true;
      reg.onDown();
    }
    this.ui.pressedId = reg?.id ?? null;
    this.ui.pointerX = x;
    this.ui.pointerY = y;
    this.scene.onPointerDown?.(x, y);
  }

  private onMove(e: PointerEvent) {
    const st = this.ptrs.get(e.pointerId);
    const { x, y } = this.pos(e);
    this.ui.pointerX = x;
    this.ui.pointerY = y;
    if (!st) return;
    const dx = x - st.lx,
      dy = y - st.ly;
    st.lx = x;
    st.ly = y;
    if (!st.dragging && Math.hypot(x - st.sx, y - st.sy) > 10) {
      st.dragging = true;
      if (!st.downFired) {
        st.regionId = null;
        this.ui.pressedId = null;
      }
    }
    if (st.dragging && !st.downFired) this.scene.onDrag?.(dx, dy, x, y);
  }

  private onUp(e: PointerEvent) {
    const st = this.ptrs.get(e.pointerId);
    this.ptrs.delete(e.pointerId);
    const { x, y } = this.pos(e);
    this.ui.pressedId = null;
    if (!st) return;
    if (!st.dragging && st.regionId && !st.downFired) {
      const reg = this.ui.hit(x, y);
      if (reg && reg.id === st.regionId && reg.onTap) {
        if (reg.sound !== false) audio.sfx('tap');
        reg.onTap();
      }
    }
    this.scene.onPointerUp?.(x, y, st.dragging);
  }

  start() {
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
      this.last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private frame(dt: number) {
    this.t += dt;
    if (this.fadeDir > 0) {
      this.fade = Math.min(1, this.fade + dt * 4);
      if (this.fade >= 1 && this.next) {
        this.scene.leave?.();
        this.scene = this.next;
        this.next = null;
        this.scene.enter?.();
        this.fadeDir = -1;
      }
    } else if (this.fadeDir < 0) {
      this.fade = Math.max(0, this.fade - dt * 4);
      if (this.fade <= 0) this.fadeDir = 0;
    }
    this.scene.update(dt);
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    this.ui.begin();
    this.scene.render(ctx, this.w, this.h);
    this.ui.end();
    if (this.fade > 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(255,236,200,${this.fade})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }
}
