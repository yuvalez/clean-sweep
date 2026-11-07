/**
 * Mid-season decisions: dilemmas, the January transfer window and tactical changes.
 *
 * The season pauses on a scheduled day until the user resolves the open decision.
 * Every choice is recorded on the event, so post-season odds can replay the same
 * decisions (see `applyReplay`).
 */
import { DIFFICULTIES } from './difficulty';
import { academyPlayer, rollCandidates, spent, type DraftState } from './draft';
import { allSlots, BENCH_SLOTS, getFormation } from './formations';
import { isClubSide, refreshUserStrength, USER_ID } from './opponents';
import { buildPool } from './pool';
import { assignToFormation, benchFrom } from './assign';
import { roundPrice } from './pricing';

export { assignToFormation } from './assign';
import { createRng, deriveSeed } from './rng';
import type { DayDesc, SeasonState } from './season';
import type {
  DecisionEvent, DilemmaKey, Difficulty, Era, Mentality, Modifier, Picks, Player, PlayerSeasonState, Signing, Slot, Squad,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MENTALITY: Record<Mentality, { att: number; def: number; fatigue: number }> = {
  defensive: { att: -2, def: 2.5, fatigue: 0.85 },
  balanced: { att: 0, def: 0, fatigue: 1 },
  attacking: { att: 2.5, def: -1.5, fatigue: 1.2 },
};

export const JANUARY = {
  maxSignings: 2,
  saleRate: 0.6,
  /** Board top-up added to unspent draft money to form the transfer kitty. */
  board: { easy: 60, normal: 45, hard: 35, legendary: 25 } as Record<Difficulty, number>,
};

export const WINTER = { tourIncome: 25, tourFitness: 25, campCost: 5, restFitness: 15 };

export const SEASON_LONG = 999;

/** Money arithmetic to 0.1 €M (no minimum, unlike player prices). */
const money = (x: number) => Math.round(x * 10) / 10;

/** The options each dilemma offers, in display order. */
export const DILEMMA_OPTIONS: Record<DilemmaKey, string[]> = {
  contract: ['pay', 'refuse'],
  rift: ['backA', 'backB', 'fineBoth'],
  rivalBid: ['accept', 'reject'],
  winterBreak: ['tour', 'camp', 'rest'],
  injuryRush: ['rush', 'wait'],
  teamTalk: ['fireUp', 'calm', 'rest'],
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function initialBank(squad: Squad, difficulty: Difficulty, era: Era = 'allTime'): number {
  const cfg = DIFFICULTIES[difficulty];
  const left = Math.max(0, (era === 'active' ? cfg.activeBudget : cfg.budget) - spent(squad.picks));
  return money(left + JANUARY.board[difficulty]);
}

export function scheduleDecisions(calendar: DayDesc[], seed: string): DecisionEvent[] {
  const rng = createRng(deriveSeed(seed, 'decisions'));
  const leagueDay = (round: number) => calendar.findIndex((d) => d.kind === 'league' && d.round === round);
  const euroR16 = calendar.findIndex((d) => d.comp === 'euro' && d.kind === 'ko' && d.round === 0 && d.leg === 1);
  const early = rng.pick<DilemmaKey>(['contract', 'rift', 'rivalBid']);
  const mid = rng.pick<DilemmaKey>((['contract', 'rift'] as DilemmaKey[]).filter((k) => k !== early));
  const ev = (id: string, day: number, type: DecisionEvent['type'], fallback?: DilemmaKey): DecisionEvent => ({
    id, day, type, fallback, status: 'scheduled',
  });
  return [
    ev('early', leagueDay(rng.int(5, 11)), early),
    ev('winter', leagueDay(19), 'winterBreak'),
    ev('january', leagueDay(19), 'january'),
    ev('mid', leagueDay(rng.int(24, 30)), 'injuryRush', mid),
    ev('europe', euroR16, 'teamTalk'),
  ].sort((a, b) => a.day - b.day);
}

// ---------------------------------------------------------------------------
// Squad helpers
// ---------------------------------------------------------------------------

function userSquad(state: SeasonState): Squad {
  return state.world.teams[USER_ID].squad!;
}

function xiEntries(state: SeasonState): { slot: Slot; p: Player }[] {
  const sq = userSquad(state);
  return getFormation(sq.formationId).slots.map((slot) => ({ slot, p: sq.picks[slot.id]! }));
}

function setSquad(state: SeasonState, squad: Squad): void {
  const team = state.world.teams[USER_ID];
  state.world.teams[USER_ID] = refreshUserStrength({ ...team, squad });
}

/** Swap the player in a slot (immutably, so `setup.squad` keeps the original draft). */
function replaceInSquad(state: SeasonState, slotId: string, player: Player): Player {
  const sq = userSquad(state);
  const out = sq.picks[slotId]!;
  setSquad(state, { ...sq, picks: { ...sq.picks, [slotId]: player } });
  state.departed.push(out);
  if (!state.players[player.uid]) {
    state.players[player.uid] = { uid: player.uid, fitness: 100, injuredFor: 0, apps: 0, goals: 0, assists: 0 };
  }
  return out;
}

function everyone(state: SeasonState): PlayerSeasonState[] {
  return Object.values(userSquad(state).picks).map((p) => state.players[p!.uid]).filter(Boolean);
}

export function saleValue(p: Player): number {
  return p.club === 'academy' ? 0.5 : roundPrice(p.price * JANUARY.saleRate);
}

// ---------------------------------------------------------------------------
// Modifiers (used by the match day code)
// ---------------------------------------------------------------------------

export function ratingMod(state: SeasonState, uid: string): number {
  return state.mods.reduce((sum, m) => sum + (m.uid === uid ? (m.rating ?? 0) : 0), 0);
}

export function teamMods(state: SeasonState): { att: number; def: number } {
  const mt = MENTALITY[state.mentality];
  let att = mt.att;
  let def = mt.def;
  for (const m of state.mods) {
    if (m.uid) continue;
    att += m.att ?? 0;
    def += m.def ?? 0;
  }
  return { att, def };
}

export function injuryMult(state: SeasonState, uid: string): number {
  return state.mods.reduce((x, m) => (m.injuryMult && (!m.uid || m.uid === uid) ? x * m.injuryMult : x), 1);
}

export function tickMods(state: SeasonState): void {
  for (const m of state.mods) m.matches--;
  state.mods = state.mods.filter((m) => m.matches > 0);
}

// ---------------------------------------------------------------------------
// Opening a decision
// ---------------------------------------------------------------------------

function open(state: SeasonState, ev: DecisionEvent): void {
  const rng = createRng(deriveSeed(state.matchSeed, `decision:${ev.id}`));
  const xi = xiEntries(state).filter(({ p }) => state.players[p.uid]);
  const fit = xi.filter(({ p }) => state.players[p.uid].injuredFor === 0);
  const skip = () => {
    if (ev.fallback) {
      ev.type = ev.fallback;
      ev.fallback = undefined;
      open(state, ev);
    } else ev.status = 'skipped';
  };
  ev.status = 'open';
  switch (ev.type) {
    case 'contract': {
      const star = [...fit].sort((a, b) => b.p.rating - a.p.rating)[0];
      if (!star) return skip();
      ev.ctx = { a: star.p.uid, amount: Math.min(40, Math.max(5, Math.round(star.p.price * 0.2))) };
      return;
    }
    case 'rift': {
      const top = [...fit].filter(({ slot }) => slot.pos !== 'GK').sort((a, b) => b.p.rating - a.p.rating).slice(0, 6);
      if (top.length < 2) return skip();
      const [a, b] = rng.shuffle(top);
      ev.ctx = { a: a.p.uid, b: b.p.uid };
      return;
    }
    case 'rivalBid': {
      const sq = userSquad(state);
      const bench = BENCH_SLOTS.map((slot) => ({ slot, p: sq.picks[slot.id]! })).filter(({ p }) => p.club !== 'academy');
      const target = bench.sort((a, b) => b.p.rating - a.p.rating)[0];
      if (!target) return skip();
      const bidders = state.world.euroIds.filter((id) => id !== USER_ID && isClubSide(state.world.teams[id]));
      ev.ctx = {
        a: target.p.uid,
        slotId: target.slot.id,
        amount: Math.round(target.p.price * 1.6 + 3),
        team: rng.pick(bidders.length ? bidders : state.world.euroIds.filter((id) => id !== USER_ID)),
      };
      return;
    }
    case 'injuryRush': {
      const hurt = xi.filter(({ p }) => state.players[p.uid].injuredFor >= 3).sort((a, b) => b.p.rating - a.p.rating)[0];
      if (!hurt) return skip();
      ev.ctx = { a: hurt.p.uid, n: state.players[hurt.p.uid].injuredFor };
      return;
    }
    case 'teamTalk': {
      const st = state.status.euro.status;
      if (st === 'eliminated' || st === 'runnerUp') return skip();
      return;
    }
    case 'winterBreak':
      return;
    case 'january':
      ev.scouted = {};
      ev.signings = [];
      return;
  }
}

/**
 * Called at the start of each day. Opens decisions scheduled for today; returns true
 * (and sets `pendingDecision`) if the user must decide before the day can be played.
 */
export function blockOnDecision(state: SeasonState): boolean {
  for (const ev of state.decisions) {
    if (ev.day !== state.day) continue;
    if (ev.status === 'scheduled') open(state, ev);
    if (ev.status === 'open') {
      state.pendingDecision = ev.id;
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Options and effects
// ---------------------------------------------------------------------------

export function optionAvailable(state: SeasonState, ev: DecisionEvent, opt: string): boolean {
  if (ev.type === 'contract' && opt === 'pay') return state.bank >= (ev.ctx?.amount ?? 0);
  if (ev.type === 'winterBreak' && opt === 'camp') return state.bank >= WINTER.campCost;
  return true;
}

function addMod(state: SeasonState, m: Modifier) {
  state.mods.push(m);
}

/** Apply a dilemma's effect. Used both live and when replaying for the odds. */
function applyChoice(state: SeasonState, ev: DecisionEvent, opt: string): void {
  const c = ev.ctx ?? {};
  switch (`${ev.type}:${opt}`) {
    case 'contract:pay':
      state.bank = money(state.bank - (c.amount ?? 0));
      addMod(state, { uid: c.a, rating: 2, matches: SEASON_LONG });
      break;
    case 'contract:refuse':
      addMod(state, { uid: c.a, rating: -4, matches: 8 });
      break;
    case 'rift:backA':
      addMod(state, { uid: c.b, rating: -3, matches: 10 });
      break;
    case 'rift:backB':
      addMod(state, { uid: c.a, rating: -3, matches: 10 });
      break;
    case 'rift:fineBoth':
      addMod(state, { uid: c.a, rating: -1, matches: 5 });
      addMod(state, { uid: c.b, rating: -1, matches: 5 });
      break;
    case 'rivalBid:accept': {
      const sq = userSquad(state);
      if (sq.picks[c.slotId!]?.uid !== c.a) break; // replay: squad differs
      const slot = BENCH_SLOTS.find((s) => s.id === c.slotId)!;
      replaceInSquad(state, slot.id, academyPlayer(slot, state.departed.length + 7));
      state.bank = money(state.bank + (c.amount ?? 0));
      break;
    }
    case 'rivalBid:reject':
      addMod(state, { uid: c.a, rating: -2, matches: 6 });
      break;
    case 'winterBreak:tour':
      state.bank = money(state.bank + WINTER.tourIncome);
      for (const st of everyone(state)) st.fitness = Math.max(30, st.fitness - WINTER.tourFitness);
      break;
    case 'winterBreak:camp':
      state.bank = money(state.bank - WINTER.campCost);
      for (const st of everyone(state)) st.fitness = 100;
      break;
    case 'winterBreak:rest':
      for (const st of everyone(state)) st.fitness = Math.min(100, st.fitness + WINTER.restFitness);
      break;
    case 'injuryRush:rush': {
      const st = state.players[c.a!];
      if (st && st.injuredFor > 0) {
        st.injuredFor = 0;
        st.injury = undefined;
        st.fitness = Math.min(st.fitness, 65);
        addMod(state, { uid: c.a, rating: -1, injuryMult: 3, matches: 6 });
      }
      break;
    }
    case 'teamTalk:fireUp':
      addMod(state, { att: 3, injuryMult: 1.5, matches: 2 });
      break;
    case 'teamTalk:calm':
      addMod(state, { def: 3, matches: 2 });
      break;
    case 'teamTalk:rest':
      for (const { p } of xiEntries(state)) {
        const st = state.players[p.uid];
        if (st) st.fitness = Math.min(100, st.fitness + 20);
      }
      break;
  }
}

function nameOf(state: SeasonState, uid?: string): string | undefined {
  if (!uid) return undefined;
  const all = [...Object.values(userSquad(state).picks), ...state.departed];
  return all.find((p) => p?.uid === uid)?.name;
}

/** Resolve the open dilemma with the chosen option. */
export function resolveDecision(state: SeasonState, id: string, opt: string): void {
  const ev = state.decisions.find((e) => e.id === id);
  if (!ev || ev.status !== 'open' || ev.type === 'january') throw new Error('no such open dilemma');
  if (!DILEMMA_OPTIONS[ev.type].includes(opt)) throw new Error(`bad option ${opt}`);
  if (!optionAvailable(state, ev, opt)) throw new Error('option not available');
  // Names are captured before the effect: a sold player leaves the squad.
  const a = nameOf(state, ev.ctx?.a);
  const b = nameOf(state, ev.ctx?.b);
  applyChoice(state, ev, opt);
  ev.choice = opt;
  ev.status = 'done';
  state.pendingDecision = undefined;
  state.news.push({ day: state.day, kind: 'info', msg: { k: 'decision', key: ev.type, opt, a, b } });
}

// ---------------------------------------------------------------------------
// January transfer window
// ---------------------------------------------------------------------------

const poolCache = new Map<string, Player[]>();
function poolOf(state: SeasonState): Player[] {
  const { mode, clubId, seed, era } = state.setup;
  const key = `${mode}|${clubId}|${seed}|${era}`;
  let p = poolCache.get(key);
  if (!p) {
    p = buildPool(mode, mode === 'club' ? clubId : undefined, seed, state.setup.era);
    poolCache.set(key, p);
  }
  return p;
}

function openJanuary(state: SeasonState): DecisionEvent {
  const ev = state.decisions.find((e) => e.id === state.pendingDecision);
  if (!ev || ev.type !== 'january') throw new Error('the transfer window is not open');
  return ev;
}

/** The most the user can pay for a replacement in this slot. */
export function januaryBudget(state: SeasonState, slotId: string): number {
  return money(state.bank + saleValue(userSquad(state).picks[slotId]!));
}

export function januaryCanSign(ev: DecisionEvent, slotId: string): boolean {
  const signings = ev.signings ?? [];
  return signings.length < JANUARY.maxSignings && !signings.some((s) => s.slotId === slotId);
}

/** Scout replacements for a slot (once per slot per window; deterministic). */
export function januaryScout(state: SeasonState, slotId: string): Player[] {
  const ev = openJanuary(state);
  if (ev.scouted![slotId]) return ev.scouted![slotId];
  if (!januaryCanSign(ev, slotId)) throw new Error('cannot sign for this slot');
  const sq = userSquad(state);
  const slot = allSlots(sq.formationId).find((s) => s.id === slotId)!;
  // Everyone already at (or sold by) the club is off the market.
  const picks: Picks = { ...sq.picks };
  const current = picks[slotId]!;
  delete picks[slotId];
  state.departed.forEach((p, i) => (picks[`departed${i}`] = p));
  picks.outgoing = current;
  const fake: DraftState = {
    formationId: sq.formationId,
    seed: state.matchSeed,
    budget: spent(picks) + januaryBudget(state, slotId),
    picks,
    rerollsLeft: 0,
    candidatesPerSpin: DIFFICULTIES[state.setup.difficulty].candidates,
    spinCount: 100 + Object.keys(ev.scouted!).length,
  };
  const rng = createRng(deriveSeed(state.matchSeed, `january:${slotId}`));
  const found = rollCandidates(poolOf(state), fake, slot, rng);
  ev.scouted![slotId] = found;
  return found;
}

function doSign(state: SeasonState, s: Signing): void {
  replaceInSquad(state, s.slotId, s.in);
  state.bank = money(state.bank + s.sale - s.in.price);
}

export function januarySign(state: SeasonState, slotId: string, uid: string): void {
  const ev = openJanuary(state);
  const p = ev.scouted?.[slotId]?.find((c) => c.uid === uid);
  if (!p) throw new Error('player was not scouted');
  if (!januaryCanSign(ev, slotId)) throw new Error('cannot sign for this slot');
  if (p.price > januaryBudget(state, slotId) + 1e-9) throw new Error('over budget');
  const out = userSquad(state).picks[slotId]!;
  const s: Signing = { slotId, out, in: p, sale: saleValue(out) };
  doSign(state, s);
  ev.signings!.push(s);
  state.news.push({ day: state.day, kind: 'info', msg: { k: 'signed', player: p.name, out: out.name, fee: p.price } });
}

export function closeJanuary(state: SeasonState): void {
  const ev = openJanuary(state);
  ev.status = 'done';
  ev.choice = 'close';
  state.pendingDecision = undefined;
}

// ---------------------------------------------------------------------------
// Tactics
// ---------------------------------------------------------------------------

function applyFormation(state: SeasonState, formationId: string): void {
  const sq = userSquad(state);
  if (sq.formationId === formationId) return;
  // The reserve keeper stays put; every other player can win a starting place.
  const keeperSlot = BENCH_SLOTS.find((s) => s.role === 'GK')!;
  const otherBench = BENCH_SLOTS.filter((s) => s !== keeperSlot);
  const xi = getFormation(sq.formationId).slots.map((s) => sq.picks[s.id]!);
  const { picks, unused } = assignToFormation([...xi, ...otherBench.map((s) => sq.picks[s.id]!)], formationId);
  const bench: Picks = { [keeperSlot.id]: sq.picks[keeperSlot.id], ...benchFrom(unused, otherBench) };
  setSquad(state, { formationId, picks: { ...picks, ...bench } });
}

export function setMentality(state: SeasonState, mentality: Mentality): void {
  if (state.mentality === mentality) return;
  state.mentality = mentality;
  state.tacticsLog.push({ day: state.day, mentality });
}

export function changeFormation(state: SeasonState, formationId: string): void {
  if (userSquad(state).formationId === formationId) return;
  applyFormation(state, formationId);
  state.tacticsLog.push({ day: state.day, formationId });
}

// ---------------------------------------------------------------------------
// Replay (post-season odds)
// ---------------------------------------------------------------------------

/** Apply the decisions and tactics the user made on this day of the real season. */
export function applyReplay(state: SeasonState): void {
  const r = state.replay!;
  for (const ev of r.decisions) {
    if (ev.day !== state.day || ev.status !== 'done') continue;
    if (ev.type === 'january') for (const s of ev.signings ?? []) {
      if (userSquad(state).picks[s.slotId]?.uid === s.out.uid) doSign(state, s);
    }
    else if (ev.choice) applyChoice(state, ev, ev.choice);
  }
  for (const t of r.tactics) {
    if (t.day !== state.day) continue;
    if (t.mentality) state.mentality = t.mentality;
    if (t.formationId) applyFormation(state, t.formationId);
  }
}
