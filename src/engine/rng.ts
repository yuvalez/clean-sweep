/** Seeded PRNG (mulberry32) and helpers. All game randomness flows through an Rng. */
export interface Rng {
  next(): number; // [0,1)
  int(min: number, maxInclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  weighted<T>(arr: readonly T[], weight: (t: T) => number): T;
  shuffle<T>(arr: readonly T[]): T[];
  normal(mean?: number, sd?: number): number;
  poisson(lambda: number): number;
  chance(p: number): boolean;
  /** Current internal state (for persistence). */
  state(): number;
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => {
      if (arr.length === 0) throw new Error('pick from empty array');
      return arr[Math.floor(next() * arr.length)];
    },
    weighted: (arr, weight) => {
      if (arr.length === 0) throw new Error('weighted pick from empty array');
      let total = 0;
      for (const t of arr) total += Math.max(0, weight(t));
      if (total <= 0) return arr[Math.floor(next() * arr.length)];
      let r = next() * total;
      for (const t of arr) {
        r -= Math.max(0, weight(t));
        if (r <= 0) return t;
      }
      return arr[arr.length - 1];
    },
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    normal: (mean = 0, sd = 1) => {
      const u = 1 - next();
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    poisson: (lambda) => {
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= next();
      } while (p > L && k < 30);
      return k - 1;
    },
    chance: (p) => next() < p,
    state: () => a,
  };
  return rng;
}

/** Derive an independent child seed from a parent seed and a label. */
export function deriveSeed(seed: number | string, label: string): number {
  return hashString(`${seed}::${label}`);
}

export function dailySeed(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}
