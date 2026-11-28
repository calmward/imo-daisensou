// How tall can the bot climb the tower at different points of the campaign?
// usage: towercalib.ts skill
import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { applyWin } from '../src/game/progress';
import { battleMods } from '../src/game/research';
import { newSave, type SaveData } from '../src/game/save';
import { chooseDeck, spendGold } from '../src/game/simCampaign';
import { STAGES } from '../src/game/stages';
import { towerStage } from '../src/game/tower';
const skill = Number(process.argv[2] ?? 0.6);
const save = newSave();
function climb(s: SaveData) {
  const log: string[] = [];
  let f = 1;
  for (; f <= 45; f++) {
    let ok = 0;
    for (let sd = 0; sd < 4; sd++) {
      const b = new Battle(towerStage(f), s.deck.map((id) => ({ id, level: s.units[id] })), battleMods(s.research), 77 + sd);
      if (simulate(b, 600, skill).win) ok++;
    }
    log.push(`${f}:${ok}`);
    if (ok === 0) break;
  }
  return { top: f - 1, log: log.join(' ') };
}
for (const st of STAGES) {
  chooseDeck(save);
  spendGold(save);
  applyWin(save, st, 60, 1, () => 1);
  if (st.id === 50 || st.id === 55 || st.id === 60) {
    chooseDeck(save);
    spendGold(save);
    const lv = (save.deck.reduce((a, d) => a + save.units[d], 0) / save.deck.length).toFixed(1);
    const r = climb(save);
    console.log('after', st.id, 'lv', lv, 'top', r.top, r.log);
  }
}
// late game: lots of extra gold
for (let i = 0; i < 2; i++) {
  save.gold += 400000;
  spendGold(save);
  const lv = (save.deck.reduce((a, d) => a + save.units[d], 0) / save.deck.length).toFixed(1);
  const r = climb(save);
  console.log('rich', i, 'lv', lv, 'top', r.top, r.log);
}
