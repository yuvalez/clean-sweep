import { CLUBS } from '../data/clubs';
import { EURO_FILLER, LEAGUES, WORLD_FILLER } from '../data/leagues';
import { YOUTH_NAMES } from '../engine/draft';
import { FORMATIONS } from '../engine/formations';
import { createSeason, INJURIES, KO_NAMES, simulateToEnd } from '../engine/season';
import { aiDraft } from '../engine/draft';
import { buildPool } from '../engine/pool';
import { DIFFICULTIES } from '../engine/difficulty';
import { en } from './en';
import { he } from './he';
import { dayLabel, fmtMsg } from './index';

const allTeamNames = [
  'World XI',
  ...CLUBS.map((c) => c.name),
  ...Object.values(LEAGUES).flatMap((l) => [...l.filler.map((f) => f[0]), ...l.challengers.map((f) => f[0]), ...l.lower]),
  ...EURO_FILLER.map((f) => f[0]),
  ...WORLD_FILLER.map((f) => f[0]),
];

describe('Hebrew translation coverage', () => {
  it('has a Hebrew name for every team', () => {
    const missing = allTeamNames.filter((n) => !he.teams[n]);
    expect(missing).toEqual([]);
  });

  it('translates every knockout round, injury, formation blurb and academy name', () => {
    for (const r of Object.values(KO_NAMES).flat()) {
      expect(he.rounds[r], r).toBeTruthy();
      expect(en.rounds[r], r).toBeTruthy();
    }
    for (const k of INJURIES) {
      expect(he.injuries[k], k).toBeTruthy();
      expect(en.injuries[k], k).toBeTruthy();
    }
    for (const f of FORMATIONS) expect(he.formationBlurb[f.id], f.id).toBeTruthy();
    for (const n of YOUTH_NAMES) expect(he.youthNames[n], n).toBeTruthy();
  });

  it('renders every news item, note, stage and calendar day of a full season in both languages', () => {
    const pool = buildPool('club', 'barcelona', 'i18n');
    const squad = aiDraft(pool, '4-3-3', { budget: DIFFICULTIES.normal.budget, rerolls: 4, candidates: 4 }, 'i18n', 'smart');
    const s = createSeason(
      { mode: 'club', clubId: 'barcelona', country: 'ESP', difficulty: 'normal', seed: 'i18n', squad, teamName: 'Barcelona', teamShort: 'BAR', color: '#a50044', color2: '#004d98' },
      'balanced',
    );
    simulateToEnd(s);
    for (const t of [en, he]) {
      const texts = [
        ...s.news.map((n) => fmtMsg(t, s, n.msg)),
        ...Object.values(s.status).flatMap((st) => (st.note ? [fmtMsg(t, s, st.note)] : [])),
        ...Object.values(s.results).map((m) => fmtMsg(t, s, m.stage)),
        ...s.calendar.map((d) => dayLabel(t, s.setup.country, d)),
      ];
      expect(texts.length).toBeGreaterThan(100);
      for (const x of texts) expect(x).not.toMatch(/undefined|\[object/);
      if (t === he) {
        // Hebrew output must not leak English words (player names aside, which are Latin by design).
        const leaks = [...s.calendar.map((d) => dayLabel(t, s.setup.country, d)), ...Object.values(s.results).map((m) => fmtMsg(t, s, m.stage))]
          .filter((x) => /[A-Za-z]{3,}/.test(x));
        expect(leaks).toEqual([]);
      }
    }
  });
});

describe('decision text', () => {
  it('renders every dilemma option and decision news item in both languages', async () => {
    const { DILEMMA_OPTIONS, closeJanuary, resolveDecision } = await import('../engine/decisions');
    const pool = buildPool('club', 'real-madrid', 'dec-i18n');
    const squad = aiDraft(pool, '4-4-2', { budget: DIFFICULTIES.normal.budget, rerolls: 4, candidates: 4 }, 'dec-i18n', 'smart');
    const s = createSeason(
      { mode: 'club', clubId: 'real-madrid', country: 'ESP', difficulty: 'normal', seed: 'dec-i18n', squad, decisions: true, teamName: 'Real Madrid', teamShort: 'RMA', color: '#fff', color2: '#d4a72c' },
      'balanced',
    );
    while (!s.done) {
      simulateToEnd(s);
      const ev = s.decisions.find((e) => e.id === s.pendingDecision);
      if (!ev) continue;
      if (ev.type === 'january') closeJanuary(s);
      else resolveDecision(s, ev.id, DILEMMA_OPTIONS[ev.type][0]);
    }
    for (const t of [en, he]) {
      for (const [key, opts] of Object.entries(DILEMMA_OPTIONS)) {
        const d = t.dec[key as keyof typeof t.dec];
        const x = { a: 'A', b: 'B', amount: '€5M', n: 3, club: 'C' };
        expect(d.title && d.body(x)).toBeTruthy();
        for (const o of opts) expect(d.opts[o].label(x) && d.opts[o].effect(x)).toBeTruthy();
      }
      const lines = s.news.filter((n) => n.msg.k === 'decision').map((n) => fmtMsg(t, s, n.msg));
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) expect(l).not.toMatch(/undefined|\?/);
    }
  });
});
