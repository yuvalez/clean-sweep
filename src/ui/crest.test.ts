import { CLUBS } from '../data/clubs';
import { EURO_FILLER, LEAGUES, WORLD_FILLER } from '../data/leagues';
import { crestFor, luminance, monogramColors, patternShapes, SHAPE_PATH } from './crest';

const fillers = [
  ...Object.values(LEAGUES).flatMap((l) => [...l.filler, ...l.challengers].map((f) => ({ name: f[0], short: f[1], color: f[3] }))),
  ...Object.values(LEAGUES).flatMap((l) => l.lower.map((n) => ({ name: n, short: n.slice(0, 3).toUpperCase(), color: '#777777' }))),
  ...[...EURO_FILLER, ...WORLD_FILLER].map((f) => ({ name: f[0], short: f[1], color: f[3] })),
].map((f) => ({ ...f, id: f.name.toLowerCase(), color2: '#f4f4f4' }));

describe('crests', () => {
  it('gives every legends club its own hand-made crest with its short code', () => {
    const keys = new Set<string>();
    for (const c of CLUBS) {
      const spec = crestFor({ ...c });
      expect(spec.text).toBe(c.short);
      keys.add(JSON.stringify({ ...spec, text: '' }));
    }
    expect(keys.size).toBe(CLUBS.length); // no two clubs share a design
  });

  it('uses the club crest for the user team in club mode (matched by name)', () => {
    const club = CLUBS[0];
    expect(crestFor({ id: 'user', name: club.name, short: club.short, color: club.color, color2: club.color2 })).toEqual(crestFor(club));
  });

  it('draws a valid, visible crest for every other team', () => {
    for (const f of fillers) {
      const spec = crestFor(f);
      expect(SHAPE_PATH[spec.shape], f.name).toBeTruthy();
      expect(spec, f.name).toEqual(crestFor(f)); // deterministic
      if (spec.pattern !== 'solid') {
        expect(Math.abs(luminance(spec.c1) - luminance(spec.c2)), `${f.name} pattern contrast`).toBeGreaterThan(0.2);
        const { rects, polys } = patternShapes(spec.pattern);
        expect(rects.length + polys.length).toBeGreaterThan(0);
      }
      const m = monogramColors(spec);
      expect(['#111111', '#ffffff']).toContain(m.fill);
    }
  });
});
