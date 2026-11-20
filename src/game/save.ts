import { ALLY_MAP } from './allies';

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
  stats: { wins: number; losses: number; kills: number };
}

const KEY = 'imo-daisensou-save-v1';
export const DECK_SIZE = 10;

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

export function loadSave(): SaveData {
  const st = storage();
  const base = newSave();
  if (!st) return base;
  try {
    const raw = st.getItem(KEY);
    if (!raw) return base;
    const d = JSON.parse(raw) as Partial<SaveData>;
    const s: SaveData = { ...base, ...d, stats: { ...base.stats, ...(d.stats ?? {}) } };
    // sanitize: drop unknown units, keep deck valid
    for (const id of Object.keys(s.units)) if (!ALLY_MAP[id]) delete s.units[id];
    s.deck = s.deck.filter((id, i, arr) => s.units[id] && arr.indexOf(id) === i).slice(0, DECK_SIZE);
    if (!s.deck.length) s.deck = ['jaga'];
    return s;
  } catch {
    return base;
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
