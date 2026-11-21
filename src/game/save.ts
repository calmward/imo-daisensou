import { ALLY_MAP, MAX_LEVEL } from './allies';
import { STAGES } from './stages';

export interface SaveData {
  v: number;
  cleared: Record<number, number>; // stage id -> clear count
  gold: number; // きんいも
  tickets: number; // ガチャけん
  units: Record<string, number>; // owned unit id -> level
  deck: string[]; // up to 10 ids
  research: Record<string, number>;
  tut: Record<string, boolean>;
  muted: boolean;
  speed2: boolean;
  lastStage: number;
  gachaCount: number;
  pity: number; // pulls since the last SR/UR
  crowns: Record<number, number>; // stage id -> highest ★ cleared (1..3)
  daily: string; // last day the login bonus was claimed
  claimed: string[]; // mission ids already claimed
  seen: Record<string, number>; // enemy id -> times defeated/encountered
  kills: Record<string, number>; // enemy id -> defeated count
  today: { date: string; counts: Record<string, number>; claimed: string[]; ids?: string[] };
  stats: { wins: number; losses: number; kills: number };
}

const KEY = 'imo-daisensou-save-v1';
export const DECK_SIZE = 10;
/** Team slots grow as you progress: 5 at the start, +1 after stages 4, 6, 9, 12 and 18. */
export const SLOT_STAGES = [4, 6, 9, 12, 18];
export function deckSize(s: { cleared: Record<number, number> }) {
  return 5 + SLOT_STAGES.filter((id) => (s.cleared[id] ?? 0) > 0).length;
}

export function newSave(): SaveData {
  return {
    v: 1,
    cleared: {},
    gold: 0,
    tickets: 0,
    units: { jaga: 1, sato: 1 },
    deck: ['jaga', 'sato'],
    research: {},
    tut: {},
    muted: false,
    speed2: false,
    lastStage: 1,
    gachaCount: 0,
    pity: 0,
    crowns: {},
    daily: '',
    claimed: [],
    seen: {},
    kills: {},
    today: { date: '', counts: {}, claimed: [] },
    stats: { wins: 0, losses: 0, kills: 0 },
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const num = (v: unknown, def: number, min = 0, max = 1e9) => {
  const n = typeof v === 'number' && isFinite(v) ? v : def;
  return Math.max(min, Math.min(max, Math.floor(n)));
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Rebuild a save from untrusted JSON, field by field. */
export function sanitize(d: unknown): SaveData {
  const base = newSave();
  const o = obj(d);
  const s = base;
  s.gold = num(o.gold, 0);
  s.tickets = num(o.tickets, 0, 0, 9999);
  s.gachaCount = num(o.gachaCount, 0);
  s.pity = num(o.pity, 0, 0, 10);
  s.lastStage = num(o.lastStage, 1, 1, 999);
  s.muted = o.muted === true;
  s.speed2 = o.speed2 === true;
  s.daily = typeof o.daily === 'string' ? o.daily : '';
  s.claimed = Array.isArray(o.claimed) ? o.claimed.filter((x): x is string => typeof x === 'string') : [];
  const okId = (k: string) => Number.isInteger(+k) && +k >= 1 && +k <= STAGES.length;
  for (const [k, v] of Object.entries(obj(o.cleared))) if (okId(k) && num(v, 0) > 0) s.cleared[+k] = num(v, 0);
  for (const [k, v] of Object.entries(obj(o.crowns))) if (okId(k) && s.cleared[+k]) s.crowns[+k] = num(v, 0, 0, 3);
  for (const k of Object.keys(s.cleared)) if (!s.crowns[+k]) s.crowns[+k] = 1;
  const units: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(o.units))) if (Object.prototype.hasOwnProperty.call(ALLY_MAP, k)) units[k] = num(v, 1, 1, MAX_LEVEL);
  s.units = Object.keys(units).length ? units : base.units;
  if (!s.units.jaga) s.units.jaga = 1;
  for (const [k, v] of Object.entries(obj(o.kills))) if (/^[a-z]+$/.test(k) && !(k in Object.prototype)) s.kills[k] = num(v, 0);
  for (const [k, v] of Object.entries(obj(o.seen))) if (/^[a-z]+$/.test(k) && !(k in Object.prototype)) s.seen[k] = num(v, 0);
  const RES = ['castle', 'income', 'wallet', 'beamPow', 'beamCharge', 'startMoney', 'muffler'];
  for (const [k, v] of Object.entries(obj(o.research))) if (RES.includes(k)) s.research[k] = num(v, 0, 0, 20);
  for (const [k, v] of Object.entries(obj(o.tut))) s.tut[k] = v === true;
  const td = obj(o.today);
  s.today = { date: typeof td.date === 'string' ? td.date : '', counts: {}, claimed: Array.isArray(td.claimed) ? td.claimed.filter((x): x is string => typeof x === 'string') : [], ids: Array.isArray(td.ids) ? td.ids.filter((x): x is string => typeof x === 'string') : undefined };
  for (const [k, v] of Object.entries(obj(td.counts))) s.today.counts[k] = num(v, 0);
  const st = obj(o.stats);
  s.stats = { wins: num(st.wins, 0), losses: num(st.losses, 0), kills: num(st.kills, 0) };
  const deck = Array.isArray(o.deck) ? o.deck : [];
  s.deck = deck.filter((id, i): id is string => typeof id === 'string' && Object.prototype.hasOwnProperty.call(s.units, id) && deck.indexOf(id) === i).slice(0, DECK_SIZE);
  if (!s.deck.length) s.deck = Object.keys(s.units).slice(0, deckSize(s));
  return s;
}

export function loadSave(): SaveData {
  const st = storage();
  if (!st) return newSave();
  try {
    const raw = st.getItem(KEY);
    if (!raw) return newSave();
    try {
      return sanitize(JSON.parse(raw));
    } catch {
      // keep the broken data around instead of silently losing progress
      st.setItem(KEY + '-broken', raw);
      return newSave();
    }
  } catch {
    return newSave();
  }
}

export function writeSave(s: SaveData) {
  const st = storage();
  if (!st) return;
  try {
    st.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked — ignore */
  }
}

export function isCleared(s: SaveData, id: number) {
  return (s.cleared[id] ?? 0) > 0;
}

export function highestUnlocked(s: SaveData, total: number) {
  let n = 1;
  while (n < total && isCleared(s, n)) n++;
  return n;
}
