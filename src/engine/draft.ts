import { candidateLinks } from './chemistry';
import type { DifficultyConfig } from './difficulty';
import { allSlots, getFormation } from './formations';
import { eligibleForSlot, slotFit } from './positions';
import { MIN_PRICE } from './pricing';
import { createRng, deriveSeed, type Rng } from './rng';
import type { Picks, Player, Slot, Squad } from './types';

export interface DraftState {
  formationId: string;
  seed: string;
  budget: number;
  picks: Picks;
  rerollsLeft: number;
  candidatesPerSpin: number;
  spinCount: number;
  activeSlotId?: string;
  candidates?: Player[];
}

export function createDraft(formationId: string, cfg: DifficultyConfig, seed: string): DraftState {
  return {
    formationId,
    seed,
    budget: cfg.budget,
    picks: {},
    rerollsLeft: cfg.rerolls,
    candidatesPerSpin: cfg.candidates,
    spinCount: 0,
  };
}

export function slotsOf(state: Pick<DraftState, 'formationId'>): Slot[] {
  return allSlots(state.formationId);
}

export function spent(picks: Picks): number {
  return Object.values(picks).reduce((sum, p) => sum + (p?.price ?? 0), 0);
}

export function remaining(state: Pick<DraftState, 'budget' | 'picks'>): number {
  return Math.round((state.budget - spent(state.picks)) * 10) / 10;
}

export function emptySlots(state: Pick<DraftState, 'formationId' | 'picks'>): Slot[] {
  return slotsOf(state).filter((s) => !state.picks[s.id]);
}

/** Most that can be spent on the next pick while keeping MIN_PRICE for every other empty slot. */
export function maxAffordable(state: Pick<DraftState, 'formationId' | 'picks' | 'budget'>): number {
  const others = Math.max(0, emptySlots(state).length - 1);
  return remaining(state) - others * MIN_PRICE;
}

export function canAfford(state: Pick<DraftState, 'formationId' | 'picks' | 'budget'>, p: Player): boolean {
  return p.price <= maxAffordable(state) + 1e-9;
}

export function isComplete(state: Pick<DraftState, 'formationId' | 'picks'>): boolean {
  return emptySlots(state).length === 0;
}

export const YOUTH_NAMES = ['Academy Prospect', 'Youth Graduate', 'Reserve-Team Hopeful', 'B-Team Captain', 'Trialist'];

export function academyPlayer(slot: Slot, n: number): Player {
  const pos = slot.kind === 'xi' ? slot.pos! : slot.role === 'GK' ? 'GK' : slot.role === 'DEF' ? 'CB' : slot.role === 'ATT' ? 'ST' : 'CM';
  const id = `academy-${slot.id}-${n}`;
  return {
    id,
    uid: `${id}@academy`,
    name: YOUTH_NAMES[n % YOUTH_NAMES.length],
    nation: '---',
    club: 'academy',
    from: 2025,
    to: 2025,
    pos: [pos],
    rating: 64,
    price: MIN_PRICE,
    bargain: false,
  };
}

/**
 * Roll candidates for a slot: one star (88+), one solid pro (80-87), the rest anyone eligible.
 * Guarantees at least one affordable option.
 */
export function rollCandidates(pool: Player[], state: DraftState, slot: Slot, rng: Rng): Player[] {
  const takenIds = new Set(Object.values(state.picks).filter(Boolean).map((p) => p!.id));
  const eligible = pool.filter((p) => !takenIds.has(p.id) && eligibleForSlot(p, slot));
  const n = state.candidatesPerSpin;
  const chosen: Player[] = [];
  const take = (from: Player[]) => {
    const opts = from.filter((p) => !chosen.includes(p));
    if (opts.length) chosen.push(rng.pick(opts));
  };
  const isBench = slot.kind === 'bench';
  // Bench spins skew cheaper: stars are rarer there.
  if (!isBench || rng.chance(0.35)) take(eligible.filter((p) => p.rating >= 88));
  take(eligible.filter((p) => p.rating >= 80 && p.rating < 88));
  if (isBench) take(eligible.filter((p) => p.rating < 80));
  let guard = 0;
  while (chosen.length < n && guard++ < 50) {
    const opts = eligible.filter((p) => !chosen.includes(p));
    if (!opts.length) break;
    chosen.push(rng.pick(opts));
  }
  const cap = maxAffordable(state);
  if (!chosen.some((p) => p.price <= cap)) {
    const affordable = eligible.filter((p) => p.price <= cap && !chosen.includes(p));
    const fallback = affordable.length ? rng.pick(affordable) : academyPlayer(slot, state.spinCount);
    if (chosen.length >= n) {
      // replace the most expensive
      chosen.sort((a, b) => b.price - a.price);
      chosen.shift();
    }
    chosen.push(fallback);
  }
  while (chosen.length < n) chosen.push(academyPlayer(slot, state.spinCount + chosen.length));
  return rng.shuffle(chosen);
}

function spinRng(state: DraftState): Rng {
  return createRng(deriveSeed(state.seed, `spin:${state.spinCount}`));
}

export function spin(state: DraftState, pool: Player[], slotId: string): DraftState {
  if (state.activeSlotId) throw new Error('finish the current spin first');
  const slot = slotsOf(state).find((s) => s.id === slotId);
  if (!slot || state.picks[slotId]) throw new Error('slot not available');
  const candidates = rollCandidates(pool, state, slot, spinRng(state));
  return { ...state, activeSlotId: slotId, candidates, spinCount: state.spinCount + 1 };
}

export function reroll(state: DraftState, pool: Player[]): DraftState {
  if (!state.activeSlotId || state.rerollsLeft <= 0) throw new Error('cannot reroll');
  const slot = slotsOf(state).find((s) => s.id === state.activeSlotId)!;
  const candidates = rollCandidates(pool, state, slot, spinRng(state));
  return { ...state, candidates, rerollsLeft: state.rerollsLeft - 1, spinCount: state.spinCount + 1 };
}

export function pick(state: DraftState, uid: string): DraftState {
  const slotId = state.activeSlotId;
  const p = state.candidates?.find((c) => c.uid === uid);
  if (!slotId || !p) throw new Error('no such candidate');
  if (!canAfford(state, p)) throw new Error('cannot afford');
  return { ...state, picks: { ...state.picks, [slotId]: p }, activeSlotId: undefined, candidates: undefined };
}

export function toSquad(state: DraftState): Squad {
  return { formationId: state.formationId, picks: { ...state.picks } };
}

// ---------------------------------------------------------------------------
// AI drafting (rival "Legends" sides + balance testing)
// ---------------------------------------------------------------------------

export type AiPolicy = 'smart' | 'naive';

/** Weight of a slot when splitting money. */
function moneyWeight(s: Slot): number {
  if (s.kind === 'bench') return 0.08;
  return s.pos === 'GK' ? 0.8 : 1;
}

/** Weight of a slot's rating in team value. */
function valueWeight(s: Slot): number {
  if (s.kind === 'bench') return 0.25;
  return s.pos === 'GK' ? 0.8 : 1;
}

const ALLOWANCE_CAP = 70; // beyond this, spins rarely offer anything better

/** Rating that money buys on average (inverse of the price curve, capped). */
function ratingFor(allowance: number): number {
  const a = Math.min(Math.max(allowance, MIN_PRICE), ALLOWANCE_CAP);
  return 65 + Math.log(2 * a) / Math.log(1.2) - 2; // -2: spins don't always offer the ideal player
}

function xiPlayers(state: DraftState): Player[] {
  const f = getFormation(state.formationId);
  return f.slots.map((s) => state.picks[s.id]).filter(Boolean) as Player[];
}

/** Value of picking `p` for `slot` now + expected value of spreading what's left over the other empty slots. */
export function scoreCandidate(state: DraftState, slot: Slot, p: Player): number {
  const others = emptySlots(state).filter((s) => s.id !== slot.id);
  const left = remaining(state) - p.price;
  const totalW = others.reduce((a, s) => a + moneyWeight(s), 0) || 1;
  let future = 0;
  for (const s of others) future += valueWeight(s) * ratingFor((left * moneyWeight(s)) / totalW);
  const links = slot.kind === 'xi' ? Math.min(2, candidateLinks(p, xiPlayers(state))) : 0;
  const eff = p.rating + slotFit(p, slot) + links * 0.9;
  return valueWeight(slot) * eff + future;
}

export function aiDraft(pool: Player[], formationId: string, cfg: Pick<DifficultyConfig, 'budget' | 'rerolls' | 'candidates'>, seed: string, policy: AiPolicy = 'smart'): Squad {
  let state: DraftState = {
    formationId,
    seed,
    budget: cfg.budget,
    picks: {},
    rerollsLeft: cfg.rerolls,
    candidatesPerSpin: cfg.candidates,
    spinCount: 0,
  };
  const order = createRng(deriveSeed(seed, 'order'));
  const f = getFormation(formationId);
  const xi = order.shuffle(f.slots);
  const bench = allSlots(formationId).filter((s) => s.kind === 'bench');
  for (const slot of [...xi, ...bench]) {
    state = spin(state, pool, slot.id);
    for (;;) {
      const affordable = state.candidates!.filter((c) => canAfford(state, c));
      let best: Player;
      if (policy === 'naive') {
        best = affordable.reduce((a, b) => (b.rating > a.rating ? b : a));
      } else {
        best = affordable.reduce((a, b) => (scoreCandidate(state, slot, b) > scoreCandidate(state, slot, a) ? b : a));
        const bestEff = best.rating + slotFit(best, slot);
        if (policy === 'smart' && slot.kind === 'xi' && bestEff < 82 && state.rerollsLeft > 0) {
          state = reroll(state, pool);
          continue;
        }
      }
      state = pick(state, best.uid);
      break;
    }
  }
  return toSquad(state);
}
