import { CLUBS } from './clubs';
import { allStints, stintsForClub } from './players';
import { ALL_POS, LINE_OF, positionFit } from '../engine/positions';
import { FORMATIONS } from '../engine/formations';

describe('player dataset', () => {
  it('parses every line into a valid stint', () => {
    for (const s of allStints()) {
      expect(s.name, JSON.stringify(s)).toBeTruthy();
      expect(s.nation, s.name).toMatch(/^[A-Z]{3}$/);
      expect(s.rating, s.name).toBeGreaterThanOrEqual(55);
      expect(s.rating, s.name).toBeLessThanOrEqual(99);
      expect(s.from, s.name).toBeGreaterThan(1890);
      expect(s.to, s.name).toBeGreaterThanOrEqual(s.from);
      expect(s.to, s.name).toBeLessThanOrEqual(2026);
      for (const p of s.pos) expect(ALL_POS, `${s.name} ${p}`).toContain(p);
    }
  });

  it.each(CLUBS.map((c) => c.id))('%s has no duplicate players and enough depth', (club) => {
    const st = stintsForClub(club);
    const ids = st.map((s) => s.id);
    expect(new Set(ids).size, `duplicates: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`).toBe(ids.length);
    const lines = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    for (const s of st) lines[LINE_OF[s.pos[0]]]++;
    expect(lines.GK).toBeGreaterThanOrEqual(6);
    expect(lines.DEF).toBeGreaterThanOrEqual(18);
    expect(lines.MID).toBeGreaterThanOrEqual(18);
    expect(lines.ATT).toBeGreaterThanOrEqual(14);
    // every XI position in every formation has at least 3 offerable players, incl. a star and a cheap one
    const positions = new Set(FORMATIONS.flatMap((f) => f.slots.map((s) => s.pos!)));
    for (const pos of positions) {
      const elig = st.filter((s) => positionFit(s.pos, pos) >= -4);
      expect(elig.length, `${club} ${pos}`).toBeGreaterThanOrEqual(4);
      expect(elig.some((s) => s.rating >= 83), `${club} ${pos} star`).toBe(true);
      expect(elig.some((s) => s.rating <= 80), `${club} ${pos} cheap`).toBe(true);
    }
  });
});
