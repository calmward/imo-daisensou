// All sound is synthesized with the Web Audio API — no downloads needed.

type Wave = OscillatorType;

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
export function noteFreq(n: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = NOTE[m[1]] + (parseInt(m[2]) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface Track {
  bpm: number;
  /** 16th-note steps. Each voice is a list of tokens: note like "C5", "-" hold, "." rest */
  lead: string;
  bass: string;
  drums: string; // k = kick, s = snare, h = hat, . = rest
  leadWave?: Wave;
  bassWave?: Wave;
  harmony?: string;
}

function tokens(s: string): string[] {
  return s.trim().split(/\s+/);
}

class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxGain!: GainNode;
  musicGain!: GainNode;
  noiseBuf!: AudioBuffer;
  muted = false;
  musicOn = true;
  private track: Track | null = null;
  private trackName = '';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private parsed: { lead: string[]; bass: string[]; drums: string[]; harmony: string[] } | null = null;
  private lastSfx: Record<string, number> = {};

  unlock() {
    if (!this.ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const ctx = this.ctx!;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      // gentle compressor keeps many overlapping hits from clipping
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(ctx.destination);
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.master);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
      const len = ctx.sampleRate * 1;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this.track && this.timer === null) this.startScheduler();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  private tone(freq: number, dur: number, opts: { wave?: Wave; vol?: number; slide?: number; at?: number; dest?: AudioNode; attack?: number; release?: number } = {}) {
    const ctx = this.ctx!;
    const t = opts.at ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.wave ?? 'square';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    const v = opts.vol ?? 0.3;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (opts.release ?? 0));
    o.connect(g);
    g.connect(opts.dest ?? this.sfxGain);
    o.start(t);
    o.stop(t + dur + (opts.release ?? 0) + 0.05);
  }

  private noise(dur: number, opts: { vol?: number; at?: number; freq?: number; q?: number; type?: BiquadFilterType; dest?: AudioNode; sweep?: number } = {}) {
    const ctx = this.ctx!;
    const t = opts.at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1200, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(opts.dest ?? this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /** Play a named sound effect. Rate-limited so swarms don't get noisy. */
  sfx(name: string) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const minGap: Record<string, number> = { hit: 0.05, hit2: 0.06, coin: 0.06, die: 0.05, step: 0.1 };
    if (minGap[name] && now - (this.lastSfx[name] ?? 0) < minGap[name]) return;
    this.lastSfx[name] = now;
    const r = 0.94 + Math.random() * 0.12;
    switch (name) {
      case 'tap':
        this.tone(880 * r, 0.06, { wave: 'triangle', vol: 0.25 });
        this.tone(1320 * r, 0.06, { wave: 'triangle', vol: 0.15, at: now + 0.04 });
        break;
      case 'deny':
        this.tone(200, 0.12, { wave: 'square', vol: 0.12 });
        this.tone(150, 0.14, { wave: 'square', vol: 0.12, at: now + 0.1 });
        break;
      case 'spawn':
        this.tone(400 * r, 0.12, { wave: 'square', vol: 0.12, slide: 900 * r });
        this.tone(700 * r, 0.08, { wave: 'triangle', vol: 0.15, at: now + 0.07, slide: 1200 });
        break;
      case 'hit':
        this.noise(0.08, { vol: 0.35, freq: 1800 * r, q: 0.8 });
        this.tone(220 * r, 0.06, { wave: 'square', vol: 0.08, slide: 90 });
        break;
      case 'hit2':
        this.noise(0.18, { vol: 0.45, freq: 600 * r, q: 0.6, sweep: 200 });
        this.tone(150 * r, 0.15, { wave: 'sawtooth', vol: 0.12, slide: 50 });
        break;
      case 'crit':
        this.tone(1500, 0.08, { wave: 'square', vol: 0.12, slide: 2400 });
        this.noise(0.15, { vol: 0.4, freq: 2500, q: 1 });
        break;
      case 'die':
        this.tone(600 * r, 0.25, { wave: 'triangle', vol: 0.18, slide: 120 });
        break;
      case 'enemyDie':
        this.tone(300 * r, 0.12, { wave: 'square', vol: 0.12, slide: 80 });
        this.noise(0.1, { vol: 0.2, freq: 900 });
        break;
      case 'coin':
        this.tone(988, 0.06, { wave: 'square', vol: 0.08 });
        this.tone(1319, 0.12, { wave: 'square', vol: 0.08, at: now + 0.06 });
        break;
      case 'kb':
        this.tone(500 * r, 0.2, { wave: 'triangle', vol: 0.15, slide: 200 });
        break;
      case 'levelup':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(noteFreq(n), 0.12, { wave: 'square', vol: 0.12, at: now + i * 0.07 }));
        break;
      case 'wallet':
        ['G4', 'C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(noteFreq(n), 0.1, { wave: 'triangle', vol: 0.22, at: now + i * 0.05 }));
        this.tone(noteFreq('C6'), 0.3, { wave: 'square', vol: 0.06, at: now + 0.25 });
        break;
      case 'charge':
        this.tone(300, 0.5, { wave: 'sawtooth', vol: 0.1, slide: 1200 });
        break;
      case 'beamReady':
        ['E5', 'G5', 'B5', 'E6'].forEach((n, i) => this.tone(noteFreq(n), 0.1, { wave: 'triangle', vol: 0.2, at: now + i * 0.06 }));
        break;
      case 'beam':
        this.tone(1200, 1.0, { wave: 'sawtooth', vol: 0.12, slide: 80 });
        this.tone(600, 1.0, { wave: 'square', vol: 0.08, slide: 60 });
        this.noise(1.2, { vol: 0.5, freq: 3000, sweep: 300, q: 0.5 });
        break;
      case 'boom':
        this.noise(0.8, { vol: 0.8, freq: 400, q: 0.4, sweep: 60, type: 'lowpass' });
        this.tone(90, 0.6, { wave: 'sine', vol: 0.5, slide: 30 });
        break;
      case 'baseHit':
        this.noise(0.2, { vol: 0.35, freq: 300, q: 0.5, type: 'lowpass' });
        this.tone(110, 0.15, { wave: 'square', vol: 0.1, slide: 60 });
        break;
      case 'boss':
        for (let i = 0; i < 3; i++) this.tone(110, 0.35, { wave: 'sawtooth', vol: 0.18, at: now + i * 0.4, slide: 70 });
        this.noise(1.3, { vol: 0.4, freq: 150, type: 'lowpass', at: now });
        break;
      case 'shock':
        this.noise(0.9, { vol: 0.7, freq: 200, q: 0.3, sweep: 50, type: 'lowpass' });
        this.tone(60, 0.8, { wave: 'sine', vol: 0.5, slide: 25 });
        break;
      case 'whistle':
        this.tone(1800, 0.15, { wave: 'sine', vol: 0.2, slide: 2600 });
        this.tone(2600, 0.25, { wave: 'sine', vol: 0.2, at: now + 0.15, slide: 2200 });
        break;
      case 'gacha':
        for (let i = 0; i < 10; i++) this.tone(400 + i * 90, 0.06, { wave: 'square', vol: 0.08, at: now + i * 0.06 });
        break;
      case 'fanfare':
        ['C5', 'C5', 'C5', 'G5', 'E5', 'G5', 'C6'].forEach((n, i) =>
          this.tone(noteFreq(n), i === 6 ? 0.6 : 0.12, { wave: 'square', vol: 0.12, at: now + [0, 0.12, 0.24, 0.4, 0.6, 0.72, 0.9][i] }),
        );
        break;
      case 'pop':
        this.tone(600 * r, 0.08, { wave: 'sine', vol: 0.3, slide: 1400 });
        break;
      case 'freeze':
        this.tone(2000, 0.3, { wave: 'triangle', vol: 0.1, slide: 3000 });
        this.tone(2600, 0.3, { wave: 'triangle', vol: 0.08, at: now + 0.05 });
        break;
    }
  }

  /** Short jingles (not looping) */
  jingle(name: 'win' | 'lose') {
    if (!this.ctx) return;
    this.stopMusic();
    const now = this.ctx.currentTime + 0.05;
    const d = this.musicGain;
    if (name === 'win') {
      const mel: [string, number, number][] = [
        ['C5', 0, 0.14], ['E5', 0.15, 0.14], ['G5', 0.3, 0.14], ['C6', 0.45, 0.3], ['A5', 0.8, 0.14], ['B5', 0.95, 0.14], ['C6', 1.1, 0.7],
      ];
      for (const [n, t, l] of mel) {
        this.tone(noteFreq(n), l, { wave: 'square', vol: 0.3, at: now + t, dest: d });
        this.tone(noteFreq(n) / 2, l, { wave: 'triangle', vol: 0.35, at: now + t, dest: d });
      }
      for (let i = 0; i < 6; i++) this.noise(0.1, { at: now + 1.1 + i * 0.1, vol: 0.15, freq: 6000, dest: d });
    } else {
      const mel: [string, number, number][] = [['G4', 0, 0.3], ['F#4', 0.35, 0.3], ['F4', 0.7, 0.3], ['E4', 1.05, 0.9]];
      for (const [n, t, l] of mel) this.tone(noteFreq(n), l, { wave: 'triangle', vol: 0.4, at: now + t, dest: d, slide: noteFreq(n) * 0.97 });
    }
  }

  playMusic(name: string, track: Track) {
    if (this.trackName === name && this.track) return;
    this.stopMusic();
    this.trackName = name;
    this.track = track;
    const lead = tokens(track.lead),
      bass = tokens(track.bass),
      drums = tokens(track.drums),
      harmony = track.harmony ? tokens(track.harmony) : [];
    this.parsed = { lead, bass, drums, harmony };
    this.step = 0;
    if (this.ctx) this.startScheduler();
  }

  stopMusic() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
    this.trackName = '';
  }

  private startScheduler() {
    if (!this.ctx || !this.track) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private holdLen(arr: string[], i: number): number {
    let n = 1;
    while (arr[(i + n) % arr.length] === '-' && n < 16) n++;
    return n;
  }

  private schedule() {
    if (!this.ctx || !this.track || !this.parsed) return;
    const stepDur = 60 / this.track.bpm / 4;
    const d = this.musicGain;
    // If tab was hidden the clock may have jumped; resync.
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      const p = this.parsed;
      const t = this.nextTime;
      if (this.musicOn && !this.muted) {
        const li = this.step % p.lead.length;
        const ln = p.lead[li];
        if (ln !== '-' && ln !== '.') {
          const len = this.holdLen(p.lead, li) * stepDur;
          this.tone(noteFreq(ln), len * 0.9, { wave: this.track.leadWave ?? 'square', vol: 0.16, at: t, dest: d, attack: 0.01 });
        }
        if (p.harmony.length) {
          const hi = this.step % p.harmony.length;
          const hn = p.harmony[hi];
          if (hn !== '-' && hn !== '.') {
            const len = this.holdLen(p.harmony, hi) * stepDur;
            this.tone(noteFreq(hn), len * 0.9, { wave: 'triangle', vol: 0.12, at: t, dest: d, attack: 0.02 });
          }
        }
        const bi = this.step % p.bass.length;
        const bn = p.bass[bi];
        if (bn !== '-' && bn !== '.') {
          const len = this.holdLen(p.bass, bi) * stepDur;
          this.tone(noteFreq(bn), len * 0.85, { wave: this.track.bassWave ?? 'triangle', vol: 0.32, at: t, dest: d });
        }
        const dn = p.drums[this.step % p.drums.length];
        if (dn === 'k' || dn === 'x') this.tone(150, 0.12, { wave: 'sine', vol: 0.6, at: t, dest: d, slide: 40 });
        if (dn === 's' || dn === 'x') this.noise(0.12, { vol: 0.25, at: t, freq: 1800, q: 0.7, dest: d });
        if (dn === 'h') this.noise(0.03, { vol: 0.1, at: t, freq: 8000, q: 1, dest: d, type: 'highpass' });
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

export const audio = new Audio();
