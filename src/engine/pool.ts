import { allStints, stintsForClub } from '../data/players';
import { pricePlayer } from './pricing';
import type { Era, Mode, Player, Stint } from './types';

let byId: Map<string, Stint[]> | null = null;
/** Every stint of every player, keyed by player id (for teammate detection across clubs). */
export function stintsById(): Map<string, Stint[]> {
  if (!byId) {
    byId = new Map();
    for (const s of allStints()) {
      const arr = byId.get(s.id) ?? [];
      arr.push(s);
      byId.set(s.id, arr);
    }
  }
  return byId;
}

let latest: number | null = null;
/** The most recent season in the data: a stint running to it means the player is still at that club. */
export function latestSeason(): number {
  if (latest === null) latest = Math.max(...allStints().map((s) => s.to));
  return latest;
}

/** Current stints only (one per active player), rated at their current club. */
export function activeStints(clubId?: string): Stint[] {
  const y = latestSeason();
  return (clubId ? stintsForClub(clubId) : allStints()).filter((s) => s.to >= y);
}

/**
 * The draftable player pool for a run.
 * Club mode = that club's stints. Global all-time = each player's best stint.
 * Active era = each current player's stint at their current club.
 */
export function buildPool(mode: Mode, clubId: string | undefined, seed: number | string, era: Era = 'allTime'): Player[] {
  let stints: Stint[];
  if (era === 'active') {
    stints = activeStints(mode === 'club' ? clubId : undefined);
  } else if (mode === 'club') {
    if (!clubId) throw new Error('club mode requires a club');
    stints = stintsForClub(clubId);
  } else {
    const best = new Map<string, Stint>();
    for (const s of allStints()) {
      const cur = best.get(s.id);
      if (!cur || s.rating > cur.rating) best.set(s.id, s);
    }
    stints = [...best.values()];
  }
  return stints.map((s) => pricePlayer(s, seed));
}
