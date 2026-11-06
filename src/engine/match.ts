import type { Rng } from './rng';
import type { CompId, GoalEvent, MatchResult, Msg, Pos, TeamStrength } from './types';

/** Tunable simulation constants (adjusted with scripts/balance.ts). */
export const SIM = {
  base: 1.3, // goals per team in an even match
  spread: 1.5, // max log-multiplier on goals from a strength gap
  scale: 15, // rating gap at which the effect starts to saturate
  home: 1.12, // home λ multiplier
  away: 0.92,
  formSd: 1.1, // per-match performance noise (rating points)
  etFactor: 0.3,
};

/** Expected-goals multiplier from (attack − opposing defence); saturates so mismatches stay realistic. */
export function goalFactor(diff: number): number {
  return Math.exp(SIM.spread * Math.tanh(diff / SIM.scale));
}

export interface ScorerCandidate {
  uid: string;
  pos: Pos;
  rating: number;
}

export interface Side {
  id: string;
  strength: TeamStrength;
  scorers?: ScorerCandidate[]; // XI, for goal events
}

export interface MatchOpts {
  id: string;
  comp: CompId;
  stage: Msg;
  neutral?: boolean;
  knockout?: boolean;
  /** Second leg of a tie: first-leg goals from the perspective of this match's home side. */
  aggregate?: { home: number; away: number };
  events?: boolean;
}

const SCORE_W: Record<Pos, number> = {
  ST: 3.2, LW: 2.4, RW: 2.4, CAM: 2, LM: 1.4, RM: 1.4, CM: 1, CDM: 0.5,
  LWB: 0.5, RWB: 0.5, LB: 0.35, RB: 0.35, CB: 0.4, GK: 0.01,
};
const ASSIST_W: Record<Pos, number> = {
  CAM: 4, LW: 3.2, RW: 3.2, CM: 2.8, LM: 2.6, RM: 2.6, ST: 2, LWB: 1.6, RWB: 1.6,
  LB: 1.2, RB: 1.2, CDM: 1.1, CB: 0.4, GK: 0.05,
};

function lambdas(rng: Rng, home: Side, away: Side, neutral: boolean) {
  const fh = rng.normal(0, SIM.formSd);
  const fa = rng.normal(0, SIM.formSd);
  const hAtt = home.strength.att + fh;
  const hDef = home.strength.def + fh;
  const aAtt = away.strength.att + fa;
  const aDef = away.strength.def + fa;
  const lh = SIM.base * goalFactor(hAtt - aDef) * (neutral ? 1 : SIM.home);
  const la = SIM.base * goalFactor(aAtt - hDef) * (neutral ? 1 : SIM.away);
  return { lh, la };
}

function goalEvents(rng: Rng, side: Side, n: number, minFrom: number, minTo: number): GoalEvent[] {
  const out: GoalEvent[] = [];
  for (let i = 0; i < n; i++) {
    const ev: GoalEvent = { teamId: side.id, minute: rng.int(minFrom, minTo) };
    if (side.scorers?.length) {
      const scorer = rng.weighted(side.scorers, (c) => SCORE_W[c.pos] * Math.pow(c.rating / 80, 2));
      ev.scorer = scorer.uid;
      if (rng.chance(0.78)) {
        const others = side.scorers.filter((c) => c.uid !== scorer.uid);
        if (others.length) ev.assist = rng.weighted(others, (c) => ASSIST_W[c.pos] * Math.pow(c.rating / 80, 2)).uid;
      }
    }
    out.push(ev);
  }
  return out;
}

function shootout(rng: Rng, home: Side, away: Side): [number, number] {
  const p = (shooter: Side, keeper: Side) =>
    Math.min(0.9, Math.max(0.6, 0.76 + (shooter.strength.att - keeper.strength.gk) / 120));
  const ph = p(home, away);
  const pa = p(away, home);
  let h = 0;
  let a = 0;
  for (let i = 0; i < 5; i++) {
    if (rng.chance(ph)) h++;
    if (h > a + (5 - i)) break; // early finish
    if (rng.chance(pa)) a++;
    if (a > h + (4 - i) || h > a + (4 - i)) break;
  }
  let guard = 0;
  while (h === a && guard++ < 30) {
    const sh = rng.chance(ph);
    const sa = rng.chance(pa);
    if (sh) h++;
    if (sa) a++;
  }
  if (h === a) h++;
  return [h, a];
}

export function simulateMatch(rng: Rng, home: Side, away: Side, opts: MatchOpts): MatchResult {
  const neutral = !!opts.neutral;
  const { lh, la } = lambdas(rng, home, away, neutral);
  let hg = rng.poisson(lh);
  let ag = rng.poisson(la);
  const goals: GoalEvent[] = [];
  if (opts.events) goals.push(...goalEvents(rng, home, hg, 1, 90), ...goalEvents(rng, away, ag, 1, 90));
  const result: MatchResult = {
    id: opts.id,
    comp: opts.comp,
    stage: opts.stage,
    homeId: home.id,
    awayId: away.id,
    hg,
    ag,
    goals,
    neutral,
  };
  if (opts.knockout) {
    const aggH = () => hg + (opts.aggregate?.home ?? 0);
    const aggA = () => ag + (opts.aggregate?.away ?? 0);
    if (aggH() === aggA()) {
      result.et = true;
      const eh = rng.poisson(lh * SIM.etFactor);
      const ea = rng.poisson(la * SIM.etFactor);
      if (opts.events) goals.push(...goalEvents(rng, home, eh, 91, 120), ...goalEvents(rng, away, ea, 91, 120));
      hg += eh;
      ag += ea;
      result.hg = hg;
      result.ag = ag;
      if (aggH() === aggA()) result.pens = shootout(rng, home, away);
    }
    if (result.pens) result.winnerId = result.pens[0] > result.pens[1] ? home.id : away.id;
    else result.winnerId = aggH() > aggA() ? home.id : away.id;
  } else if (hg !== ag) {
    result.winnerId = hg > ag ? home.id : away.id;
  }
  goals.sort((a, b) => a.minute - b.minute);
  return result;
}
