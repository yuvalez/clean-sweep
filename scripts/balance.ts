/**
 * Monte Carlo balance check.
 *   npx tsx scripts/balance.ts [seasonsPerDraft=40] [draftsPerUnit=2] [difficulty|all] [club|active]
 * For every difficulty, AI-drafts user squads (smart + naive policies), then simulates many
 * seasons and reports Clean-Sweep / trophy rates.
 *   club   (default) one unit per club, Club Legends mode vs all-time Legends rivals
 *   active one unit per league country, Global mode with the active era vs current squads
 */
import { CLUBS, type Country } from '../src/data/clubs';
import { LEAGUES } from '../src/data/leagues';
import { isClubSide } from '../src/engine/opponents';
import type { SeasonSetup } from '../src/engine/opponents';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../src/engine/difficulty';
import { aiDraft, type AiPolicy } from '../src/engine/draft';
import { FORMATIONS } from '../src/engine/formations';
import { oddsRun } from '../src/engine/odds';
import { buildPool } from '../src/engine/pool';
import { createSeason } from '../src/engine/season';
import { squadStrength } from '../src/engine/strength';
import type { CompId, Difficulty } from '../src/engine/types';

const RUNS = Number(process.argv[2] ?? 40);
const DRAFTS = Number(process.argv[3] ?? 2);
const ONLY = process.argv[4] && process.argv[4] !== 'all' ? (process.argv[4] as Difficulty) : undefined;
const MODE = (process.argv[5] ?? 'club') as 'club' | 'active';

interface Unit { id: string; country: Country; clubId?: string; name: string; short: string; color: string; color2: string }
const UNITS: Unit[] =
  MODE === 'club'
    ? CLUBS.map((c) => ({ id: c.id, country: c.country, clubId: c.id, name: c.name, short: c.short, color: c.color, color2: c.color2 }))
    : (Object.keys(LEAGUES) as Country[]).map((c) => ({ id: c, country: c, name: 'World XI', short: 'WXI', color: '#34d399', color2: '#0f172a' }));

interface Agg { n: number; sweep: number; trophies: number; perComp: Record<CompId, number>; perfect: number; ovr: number; rivalOvr: number; spend: number }
const blank = (): Agg => ({ n: 0, sweep: 0, trophies: 0, perComp: { super: 0, league: 0, cup: 0, euro: 0, cwc: 0 }, perfect: 0, ovr: 0, rivalOvr: 0, spend: 0 });

const pct = (x: number) => `${(x * 100).toFixed(1).padStart(5)}%`;

for (const diff of DIFFICULTY_ORDER) {
  if (ONLY && diff !== ONLY) continue;
  const cfg = DIFFICULTIES[diff];
  const byPolicy: Record<AiPolicy, Agg> = { smart: blank(), naive: blank() };
  const perClub: Record<string, number> = {};
  for (const policy of ['smart', 'naive'] as AiPolicy[]) {
    const a = byPolicy[policy];
    for (const club of UNITS) {
      for (let d = 0; d < DRAFTS; d++) {
        const seed = `bal-${diff}-${club.id}-${d}`;
        const formation = FORMATIONS[(d + club.id.length) % FORMATIONS.length].id;
        const pool = MODE === 'club' ? buildPool('club', club.id, seed) : buildPool('global', undefined, seed, 'active');
        const budget = MODE === 'club' ? cfg.budget : cfg.activeBudget;
        const squad = aiDraft(pool, formation, { ...cfg, budget }, seed, policy);
        const st = squadStrength(squad);
        const season = createSeason(
          {
            mode: MODE === 'club' ? 'club' : 'global', clubId: club.clubId, era: MODE === 'club' ? 'allTime' : 'active',
            country: club.country, difficulty: diff, seed, squad, teamName: club.name, teamShort: club.short, color: club.color, color2: club.color2,
          } as SeasonSetup,
          'balanced',
        );
        const rivals = Object.values(season.world.teams).filter(isClubSide);
        a.ovr += st.overall;
        a.rivalOvr += rivals.reduce((x, t) => x + t.strength.overall, 0) / rivals.length;
        a.spend += Object.values(squad.picks).reduce((x, p) => x + p!.price, 0);
        let clubSweeps = 0;
        for (let i = 0; i < RUNS; i++) {
          const r = oddsRun(season, i);
          a.n++;
          a.trophies += r.won.length;
          for (const c of r.won) a.perComp[c]++;
          if (r.won.length === 5) { a.sweep++; clubSweeps++; }
          if (r.perfect) a.perfect++;
        }
        if (policy === 'smart') perClub[club.id] = (perClub[club.id] ?? 0) + clubSweeps / (RUNS * DRAFTS);
      }
    }
  }
  console.log(MODE === 'club'
    ? `\n=== ${cfg.label.toUpperCase()} (budget €${cfg.budget}M, rivals €${cfg.rivalBudget}M) ===`
    : `\n=== ${cfg.label.toUpperCase()} ACTIVE (budget €${cfg.activeBudget}M, current squads ${cfg.currentBoost >= 0 ? '+' : ''}${cfg.currentBoost}) ===`);
  for (const policy of ['smart', 'naive'] as AiPolicy[]) {
    const a = byPolicy[policy];
    const drafts = UNITS.length * DRAFTS;
    console.log(
      `${policy.padEnd(6)} sweep ${pct(a.sweep / a.n)} | avg trophies ${(a.trophies / a.n).toFixed(2)} | ` +
        (Object.keys(a.perComp) as CompId[]).map((c) => `${c} ${pct(a.perComp[c] / a.n)}`).join(' ') +
        ` | perfect ${pct(a.perfect / a.n)} | ovr ${(a.ovr / drafts).toFixed(1)} vs rivals ${(a.rivalOvr / drafts).toFixed(1)} | spend €${Math.round(a.spend / drafts)}M`,
    );
  }
  console.log(`smart sweep by ${MODE === 'club' ? 'club' : 'league'}: ` + Object.entries(perClub).map(([c, v]) => `${c} ${(v * 100).toFixed(0)}%`).join(', '));
}
