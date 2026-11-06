import { refreshUserStrength, USER_ID } from './opponents';
import { initSeason, simulateToEnd, trophies, userRecord, type SeasonState } from './season';
import type { CompId } from './types';

export interface OddsReport {
  runs: number;
  sweep: number; // probability of winning all 5
  perComp: Record<CompId, number>;
  avgTrophies: number;
  perfect: number; // 38-0 league seasons
  invincible: number;
}

/**
 * Re-simulate the same squad against the same opponents with fresh match luck.
 * Runs in chunks so the UI stays responsive.
 */
export async function seasonOdds(base: SeasonState, runs = 300, onProgress?: (done: number) => void): Promise<OddsReport> {
  const perComp: Record<CompId, number> = { super: 0, league: 0, cup: 0, euro: 0, cwc: 0 };
  let sweep = 0;
  let total = 0;
  let perfect = 0;
  let invincible = 0;
  const chunk = 20;
  for (let i = 0; i < runs; i += chunk) {
    for (let j = i; j < Math.min(runs, i + chunk); j++) {
      const r = oddsRun(base, j);
      for (const c of r.won) perComp[c]++;
      total += r.won.length;
      if (r.won.length === 5) sweep++;
      if (r.perfect) perfect++;
      if (r.invincible) invincible++;
    }
    onProgress?.(Math.min(runs, i + chunk));
    await new Promise((res) => setTimeout(res, 0));
  }
  for (const c of Object.keys(perComp) as CompId[]) perComp[c] /= runs;
  return { runs, sweep: sweep / runs, perComp, avgTrophies: total / runs, perfect: perfect / runs, invincible: invincible / runs };
}

export function oddsRun(base: SeasonState, i: number): { won: CompId[]; perfect: boolean; invincible: boolean } {
  // Start from the drafted squad, then replay the decisions and tactics made in the real season.
  const user = base.world.teams[USER_ID];
  const world = { ...base.world, teams: { ...base.world.teams, [USER_ID]: refreshUserStrength({ ...user, squad: base.setup.squad }) } };
  const s = initSeason({ ...base.setup, decisions: false }, world, `${base.matchSeed}:odds:${i}`, base.rotation);
  s.replay = { decisions: base.decisions ?? [], tactics: base.tacticsLog ?? [] };
  simulateToEnd(s, true);
  const rec = userRecord(s);
  return { won: trophies(s), perfect: rec.leagueWins === 38, invincible: rec.leagueLosses === 0 };
}
