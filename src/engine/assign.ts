import { academyPlayer } from './draft';
import { BENCH_SLOTS, getFormation } from './formations';
import { slotFit } from './positions';
import type { Picks, Player, Slot } from './types';

/**
 * Pick the best XI for a formation from `players` (maximising rating + position fit).
 * Greedy start, then improving swaps between slots and with unused players until stable.
 */
export function assignToFormation(players: Player[], formationId: string): { picks: Picks; unused: Player[] } {
  const slots = getFormation(formationId).slots;
  // Too few players (e.g. a thin current squad): academy kids can fill the gaps.
  const pads = players.length < slots.length ? slots.map((s, i) => academyPlayer(s, 80 + i)) : [];
  const padIds = new Set(pads.map((p) => p.uid));
  players = [...players, ...pads];
  const val = (p: Player, s: Slot) => p.rating + slotFit(p, s);
  const pairs = slots.flatMap((s) => players.map((p) => ({ s, p, v: val(p, s) }))).sort((a, b) => b.v - a.v);
  const bySlot = new Map<string, Player>();
  const used = new Set<string>();
  for (const { s, p } of pairs) {
    if (bySlot.has(s.id) || used.has(p.uid)) continue;
    bySlot.set(s.id, p);
    used.add(p.uid);
  }
  let unused = players.filter((p) => !used.has(p.uid));
  let improved = true;
  while (improved) {
    improved = false;
    for (const a of slots) {
      for (const b of slots) {
        if (a.id >= b.id) continue;
        const pa = bySlot.get(a.id)!;
        const pb = bySlot.get(b.id)!;
        if (val(pb, a) + val(pa, b) > val(pa, a) + val(pb, b) + 1e-9) {
          bySlot.set(a.id, pb);
          bySlot.set(b.id, pa);
          improved = true;
        }
      }
      for (const u of unused) {
        const cur = bySlot.get(a.id)!;
        if (val(u, a) > val(cur, a) + 1e-9) {
          bySlot.set(a.id, u);
          unused = [...unused.filter((x) => x !== u), cur];
          improved = true;
          break;
        }
      }
    }
  }
  return { picks: Object.fromEntries(slots.map((s) => [s.id, bySlot.get(s.id)])), unused: unused.filter((p) => !padIds.has(p.uid)) };
}

const LINE_POS: Record<string, string[]> = {
  GK: ['GK'],
  DEF: ['LB', 'RB', 'CB', 'LWB', 'RWB'],
  MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  ATT: ['LW', 'RW', 'ST'],
};

/**
 * Fill bench slots from leftover players, matching each slot's role to a player's main
 * position where possible (best-rated first). Missing players become academy kids.
 */
export function benchFrom(players: Player[], slots: Slot[] = BENCH_SLOTS): Picks {
  let left = [...players].sort((a, b) => b.rating - a.rating);
  const out: Picks = {};
  slots.forEach((slot, i) => {
    const want = slot.role ? LINE_POS[slot.role] : undefined;
    const match = (want ? left.find((p) => want.includes(p.pos[0])) : undefined) ?? (slot.role === 'GK' ? undefined : left[0]);
    out[slot.id] = match ?? academyPlayer(slot, 50 + i);
    left = left.filter((p) => p !== match);
  });
  return out;
}
