import { chemBonus, chemistry } from './chemistry';
import { getFormation } from './formations';
import { LINE_OF, positionFit } from './positions';
import type { Line, Player, Pos, Squad, TeamStrength } from './types';

export interface LineupEntry {
  player: Pick<Player, 'uid' | 'id' | 'name' | 'nation' | 'pos' | 'rating'>;
  fitness: number;
}
export type Lineup = Record<string, LineupEntry>; // xi slotId → entry

export function fatiguePenalty(fitness: number): number {
  return Math.max(0, 80 - fitness) * 0.2;
}

export function effectiveRating(player: { pos: readonly Pos[]; rating: number }, slotPos: Pos, chem: number, fitness = 100): number {
  return player.rating + positionFit(player.pos, slotPos) + chemBonus(chem) - fatiguePenalty(fitness);
}

function lineValue(vals: number[]): number {
  if (!vals.length) return 60;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const max = Math.max(...vals);
  return mean + 0.12 * (max - mean);
}

export function lineupStrength(formationId: string, lineup: Lineup): TeamStrength & { chem: number } {
  const f = getFormation(formationId);
  const xi: Record<string, LineupEntry['player']> = {};
  for (const s of f.slots) if (lineup[s.id]) xi[s.id] = lineup[s.id].player;
  const chem = chemistry(f, xi).score;
  const lines: Record<Line, number[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const s of f.slots) {
    const e = lineup[s.id];
    const v = e ? effectiveRating(e.player, s.pos!, chem, e.fitness) : 50;
    lines[LINE_OF[s.pos!]].push(v);
  }
  const GK = lineValue(lines.GK);
  const DEF = lineValue(lines.DEF);
  const MID = lineValue(lines.MID);
  const ATT = lineValue(lines.ATT);
  const att = 0.55 * ATT + 0.35 * MID + 0.1 * DEF + f.attMod;
  const def = 0.45 * DEF + 0.3 * MID + 0.25 * GK + f.defMod;
  return { att, def, gk: GK, overall: (att + def) / 2, chem };
}

/** Strength of a squad's first-choice XI at full fitness. */
export function squadStrength(squad: Squad): TeamStrength & { chem: number } {
  const f = getFormation(squad.formationId);
  const lineup: Lineup = {};
  for (const s of f.slots) {
    const p = squad.picks[s.id];
    if (p) lineup[s.id] = { player: p, fitness: 100 };
  }
  return lineupStrength(squad.formationId, lineup);
}
