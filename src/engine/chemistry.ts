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

export interface ChemistryReport {
  score: number; // 0-100
  perSlot: Record<string, number>; // 0-4
  links: ChemLink[];
}

const ADJ_DIST = 32;
const MAX_PER_PLAYER = 4;

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

/**
 * Chemistry for an XI. Each player earns up to 4 points:
 * +1 natural position, +1 per teammate link (max 2), +1 compatriot in an adjacent slot.
 */
export function chemistry(formation: Formation | string, xi: Record<string, Pick<Player, 'id' | 'nation' | 'pos'> | undefined>): ChemistryReport {
  const f = typeof formation === 'string' ? getFormation(formation) : formation;
  const filled = f.slots.filter((s) => xi[s.id]);
  const links: ChemLink[] = [];
  const teammateCount: Record<string, number> = {};
  const nationLink: Record<string, boolean> = {};
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const sa = filled[i];
      const sb = filled[j];
      const pa = xi[sa.id]!;
      const pb = xi[sb.id]!;
      if (wereTeammates(pa, pb)) {
        links.push({ a: sa.id, b: sb.id, kind: 'teammates' });
        teammateCount[sa.id] = (teammateCount[sa.id] ?? 0) + 1;
        teammateCount[sb.id] = (teammateCount[sb.id] ?? 0) + 1;
      } else if (pa.nation === pb.nation && adjacent(sa, sb)) {
        links.push({ a: sa.id, b: sb.id, kind: 'nation' });
        nationLink[sa.id] = true;
        nationLink[sb.id] = true;
      }
    }
  }
  const perSlot: Record<string, number> = {};
  let total = 0;
  for (const s of filled) {
    const p = xi[s.id]!;
    let pts = 0;
    if (positionFit(p.pos, s.pos!) >= -1) pts += 1;
    pts += Math.min(2, teammateCount[s.id] ?? 0);
    if (nationLink[s.id]) pts += 1;
    perSlot[s.id] = pts;
    total += pts;
  }
  const score = filled.length ? Math.round((total / (filled.length * MAX_PER_PLAYER)) * 100) : 0;
  return { score, perSlot, links };
}

/** Effective-rating bonus from chemistry: -2 at 0, +3 at 100. */
export function chemBonus(score: number): number {
  return (score / 100) * 5 - 2;
}

/** How many teammate links a candidate would bring to the current XI (for card tags). */
export function candidateLinks(candidate: Pick<Player, 'id'>, xiPlayers: Pick<Player, 'id'>[]): number {
  return xiPlayers.filter((p) => wereTeammates(candidate, p)).length;
}
