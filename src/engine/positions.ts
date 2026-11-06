import type { BenchRole, Line, Player, Pos, Slot } from './types';

export const ALL_POS: Pos[] = ['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];

export const LINE_OF: Record<Pos, Line> = {
  GK: 'GK',
  LB: 'DEF', CB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT',
};

/** Positions that are a natural stretch from one another. */
const RELATED: Record<Pos, Pos[]> = {
  GK: [],
  LB: ['LWB'],
  LWB: ['LB', 'LM'],
  RB: ['RWB'],
  RWB: ['RB', 'RM'],
  CB: [],
  CDM: ['CM'],
  CM: ['CDM', 'CAM'],
  CAM: ['CM'],
  LM: ['LW', 'LWB'],
  RM: ['RW', 'RWB'],
  LW: ['LM'],
  RW: ['RM'],
  ST: [],
};

export const FIT = { primary: 0, secondary: -1, related: -4, sameLine: -6, otherLine: -15 } as const;
export const SPIN_FIT_THRESHOLD = FIT.related; // players with fit >= this can be offered for a slot

/** Rating modifier for a player with `positions` playing at `slotPos`. */
export function positionFit(positions: readonly Pos[], slotPos: Pos): number {
  if (positions[0] === slotPos) return FIT.primary;
  if (positions.includes(slotPos)) return FIT.secondary;
  if (positions.some((p) => RELATED[p].includes(slotPos) || RELATED[slotPos].includes(p))) {
    // GK never relates to outfield
    return FIT.related;
  }
  const slotLine = LINE_OF[slotPos];
  if (slotLine === 'GK' || positions[0] === 'GK') return -40;
  if (positions.some((p) => LINE_OF[p] === slotLine)) return FIT.sameLine;
  return FIT.otherLine;
}

export function primaryLine(p: { pos: readonly Pos[] }): Line {
  return LINE_OF[p.pos[0]];
}

export function eligibleForBench(p: { pos: readonly Pos[] }, role: BenchRole): boolean {
  const line = primaryLine(p);
  if (role === 'ANY') return line !== 'GK';
  return line === role;
}

export function eligibleForSlot(p: { pos: readonly Pos[] }, slot: Slot): boolean {
  if (slot.kind === 'bench') return eligibleForBench(p, slot.role!);
  return positionFit(p.pos, slot.pos!) >= SPIN_FIT_THRESHOLD;
}

/** Fit shown on a card for a slot. Bench players are judged on their primary position. */
export function slotFit(p: Player, slot: Slot): number {
  if (slot.kind === 'bench') return 0;
  return positionFit(p.pos, slot.pos!);
}

export function slotLabel(slot: Slot): string {
  if (slot.kind === 'xi') return slot.pos!;
  return slot.role === 'ANY' ? 'SUB' : `SUB ${slot.role}`;
}
