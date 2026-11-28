// trace one stage with the campaign-progressed save. usage: probetrace.ts skill id seed
import { Battle } from '../src/game/battle';
import { Bot } from '../src/game/bot';
import { applyWin } from '../src/game/progress';
import { battleMods } from '../src/game/research';
import { newSave } from '../src/game/save';
import { chooseDeck, spendGold } from '../src/game/simCampaign';
import { STAGES } from '../src/game/stages';
const skill = Number(process.argv[2] ?? 0.8);
const id = Number(process.argv[3] ?? 55);
const seed = Number(process.argv[4] ?? 1000);
const K = Number(process.argv[5] ?? 1);
const once = process.argv[6] === 'once';
const save = newSave();
for (const st of STAGES) {
  chooseDeck(save);
  spendGold(save);
  if (st.id === id) {
    console.log('deck', save.deck.map((d) => d + ':' + save.units[d]).join(' '));
    const st2 = { ...st, spawns: st.spawns.map((s) => ({ ...s, mult: Math.round((s.mult ?? 100) * K) })), rushes: (st.rushes ?? []).map((r) => ({ ...r, mult: Math.round(r.mult * K) })) };
    const b = new Battle(st2, save.deck.map((d) => ({ id: d, level: save.units[d] })), battleMods(save.research), seed);
    const bot = new Bot(b, skill);
    let next = 0;
    const deaths: Record<string, number> = {};
    while (!b.result && b.time < 600) {
      bot.step(1 / 30);
      b.update(1 / 30);
      for (const e of b.events) if (e.type === 'death') deaths[(e.f.side ? 'E:' : 'A:') + e.f.id] = (deaths[(e.f.side ? 'E:' : 'A:') + e.f.id] ?? 0) + 1;
      b.events.length = 0;
      if (b.time >= next) {
        next += 30;
        const al = b.allies.filter((a) => a.state !== 'dead');
        const en = b.enemies.filter((a) => a.state !== 'dead');
        console.log(`t=${b.time.toFixed(0)} money=${b.money.toFixed(0)} A=${al.length} maxX=${Math.max(0, ...al.map((a) => a.x)).toFixed(0)} E=${en.length} minX=${Math.min(b.length, ...en.map((a) => a.x)).toFixed(0)} frz=${en.filter((e) => e.freezeT > 0).length} slw=${en.filter((e) => e.slowT > 0).length} kb=${en.filter((e) => e.state === "kb").length} rage=${b.rage.toFixed(1)} eAtk=${Math.max(0,...en.map((e)=>e.s.atk))} st=${en.map((e)=>e.state[0]).join("")} aHp=${Math.max(0,...al.map((a)=>a.maxHp))} eBase=${b.eBase.hp.toFixed(0)} pBase=${b.pBase.hp.toFixed(0)} [${en.map((e) => e.id + (e.shield ? '*' : '')).join(',')}]`);
      }
    }
    console.log(b.result, b.time.toFixed(0), JSON.stringify(deaths));
    break;
  }
  applyWin(save, st, 60, 1, () => 1);
  if (!once) applyWin(save, st, 60, 1, () => 1);
}
