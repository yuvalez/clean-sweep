import type { Country } from '../data/clubs';
import { formatPrice } from '../engine/pricing';
import { KO_NAMES, type DayDesc, type SeasonState } from '../engine/season';
import type { Msg, Slot } from '../engine/types';
import { useGame, type Lang } from '../store/gameStore';
import { en, type Dict } from './en';
import { he } from './he';

export { ltr } from './en';
export type { Dict, Lang };

export const DICTS: Record<Lang, Dict> = { en, he };

/** The dictionary for the current language (re-renders on language change). */
export function useT(): Dict {
  return DICTS[useGame((s) => s.lang)];
}

/** The dictionary for the current language, outside React. */
export function getT(): Dict {
  return DICTS[useGame.getState().lang];
}

/** First-strong isolate: keeps a Latin name from reordering the Hebrew sentence around it. */
export const iso = (s: string) => `\u2068${s}\u2069`;

export const teamName = (t: Dict, name: string) => t.teams[name] ?? name;
export const playerName = (t: Dict, name: string) => t.youthNames[name] ?? name;
export const roundName = (t: Dict, round: string) => t.rounds[round] ?? round;

export function slotName(t: Dict, slot: Slot): string {
  return slot.kind === 'xi' ? slot.pos! : t.benchLabel[slot.role!];
}

export function slotToken(t: Dict, slot: Slot): string {
  return slot.kind === 'xi' ? slot.pos! : t.benchToken[slot.role!];
}

/** Render an engine message in the current language. */
export function fmtMsg(t: Dict, s: SeasonState, m: Msg): string {
  const pn = (name?: string) => iso(playerName(t, name ?? '?'));
  const team = (id: string) => teamName(t, s.world.teams[id]?.name ?? id);
  const comp = (c: Parameters<Dict['comp']>[0]) => t.comp(c, s.setup.country);
  switch (m.k) {
    case 'matchday': return t.matchday(m.n);
    case 'groupMd': return t.groupMd(m.group, m.n);
    case 'round': return roundName(t, m.round);
    case 'leg': return `${roundName(t, m.round)}, ${t.leg(m.leg)}`;
    case 'clinched': return t.clinched(m.left);
    case 'points': return t.pointsNote(m.pts);
    case 'outOfReach': return t.outOfReach;
    case 'finished': return t.finished(m.pos);
    case 'groupOut': return t.groupOut(m.pos, m.group);
    case 'beatInFinal': return t.beatInFinal(team(m.opp));
    case 'lostFinal': return t.lostFinal(team(m.opp));
    case 'knockedOut': return t.knockedOut(team(m.opp), roundName(t, m.round));
    case 'injury': return t.injuryNews(pn(m.player), m.n, t.injuries[m.injury] ?? m.injury);
    case 'return': return t.returnNews(pn(m.player));
    case 'won': return t.wonNews(comp(m.comp), m.note && fmtMsg(t, s, m.note));
    case 'out': return t.outNews(comp(m.comp), m.note && fmtMsg(t, s, m.note));
    case 'signed': return t.signedNews(pn(m.player), pn(m.out), formatPrice(m.fee));
    case 'decision': {
      const d = t.dec[m.key];
      const args = { a: pn(m.a), b: pn(m.b), amount: '', n: 0, club: '' };
      return t.decisionNews(d.title, d.opts[m.opt]?.label(args) ?? m.opt);
    }
  }
}

/** "Spanish League · Matchday 4", "European Cup · Quarter-final, 1st leg" … */
export function dayLabel(t: Dict, country: Country, d: DayDesc): string {
  const comp = t.comp(d.comp, country);
  if (d.kind === 'league') return `${comp} · ${t.matchday(d.round + 1)}`;
  if (d.kind === 'group') return `${comp} · ${t.groupStage(d.round + 1)}`;
  const round = roundName(t, KO_NAMES[d.comp as keyof typeof KO_NAMES][d.round]);
  return `${comp} · ${round}${d.leg ? `, ${t.leg(d.leg)}` : ''}`;
}
