import { ALLIES, EVOLVE_LV } from './allies';
import type { SaveData } from './save';

export interface Mission {
  id: string;
  label: string;
  progress: (s: SaveData) => [number, number];
  gold: number;
  tickets: number;
}

const clearedCount = (s: SaveData) => Object.keys(s.cleared).length;
const crownCount = (s: SaveData, star: number) => Object.values(s.crowns).filter((c) => c >= star).length;
const owned = (s: SaveData) => Object.keys(s.units).length;
const maxLv = (s: SaveData) => Math.max(...Object.values(s.units));
const evolved = (s: SaveData) => Object.values(s.units).filter((l) => l >= EVOLVE_LV).length;
const research = (s: SaveData) => Object.values(s.research).reduce((a, b) => a + b, 0);

function m(id: string, label: string, progress: (s: SaveData) => number, target: number, gold: number, tickets = 0): Mission {
  return { id, label, progress: (s) => [Math.min(target, progress(s)), target], gold, tickets };
}

export const MISSIONS: Mission[] = [
  m('c1', 'ステージ 1を クリア', clearedCount, 1, 200),
  m('c3', 'ステージを 3つ クリア', clearedCount, 3, 300, 1),
  m('c6', 'はじめての ボスを たおす（6ステージ）', clearedCount, 6, 500, 1),
  m('c12', 'ステージを 12 クリア', clearedCount, 12, 1000, 2),
  m('c24', 'ステージを 24 クリア', clearedCount, 24, 2000, 2),
  m('c36', 'ぜんぶの ステージを クリア！', clearedCount, 36, 5000, 5),
  m('k50', 'てきを 50ひき たおす', (s) => s.stats.kills, 50, 200),
  m('k300', 'てきを 300ぴき たおす', (s) => s.stats.kills, 300, 600, 1),
  m('k1000', 'てきを 1000ぴき たおす', (s) => s.stats.kills, 1000, 1500, 2),
  m('k3000', 'てきを 3000びき たおす', (s) => s.stats.kills, 3000, 3000, 3),
  m('u5', 'なかまを 5しゅるい あつめる', owned, 5, 300),
  m('u10', 'なかまを 10しゅるい あつめる', owned, 10, 800, 1),
  m('u15', 'なかまを 15しゅるい あつめる', owned, 15, 1500, 2),
  m('uall', `なかまを ぜんいん あつめる（${ALLIES.length}）`, owned, ALLIES.length, 5000, 5),
  m('l5', 'なかまを レベル5に する', maxLv, 5, 300),
  m('evo1', 'なかまを しんか させる（レベル10）', evolved, 1, 1000, 1),
  m('evo5', 'なかまを 5たい しんか させる', evolved, 5, 3000, 3),
  m('r10', 'おしろを 10かい つよくする', research, 10, 600),
  m('r40', 'おしろを 40かい つよくする', research, 40, 2000, 2),
  m('g1', 'ガチャを まわす', (s) => s.gachaCount, 1, 300),
  m('g10', 'ガチャを 10かい まわす', (s) => s.gachaCount, 10, 1500, 1),
  m('s2a', '★★（むずかしい）を 1つ クリア', (s) => crownCount(s, 2), 1, 600, 1),
  m('s2b', '★★（むずかしい）を 10 クリア', (s) => crownCount(s, 2), 10, 2000, 2),
  m('s3a', '★★★（げきむず）を 1つ クリア', (s) => crownCount(s, 3), 1, 1500, 2),
  m('s3b', '★★★（げきむず）を 10 クリア', (s) => crownCount(s, 3), 10, 5000, 5),
  m('w10', 'バトルで 10かい かつ', (s) => s.stats.wins, 10, 500),
  m('w50', 'バトルで 50かい かつ', (s) => s.stats.wins, 50, 2000, 2),
];

export function isDone(s: SaveData, mi: Mission) {
  const [a, b] = mi.progress(s);
  return a >= b;
}

export function claimable(s: SaveData) {
  return MISSIONS.filter((mi) => isDone(s, mi) && !s.claimed.includes(mi.id));
}

export function claim(s: SaveData, mi: Mission): boolean {
  if (!isDone(s, mi) || s.claimed.includes(mi.id)) return false;
  s.claimed.push(mi.id);
  s.gold += mi.gold;
  s.tickets += mi.tickets;
  return true;
}
