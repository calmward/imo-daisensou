// いもの とう: an endless tower of generated floors (opens after clearing stage 50).
import { Rng } from '../core/rng';
import { ENEMY_MAP } from './enemies';
import type { SpawnEntry, StageDef, StageMod } from './types';

export const TOWER_ID = 200;
export const TOWER_OPEN_STAGE = 50;
/** floors with a ほのおのいし + title on first clear */
export const TOWER_TITLES: Record<number, string> = { 10: 'とうの ゆうしゃ', 20: 'とうの えいゆう', 30: 'とうの おうさま' };

const POOL1 = ['nezumi', 'kemushi', 'karasu', 'hachi', 'mogura', 'katatsumuri', 'tanuki', 'kamakiri', 'hebi', 'inoshishi', 'fukurou', 'kaeru', 'kame'];
const POOL2 = ['yukiusagi', 'penguin', 'yukidaruma', 'tonakai', 'yukiotoko'];
const POOL3 = ['hinotokage', 'raptor', 'ptera', 'torikera', 'tamago', 'magmagolem'];
const BOSSES = ['kabuto', 'okarasu', 'kuma', 'daiou', 'mammoth', 'kooriou', 'tyranno', 'magmaou'];
const MODS: StageMod[] = ['blizzard', 'eruption', 'lava', 'slippery'];
const NAMES = ['いしの かいだん', 'ほこりの へや', 'くもの す', 'まどの ある へや', 'ひみつの ろうか', 'ふしぎな へや', 'たからの へや', 'かぜの ふく へや', 'ろうそくの へや'];

/** strength (%) of a floor. Calibrated with scripts/towercalib.ts against the campaign. */
export function towerPower(f: number) {
  const base = TOWER_BASE * (1 + 0.075 * (Math.min(f, 30) - 1));
  return f > 30 ? base * Math.pow(1.07, f - 30) : base;
}
export const TOWER_BASE = 420;

/** hp each role is normalised to at 100% (so ants and triceratops make fair floors) */
const ROLE_HP = [520, 1300, 2600];
const ROLE_IV: [number, number][] = [
  [3.5, 5.5],
  [10, 14],
  [18, 24],
];

export function towerStage(f: number): StageDef {
  const rng = new Rng(9001 + f * 7919);
  const pool = [...POOL1, ...(f > 10 ? POOL2 : []), ...(f > 20 ? POOL3 : [])];
  // later floors favour the newest enemies a bit
  const fresh = f > 20 ? POOL3 : f > 10 ? POOL2 : POOL1;
  const picks: string[] = [];
  picks.push(fresh[rng.int(0, fresh.length - 1)]);
  while (picks.length < 3) {
    const id = pool[rng.int(0, pool.length - 1)];
    if (!picks.includes(id)) picks.push(id);
  }
  picks.sort((a, b) => ENEMY_MAP[a].hp - ENEMY_MAP[b].hp);
  const p = towerPower(f);
  const spawns: SpawnEntry[] = picks.map((id, i) => {
    const k = Math.max(0.5, Math.min(8, ROLE_HP[i] / ENEMY_MAP[id].hp));
    return { enemy: id, start: [2, 8, 16][i], interval: ROLE_IV[i], count: 0, mult: Math.round(p * k) };
  });
  const bossFloor = f % 5 === 0;
  if (bossFloor) {
    const bid = BOSSES[(f / 5 - 1) % BOSSES.length];
    const k = 9000 / ENEMY_MAP[bid].hp;
    spawns.push({ enemy: bid, start: 1, interval: [999, 999], count: 1, mult: Math.round(p * k * 1.7), trigger: 0.97, boss: true });
  }
  const mod = f % 10 === 0 ? MODS[(f / 10 - 1) % MODS.length] : undefined;
  return {
    id: TOWER_ID,
    name: `いもの とう ${f}かい${bossFloor ? '（ボス）' : ''}`,
    world: f > 20 ? 4 : f > 10 ? 3 : 2,
    length: Math.min(3000, 2000 + 20 * f),
    baseHp: Math.round(15000 + 900 * Math.min(f, 40)),
    spawns,
    reward: 0,
    boss: bossFloor,
    mod,
    tip: bossFloor ? 'ボスの フロア！ ちからを あわせよう' : f > 30 ? 'どこまで のぼれるかな？' : NAMES[f % NAMES.length],
    rushes: [{ at: 70, enemy: picks[0], count: Math.min(9, 4 + Math.floor(f / 6)), mult: spawns[0].mult ?? 100 }],
  };
}

export interface TowerReward {
  gold: number;
  tickets: number;
  stone: boolean;
  title?: string;
  first: boolean;
}

/** what clearing floor f gives (first clear vs. replay) */
export function towerReward(f: number, first: boolean): TowerReward {
  if (!first) return { gold: Math.round((50 + 5 * f) / 10) * 10, tickets: 0, stone: false, first };
  const gold = 200 + 30 * f;
  if (f > 30) return { gold, tickets: 0, stone: f % 10 === 0, first };
  return { gold, tickets: f % 5 === 0 ? 1 : 0, stone: !!TOWER_TITLES[f], title: TOWER_TITLES[f], first };
}
