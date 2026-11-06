import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { getClub, type Country } from '../data/clubs';
import { DIFFICULTIES } from '../engine/difficulty';
import * as Dec from '../engine/decisions';
import * as D from '../engine/draft';
import { seasonOdds, type OddsReport } from '../engine/odds';
import type { SeasonSetup } from '../engine/opponents';
import { buildPool } from '../engine/pool';
import { dailySeed } from '../engine/rng';
import {
  advanceDay, advanceToNextUserMatch, createSeason, simulateToEnd, trophies, userRecord, type SeasonState,
} from '../engine/season';
import type { CompId, Difficulty, Mentality, Mode, Player, RotationPolicy } from '../engine/types';

export type Screen = 'home' | 'formation' | 'draft' | 'review' | 'season' | 'summary';
export type Lang = 'en' | 'he';

function defaultLang(): Lang {
  try {
    return navigator.language?.toLowerCase().startsWith('he') ? 'he' : 'en';
  } catch {
    return 'en';
  }
}

export interface Config {
  mode: Mode;
  clubId: string;
  country: Country;
  difficulty: Difficulty;
  seedMode: 'random' | 'daily' | 'custom';
  customSeed: string;
  teamName: string;
  decisions: boolean;
}

export interface HallEntry {
  id: string;
  date: string;
  team: string;
  color: string;
  mode: Mode;
  difficulty: Difficulty;
  seed: string;
  won: CompId[];
  record: string;
  leagueRecord: string;
  sweepChance?: number;
}

interface GameState {
  screen: Screen;
  lang: Lang;
  config: Config;
  seed: string;
  draft?: D.DraftState;
  season?: SeasonState;
  rotation: RotationPolicy;
  odds?: OddsReport;
  oddsProgress: number;
  oddsFor?: string;
  hallOfFame: HallEntry[];
  savedToHall?: string;

  goto(screen: Screen): void;
  setLang(lang: Lang): void;
  configure(patch: Partial<Config>): void;
  startRun(): void;
  chooseFormation(formationId: string): void;
  spin(slotId: string): void;
  reroll(): void;
  pick(uid: string): void;
  setRotation(r: RotationPolicy): void;
  startSeason(): void;
  playNext(): void;
  simMatches(n: number): void;
  simToEnd(): void;
  decide(id: string, option: string): void;
  janScout(slotId: string): void;
  janSign(slotId: string, uid: string): void;
  janClose(): void;
  setMentality(m: Mentality): void;
  changeFormation(formationId: string): void;
  computeOdds(): Promise<void>;
  playAgain(): void;
  abandon(): void;
}

const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage full or blocked: the run just won't persist */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

const poolCache = new Map<string, Player[]>();
export function poolFor(config: Pick<Config, 'mode' | 'clubId'>, seed: string): Player[] {
  const key = `${config.mode}|${config.clubId}|${seed}`;
  let p = poolCache.get(key);
  if (!p) {
    p = buildPool(config.mode, config.mode === 'club' ? config.clubId : undefined, seed);
    poolCache.set(key, p);
  }
  return p;
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

function resolveSeed(c: Config): string {
  if (c.seedMode === 'daily') return `${dailySeed()}-${c.mode === 'club' ? c.clubId : `g-${c.country}`}-${c.difficulty}`;
  if (c.seedMode === 'custom' && c.customSeed.trim()) return c.customSeed.trim();
  return randomSeed();
}

export function teamIdentity(c: Config): Pick<SeasonSetup, 'teamName' | 'teamShort' | 'color' | 'color2' | 'country'> {
  if (c.mode === 'club') {
    const club = getClub(c.clubId);
    return { teamName: club.name, teamShort: club.short, color: club.color, color2: club.color2, country: club.country };
  }
  const name = c.teamName.trim() || 'World XI';
  return {
    teamName: name,
    teamShort: name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'WXI',
    color: '#34d399',
    color2: '#0f172a',
    country: c.country,
  };
}

const clone = <T,>(x: T): T => structuredClone(x);

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      /** Apply an engine mutation to a copy of the season. */
      const withSeason = (fn: (s: SeasonState) => void) => {
        const s = get().season;
        if (!s) return;
        const next = clone(s);
        fn(next);
        set({ season: next });
      };
      return {
      screen: 'home',
      lang: defaultLang(),
      config: {
        mode: 'club',
        clubId: 'barcelona',
        country: 'ESP',
        difficulty: 'normal',
        seedMode: 'random',
        customSeed: '',
        teamName: '',
        decisions: true,
      },
      seed: '',
      rotation: 'balanced',
      oddsProgress: 0,
      hallOfFame: [],

      goto: (screen) => set({ screen }),
      setLang: (lang) => set({ lang }),
      configure: (patch) => set({ config: { ...get().config, ...patch } }),

      startRun: () => {
        const seed = resolveSeed(get().config);
        set({ seed, draft: undefined, season: undefined, odds: undefined, oddsFor: undefined, savedToHall: undefined, screen: 'formation' });
      },

      chooseFormation: (formationId) => {
        const { config, seed } = get();
        set({ draft: D.createDraft(formationId, DIFFICULTIES[config.difficulty], seed), screen: 'draft' });
      },

      spin: (slotId) => {
        const { draft, config, seed } = get();
        if (!draft) return;
        set({ draft: D.spin(draft, poolFor(config, seed), slotId) });
      },
      reroll: () => {
        const { draft, config, seed } = get();
        if (!draft) return;
        set({ draft: D.reroll(draft, poolFor(config, seed)) });
      },
      pick: (uid) => {
        const { draft } = get();
        if (!draft) return;
        set({ draft: D.pick(draft, uid) });
      },

      setRotation: (rotation) => {
        const { season } = get();
        set({ rotation, season: season ? { ...season, rotation } : season });
      },

      startSeason: () => {
        const { draft, config, seed, rotation } = get();
        if (!draft || !D.isComplete(draft)) return;
        const setup: SeasonSetup = {
          mode: config.mode,
          clubId: config.mode === 'club' ? config.clubId : undefined,
          difficulty: config.difficulty,
          seed,
          squad: D.toSquad(draft),
          decisions: config.decisions !== false,
          ...teamIdentity(config),
        };
        set({ season: createSeason(setup, rotation), screen: 'season' });
      },

      playNext: () => {
        const s = get().season;
        if (!s || s.done) return;
        const next = clone(s);
        advanceToNextUserMatch(next);
        set({ season: next });
      },
      simMatches: (n) => {
        const s = get().season;
        if (!s || s.done) return;
        const next = clone(s);
        let played = 0;
        while (!next.done && !next.pendingDecision && played < n) if (advanceDay(next)) played++;
        set({ season: next });
      },
      simToEnd: () => {
        const s = get().season;
        if (!s || s.done) return;
        const next = clone(s);
        simulateToEnd(next);
        set({ season: next });
      },

      decide: (id, option) => withSeason((s) => Dec.resolveDecision(s, id, option)),
      janScout: (slotId) => withSeason((s) => Dec.januaryScout(s, slotId)),
      janSign: (slotId, uid) => withSeason((s) => Dec.januarySign(s, slotId, uid)),
      janClose: () => withSeason((s) => Dec.closeJanuary(s)),
      setMentality: (m) => withSeason((s) => Dec.setMentality(s, m)),
      changeFormation: (fid) => withSeason((s) => Dec.changeFormation(s, fid)),

      computeOdds: async () => {
        const { season, oddsFor, seed } = get();
        if (!season || oddsFor === seed) return;
        set({ oddsFor: seed, odds: undefined, oddsProgress: 0 });
        const report = await seasonOdds(season, 300, (done) => set({ oddsProgress: done }));
        if (get().seed !== seed) return;
        set({ odds: report });
        const hall = get().hallOfFame.map((h) => (h.id === get().savedToHall ? { ...h, sweepChance: report.sweep } : h));
        set({ hallOfFame: hall });
      },

      playAgain: () => {
        const { config } = get();
        set({ config: { ...config, seedMode: config.seedMode === 'custom' ? 'random' : config.seedMode } });
        get().startRun();
      },

      abandon: () => set({ draft: undefined, season: undefined, odds: undefined, oddsFor: undefined, screen: 'home' }),
      };
    },
    {
      name: 'clean-sweep-v1',
      version: 3,
      // v2: structured (translatable) messages. v3: mid-season decisions. Older in-progress seasons are dropped.
      migrate: (persisted, version) => {
        const p = persisted as Partial<GameState> | undefined;
        if (p && version < 3 && p.season && (p.season as { version: number }).version !== 3) {
          p.season = undefined;
          p.odds = undefined;
          p.oddsFor = undefined;
          if (p.screen === 'season' || p.screen === 'summary') p.screen = 'home';
        }
        return p as GameState;
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        screen: s.screen,
        lang: s.lang,
        config: s.config,
        seed: s.seed,
        draft: s.draft,
        season: s.season,
        rotation: s.rotation,
        hallOfFame: s.hallOfFame,
        savedToHall: s.savedToHall,
        odds: s.odds,
        oddsFor: s.oddsFor,
      }),
    },
  ),
);

/** Record a finished season in the Hall of Fame (once per run). */
export function saveToHall(): void {
  const st = useGame.getState();
  const s = st.season;
  if (!s || !s.done || st.savedToHall === st.seed) return;
  const rec = userRecord(s);
  const lt = s.league.table.user;
  const entry: HallEntry = {
    id: st.seed,
    date: new Date().toISOString().slice(0, 10),
    team: s.setup.teamName,
    color: s.setup.color,
    mode: s.setup.mode,
    difficulty: s.setup.difficulty,
    seed: st.seed,
    won: trophies(s),
    record: `${rec.w}-${rec.d}-${rec.l}`,
    leagueRecord: `${lt.w}-${lt.d}-${lt.l}`,
  };
  useGame.setState({ hallOfFame: [entry, ...st.hallOfFame].slice(0, 30), savedToHall: st.seed });
}
