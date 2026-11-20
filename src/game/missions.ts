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
  m('evo1', `なかまを しんか させる（レベル${EVOLVE_LV}）`, evolved, 1, 1000, 1),
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
  rollDay(s);
  const daily = dailyMissions(s).filter((d) => !s.today.claimed.includes(d.id) && (s.today.counts[d.key] ?? 0) >= d.target);
  return [...MISSIONS.filter((mi) => isDone(s, mi) && !s.claimed.includes(mi.id)), ...daily];
}

export function claim(s: SaveData, mi: Mission): boolean {
  if (!isDone(s, mi) || s.claimed.includes(mi.id)) return false;
  s.claimed.push(mi.id);
  s.gold += mi.gold;
  s.tickets += mi.tickets;
  return true;
}

// ---- daily missions ----
export interface Daily {
  id: string;
  label: string;
  key: string; // counter in save.today.counts
  target: number;
  gold: number;
  tickets: number;
}

const DAILY_POOL: Daily[] = [
  { id: 'dk', label: 'てきを 40ぴき たおす', key: 'kills', target: 40, gold: 300, tickets: 1 },
  { id: 'dw', label: 'バトルで 2かい かつ', key: 'wins', target: 2, gold: 300, tickets: 1 },
  { id: 'db', label: 'いもビームを 3かい うつ', key: 'beams', target: 3, gold: 250, tickets: 1 },
  { id: 'dd', label: 'なかまを 50たい しゅつげき させる', key: 'deploys', target: 50, gold: 300, tickets: 1 },
  { id: 'dt', label: 'いもどろぼうを 3びき たおす', key: 'thieves', target: 3, gold: 300, tickets: 1 },
  { id: 'dwl', label: 'おさいふを 10かい レベルアップ', key: 'wallets', target: 10, gold: 250, tickets: 1 },
  { id: 'dbs', label: 'ボスを たおす', key: 'bosses', target: 1, gold: 400, tickets: 1 },
];

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Make sure today's counters are fresh. */
export function rollDay(s: SaveData, date = todayKey()) {
  if (s.today.date !== date) s.today = { date, counts: {}, claimed: [] };
}

export function dailyMissions(s: SaveData, date = todayKey()): Daily[] {
  rollDay(s, date);
  if (s.today.ids?.length) {
    const fixed = s.today.ids.map((id) => DAILY_POOL.find((d) => d.id === id)).filter((d): d is Daily => !!d);
    if (fixed.length) return fixed;
  }
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cleared = Object.keys(s.cleared).length;
  const pool = DAILY_POOL.filter((d) => (d.key === 'thieves' ? cleared >= 5 : d.key === 'bosses' ? cleared >= 6 : true));
  const out: Daily[] = [];
  while (out.length < 3 && pool.length) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  s.today.ids = out.map((d) => d.id); // keep today's set stable
  return out;
}

export function countToday(s: SaveData, key: string, n = 1) {
  rollDay(s);
  s.today.counts[key] = (s.today.counts[key] ?? 0) + n;
}

export function claimDailyMission(s: SaveData, d: Daily) {
  rollDay(s);
  if (s.today.claimed.includes(d.id) || (s.today.counts[d.key] ?? 0) < d.target) return false;
  s.today.claimed.push(d.id);
  s.gold += d.gold;
  s.tickets += d.tickets;
  return true;
}
