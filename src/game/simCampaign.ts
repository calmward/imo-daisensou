// Plays the whole campaign with the bot, spending rewards like a player would.
import { ALLIES, ALLY_MAP, levelCost, MAX_LEVEL } from './allies';
import { Battle } from './battle';
import { simulate } from './bot';
import { applyLoss, applyWin, doResearch } from './progress';
import { battleMods, RESEARCH, researchCost } from './research';
import { deckSize, newSave, type SaveData } from './save';
import { STAGES } from './stages';

export interface StageLog {
  id: number;
  name: string;
  tries: number;
  grinds: number;
  time: number;
  baseFrac: number;
  avgLv: number;
  win: boolean;
  closest: number;
}

/** Spend gold: cheapest useful upgrade first, mixing unit levels and research. */
export function spendGold(save: SaveData) {
  const researchPriority = ['income', 'castle', 'beamPow', 'wallet', 'beamCharge', 'startMoney'];
  for (let guard = 0; guard < 500; guard++) {
    const options: { cost: number; act: () => void }[] = [];
    for (const id of save.deck) {
      const lv = save.units[id];
      if (lv < MAX_LEVEL) options.push({ cost: levelCost(ALLY_MAP[id], lv) * 0.9, act: () => { save.gold -= levelCost(ALLY_MAP[id], lv); save.units[id]++; } });
    }
    for (const rid of researchPriority) {
      const def = RESEARCH.find((r) => r.id === rid)!;
      const lv = save.research[rid] ?? 0;
      if (lv < def.max) options.push({ cost: researchCost(def, lv) * 1.3, act: () => doResearch(save, rid) });
    }
    options.sort((a, b) => a.cost - b.cost);
    const o = options[0];
    if (!o || o.cost > save.gold) break;
    const before = save.gold;
    o.act();
    if (save.gold === before || save.gold < 0) break;
  }
}

export function chooseDeck(save: SaveData, allowGacha = false) {
  const owned = ALLIES.filter((a) => save.units[a.id] && (allowGacha || !a.gacha));
  // prefer stronger units when over 10
  owned.sort((a, b) => b.cost - a.cost);
  save.deck = owned.slice(0, deckSize(save)).map((a) => a.id);
}

export function runCampaign(opts: { skill?: number; seed?: number; maxTries?: number; verbose?: boolean } = {}) {
  const save = newSave();
  const logs: StageLog[] = [];
  const skill = opts.skill ?? 1;
  let seed = opts.seed ?? 7;
  for (const st of STAGES) {
    let tries = 0;
    let grinds = 0;
    let res = { win: false, time: 0, baseFrac: 0, enemyFrac: 1, closest: 1 };
    while (tries < (opts.maxTries ?? 10)) {
      chooseDeck(save);
      spendGold(save);
      tries++;
      const b = new Battle(st, save.deck.map((id) => ({ id, level: save.units[id] })), battleMods(save.research), seed++);
      res = simulate(b, 600, skill);
      const killGold = Math.min(200, b.kills * 2);
      if (res.win) {
        applyWin(save, st, killGold, 1, () => 1);
        break;
      }
      applyLoss(save, st, killGold);
      // grind the previous stage once (like a kid replaying an easy stage)
      if (st.id > 1) {
        const prev = STAGES[st.id - 2];
        chooseDeck(save);
        spendGold(save);
        const pb = new Battle(prev, save.deck.map((id) => ({ id, level: save.units[id] })), battleMods(save.research), seed++);
        const pr = simulate(pb, 600, skill);
        if (pr.win) applyWin(save, prev, Math.min(200, pb.kills * 2), 1, () => 1);
        grinds++;
      }
    }
    const avgLv = save.deck.reduce((s, id) => s + save.units[id], 0) / save.deck.length;
    logs.push({ id: st.id, name: st.name, tries, grinds, time: Math.round(res.time), baseFrac: Math.round(res.baseFrac * 100) / 100, avgLv: Math.round(avgLv * 10) / 10, win: res.win, closest: Math.round(res.closest * 100) / 100 });
    if (!res.win) break;
  }
  return { logs, save };
}
