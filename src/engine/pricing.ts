import { createRng, deriveSeed } from './rng';
import type { Player, Stint } from './types';

export const MIN_PRICE = 1; // €M
const PRICE_BASE = 0.5;
const PRICE_GROWTH = 1.2;
const JITTER = 0.12;

export function basePrice(rating: number): number {
  return Math.max(MIN_PRICE, PRICE_BASE * Math.pow(PRICE_GROWTH, rating - 65));
}

/** Round to a "football-y" number: 1-dp under €10M, whole millions above. */
export function roundPrice(p: number): number {
  if (p < 10) return Math.max(MIN_PRICE, Math.round(p * 2) / 2);
  return Math.round(p);
}

export function pricePlayer(stint: Stint, runSeed: number | string): Player {
  const uid = `${stint.id}@${stint.club}`;
  const rng = createRng(deriveSeed(runSeed, `price:${uid}`));
  const jitter = (rng.next() * 2 - 1) * JITTER;
  const price = roundPrice(basePrice(stint.rating) * (1 + jitter));
  return { ...stint, uid, price, bargain: jitter < -0.07 && stint.rating >= 78 };
}

export function formatPrice(m: number): string {
  if (m >= 1000) return `€${(m / 1000).toFixed(2).replace(/0$/, '')}B`;
  if (m < 10 && m % 1 !== 0) return `€${m.toFixed(1)}M`;
  return `€${Math.round(m)}M`;
}
