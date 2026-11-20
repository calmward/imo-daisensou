import { ALLY_MAP, MAX_LEVEL } from './allies';
import type { SaveData } from './save';
import type { Rarity } from './types';

export const GACHA_GOLD_COST = 1200;

export const GACHA_POOL: Record<Rarity, string[]> = {
  N: [],
  R: ['sweet', 'youkan', 'ninja', 'hash', 'korokke', 'potesala'],
  SR: ['daigaku', 'mash'],
  UR: ['king'],
};

export type GachaResult =
  | { kind: 'unit'; id: string; isNew: boolean; level: number; rarity: Rarity }
  | { kind: 'gold'; amount: number; rarity: Rarity }
  | { kind: 'power'; id: string; level: number; rarity: Rarity };

export function canGacha(save: SaveData) {
  return save.tickets > 0 || save.gold >= GACHA_GOLD_COST;
}

/** Pity: the first ever pull is guaranteed to be a new unit so kids get something fun. */
export function rollGacha(save: SaveData, rnd: () => number = Math.random): GachaResult | null {
  if (save.tickets > 0) save.tickets--;
  else if (save.gold >= GACHA_GOLD_COST) save.gold -= GACHA_GOLD_COST;
  else return null;
  const pulls = save.gachaCount || 0;
  save.gachaCount = pulls + 1;
  const r = rnd();
  let rarity: Rarity;
  if (pulls === 0) rarity = 'R';
  else if (r < 0.04) rarity = 'UR';
  else if (r < 0.16) rarity = 'SR';
  else if (r < 0.7) rarity = 'R';
  else rarity = 'N';
  if (rarity === 'N') {
    // いもパワー: a random owned potato levels up (feels better than coins)
    const ids = Object.keys(save.units).filter((u) => save.units[u] < MAX_LEVEL);
    if (ids.length && rnd() < 0.7) {
      const id = ids[Math.floor(rnd() * ids.length)];
      save.units[id]++;
      return { kind: 'power', id, level: save.units[id], rarity };
    }
    const amount = [600, 800, 1000][Math.floor(rnd() * 3)];
    save.gold += amount;
    return { kind: 'gold', amount, rarity };
  }
  const pool = GACHA_POOL[rarity];
  let candidates = pool;
  if (pulls === 0) candidates = pool.filter((id) => !save.units[id]);
  if (!candidates.length) candidates = pool;
  const id = candidates[Math.floor(rnd() * candidates.length)];
  const isNew = !save.units[id];
  if (isNew) {
    save.units[id] = 1;
    if (save.deck.length < 10) save.deck.push(id);
  } else {
    save.units[id] = Math.min(MAX_LEVEL, save.units[id] + 1);
  }
  return { kind: 'unit', id, isNew, level: save.units[id], rarity: ALLY_MAP[id].rarity };
}
