import { LEAGUES } from '../data/leagues';
import { applyResult, doubleRoundRobin, emptyTable, sortTable, type Fixture } from './competitions/league';
import { makeTies, randomPairs, roundWinners, tieAggregate } from './competitions/knockout';
import { applyReplay, blockOnDecision, initialBank, injuryMult, MENTALITY, ratingMod, scheduleDecisions, teamMods, tickMods } from './decisions';
import { DIFFICULTIES } from './difficulty';
import { BENCH_SLOTS, getFormation } from './formations';
import { simulateMatch, type ScorerCandidate, type Side } from './match';
import { buildWorld, USER_ID, type SeasonSetup, type TeamWorld } from './opponents';
import { createRng, deriveSeed, type Rng } from './rng';
import { effectiveRating, lineupStrength, type Lineup, type LineupEntry } from './strength';
import type {
  CompId, CompetitionStatus, DecisionEvent, KnockoutRound, MatchResult, Mentality, Modifier, Msg, Player, PlayerSeasonState,
  RotationPolicy, TableRow, TacticsChange, Team, Tie,
} from './types';

export interface DayDesc {
  comp: CompId;
  kind: 'league' | 'group' | 'ko';
  round: number;
  leg?: 1 | 2;
  label: string;
  gap: number; // days since previous match day
}

export interface GroupState {
  name: string;
  teamIds: string[];
  rounds: Fixture[][];
  table: Record<string, TableRow>;
}

export interface NewsItem {
  day: number;
  kind: 'injury' | 'return' | 'trophy' | 'out' | 'info';
  msg: Msg;
}

export interface SeasonState {
  version: 3;
  setup: SeasonSetup;
  matchSeed: string;
  world: TeamWorld;
  rotation: RotationPolicy;
  calendar: DayDesc[];
  day: number;
  results: Record<string, MatchResult>;
  userMatches: string[];
  league: { rounds: Fixture[][]; table: Record<string, TableRow> };
  euroGroups: GroupState[];
  ko: Record<'super' | 'cup' | 'euro' | 'cwc', KnockoutRound[]>;
  status: Record<CompId, CompetitionStatus>;
  players: Record<string, PlayerSeasonState>;
  news: NewsItem[];
  done: boolean;
  // mid-season decisions
  decisions: DecisionEvent[];
  pendingDecision?: string;
  bank: number; // €M transfer kitty
  mentality: Mentality;
  tacticsLog: TacticsChange[];
  mods: Modifier[];
  departed: Player[];
  /** Odds re-simulation: replay the real season's decisions instead of asking. */
  replay?: { decisions: DecisionEvent[]; tactics: TacticsChange[] };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FATIGUE = {
  matchCost: 30,
  gkCost: 10,
  recoveryPerDay: 5.5,
  injuryBase: 0.0085,
};

const ROTATION: Record<RotationPolicy, { threshold: number; maxDrop: number }> = {
  rotate: { threshold: 74, maxDrop: 30 },
  balanced: { threshold: 66, maxDrop: 18 },
  strongest: { threshold: 48, maxDrop: 5 },
};
const BIG_MATCH = { threshold: 42, maxDrop: 5 };

/** Injury keys; the UI translates them. */
export const INJURIES = ['hamstring', 'ankle', 'calf', 'knee', 'groin', 'thigh', 'back', 'toe', 'ligament', 'concussion'];

export const KO_NAMES = {
  super: ['Semi-final', 'Final'],
  cup: ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
  euro: ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
  cwc: ['Quarter-final', 'Semi-final', 'Final'],
} as const;

export function compNames(country: SeasonSetup['country']): Record<CompId, string> {
  const adj = LEAGUES[country].adjective;
  return {
    super: `${adj} Super Cup`,
    league: `${adj} League`,
    cup: `${adj} Cup`,
    euro: 'European Cup',
    cwc: 'Club World Cup',
  };
}

export const COMP_ORDER: CompId[] = ['super', 'league', 'cup', 'euro', 'cwc'];

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export function buildCalendar(): DayDesc[] {
  const days: DayDesc[] = [];
  days.push({ comp: 'super', kind: 'ko', round: 0, label: 'Super Cup Semi-final', gap: 7 });
  days.push({ comp: 'super', kind: 'ko', round: 1, label: 'Super Cup Final', gap: 3 });
  const midweek: Record<number, DayDesc> = {
    3: { comp: 'euro', kind: 'group', round: 0, label: 'European Cup Group MD1', gap: 3 },
    5: { comp: 'euro', kind: 'group', round: 1, label: 'European Cup Group MD2', gap: 3 },
    6: { comp: 'cup', kind: 'ko', round: 0, label: 'Cup Round of 32', gap: 3 },
    8: { comp: 'euro', kind: 'group', round: 2, label: 'European Cup Group MD3', gap: 3 },
    10: { comp: 'euro', kind: 'group', round: 3, label: 'European Cup Group MD4', gap: 3 },
    13: { comp: 'euro', kind: 'group', round: 4, label: 'European Cup Group MD5', gap: 3 },
    15: { comp: 'euro', kind: 'group', round: 5, label: 'European Cup Group MD6', gap: 3 },
    17: { comp: 'cup', kind: 'ko', round: 1, label: 'Cup Round of 16', gap: 3 },
    21: { comp: 'cup', kind: 'ko', round: 2, label: 'Cup Quarter-final', gap: 3 },
    23: { comp: 'euro', kind: 'ko', round: 0, leg: 1, label: 'European Cup R16, 1st leg', gap: 3 },
    25: { comp: 'euro', kind: 'ko', round: 0, leg: 2, label: 'European Cup R16, 2nd leg', gap: 3 },
    27: { comp: 'cup', kind: 'ko', round: 3, label: 'Cup Semi-final', gap: 3 },
    29: { comp: 'euro', kind: 'ko', round: 1, leg: 1, label: 'European Cup QF, 1st leg', gap: 3 },
    31: { comp: 'euro', kind: 'ko', round: 1, leg: 2, label: 'European Cup QF, 2nd leg', gap: 3 },
    33: { comp: 'euro', kind: 'ko', round: 2, leg: 1, label: 'European Cup SF, 1st leg', gap: 3 },
    35: { comp: 'euro', kind: 'ko', round: 2, leg: 2, label: 'European Cup SF, 2nd leg', gap: 3 },
  };
  let afterMidweek = false;
  for (let md = 0; md < 38; md++) {
    days.push({ comp: 'league', kind: 'league', round: md, label: `League Matchday ${md + 1}`, gap: afterMidweek ? 4 : 7 });
    afterMidweek = false;
    const mw = midweek[md + 1];
    if (mw) {
      days.push(mw);
      afterMidweek = true;
    }
  }
  days.push({ comp: 'cup', kind: 'ko', round: 4, label: 'Cup Final', gap: 6 });
  days.push({ comp: 'euro', kind: 'ko', round: 3, label: 'European Cup Final', gap: 7 });
  days.push({ comp: 'cwc', kind: 'ko', round: 0, label: 'Club World Cup Quarter-final', gap: 12 });
  days.push({ comp: 'cwc', kind: 'ko', round: 1, label: 'Club World Cup Semi-final', gap: 4 });
  days.push({ comp: 'cwc', kind: 'ko', round: 2, label: 'Club World Cup Final', gap: 4 });
  return days;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function squadPlayers(team: Team): Player[] {
  return Object.values(team.squad?.picks ?? {}).filter(Boolean) as Player[];
}

function drawGroups(world: TeamWorld, rng: Rng): GroupState[] {
  const ranked = world.euroIds
    .filter((id) => id !== USER_ID)
    .sort((a, b) => world.teams[b].strength.overall - world.teams[a].strength.overall);
  const ordered = [USER_ID, ...ranked];
  const pots = [0, 1, 2, 3].map((p) => ordered.slice(p * 8, p * 8 + 8));
  let best: string[][] = [];
  let bestClash = Infinity;
  for (let attempt = 0; attempt < 60; attempt++) {
    const groups: string[][] = Array.from({ length: 8 }, () => []);
    for (const pot of pots) {
      const s = rng.shuffle(pot);
      s.forEach((id, i) => groups[i].push(id));
    }
    let clash = 0;
    for (const g of groups) {
      const countries = g.map((id) => (id === USER_ID ? world.teams[USER_ID].country : world.teams[id].country));
      clash += countries.length - new Set(countries).size;
    }
    if (clash < bestClash) {
      best = groups;
      bestClash = clash;
      if (clash === 0) break;
    }
  }
  return best.map((teamIds, i) => ({
    name: String.fromCharCode(65 + i),
    teamIds,
    rounds: doubleRoundRobin(teamIds, rng),
    table: emptyTable(teamIds),
  }));
}

export function initSeason(setup: SeasonSetup, world: TeamWorld, matchSeed: string, rotation: RotationPolicy): SeasonState {
  const rng = createRng(deriveSeed(matchSeed, 'init'));
  const names = compNames(setup.country);
  const status = Object.fromEntries(
    COMP_ORDER.map((id) => [id, { id, name: names[id], status: 'pending' } as CompetitionStatus]),
  ) as Record<CompId, CompetitionStatus>;
  const players: Record<string, PlayerSeasonState> = {};
  for (const p of squadPlayers(world.teams[USER_ID])) {
    players[p.uid] = { uid: p.uid, fitness: 100, injuredFor: 0, apps: 0, goals: 0, assists: 0 };
  }
  const state: SeasonState = {
    version: 3,
    setup,
    matchSeed,
    world,
    rotation,
    calendar: buildCalendar(),
    day: 0,
    results: {},
    userMatches: [],
    league: { rounds: doubleRoundRobin(world.leagueIds, rng), table: emptyTable(world.leagueIds) },
    euroGroups: drawGroups(world, rng),
    ko: { super: [], cup: [], euro: [], cwc: [] },
    status,
    players,
    news: [],
    done: false,
    decisions: [],
    bank: initialBank(setup.squad, setup.difficulty),
    mentality: 'balanced',
    tacticsLog: [],
    mods: [],
    departed: [],
  };
  if (setup.decisions) state.decisions = scheduleDecisions(state.calendar, matchSeed);
  return state;
}

export function createSeason(setup: SeasonSetup, rotation: RotationPolicy): SeasonState {
  const world = buildWorld(setup);
  return initSeason(setup, world, `${setup.seed}:matches`, rotation);
}

// ---------------------------------------------------------------------------
// Lineups
// ---------------------------------------------------------------------------

const YOUTH: LineupEntry['player'] = { uid: 'youth', id: 'youth', name: 'Academy Kid', nation: '---', pos: ['CM'], rating: 60 };

export interface UserLineup {
  lineup: Lineup;
  subsIn: string[]; // bench uids starting
}

export function pickUserLineup(state: SeasonState, big: boolean): UserLineup {
  const team = state.world.teams[USER_ID];
  const squad = team.squad!;
  const f = getFormation(squad.formationId);
  const rule = big ? BIG_MATCH : ROTATION[state.rotation];
  const ps = (uid: string) => state.players[uid];
  const lineup: Lineup = {};
  const benchPool = BENCH_SLOTS.map((s) => squad.picks[s.id]).filter(
    (p): p is Player => !!p && ps(p.uid).injuredFor === 0,
  );
  const used = new Set<string>();
  const subsIn: string[] = [];

  const starters = f.slots.map((slot) => ({ slot, p: squad.picks[slot.id]! }));
  // Forced changes first, then the most tired.
  starters.sort((a, b) => {
    const ia = ps(a.p.uid).injuredFor > 0 ? 0 : 1;
    const ib = ps(b.p.uid).injuredFor > 0 ? 0 : 1;
    return ia - ib || ps(a.p.uid).fitness - ps(b.p.uid).fitness;
  });
  for (const { slot, p } of starters) {
    const st = ps(p.uid);
    const injured = st.injuredFor > 0;
    const tired = st.fitness < rule.threshold;
    if (!injured && !tired) {
      lineup[slot.id] = { player: p, fitness: st.fitness };
      continue;
    }
    const starterEff = effectiveRating(p, slot.pos!, 50, st.fitness);
    let best: Player | undefined;
    let bestEff = -Infinity;
    for (const b of benchPool) {
      if (used.has(b.uid)) continue;
      const bs = ps(b.uid);
      if (!injured && bs.fitness < 65) continue;
      const eff = effectiveRating(b, slot.pos!, 50, bs.fitness);
      if (eff > bestEff) {
        bestEff = eff;
        best = b;
      }
    }
    if (best && (injured || bestEff >= starterEff - rule.maxDrop) && bestEff > 40) {
      used.add(best.uid);
      subsIn.push(best.uid);
      lineup[slot.id] = { player: best, fitness: ps(best.uid).fitness };
    } else if (!injured) {
      lineup[slot.id] = { player: p, fitness: st.fitness };
    } else {
      lineup[slot.id] = { player: { ...YOUTH, pos: [slot.pos!] }, fitness: 100 };
    }
  }
  return { lineup, subsIn };
}

function legendsScorers(team: Team): ScorerCandidate[] | undefined {
  if (!team.squad) return undefined;
  const f = getFormation(team.squad.formationId);
  return f.slots.map((s) => {
    const p = team.squad!.picks[s.id]!;
    return { uid: p.uid, pos: s.pos!, rating: p.rating };
  });
}

// ---------------------------------------------------------------------------
// Playing a day
// ---------------------------------------------------------------------------

interface DayCtx {
  rng: Rng;
  fast: boolean;
  userLineup?: UserLineup;
  userSide?: Side;
}

function isBig(state: SeasonState, d: DayDesc, oppId?: string): boolean {
  if (d.kind === 'ko') {
    if (d.comp === 'euro') return true;
    const names = KO_NAMES[d.comp as keyof typeof KO_NAMES];
    const name = names[d.round];
    return name === 'Final' || name === 'Semi-final';
  }
  if (d.kind === 'league' && oppId) return state.world.rivalIds.includes(oppId);
  return false;
}

function sideFor(state: SeasonState, id: string, ctx: DayCtx, d: DayDesc, oppId: string): Side {
  if (id === USER_ID) {
    if (!ctx.userSide) {
      const big = isBig(state, d, oppId);
      ctx.userLineup = pickUserLineup(state, big);
      if (state.mods.length) {
        for (const e of Object.values(ctx.userLineup.lineup)) {
          const d = ratingMod(state, e.player.uid);
          if (d) e.player = { ...e.player, rating: e.player.rating + d };
        }
      }
      const s = lineupStrength(state.world.teams[USER_ID].squad!.formationId, ctx.userLineup.lineup);
      const tm = teamMods(state);
      s.att += tm.att;
      s.def += tm.def;
      s.overall = (s.att + s.def) / 2;
      const f = getFormation(state.world.teams[USER_ID].squad!.formationId);
      ctx.userSide = {
        id,
        strength: s,
        scorers: ctx.fast
          ? undefined
          : f.slots.map((slot) => {
              const e = ctx.userLineup!.lineup[slot.id];
              return { uid: e.player.uid, pos: slot.pos!, rating: e.player.rating };
            }),
      };
    }
    return ctx.userSide;
  }
  const t = state.world.teams[id];
  return { id, strength: t.strength, scorers: ctx.fast ? undefined : legendsScorers(t) };
}

function play(
  state: SeasonState,
  ctx: DayCtx,
  d: DayDesc,
  homeId: string,
  awayId: string,
  mid: string,
  extra: { knockout?: boolean; neutral?: boolean; aggregate?: { home: number; away: number }; stage: Msg },
): MatchResult {
  const userInvolved = homeId === USER_ID || awayId === USER_ID;
  const home = sideFor(state, homeId, ctx, d, awayId);
  const away = sideFor(state, awayId, ctx, d, homeId);
  const m = simulateMatch(ctx.rng, home, away, {
    id: mid,
    comp: d.comp,
    stage: extra.stage,
    knockout: extra.knockout,
    neutral: extra.neutral,
    aggregate: extra.aggregate,
    events: !ctx.fast && userInvolved,
  });
  state.results[mid] = m;
  if (userInvolved) {
    state.userMatches.push(mid);
    afterUserMatch(state, ctx, m);
  }
  return m;
}

function afterUserMatch(state: SeasonState, ctx: DayCtx, m: MatchResult): void {
  const lu = ctx.userLineup!;
  const cfg = DIFFICULTIES[state.setup.difficulty];
  const f = getFormation(state.world.teams[USER_ID].squad!.formationId);
  for (const slot of f.slots) {
    const e = lu.lineup[slot.id];
    const st = state.players[e.player.uid];
    if (!st) continue; // academy kid
    st.apps++;
    const pre = st.fitness;
    const cost = (slot.pos === 'GK' ? FATIGUE.gkCost : FATIGUE.matchCost) * MENTALITY[state.mentality].fatigue;
    st.fitness = Math.max(0, st.fitness - cost);
    const p = FATIGUE.injuryBase * cfg.injuryMult * (1 + (100 - pre) / 35) * (slot.pos === 'GK' ? 0.3 : 1) * injuryMult(state, e.player.uid);
    if (ctx.rng.chance(p)) {
      const len = ctx.rng.weighted([1, 2, 3, 4, 6, 8, 12], (n) => ({ 1: 30, 2: 25, 3: 15, 4: 11, 6: 10, 8: 6, 12: 3 })[n]!);
      st.injuredFor = len;
      st.injury = ctx.rng.pick(INJURIES);
      if (!ctx.fast) {
        state.news.push({ day: state.day, kind: 'injury', msg: { k: 'injury', player: e.player.name, n: len, injury: st.injury } });
      }
    }
  }
  tickMods(state);
  if (!ctx.fast) {
    for (const g of m.goals) {
      if (g.teamId !== USER_ID) continue;
      if (g.scorer && state.players[g.scorer]) state.players[g.scorer].goals++;
      if (g.assist && state.players[g.assist]) state.players[g.assist].assists++;
    }
  }
}

function setStatus(state: SeasonState, comp: CompId, status: CompetitionStatus['status'], note?: Msg, fast = false) {
  const cur = state.status[comp];
  if (cur.status === 'won' || cur.status === 'eliminated' || cur.status === 'runnerUp') return;
  cur.status = status;
  if (note) cur.note = note;
  if (fast) return;
  if (status === 'won') state.news.push({ day: state.day, kind: 'trophy', msg: { k: 'won', comp, note } });
  if (status === 'eliminated' || status === 'runnerUp') state.news.push({ day: state.day, kind: 'out', msg: { k: 'out', comp, note } });
}

function playLeagueDay(state: SeasonState, ctx: DayCtx, d: DayDesc) {
  setStatus(state, 'league', 'active');
  state.league.rounds[d.round].forEach(([h, a], i) => {
    const m = play(state, ctx, d, h, a, `L${d.round}-${i}`, { stage: { k: 'matchday', n: d.round + 1 } });
    applyResult(state.league.table, m);
  });
  // clinch / out of reach
  const rows = sortTable(state.league.table);
  const left = 38 - (d.round + 1);
  const userRow = state.league.table[USER_ID];
  const leader = rows[0];
  const second = rows[1];
  if (leader.teamId === USER_ID && userRow.pts > second.pts + left * 3) {
    setStatus(state, 'league', 'won', left > 0 ? { k: 'clinched', left } : { k: 'points', pts: userRow.pts }, ctx.fast);
  } else if (leader.teamId !== USER_ID && leader.pts > userRow.pts + left * 3) {
    const pos = rows.findIndex((r) => r.teamId === USER_ID) + 1;
    setStatus(state, 'league', 'eliminated', left > 0 ? { k: 'outOfReach' } : { k: 'finished', pos }, ctx.fast);
  } else if (left === 0) {
    if (leader.teamId === USER_ID) setStatus(state, 'league', 'won', { k: 'points', pts: userRow.pts }, ctx.fast);
    else setStatus(state, 'league', 'eliminated', { k: 'finished', pos: rows.findIndex((r) => r.teamId === USER_ID) + 1 }, ctx.fast);
  }
}

function playGroupDay(state: SeasonState, ctx: DayCtx, d: DayDesc) {
  setStatus(state, 'euro', 'active');
  for (const g of state.euroGroups) {
    g.rounds[d.round].forEach(([h, a], i) => {
      const m = play(state, ctx, d, h, a, `EG${g.name}${d.round}-${i}`, { stage: { k: 'groupMd', group: g.name, n: d.round + 1 } });
      applyResult(g.table, m);
    });
  }
  if (d.round === 5) {
    const g = state.euroGroups.find((g) => g.teamIds.includes(USER_ID))!;
    const pos = sortTable(g.table).findIndex((r) => r.teamId === USER_ID) + 1;
    if (pos > 2) setStatus(state, 'euro', 'eliminated', { k: 'groupOut', pos, group: g.name }, ctx.fast);
  }
}

function drawKoRound(state: SeasonState, comp: 'super' | 'cup' | 'euro' | 'cwc', round: number, rng: Rng): KnockoutRound {
  const name = KO_NAMES[comp][round];
  const prefix = `${comp}${round}`;
  const legs: 1 | 2 = comp === 'euro' && name !== 'Final' ? 2 : 1;
  const rounds = state.ko[comp];
  let pairs: [string, string][];
  if (round > 0) {
    pairs = randomPairs(roundWinners(rounds[round - 1]), rng);
  } else if (comp === 'super') {
    const w = state.world;
    const topFiller = w.leagueIds.find((id) => id !== USER_ID && !w.rivalIds.includes(id))!;
    pairs = randomPairs([USER_ID, ...w.rivalIds, topFiller], rng);
  } else if (comp === 'cup') {
    pairs = randomPairs([...state.world.leagueIds, ...state.world.cupLowerIds], rng);
  } else if (comp === 'euro') {
    const winners: { id: string; g: string }[] = [];
    const runners: { id: string; g: string }[] = [];
    for (const g of state.euroGroups) {
      const t = sortTable(g.table);
      winners.push({ id: t[0].teamId, g: g.name });
      runners.push({ id: t[1].teamId, g: g.name });
    }
    let shuffled = rng.shuffle(runners);
    for (let i = 0; i < 100 && shuffled.some((r, j) => r.g === winners[j].g); i++) shuffled = rng.shuffle(runners);
    pairs = winners.map((w, j) => [shuffled[j].id, w.id]); // group winner hosts the 2nd leg
  } else {
    pairs = randomPairs([USER_ID, ...cwcEuropeans(state), ...state.world.worldIds], rng);
  }
  const r: KnockoutRound = { name, ties: makeTies(pairs, legs, prefix) };
  rounds.push(r);
  return r;
}

/** The three strongest European finishers (other than the user) qualify for the Club World Cup. */
function cwcEuropeans(state: SeasonState): string[] {
  const reach: Record<string, number> = {};
  state.ko.euro.forEach((round, i) => {
    for (const t of round.ties) {
      reach[t.a] = Math.max(reach[t.a] ?? 0, i + 1);
      reach[t.b] = Math.max(reach[t.b] ?? 0, i + 1);
      if (i === 3 && t.winnerId) reach[t.winnerId] = 5;
    }
  });
  return state.world.euroIds
    .filter((id) => id !== USER_ID)
    .sort((a, b) => (reach[b] ?? 0) - (reach[a] ?? 0) || state.world.teams[b].strength.overall - state.world.teams[a].strength.overall)
    .slice(0, 3);
}

function playKoDay(state: SeasonState, ctx: DayCtx, d: DayDesc) {
  const comp = d.comp as 'super' | 'cup' | 'euro' | 'cwc';
  setStatus(state, comp, 'active');
  const rounds = state.ko[comp];
  const round = rounds[d.round] ?? drawKoRound(state, comp, d.round, ctx.rng);
  const isFinal = round.name === 'Final';
  const neutral = isFinal || comp === 'cwc';
  round.ties.forEach((tie: Tie) => {
    const leg = d.leg ?? 1;
    if (tie.legs === 1) {
      const m = play(state, ctx, d, tie.a, tie.b, `${tie.id}`, { knockout: true, neutral, stage: { k: 'round', round: round.name } });
      tie.results.push(m.id);
      tie.winnerId = m.winnerId;
    } else if (leg === 1) {
      const m = play(state, ctx, d, tie.a, tie.b, `${tie.id}-1`, { stage: { k: 'leg', round: round.name, leg: 1 } });
      tie.results.push(m.id);
    } else {
      const [aggA, aggB] = tieAggregate(tie, state.results);
      const m = play(state, ctx, d, tie.b, tie.a, `${tie.id}-2`, {
        knockout: true,
        aggregate: { home: aggB, away: aggA },
        stage: { k: 'leg', round: round.name, leg: 2 },
      });
      tie.results.push(m.id);
      tie.winnerId = m.winnerId;
    }
    if (tie.winnerId && (tie.a === USER_ID || tie.b === USER_ID)) {
      const opp = tie.a === USER_ID ? tie.b : tie.a;
      if (tie.winnerId === USER_ID) {
        if (isFinal) setStatus(state, comp, 'won', { k: 'beatInFinal', opp }, ctx.fast);
      } else if (isFinal) {
        setStatus(state, comp, 'runnerUp', { k: 'lostFinal', opp }, ctx.fast);
      } else {
        setStatus(state, comp, 'eliminated', { k: 'knockedOut', opp, round: round.name }, ctx.fast);
      }
    }
  });
}

/** Simulate the next calendar day (mutates state). Returns true if the user played. */
export function advanceDay(state: SeasonState, fast = false): boolean {
  if (state.done || state.pendingDecision) return false;
  if (state.replay) applyReplay(state);
  else if (blockOnDecision(state)) return false;
  const d = state.calendar[state.day];
  const ctx: DayCtx = { rng: createRng(deriveSeed(state.matchSeed, `day:${state.day}`)), fast };
  // recovery + injury countdown
  for (const st of Object.values(state.players)) {
    st.fitness = Math.min(100, st.fitness + d.gap * FATIGUE.recoveryPerDay);
    if (st.injuredFor > 0) {
      st.injuredFor--;
      if (st.injuredFor === 0 && !fast) {
        const p = squadPlayers(state.world.teams[USER_ID]).find((p) => p.uid === st.uid);
        if (p) state.news.push({ day: state.day, kind: 'return', msg: { k: 'return', player: p.name } });
        st.injury = undefined;
      }
    }
  }
  const before = state.userMatches.length;
  if (d.kind === 'league') playLeagueDay(state, ctx, d);
  else if (d.kind === 'group') playGroupDay(state, ctx, d);
  else playKoDay(state, ctx, d);
  state.day++;
  if (state.day >= state.calendar.length) state.done = true;
  return state.userMatches.length > before;
}

/** Advance until the user has played one match (or the season ends). */
export function advanceToNextUserMatch(state: SeasonState): void {
  while (!state.done && !state.pendingDecision) {
    if (advanceDay(state)) return;
  }
}

export function simulateToEnd(state: SeasonState, fast = false): void {
  while (!state.done && !state.pendingDecision) advanceDay(state, fast);
}

// ---------------------------------------------------------------------------
// Summary helpers
// ---------------------------------------------------------------------------

export function trophies(state: SeasonState): CompId[] {
  return COMP_ORDER.filter((c) => state.status[c].status === 'won');
}

export interface UserRecord {
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  leagueWins: number;
  leagueLosses: number;
}

/** W/D/L for the user. Shoot-out results count as draws. */
export function userRecord(state: SeasonState): UserRecord {
  const r: UserRecord = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, leagueWins: 0, leagueLosses: 0 };
  for (const id of state.userMatches) {
    const m = state.results[id];
    const home = m.homeId === USER_ID;
    const gf = home ? m.hg : m.ag;
    const ga = home ? m.ag : m.hg;
    r.played++;
    r.gf += gf;
    r.ga += ga;
    if (gf > ga) {
      r.w++;
      if (m.comp === 'league') r.leagueWins++;
    } else if (gf < ga) {
      r.l++;
      if (m.comp === 'league') r.leagueLosses++;
    } else r.d++;
  }
  return r;
}

export function nextUserFixture(state: SeasonState): { day: DayDesc; oppId?: string; home?: boolean } | undefined {
  for (let i = state.day; i < state.calendar.length; i++) {
    const d = state.calendar[i];
    if (state.status[d.comp].status === 'eliminated' || state.status[d.comp].status === 'runnerUp') continue;
    if (d.kind === 'league') {
      const fx = state.league.rounds[d.round].find(([h, a]) => h === USER_ID || a === USER_ID);
      if (fx) return { day: d, oppId: fx[0] === USER_ID ? fx[1] : fx[0], home: fx[0] === USER_ID };
    } else if (d.kind === 'group') {
      const g = state.euroGroups.find((g) => g.teamIds.includes(USER_ID))!;
      const fx = g.rounds[d.round].find(([h, a]) => h === USER_ID || a === USER_ID);
      if (fx) return { day: d, oppId: fx[0] === USER_ID ? fx[1] : fx[0], home: fx[0] === USER_ID };
    } else {
      const comp = d.comp as 'super' | 'cup' | 'euro' | 'cwc';
      const round = state.ko[comp][d.round];
      if (state.status[comp].status === 'won') continue;
      if (!round) return { day: d };
      const tie = round.ties.find((t) => t.a === USER_ID || t.b === USER_ID);
      if (tie) {
        const leg = d.leg ?? 1;
        const home = tie.legs === 2 ? (leg === 1 ? tie.a === USER_ID : tie.b === USER_ID) : tie.a === USER_ID;
        return { day: d, oppId: tie.a === USER_ID ? tie.b : tie.a, home };
      }
    }
  }
  return undefined;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
