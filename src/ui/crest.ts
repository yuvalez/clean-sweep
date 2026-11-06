/**
 * Original, procedurally drawn club crests.
 *
 * These evoke each club through its colours and a simple heraldic pattern; they are
 * deliberately not copies of any real crest (real crests are trademarks).
 * Pure functions only, so the specs are unit-testable.
 */
import { CLUBS } from '../data/clubs';
import { hashString } from '../engine/rng';

export type CrestShape = 'shield' | 'round' | 'spanish' | 'pointed' | 'octagon';
export type CrestPattern =
  | 'solid' | 'vstripes' | 'hoops' | 'halves' | 'quarters' | 'sash' | 'chevron' | 'chief' | 'band' | 'cross' | 'lozenges';

export interface CrestSpec {
  shape: CrestShape;
  pattern: CrestPattern;
  c1: string; // field
  c2: string; // pattern
  trim: string; // outline
  ring?: string; // thick inner ring (round crests)
  text: string; // monogram
}

/** Hand-made specs for the 14 legends clubs: their colours and a characteristic motif. */
const CLUB_CRESTS: Record<string, Omit<CrestSpec, 'text'>> = {
  barcelona: { shape: 'spanish', pattern: 'vstripes', c1: '#a50044', c2: '#004d98', trim: '#edbb00' },
  'real-madrid': { shape: 'round', pattern: 'sash', c1: '#f4f4f4', c2: '#3d3f8f', trim: '#d4a72c', ring: '#d4a72c' },
  atletico: { shape: 'spanish', pattern: 'vstripes', c1: '#cb3524', c2: '#f4f4f4', trim: '#272e61' },
  'man-united': { shape: 'shield', pattern: 'chief', c1: '#da291c', c2: '#fbe122', trim: '#111111' },
  liverpool: { shape: 'pointed', pattern: 'solid', c1: '#c8102e', c2: '#f6eb61', trim: '#00b2a9' },
  arsenal: { shape: 'pointed', pattern: 'chief', c1: '#ef0107', c2: '#063672', trim: '#d4a72c' },
  chelsea: { shape: 'round', pattern: 'solid', c1: '#034694', c2: '#f4f4f4', trim: '#d4a72c', ring: '#f4f4f4' },
  'man-city': { shape: 'round', pattern: 'solid', c1: '#6cabdd', c2: '#1c2c5b', trim: '#1c2c5b', ring: '#1c2c5b' },
  bayern: { shape: 'round', pattern: 'lozenges', c1: '#0066b2', c2: '#f4f4f4', trim: '#dc052d', ring: '#dc052d' },
  dortmund: { shape: 'round', pattern: 'solid', c1: '#fde100', c2: '#121212', trim: '#121212', ring: '#121212' },
  juventus: { shape: 'pointed', pattern: 'vstripes', c1: '#121212', c2: '#f4f4f4', trim: '#d4a72c' },
  milan: { shape: 'spanish', pattern: 'vstripes', c1: '#fb090b', c2: '#121212', trim: '#f4f4f4' },
  inter: { shape: 'round', pattern: 'vstripes', c1: '#0068a8', c2: '#121212', trim: '#d4a72c', ring: '#d4a72c' },
  psg: { shape: 'round', pattern: 'band', c1: '#004170', c2: '#da291c', trim: '#da291c', ring: '#f4f4f4' },
};

const SHAPES: CrestShape[] = ['shield', 'round', 'spanish', 'pointed', 'octagon'];
const PATTERNS: CrestPattern[] = ['solid', 'vstripes', 'hoops', 'halves', 'quarters', 'sash', 'chevron', 'chief', 'band', 'cross'];

/** Relative luminance (0 = black, 1 = white) of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastPartner(c1: string, c2?: string): string {
  // Filler teams have a generic near-white second colour: make sure the pattern is visible.
  if (c2 && Math.abs(luminance(c1) - luminance(c2)) > 0.25) return c2;
  return luminance(c1) > 0.5 ? '#141414' : '#f4f4f4';
}

export function crestFor(team: { id?: string; name?: string; short: string; color: string; color2: string }): CrestSpec {
  const club = CLUBS.find((c) => c.id === team.id || c.name === team.name);
  const text = (team.short || '?').slice(0, 3).toUpperCase();
  if (club && CLUB_CRESTS[club.id]) return { ...CLUB_CRESTS[club.id], text: club.short };
  const h = hashString(team.id ?? team.name ?? team.short);
  const c1 = team.color;
  const c2 = contrastPartner(c1, team.color2);
  const shape = SHAPES[h % SHAPES.length];
  const pattern = PATTERNS[(h >>> 3) % PATTERNS.length];
  const trim = luminance(c1) > 0.5 ? '#2a2a2a' : (h >>> 7) % 3 === 0 ? '#d4a72c' : '#f4f4f4';
  return { shape, pattern, c1, c2, trim, ring: shape === 'round' && (h >>> 9) % 2 === 0 ? c2 : undefined, text };
}

/** SVG path of the crest outline in a 100×100 box. */
export const SHAPE_PATH: Record<CrestShape, string> = {
  shield: 'M10 8 H90 V46 C90 72 72 88 50 96 C28 88 10 72 10 46 Z',
  round: 'M50 4 A46 46 0 1 1 49.99 4 Z',
  spanish: 'M12 7 H88 V56 A38 38 0 0 1 12 56 Z',
  pointed: 'M10 12 Q50 2 90 12 V50 Q90 80 50 97 Q10 80 10 50 Z',
  octagon: 'M31 5 H69 L95 31 V69 L69 95 H31 L5 69 V31 Z',
};

/** Pattern geometry (drawn in c2 over a c1 field), as SVG polygon point lists or rects. */
export function patternShapes(p: CrestPattern): { rects: [number, number, number, number][]; polys: string[] } {
  const rects: [number, number, number, number][] = [];
  const polys: string[] = [];
  switch (p) {
    case 'vstripes':
      for (let x = 100 / 7; x < 100; x += 200 / 7) rects.push([x, 0, 100 / 7, 100]);
      break;
    case 'hoops':
      for (let y = 10; y < 100; y += 20) rects.push([0, y, 100, 10]);
      break;
    case 'halves':
      rects.push([50, 0, 50, 100]);
      break;
    case 'quarters':
      rects.push([50, 0, 50, 50], [0, 50, 50, 50]);
      break;
    case 'sash':
      polys.push('0,82 18,100 100,18 82,0');
      break;
    case 'chevron':
      polys.push('0,34 50,66 100,34 100,52 50,84 0,52');
      break;
    case 'chief':
      rects.push([0, 0, 100, 30]);
      break;
    case 'band':
      rects.push([37, 0, 26, 100]);
      break;
    case 'cross':
      rects.push([41, 0, 18, 100], [0, 40, 100, 18]);
      break;
    case 'lozenges':
      for (let r = 0; r <= 7; r++) {
        for (let c = 0; c <= 7; c++) {
          if ((r + c) % 2) continue;
          const x = c * 14;
          const y = r * 14;
          polys.push(`${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`);
        }
      }
      break;
    case 'solid':
      break;
  }
  return { rects, polys };
}

/** Monogram colours that stay readable on the crest's main colour. */
export function monogramColors(spec: CrestSpec): { fill: string; stroke: string } {
  const centre = spec.pattern === 'band' || spec.pattern === 'cross' ? spec.c2 : spec.c1;
  return luminance(centre) > 0.45 ? { fill: '#111111', stroke: 'rgba(255,255,255,0.75)' } : { fill: '#ffffff', stroke: 'rgba(0,0,0,0.6)' };
}
