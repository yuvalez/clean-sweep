import type { Difficulty } from './types';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  budget: number; // €M
  rerolls: number;
  candidates: number;
  rivalBudget: number; // €M for AI "Legends" sides
  fillerBoost: number; // rating points added to filler teams
  injuryMult: number;
  blurb: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy', label: 'Easy', budget: 600, rerolls: 6, candidates: 4, rivalBudget: 110,
    fillerBoost: -3, injuryMult: 0.7, blurb: 'Deep pockets, weaker rivals. Learn the ropes.',
  },
  normal: {
    id: 'normal', label: 'Normal', budget: 500, rerolls: 4, candidates: 4, rivalBudget: 160,
    fillerBoost: 0, injuryMult: 1.0, blurb: 'A fair fight. A clean sweep takes a smart draft.',
  },
  hard: {
    id: 'hard', label: 'Hard', budget: 430, rerolls: 2, candidates: 3, rivalBudget: 180,
    fillerBoost: 2, injuryMult: 1.2, blurb: 'Tight budget, stronger giants. Every euro counts.',
  },
  legendary: {
    id: 'legendary', label: 'Legendary', budget: 370, rerolls: 1, candidates: 3, rivalBudget: 190,
    fillerBoost: 4, injuryMult: 1.4, blurb: 'For the obsessed. Possible — barely.',
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'legendary'];
