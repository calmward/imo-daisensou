// Calibrate World 5 factors to a target first-try win rate for an average kid bot.
// usage: calib.ts skill target ids
import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { applyWin } from '../src/game/progress';
import { battleMods } from '../src/game/research';
import { newSave } from '../src/game/save';
import { chooseDeck, spendGold } from '../src/game/simCampaign';
import { STAGES } from '../src/game/stages';
import { TUNING } from '../src/game/tuning';
const skill = Number(process.argv[2] ?? 0.6);
const target = Number(process.argv[3] ?? 0.55);
// ids can carry their own target: 49:0.85,50:0.7
const spec = (process.argv[4] ?? '49').split(',').map((x) => x.split(':'));
const ids = spec.map((x) => Number(x[0]));
const tgt: Record<number, number> = Object.fromEntries(spec.map((x) => [Number(x[0]), x[1] ? Number(x[1]) : target]));
const save = newSave();
const out: Record<number, number> = {};
function rate(st: (typeof STAGES)[number], k: number, n = 16) {
  const s2 = { ...st, spawns: st.spawns.map((s) => ({ ...s, mult: Math.round((s.mult ?? 100) * k) })), rushes: (st.rushes ?? []).map((r) => ({ ...r, mult: Math.round(r.mult * k) })) };
  let w = 0, t = 0, jd = 0;
  for (let s = 0; s < n; s++) {
    const b = new Battle(s2, save.deck.map((id) => ({ id, level: save.units[id] })), battleMods(save.research), 500 + s);
    const r = simulate(b, 600, skill);
    if (r.win) w++;
    if (b.judged) jd++;
    t = Math.max(t, r.time);
  }
  return { w: w / n, t, jd };
}
for (const st of STAGES) {
  chooseDeck(save);
  spendGold(save);
  if (ids.includes(st.id)) {
    if (process.env.SWEEP) {
      for (const k of (process.env.SWEEP.includes(',') ? process.env.SWEEP.split(',').map(Number) : [0.9, 1.0, 1.05, 1.1, 1.2, 1.3, 1.5])) { const r = rate(st, k, 16); console.log(st.id, 'k', k, 'win', r.w.toFixed(2), 'maxT', r.t.toFixed(0), 'judged', r.jd); }
      applyWin(save, st, 60, 1, () => 1);
      continue;
    }
    let lo = 0.4, hi = 2.5;
    for (let it = 0; it < 7; it++) {
      const mid = (lo + hi) / 2;
      if (rate(st, mid).w >= tgt[st.id]) lo = mid;
      else hi = mid;
    }
    const r = rate(st, lo, 24);
    out[st.id] = Math.round(TUNING[st.id - 1] * lo * 1000) / 1000;
    console.log(st.id, 'k', lo.toFixed(3), 'win', r.w.toFixed(2), 'maxT', r.t.toFixed(0), 'new', out[st.id]);
  }
  applyWin(save, st, 60, 1, () => 1);
  if (st.id >= Math.max(...ids)) break;
}
console.log(JSON.stringify(out));
