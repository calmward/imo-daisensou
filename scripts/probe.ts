// Win rate of chosen stages with a campaign-progressed save. usage: probe.ts skill id1,id2,...
import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { applyWin } from '../src/game/progress';
import { battleMods } from '../src/game/research';
import { newSave } from '../src/game/save';
import { chooseDeck, spendGold } from '../src/game/simCampaign';
import { STAGES } from '../src/game/stages';
const skill = Number(process.argv[2] ?? 0.6);
const ids = (process.argv[3] ?? '51').split(',').map(Number);
const save = newSave();
for (const st of STAGES) {
  chooseDeck(save);
  spendGold(save);
  if (ids.includes(st.id)) {
    let w = 0, t = 0, bf = 0;
    const N = 20;
    for (let s = 0; s < N; s++) {
      const b = new Battle(st, save.deck.map((id) => ({ id, level: save.units[id] })), battleMods(save.research), 1000 + s);
      const r = simulate(b, 600, skill);
      if (r.win) w++;
      t += r.time; bf += r.baseFrac;
    }
    console.log(st.id, st.name, 'win', w + '/' + N, 'avgT', (t / N).toFixed(0), 'avgBase', (bf / N).toFixed(2), 'lv', (save.deck.reduce((a, d) => a + save.units[d], 0) / save.deck.length).toFixed(1));
  }
  applyWin(save, st, 60, 1, () => 1);
  applyWin(save, st, 60, 1, () => 1);
  if (st.id >= Math.max(...ids)) break;
}
