export type Trait = 'bug' | 'bird' | 'beast' | 'boss';

export interface Effect {
  kind: 'slow' | 'freeze' | 'knock';
  chance: number; // 0..1
  dur: number; // seconds (ignored for knock)
  vs?: Trait[]; // only triggers vs these traits (undefined = all)
}

/** Combat stats shared by allies and enemies. */
export interface CombatStats {
  hp: number;
  atk: number;
  range: number; // reach from the unit's front
  speed: number; // world units / second
  atkInterval: number; // seconds between attack starts
  foreswing: number; // windup before the hit lands
  kb: number; // number of knockbacks over its hp
  area: boolean; // hits everything in range
  width: number; // body length behind the front (for collision feel)
  traits?: Trait[]; // what this unit IS
  strongVs?: Trait[]; // deals x1.8 / takes x0.5 vs these
  effect?: Effect;
  crit?: number; // chance of x2 damage
  burrow?: number; // distance travelled underground once (enemy)
  shockwave?: boolean; // knocks back all foes on appear (boss)
  multiHit?: number; // hits per attack (visual + split damage)
  minRange?: number; // can't hit things closer than this (long-range snipers)
}

export type Rarity = 'N' | 'R' | 'SR' | 'UR';

export interface AllyDef extends CombatStats {
  id: string;
  name: string;
  role: string; // short role label
  desc: string;
  cost: number;
  cooldown: number;
  rarity: Rarity;
  gacha?: boolean;
  size: number; // visual scale (1 = ~64 world units tall)
}

export interface EnemyDef extends CombatStats {
  id: string;
  name: string;
  desc: string;
  reward: number; // battle money when defeated
  size: number;
  boss?: boolean;
}

export interface SpawnEntry {
  enemy: string;
  mult?: number; // strength %, default 100
  start: number; // seconds after battle start (or after trigger)
  interval?: [number, number]; // min/max seconds between spawns
  count?: number; // total to spawn (0/undefined = unlimited)
  trigger?: number; // activates when enemy base hp fraction <= this
  boss?: boolean; // shows boss warning
}

export interface StageDef {
  id: number; // 1-based
  name: string;
  world: number; // 0,1,2
  length: number; // distance between bases
  baseHp: number;
  spawns: SpawnEntry[];
  reward: number; // きんいも on first clear
  unlock?: string; // ally id unlocked on first clear
  boss?: boolean;
  maxEnemies?: number;
  tip?: string; // hint text shown before start
  baseKind?: string; // enemy base art
}
