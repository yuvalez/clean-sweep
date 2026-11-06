import type { BenchRole, Formation, Pos, Slot } from './types';

const s = (id: string, pos: Pos, x: number, y: number): Slot => ({ id, kind: 'xi', pos, x, y });

export const FORMATIONS: Formation[] = [
  {
    id: '4-3-3',
    name: '4-3-3',
    attMod: 0.6,
    defMod: 0,
    blurb: 'Wingers stretch the pitch. Balanced with an attacking edge.',
    slots: [
      s('gk', 'GK', 50, 6),
      s('lb', 'LB', 14, 26), s('lcb', 'CB', 37, 22), s('rcb', 'CB', 63, 22), s('rb', 'RB', 86, 26),
      s('lcm', 'CM', 28, 50), s('cdm', 'CDM', 50, 42), s('rcm', 'CM', 72, 50),
      s('lw', 'LW', 16, 76), s('st', 'ST', 50, 84), s('rw', 'RW', 84, 76),
    ],
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    attMod: 0.3,
    defMod: 0.3,
    blurb: 'Two strikers, two banks of four. Solid and direct.',
    slots: [
      s('gk', 'GK', 50, 6),
      s('lb', 'LB', 14, 26), s('lcb', 'CB', 37, 22), s('rcb', 'CB', 63, 22), s('rb', 'RB', 86, 26),
      s('lm', 'LM', 14, 54), s('lcm', 'CM', 38, 48), s('rcm', 'CM', 62, 48), s('rm', 'RM', 86, 54),
      s('lst', 'ST', 38, 82), s('rst', 'ST', 62, 82),
    ],
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    attMod: 0.2,
    defMod: 0.6,
    blurb: 'Double pivot shields the back four. Control first.',
    slots: [
      s('gk', 'GK', 50, 6),
      s('lb', 'LB', 14, 26), s('lcb', 'CB', 37, 22), s('rcb', 'CB', 63, 22), s('rb', 'RB', 86, 26),
      s('ldm', 'CDM', 38, 42), s('rdm', 'CDM', 62, 42),
      s('lw', 'LW', 16, 66), s('cam', 'CAM', 50, 64), s('rw', 'RW', 84, 66),
      s('st', 'ST', 50, 86),
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    attMod: 0.4,
    defMod: 0.2,
    blurb: 'Wing-backs and a packed midfield. Win the middle.',
    slots: [
      s('gk', 'GK', 50, 6),
      s('lcb', 'CB', 28, 22), s('cb', 'CB', 50, 20), s('rcb', 'CB', 72, 22),
      s('lwb', 'LWB', 10, 48), s('lcm', 'CM', 34, 50), s('cdm', 'CDM', 50, 40), s('rcm', 'CM', 66, 50), s('rwb', 'RWB', 90, 48),
      s('lst', 'ST', 38, 82), s('rst', 'ST', 62, 82),
    ],
  },
  {
    id: '3-4-3',
    name: '3-4-3',
    attMod: 1.2,
    defMod: -0.6,
    blurb: 'All-out attack. Three forwards, three at the back.',
    slots: [
      s('gk', 'GK', 50, 6),
      s('lcb', 'CB', 28, 22), s('cb', 'CB', 50, 20), s('rcb', 'CB', 72, 22),
      s('lm', 'LM', 12, 52), s('lcm', 'CM', 38, 46), s('rcm', 'CM', 62, 46), s('rm', 'RM', 88, 52),
      s('lw', 'LW', 18, 78), s('st', 'ST', 50, 86), s('rw', 'RW', 82, 78),
    ],
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    attMod: -0.6,
    defMod: 1.2,
    blurb: 'Park the bus, hit on the break. Hard to beat.',
    slots: [
      s('gk', 'GK', 50, 6),
      s('lwb', 'LWB', 10, 32), s('lcb', 'CB', 30, 22), s('cb', 'CB', 50, 20), s('rcb', 'CB', 70, 22), s('rwb', 'RWB', 90, 32),
      s('lcm', 'CM', 30, 52), s('cdm', 'CDM', 50, 46), s('rcm', 'CM', 70, 52),
      s('lst', 'ST', 38, 82), s('rst', 'ST', 62, 82),
    ],
  },
];

const BENCH_ROLES: BenchRole[] = ['GK', 'DEF', 'MID', 'ATT', 'ANY'];
export const BENCH_SLOTS: Slot[] = BENCH_ROLES.map((role, i) => ({
  id: `sub${i + 1}`,
  kind: 'bench',
  role,
  x: 10 + i * 20,
  y: 0,
}));

export function getFormation(id: string): Formation {
  const f = FORMATIONS.find((f) => f.id === id);
  if (!f) throw new Error(`Unknown formation ${id}`);
  return f;
}

export function allSlots(formationId: string): Slot[] {
  return [...getFormation(formationId).slots, ...BENCH_SLOTS];
}
