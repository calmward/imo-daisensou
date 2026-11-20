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
}

/** Apply a stage win to the save. */
export function applyWin(save: SaveData, stage: StageDef, killGold: number): WinResult {
  const first = !save.cleared[stage.id];
  const gold = stageReward(stage, first) + killGold;
  save.gold += gold;
  save.cleared[stage.id] = (save.cleared[stage.id] ?? 0) + 1;
  let tickets = 0;
  let unlocked: string | undefined;
  if (first) {
    tickets = ticketReward(stage);
    save.tickets += tickets;
    if (stage.unlock && !save.units[stage.unlock]) {
      save.units[stage.unlock] = 1;
      unlocked = stage.unlock;
      if (save.deck.length < 10) save.deck.push(stage.unlock);
    }
  }
  save.stats.wins++;
  return { gold, tickets, unlocked, first };
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
