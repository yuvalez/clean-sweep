import { allStints, stintsForClub } from '../data/players';
import { pricePlayer } from './pricing';
import type { Mode, Player, Stint } from './types';

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

/** The draftable player pool for a run. Club mode = that club's stints; Global = each player's best stint. */
export function buildPool(mode: Mode, clubId: string | undefined, seed: number | string): Player[] {
  let stints: Stint[];
  if (mode === 'club') {
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
