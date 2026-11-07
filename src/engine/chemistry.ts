import { getFormation } from './formations';
import { positionFit } from './positions';
import { stintsById } from './pool';
import type { Formation, Player, Slot } from './types';

export type LinkKind = 'teammates' | 'nation';
export interface ChemLink {
  a: string; // slot ids
  b: string;
  kind: LinkKind;
}

/** Why a player earned their chemistry points. */
export interface ChemDetail {
  natural: boolean; // in a natural (or comfortable) position
  teammates: number; // former teammates in the XI
  compatriots: number; // same-nation players in the XI
  points: number; // 0-4
}

export interface ChemistryReport {
  score: number; // 0-100
  perSlot: Record<string, number>; // 0-4
  detail: Record<string, ChemDetail>;
  /** Lines to draw on the pitch: every teammate pair, and compatriots in adjacent slots. */
  links: ChemLink[];
}

const ADJ_DIST = 32;
export const MAX_PER_PLAYER = 4;
export const CHEM_RULES = { natural: 1, perTeammate: 1, maxTeammates: 2, perCompatriot: 1, maxCompatriots: 2 };

const teammateCache = new Map<string, boolean>();
/** True if the two players were ever at the same club at the same time. */
export function wereTeammates(a: Pick<Player, 'id'>, b: Pick<Player, 'id'>): boolean {
  if (a.id === b.id) return false;
  const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
  const hit = teammateCache.get(key);
  if (hit !== undefined) return hit;
  const sa = stintsById().get(a.id) ?? [];
  const sb = stintsById().get(b.id) ?? [];
  let result = false;
  outer: for (const x of sa) {
    for (const y of sb) {
      if (x.club === y.club && Math.max(x.from, y.from) < Math.min(x.to, y.to)) {
        result = true;
        break outer;
      }
    }
  }
  teammateCache.set(key, result);
  return result;
}

export function adjacent(a: Slot, b: Slot): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= ADJ_DIST;
}

export function sameNation(a: Pick<Player, 'nation'>, b: Pick<Player, 'nation'>): boolean {
  return a.nation === b.nation && a.nation !== '---';
}

/**
 * Chemistry for an XI. Each player earns up to 4 points:
 * +1 natural position, +1 per former teammate in the XI (max 2),
 * +1 per compatriot anywhere in the XI (max 2).
 */
export function chemistry(formation: Formation | string, xi: Record<string, Pick<Player, 'id' | 'nation' | 'pos'> | undefined>): ChemistryReport {
  const f = typeof formation === 'string' ? getFormation(formation) : formation;
  const filled = f.slots.filter((s) => xi[s.id]);
  const links: ChemLink[] = [];
  const teammates: Record<string, number> = {};
  const compatriots: Record<string, number> = {};
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const sa = filled[i];
      const sb = filled[j];
      const pa = xi[sa.id]!;
      const pb = xi[sb.id]!;
      const mates = wereTeammates(pa, pb);
      const nation = sameNation(pa, pb);
      if (mates) {
        links.push({ a: sa.id, b: sb.id, kind: 'teammates' });
        teammates[sa.id] = (teammates[sa.id] ?? 0) + 1;
        teammates[sb.id] = (teammates[sb.id] ?? 0) + 1;
      }
      if (nation) {
        if (!mates && adjacent(sa, sb)) links.push({ a: sa.id, b: sb.id, kind: 'nation' });
        compatriots[sa.id] = (compatriots[sa.id] ?? 0) + 1;
        compatriots[sb.id] = (compatriots[sb.id] ?? 0) + 1;
      }
    }
  }
  const perSlot: Record<string, number> = {};
  const detail: Record<string, ChemDetail> = {};
  let total = 0;
  for (const s of filled) {
    const p = xi[s.id]!;
    const d: ChemDetail = {
      natural: positionFit(p.pos, s.pos!) >= -1,
      teammates: teammates[s.id] ?? 0,
      compatriots: compatriots[s.id] ?? 0,
      points: 0,
    };
    d.points = Math.min(
      MAX_PER_PLAYER,
      (d.natural ? CHEM_RULES.natural : 0) +
        Math.min(CHEM_RULES.maxTeammates, d.teammates) * CHEM_RULES.perTeammate +
        Math.min(CHEM_RULES.maxCompatriots, d.compatriots) * CHEM_RULES.perCompatriot,
    );
    detail[s.id] = d;
    perSlot[s.id] = d.points;
    total += d.points;
  }
  const score = filled.length ? Math.round((total / (filled.length * MAX_PER_PLAYER)) * 100) : 0;
  return { score, perSlot, detail, links };
}

/** Effective-rating bonus from chemistry: -2 at 0, +3 at 100. */
export function chemBonus(score: number): number {
  return (score / 100) * 5 - 2;
}

/** How many teammate links a candidate would bring to the current XI (for card tags). */
export function candidateLinks(candidate: Pick<Player, 'id'>, xiPlayers: Pick<Player, 'id'>[]): number {
  return xiPlayers.filter((p) => wereTeammates(candidate, p)).length;
}

/** How many compatriots a candidate would join in the current XI (for card tags). */
export function candidateCompatriots(candidate: Pick<Player, 'id' | 'nation'>, xiPlayers: Pick<Player, 'id' | 'nation'>[]): number {
  return xiPlayers.filter((p) => p.id !== candidate.id && sameNation(candidate, p)).length;
}
