import type { Pos, Stint } from '../../engine/types';
import arsenal from './arsenal';
import atletico from './atletico';
import barcelona from './barcelona';
import bayern from './bayern';
import chelsea from './chelsea';
import dortmund from './dortmund';
import inter from './inter';
import juventus from './juventus';
import liverpool from './liverpool';
import manCity from './man-city';
import manUnited from './man-united';
import milan from './milan';
import psg from './psg';
import realMadrid from './real-madrid';

const RAW: Record<string, string> = {
  barcelona, 'real-madrid': realMadrid, atletico, 'man-united': manUnited, liverpool, arsenal, chelsea,
  'man-city': manCity, bayern, dortmund, juventus, milan, inter, psg,
};

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/ø/g, 'o').replace(/ß/g, 'ss').replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseClub(club: string, raw: string): Stint[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, nation, years, pos, rating] = line.split('|');
      const [from, to] = years.split('-').map(Number);
      return {
        id: slugify(name),
        name,
        nation,
        club,
        from,
        to,
        pos: pos.split(' ') as Pos[],
        rating: Number(rating),
      };
    });
}

let cache: Stint[] | null = null;
export function allStints(): Stint[] {
  if (!cache) cache = Object.entries(RAW).flatMap(([club, raw]) => parseClub(club, raw));
  return cache;
}

export function stintsForClub(club: string): Stint[] {
  return allStints().filter((s) => s.club === club);
}
