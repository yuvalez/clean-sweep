import { CLUBS, getClub, type Country } from '../data/clubs';
import { EURO_FILLER, EURO_LEAGUE_QUALIFIERS, LEAGUES, WORLD_FILLER, type FillerDef } from '../data/leagues';
import { slugify } from '../data/players';
import { assignToFormation, benchFrom } from './assign';
import { DIFFICULTIES } from './difficulty';
import { aiDraft } from './draft';
import { FORMATIONS } from './formations';
import { buildPool } from './pool';
import { createRng, deriveSeed, type Rng } from './rng';
import { squadStrength } from './strength';
import type { Difficulty, Era, Mode, Squad, Team, TeamStrength } from './types';

export interface SeasonSetup {
  mode: Mode;
  clubId?: string; // club mode
  country: Country; // league the user plays in
  difficulty: Difficulty;
  seed: string;
  squad: Squad;
  teamName: string;
  teamShort: string;
  /** Global mode player pool (default all-time). Active era also makes rival clubs field their current squads. */
  era?: Era;
  /** Mid-season decisions (dilemmas, January window, tactics). */
  decisions?: boolean;
  color: string;
  color2: string;
}

export interface TeamWorld {
  teams: Record<string, Team>;
  userId: string;
  leagueIds: string[]; // 20
  rivalIds: string[]; // 2 domestic title challengers
  cupLowerIds: string[]; // 12
  euroIds: string[]; // 32
  worldIds: string[]; // 4
}

export const USER_ID = 'user';

function fillerStrength(rating: number, rng: Rng): TeamStrength {
  const tilt = rng.normal(0, 1.2);
  const att = rating + tilt;
  const def = rating - tilt;
  return { att, def, gk: rating, overall: rating };
}

function fillerTeam(def: FillerDef, country: string, boost: number, rng: Rng, ratingOverride?: number): Team {
  const [name, short, rating, color] = def;
  return {
    id: slugify(name),
    name,
    short,
    color,
    color2: '#f4f4f4',
    kind: 'filler',
    country,
    strength: fillerStrength((ratingOverride ?? rating) + boost, rng),
  };
}

export function legendsTeam(clubId: string, difficulty: Difficulty, seed: string): Team {
  const club = getClub(clubId);
  const cfg = DIFFICULTIES[difficulty];
  const rng = createRng(deriveSeed(seed, `legends:${clubId}`));
  const formation = rng.pick(FORMATIONS).id;
  const pool = buildPool('club', clubId, deriveSeed(seed, `legends-price:${clubId}`));
  const squad = aiDraft(pool, formation, { budget: cfg.rivalBudget, rerolls: cfg.rerolls, candidates: 4 }, `${seed}:${clubId}`, 'smart');
  const s = squadStrength(squad);
  return {
    id: club.id,
    name: club.name,
    short: club.short,
    color: club.color,
    color2: club.color2,
    kind: 'legends',
    country: club.country,
    strength: { att: s.att, def: s.def, gk: s.gk, overall: s.overall },
    squad,
  };
}

/** A club's real current squad, in whichever formation gets the most out of it. */
export function currentTeam(clubId: string, difficulty: Difficulty, seed: string): Team {
  const club = getClub(clubId);
  const boost = DIFFICULTIES[difficulty].currentBoost;
  const pool = buildPool('club', clubId, deriveSeed(seed, `current-price:${clubId}`), 'active');
  let best: { squad: Squad; overall: number } | undefined;
  for (const f of FORMATIONS) {
    const { picks, unused } = assignToFormation(pool, f.id);
    const squad: Squad = { formationId: f.id, picks: { ...picks, ...benchFrom(unused) } };
    const overall = squadStrength(squad).overall;
    if (!best || overall > best.overall + 1e-9) best = { squad, overall };
  }
  const s = squadStrength(best!.squad);
  return {
    id: club.id,
    name: club.name,
    short: club.short,
    color: club.color,
    color2: club.color2,
    kind: 'current',
    country: club.country,
    strength: { att: s.att + boost, def: s.def + boost, gk: s.gk + boost, overall: s.overall + boost },
    squad: best!.squad,
  };
}

/** A dataset club's side: all-time legends, or its current squad in the active era. */
export function isClubSide(t: Pick<Team, 'kind'>): boolean {
  return t.kind === 'legends' || t.kind === 'current';
}

export function buildWorld(setup: SeasonSetup): TeamWorld {
  const cfg = DIFFICULTIES[setup.difficulty];
  const rng = createRng(deriveSeed(setup.seed, 'world'));
  const teams: Record<string, Team> = {};
  const add = (t: Team) => {
    teams[t.id] = t;
    return t.id;
  };

  const userStrength = squadStrength(setup.squad);
  add({
    id: USER_ID,
    name: setup.teamName,
    short: setup.teamShort,
    color: setup.color,
    color2: setup.color2,
    kind: 'user',
    country: setup.country,
    strength: { att: userStrength.att, def: userStrength.def, gk: userStrength.gk, overall: userStrength.overall },
    squad: setup.squad,
  });

  // Every dataset club except the user's becomes an AI-drafted Legends side.
  const legendClubs = CLUBS.filter((c) => c.id !== setup.clubId || setup.mode === 'global');
  for (const c of legendClubs) {
    add(setup.era === 'active' ? currentTeam(c.id, setup.difficulty, setup.seed) : legendsTeam(c.id, setup.difficulty, setup.seed));
  }
  const legendOveralls = legendClubs.map((c) => teams[c.id].strength.overall).sort((a, b) => a - b);
  const legendMedian = legendOveralls[Math.floor(legendOveralls.length / 2)];

  // Domestic title rivals: two Legends sides from the same country, topped up with challengers.
  const league = LEAGUES[setup.country];
  const domestic = rng.shuffle(legendClubs.filter((c) => c.country === setup.country)).map((c) => c.id);
  const rivalIds = domestic.slice(0, 2);
  for (const ch of league.challengers) {
    if (rivalIds.length >= 2) break;
    rivalIds.push(add(fillerTeam(ch, setup.country, 0, rng, legendMedian - 1.5)));
  }

  const leagueFiller = league.filler.slice(0, 20 - 1 - rivalIds.length);
  const fillerIds = leagueFiller.map((d) => add(fillerTeam(d, setup.country, cfg.fillerBoost, rng)));
  const leagueIds = [USER_ID, ...rivalIds, ...fillerIds];

  const cupLowerIds = league.lower.map((name, i) =>
    add(fillerTeam([name, name.slice(0, 3).toUpperCase(), 66 - (i % 4), '#777777'], setup.country, cfg.fillerBoost, rng)),
  );

  // European Cup: user + all Legends + top non-dataset clubs of each league + continental filler.
  // Eight Legends sides qualify: the domestic rivals plus six more drawn at random.
  const otherLegends = rng.shuffle(legendClubs.map((c) => c.id).filter((id) => !rivalIds.includes(id)));
  const euroLegends = [...rivalIds.filter((id) => isClubSide(teams[id])), ...otherLegends].slice(0, 8);
  const euroIds = [USER_ID, ...euroLegends];
  for (const [country, n] of Object.entries(EURO_LEAGUE_QUALIFIERS) as [Country, number][]) {
    for (const d of LEAGUES[country].filler.slice(0, n)) {
      const id = slugify(d[0]);
      if (!teams[id]) add(fillerTeam(d, country, cfg.fillerBoost, rng));
      if (!euroIds.includes(id)) euroIds.push(id);
    }
  }
  // rival challengers (e.g. Marseille) also play in Europe
  for (const id of rivalIds) if (!euroIds.includes(id)) euroIds.push(id);
  const continental = rng.shuffle(EURO_FILLER);
  continental.sort((a, b) => b[2] - a[2] + rng.normal(0, 3));
  for (const d of continental) {
    if (euroIds.length >= 32) break;
    euroIds.push(add(fillerTeam(d, 'EUR', cfg.fillerBoost, rng)));
  }

  const world = rng.shuffle(WORLD_FILLER).slice(0, 6).sort((a, b) => b[2] - a[2]).slice(0, 4);
  const worldIds = world.map((d) => add(fillerTeam(d, 'WLD', cfg.fillerBoost, rng)));

  return { teams, userId: USER_ID, leagueIds, rivalIds, cupLowerIds, euroIds: euroIds.slice(0, 32), worldIds };
}

/** Re-compute the user's team strength (e.g. after the squad changes). */
export function refreshUserStrength(team: Team): Team {
  if (!team.squad) return team;
  const s = squadStrength(team.squad);
  return { ...team, strength: { att: s.att, def: s.def, gk: s.gk, overall: s.overall } };
}
