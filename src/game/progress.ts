import { ALLY_MAP, levelCost, MAX_LEVEL } from './allies';
import { RESEARCH, researchCost } from './research';
import type { SaveData } from './save';
import type { StageDef } from './types';
import { ticketReward } from './stages';

export function stageReward(stage: StageDef, firstClear: boolean): number {
  return firstClear ? stage.reward : Math.round((stage.reward * 0.4) / 10) * 10;
}

export interface WinResult {
  gold: number;
  tickets: number;
  unlocked?: string;
  first: boolean;
  chest?: { kind: 'gold' | 'ticket'; amount: number };
  star: number;
}

/** Apply a stage win to the save. star = difficulty (1 normal, 2 hard, 3 very hard). */
export function applyWin(save: SaveData, stage: StageDef, killGold: number, star = 1, rnd: () => number = Math.random): WinResult {
  const first = star === 1 ? !save.cleared[stage.id] : (save.crowns[stage.id] ?? 0) < star;
  const starBonus = [1, 1, 1.6, 2.4][star];
  const gold = Math.round((stageReward(stage, first) * starBonus) / 10) * 10 + killGold;
  save.gold += gold;
  save.cleared[stage.id] = (save.cleared[stage.id] ?? 0) + 1;
  save.crowns[stage.id] = Math.max(save.crowns[stage.id] ?? 0, star);
  let tickets = 0;
  let unlocked: string | undefined;
  // lucky treasure chest
  let chest: WinResult['chest'];
  const roll = rnd();
  if (roll < 0.08) chest = { kind: 'ticket', amount: 1 };
  else if (roll < 0.3) chest = { kind: 'gold', amount: Math.round((100 + stage.id * 15) / 10) * 10 };
  if (chest?.kind === 'ticket') save.tickets += 1;
  if (chest?.kind === 'gold') save.gold += chest.amount;
  if (first && star > 1) {
    tickets = star - 1;
    save.tickets += tickets;
  }
  if (first && star === 1) {
    tickets = ticketReward(stage);
    save.tickets += tickets;
    if (stage.unlock && !save.units[stage.unlock]) {
      save.units[stage.unlock] = 1;
      unlocked = stage.unlock;
      if (save.deck.length < 10) save.deck.push(stage.unlock);
    }
  }
  save.stats.wins++;
  return { gold, tickets, unlocked, first, chest, star };
}

/** Consolation prize on a loss so kids still progress. */
export function applyLoss(save: SaveData, stage: StageDef, killGold: number): number {
  const gold = Math.round((stage.reward * 0.1) / 10) * 10 + killGold;
  save.gold += gold;
  save.stats.losses++;
  return gold;
}

export function canLevelUp(save: SaveData, id: string) {
  const lv = save.units[id];
  if (!lv || lv >= MAX_LEVEL) return false;
  return save.gold >= levelCost(ALLY_MAP[id], lv);
}

export function levelUp(save: SaveData, id: string): boolean {
  if (!canLevelUp(save, id)) return false;
  save.gold -= levelCost(ALLY_MAP[id], save.units[id]);
  save.units[id]++;
  return true;
}

export function canResearch(save: SaveData, id: string) {
  const def = RESEARCH.find((r) => r.id === id)!;
  const lv = save.research[id] ?? 0;
  return lv < def.max && save.gold >= researchCost(def, lv);
}

export function doResearch(save: SaveData, id: string): boolean {
  if (!canResearch(save, id)) return false;
  const def = RESEARCH.find((r) => r.id === id)!;
  const lv = save.research[id] ?? 0;
  save.gold -= researchCost(def, lv);
  save.research[id] = lv + 1;
  return true;
}

/** Daily login bonus: once per calendar day. */
export function claimDaily(save: SaveData, today: string): { gold: number; tickets: number } | null {
  if (save.daily === today) return null;
  save.daily = today;
  const gold = 300 + Math.min(1200, Object.keys(save.cleared).length * 40);
  save.gold += gold;
  save.tickets += 1;
  return { gold, tickets: 1 };
}
