import { DIFFICULTIES, DIFFICULTY_ORDER } from './difficulty';
import { aiDraft, canAfford, createDraft, emptySlots, isComplete, pick, remaining, reroll, spin } from './draft';
import {
  assignToFormation, changeFormation, closeJanuary, DILEMMA_OPTIONS, januaryBudget, januaryCanSign, januaryScout, januarySign,
  optionAvailable, resolveDecision, setMentality,
} from './decisions';
import { FORMATIONS, getFormation } from './formations';
import { oddsRun } from './odds';
import { positionFit, slotFit } from './positions';
import { buildPool, latestSeason } from './pool';
import { createRng } from './rng';
import { CLUBS } from '../data/clubs';
import { createSeason, simulateToEnd, trophies, userRecord } from './season';
import { sortTable } from './competitions/league';
import type { SeasonSetup } from './opponents';

function playRandomDraft(seed: string, clubId: string | undefined, formationId: string, diff = DIFFICULTY_ORDER[0]) {
  const cfg = DIFFICULTIES[diff];
  const pool = buildPool(clubId ? 'club' : 'global', clubId, seed);
  const rng = createRng(seed);
  let st = createDraft(formationId, cfg, seed);
  while (!isComplete(st)) {
    const slot = rng.pick(emptySlots(st));
    st = spin(st, pool, slot.id);
    if (st.rerollsLeft > 0 && rng.chance(0.3)) st = reroll(st, pool);
    const affordable = st.candidates!.filter((c) => canAfford(st, c));
    expect(affordable.length, 'at least one affordable candidate').toBeGreaterThan(0);
    // greedy: most expensive affordable to stress the budget
    const choice = affordable.sort((a, b) => b.price - a.price)[0];
    st = pick(st, choice.uid);
    expect(remaining(st)).toBeGreaterThanOrEqual(-1e-9);
  }
  return st;
}

describe('draft', () => {
  it('never softlocks or overspends, across clubs, formations and difficulties', () => {
    let n = 0;
    for (const diff of DIFFICULTY_ORDER) {
      for (const f of FORMATIONS) {
        const club = CLUBS[n % CLUBS.length].id;
        playRandomDraft(`t${n}`, n % 5 === 0 ? undefined : club, f.id, diff);
        n++;
      }
    }
  });

  it('never offers the same player twice in one squad', () => {
    const st = playRandomDraft('dupes', 'barcelona', '4-3-3');
    const ids = Object.values(st.picks).map((p) => p!.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('AI drafts complete within budget', () => {
    const pool = buildPool('club', 'real-madrid', 'ai');
    const sq = aiDraft(pool, '4-4-2', DIFFICULTIES.normal, 'ai');
    const total = Object.values(sq.picks).reduce((a, p) => a + p!.price, 0);
    expect(Object.keys(sq.picks).length).toBe(16);
    expect(total).toBeLessThanOrEqual(DIFFICULTIES.normal.budget);
  });
});

function setupFor(seed: string): SeasonSetup {
  const pool = buildPool('club', 'barcelona', seed);
  const squad = aiDraft(pool, '4-3-3', DIFFICULTIES.normal, seed);
  return {
    mode: 'club', clubId: 'barcelona', country: 'ESP', difficulty: 'normal', seed, squad,
    teamName: 'Barcelona', teamShort: 'BAR', color: '#a50044', color2: '#004d98',
  };
}

describe('season', () => {
  it('is deterministic for a given seed', () => {
    const a = createSeason(setupFor('det'), 'balanced');
    const b = createSeason(setupFor('det'), 'balanced');
    simulateToEnd(a);
    simulateToEnd(b);
    expect(a.userMatches).toEqual(b.userMatches);
    expect(a.results).toEqual(b.results);
  });

  it('keeps league and knockout invariants', () => {
    const s = createSeason(setupFor('inv'), 'rotate');
    simulateToEnd(s);
    const rows = sortTable(s.league.table);
    expect(rows).toHaveLength(20);
    for (const r of rows) {
      expect(r.p).toBe(38);
      expect(r.w + r.d + r.l).toBe(38);
      expect(r.pts).toBe(r.w * 3 + r.d);
    }
    expect(rows.reduce((a, r) => a + r.gf - r.ga, 0)).toBe(0);
    expect(rows.reduce((a, r) => a + r.w, 0)).toBe(rows.reduce((a, r) => a + r.l, 0));
    for (const comp of ['super', 'cup', 'euro', 'cwc'] as const) {
      const rounds = s.ko[comp];
      expect(rounds.at(-1)!.name).toBe('Final');
      expect(rounds.at(-1)!.ties).toHaveLength(1);
      for (const r of rounds) for (const t of r.ties) expect([t.a, t.b]).toContain(t.winnerId);
    }
    expect(s.ko.cup[0].ties).toHaveLength(16);
    expect(s.ko.euro[0].ties).toHaveLength(8);
    for (const st of Object.values(s.status)) expect(['won', 'eliminated', 'runnerUp']).toContain(st.status);
    const rec = userRecord(s);
    expect(rec.played).toBe(s.userMatches.length);
    expect(trophies(s).length).toBeLessThanOrEqual(5);
  });
});

/** Play a season with decisions on, resolving each one with `choose` (index into the options). */
function playWithDecisions(seed: string, choose: (opts: string[]) => string) {
  const s = createSeason({ ...setupFor(seed), decisions: true }, 'balanced');
  const seen: string[] = [];
  let guard = 0;
  while (!s.done && guard++ < 200) {
    simulateToEnd(s);
    if (!s.pendingDecision) continue;
    const ev = s.decisions.find((e) => e.id === s.pendingDecision)!;
    seen.push(ev.type);
    if (ev.type === 'january') {
      const squad = s.world.teams.user.squad!;
      // replace the two lowest-rated players with the best affordable scouted option
      const worst = Object.entries(squad.picks).sort((a, b) => a[1]!.rating - b[1]!.rating).slice(0, 3);
      for (const [slotId] of worst) {
        if (!januaryCanSign(ev, slotId)) continue;
        const opts = januaryScout(s, slotId).filter((p) => p.price <= januaryBudget(s, slotId));
        expect(opts.length, 'January always offers an affordable player').toBeGreaterThan(0);
        januarySign(s, slotId, opts.sort((a, b) => b.rating - a.rating)[0].uid);
        expect(s.bank).toBeGreaterThanOrEqual(-1e-9);
      }
      closeJanuary(s);
    } else {
      const opts = DILEMMA_OPTIONS[ev.type].filter((o) => optionAvailable(s, ev, o));
      resolveDecision(s, ev.id, choose(opts));
    }
  }
  return { s, seen };
}

describe('mid-season decisions', () => {
  it('pauses for each decision, then completes the season', () => {
    const { s, seen } = playWithDecisions('dec1', (o) => o[0]);
    expect(s.done).toBe(true);
    expect(seen).toContain('january');
    expect(seen).toContain('winterBreak');
    expect(s.decisions.every((e) => e.status === 'done' || e.status === 'skipped')).toBe(true);
    expect(s.bank).toBeGreaterThanOrEqual(0);
    const squad = s.world.teams.user.squad!;
    expect(Object.values(squad.picks).filter(Boolean)).toHaveLength(16);
    const ids = Object.values(squad.picks).map((p) => p!.id);
    expect(new Set(ids).size).toBe(16);
    for (const p of Object.values(squad.picks)) expect(s.players[p!.uid]).toBeDefined();
    // the original draft is untouched (odds replay starts from it)
    expect(s.setup.squad.picks).not.toEqual(squad.picks);
  });

  it('does not pause when decisions are off', () => {
    const s = createSeason(setupFor('dec-off'), 'balanced');
    simulateToEnd(s);
    expect(s.done).toBe(true);
    expect(s.decisions).toHaveLength(0);
  });

  it('is deterministic and replays into the odds', () => {
    const a = playWithDecisions('dec2', (o) => o[o.length - 1]).s;
    const b = playWithDecisions('dec2', (o) => o[o.length - 1]).s;
    expect(a.results).toEqual(b.results);
    expect(a.world.teams.user.squad).toEqual(b.world.teams.user.squad);
    const r1 = oddsRun(a, 1);
    const r2 = oddsRun(a, 1);
    expect(r1).toEqual(r2);
  });

  it('reassigns the XI sensibly when the formation changes', () => {
    const s = createSeason({ ...setupFor('tac'), decisions: true }, 'balanced');
    const before = Object.values(s.world.teams.user.squad!.picks).map((p) => p!.uid).sort();
    const gk = s.world.teams.user.squad!.picks.gk!;
    changeFormation(s, '3-5-2');
    setMentality(s, 'attacking');
    const sq = s.world.teams.user.squad!;
    expect(sq.formationId).toBe('3-5-2');
    expect(sq.picks.gk!.uid).toBe(gk.uid);
    expect(Object.values(sq.picks).map((p) => p!.uid).sort()).toEqual(before);
    expect(s.tacticsLog).toEqual([{ day: 0, formationId: '3-5-2' }, { day: 0, mentality: 'attacking' }]);
    // the chosen XI is stable: re-assigning the same players changes nothing
    const players = getFormation('3-5-2').slots.map((slot) => sq.picks[slot.id]!);
    expect(assignToFormation(players, '3-5-2').picks).toEqual(Object.fromEntries(getFormation('3-5-2').slots.map((x) => [x.id, sq.picks[x.id]])));
    // and no bench player would be a better fit for any starting slot
    for (const slot of getFormation('3-5-2').slots) {
      for (const b of ['sub2', 'sub3', 'sub4', 'sub5']) {
        const bp = sq.picks[b]!;
        const cur = sq.picks[slot.id]!;
        expect(bp.rating + slotFit(bp, slot)).toBeLessThanOrEqual(cur.rating + slotFit(cur, slot) + 1e-9);
      }
    }
  });
});

describe('active-players era', () => {
  it('pools only current players, rated at their current club', () => {
    const pool = buildPool('global', undefined, 'act', 'active');
    const y = latestSeason();
    expect(pool.length).toBeGreaterThan(150);
    expect(new Set(pool.map((p) => p.id)).size).toBe(pool.length);
    for (const p of pool) expect(p.to).toBe(y);
  });

  it('has real depth at every position of every formation', () => {
    const pool = buildPool('global', undefined, 'act', 'active');
    for (const f of FORMATIONS) {
      for (const slot of f.slots) {
        const elig = pool.filter((p) => positionFit(p.pos, slot.pos!) >= -4);
        expect(elig.length, `${f.id} ${slot.pos}`).toBeGreaterThanOrEqual(6);
        expect(elig.some((p) => p.rating >= 85), `${f.id} ${slot.pos} star`).toBe(true);
      }
    }
  });

  it('never softlocks a draft on the active budget', () => {
    for (const diff of DIFFICULTY_ORDER) {
      for (const f of FORMATIONS) {
        const cfg = { ...DIFFICULTIES[diff], budget: DIFFICULTIES[diff].activeBudget };
        const pool = buildPool('global', undefined, `a-${diff}-${f.id}`, 'active');
        const sq = aiDraft(pool, f.id, cfg, `a-${diff}-${f.id}`, 'naive');
        expect(Object.values(sq.picks).filter(Boolean)).toHaveLength(16);
        expect(Object.values(sq.picks).reduce((a, p) => a + p!.price, 0)).toBeLessThanOrEqual(cfg.budget + 1e-9);
      }
    }
  });

  it('makes the big clubs field their current squads', () => {
    const pool = buildPool('global', undefined, 'act-season', 'active');
    const squad = aiDraft(pool, '4-3-3', DIFFICULTIES.normal, 'act-season', 'smart');
    const s = createSeason(
      { mode: 'global', era: 'active', country: 'ENG', difficulty: 'normal', seed: 'act-season', squad, teamName: 'World XI', teamShort: 'WXI', color: '#34d399', color2: '#0f172a' },
      'balanced',
    );
    const clubs = CLUBS.map((c) => s.world.teams[c.id]);
    const y = latestSeason();
    for (const t of clubs) {
      expect(t.kind).toBe('current');
      const real = Object.values(t.squad!.picks).filter((p) => p!.club !== 'academy');
      expect(real.length).toBeGreaterThanOrEqual(10);
      for (const p of real) expect(p!.to).toBe(y);
      expect(new Set(Object.values(t.squad!.picks).map((p) => p!.uid)).size).toBe(16);
    }
    simulateToEnd(s);
    expect(s.done).toBe(true);
  });
});
