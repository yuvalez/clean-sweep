import type { Rng } from '../rng';
import type { KnockoutRound, MatchResult, Tie } from '../types';

export function makeTies(pairs: [string, string][], legs: 1 | 2, prefix: string): Tie[] {
  return pairs.map(([a, b], i) => ({ id: `${prefix}-${i}`, a, b, legs, results: [] }));
}

export function randomPairs(ids: string[], rng: Rng): [string, string][] {
  const s = rng.shuffle(ids);
  const out: [string, string][] = [];
  for (let i = 0; i + 1 < s.length; i += 2) out.push([s[i], s[i + 1]]);
  return out;
}

export function roundWinners(round: KnockoutRound): string[] {
  return round.ties.map((t) => t.winnerId!).filter(Boolean);
}

export function tieAggregate(tie: Tie, results: Record<string, MatchResult>): [number, number] {
  let a = 0;
  let b = 0;
  for (const id of tie.results) {
    const m = results[id];
    if (!m) continue;
    if (m.homeId === tie.a) { a += m.hg; b += m.ag; } else { a += m.ag; b += m.hg; }
  }
  return [a, b];
}

export function findTie(rounds: KnockoutRound[], teamId: string): { round: KnockoutRound; tie: Tie } | undefined {
  for (let i = rounds.length - 1; i >= 0; i--) {
    const tie = rounds[i].ties.find((t) => t.a === teamId || t.b === teamId);
    if (tie) return { round: rounds[i], tie };
  }
  return undefined;
}
