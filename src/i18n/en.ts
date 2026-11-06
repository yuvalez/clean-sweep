import type { Country } from '../data/clubs';
import type { BenchRole, CompId, Difficulty, DilemmaKey, Mentality, RotationPolicy } from '../engine/types';

/** Values a dilemma's text can mention. */
export interface DecArgs {
  a: string;
  b: string;
  amount: string;
  n: number;
  club: string;
}
type DecText = {
  title: string;
  body: (x: DecArgs) => string;
  opts: Record<string, { label: (x: DecArgs) => string; effect: (x: DecArgs) => string }>;
};

/** Wrap text in a left-to-right isolate so scores, records and year ranges don't flip inside RTL text. */
export const ltr = (s: string | number) => `⁦${s}⁩`;

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
const ord = (n: number) => {
  const sfx = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (sfx[(v - 20) % 10] || sfx[v] || sfx[0]);
};

const ADJ: Record<Country, string> = { ESP: 'Spanish', ENG: 'English', GER: 'German', ITA: 'Italian', FRA: 'French' };

export const en = {
  dir: 'ltr' as 'ltr' | 'rtl',
  locale: 'en',
  switchTo: 'עברית',
  switchToLabel: 'החלף לעברית',

  // brand
  brandA: 'Clean',
  brandB: 'Sweep',
  docTitle: 'Clean Sweep',
  backToSeason: 'Back to season →',
  disclaimer: 'Unofficial fan-made game. Not affiliated with, or endorsed by, any club, league or player. Ratings are the game’s own opinion.',
  contact: 'Feedback & takedown requests',
  crashTitle: 'Something went wrong',
  crashBody: 'The game hit an error, possibly from an old saved game. Try reloading. If it keeps happening, reset the saved game (your Hall of Fame will be cleared too).',
  crashReload: 'Reload',
  crashReset: 'Reset saved game',

  // shared
  back: '← Back',
  abandonRun: 'Abandon run',
  seed: 'Seed',
  vs: 'vs',
  at: '@',
  legendsTitle: 'All-time Legends side',
  academyKid: 'Academy Kid',
  youthNames: {} as Record<string, string>,
  teams: {} as Record<string, string>,

  // competitions
  comp: (c: CompId, country: Country): string =>
    ({ super: `${ADJ[country]} Super Cup`, league: `${ADJ[country]} League`, cup: `${ADJ[country]} Cup`, euro: 'European Cup', cwc: 'Club World Cup' })[c],
  country: { ESP: 'Spain', ENG: 'England', GER: 'Germany', ITA: 'Italy', FRA: 'France' } as Record<Country, string>,
  rounds: {
    'Round of 32': 'Round of 32',
    'Round of 16': 'Round of 16',
    'Quarter-final': 'Quarter-final',
    'Semi-final': 'Semi-final',
    Final: 'Final',
  } as Record<string, string>,
  leg: (leg: 1 | 2): string => (leg === 1 ? '1st leg' : '2nd leg'),
  matchday: (n: number) => `Matchday ${n}`,
  groupMd: (g: string, n: number) => `Group ${g}, MD${n}`,
  groupStage: (n: number) => `Group stage, MD${n}`,
  group: (g: string) => `Group ${g}`,
  place: (n: number) => ord(n),

  // structured news / notes
  clinched: (left: number) => `Clinched with ${left} ${s(left, 'game', 'games')} to spare.`,
  pointsNote: (pts: number) => `${pts} points.`,
  outOfReach: 'The title is out of reach',
  finished: (pos: number) => `Finished ${ord(pos)}`,
  groupOut: (pos: number, g: string) => `Knocked out in the group stage (${ord(pos)} in Group ${g})`,
  beatInFinal: (opp: string) => `Beat ${opp} in the final.`,
  lostFinal: (opp: string) => `Lost the final to ${opp}`,
  knockedOut: (opp: string, round: string) => `Knocked out by ${opp} in the ${round.toLowerCase()}`,
  injuryNews: (player: string, n: number, injury: string) => `${player} is out for ${n} ${s(n, 'game', 'games')} (${injury}).`,
  returnNews: (player: string) => `${player} is back in training.`,
  wonNews: (comp: string, note?: string) => `🏆 ${comp} won!${note ? ` ${note}` : ''}`,
  outNews: (comp: string, note?: string) => `❌ ${comp}: ${note ?? 'eliminated'}.`,
  injuries: {
    hamstring: 'hamstring strain', ankle: 'ankle sprain', calf: 'calf tear', knee: 'knee knock', groin: 'groin strain',
    thigh: 'thigh strain', back: 'back spasm', toe: 'broken toe', ligament: 'knee ligament damage', concussion: 'concussion',
  } as Record<string, string>,

  // difficulty
  diff: {
    easy: { label: 'Easy', blurb: 'Deep pockets, weaker rivals. Learn the ropes.' },
    normal: { label: 'Normal', blurb: 'A fair fight. A clean sweep takes a smart draft.' },
    hard: { label: 'Hard', blurb: 'Tight budget, stronger giants. Every euro counts.' },
    legendary: { label: 'Legendary', blurb: 'For the obsessed. Possible — barely.' },
  } as Record<Difficulty, { label: string; blurb: string }>,

  // home
  tagline: 'Five trophies · One budget · Zero excuses',
  intro:
    'Scout random players for every position, build your XI on a budget, then survive a full season. Win the league, the cup, the super cup, the European Cup and the Club World Cup.',
  runInProgress: 'You have a run in progress',
  seasonUnderway: (team: string) => `${team}: season underway`,
  draftInProgress: 'Draft in progress',
  continue: 'Continue →',
  modeClub: 'Club Legends',
  modeClubSub: "One club's all-time players",
  modeGlobal: 'Global',
  modeGlobalSub: 'Every player in the game',
  chooseClub: 'Choose your club',
  starPowerTitle: 'Star power: how many elite players the pool holds',
  starPowerNote: '★ Star power: clubs with fewer all-time greats make for a tougher draft.',
  yourLeague: 'Your league',
  teamName: 'Team name',
  teamNamePlaceholder: 'World XI',
  difficulty: 'Difficulty',
  rerollsOptions: (r: number, c: number) => `${r} ${s(r, 'reroll', 'rerolls')} · ${c} options per scout`,
  seasonSeed: 'Season seed',
  seedRandom: '🎲 Random',
  seedDaily: '📅 Daily',
  seedCustom: '🔑 Custom',
  seedPlaceholder: 'any text',
  dailyNote: (d: string) => `Same players and fixtures for everyone today (${d}).`,
  startDraft: 'Start draft →',
  howItWorks: 'How it works',
  steps: [
    ['1. Pick a formation.', 'It decides which positions you scout.'],
    ['2. Scout each slot.', 'Tap a position and you get random players to choose from. Stars cost a fortune, and once you scout a slot you must sign someone.'],
    ['3. Mind the budget.', 'Every slot needs a player, bench included. Bargains exist.'],
    ['4. Build chemistry.', 'Real former teammates link up (gold lines). Compatriots side by side help too.'],
    ['5. Survive the season.', '55+ matches, fatigue and injuries. Your bench will play.'],
  ] as [string, string][],
  hallOfFame: 'Hall of Fame',
  hallEmpty: 'No seasons played yet. Your finished runs will appear here.',
  hallLine: (rec: string, league: string) => `${ltr(rec)} overall · league ${ltr(league)}`,
  sweepOddsShort: (pct: string) => ` · sweep odds ${pct}%`,
  trophiesCount: (n: number) => `${n} ${s(n, 'trophy', 'trophies')}`,

  // formation
  pickShape: 'Pick your shape',
  formationIntro:
    "Your formation decides which positions you scout. Out-of-position players lose rating, so pick a shape that suits your club's history.",
  atk: 'ATK',
  def: 'DEF',
  formationBlurb: {
    '4-3-3': 'Wingers stretch the pitch. Balanced with an attacking edge.',
    '4-4-2': 'Two strikers, two banks of four. Solid and direct.',
    '4-2-3-1': 'Double pivot shields the back four. Control first.',
    '3-5-2': 'Wing-backs and a packed midfield. Win the middle.',
    '3-4-3': 'All-out attack. Three forwards, three at the back.',
    '5-3-2': 'Park the bus, hit on the break. Hard to beat.',
  } as Record<string, string>,

  // positions
  benchToken: { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'ATT', ANY: 'SUB' } as Record<BenchRole, string>,
  benchLabel: { GK: 'SUB GK', DEF: 'SUB DEF', MID: 'SUB MID', ATT: 'SUB ATT', ANY: 'SUB' } as Record<BenchRole, string>,

  // pitch
  scout: 'Scout',
  scouting: 'Scouting…',
  bench: 'BENCH',
  outOfPositionShort: 'Out of position',
  chemPips: (n: number) => `Chemistry ${n}/4`,
  injured: 'Injured',
  ariaScout: (label: string) => `Scout ${label}`,

  // draft
  fitNatural: 'Natural position',
  fitComfortable: `Comfortable here (${ltr('−1')})`,
  fitOut: (fit: number) => `Out of position (${ltr(fit)})`,
  squadPlayer: 'Squad player',
  academy: 'Academy',
  bargain: '💎 Bargain',
  teammatesChip: (n: number) => `🔗 ${n} ${s(n, 'teammate', 'teammates')}`,
  overBudget: (max: string) => `Over budget: max ${max}`,
  theDraft: 'The Draft',
  poolClub: (club: string) => `${club} all-time pool`,
  poolGlobal: 'Global pool',
  poolInfo: (n: number, f: string) => `${n} players · ${f}`,
  confirmAbandonRun: 'Abandon this run?',
  leftShort: 'left',
  slotsShort: (n: number) => `${n} ${s(n, 'slot', 'slots')}`,
  chemShort: 'Chem',
  legendTeammates: 'Former teammates',
  legendCompatriots: 'Compatriots',
  legendPips: 'Chemistry pips',
  budgetLeft: 'Budget left',
  ofBudget: (b: string) => `of ${b}`,
  slotsLeft: 'Slots left',
  perStarter: (p: string) => `~${p} per starter`,
  squadComplete: 'Squad complete',
  rerolls: 'Rerolls',
  reScout: 're-scout a slot',
  teamOverall: 'Team overall',
  xiAverage: 'XI average',
  chemistryN: (n: number) => `Chemistry ${n}`,
  scoutingReport: 'Scouting report',
  maxSpend: 'Max spend:',
  reroll: (n: number) => `🔄 Reroll (${n})`,
  mustSign: (min: string) => `You must sign one of these players. Every unfilled slot reserves at least ${min}.`,
  completeLine: (att: string, def: string, chem: number) => `Attack ${att} · Defence ${def} · Chemistry ${chem}. `,
  unspent: 'Unspent money is worth nothing, but it does make a nice story.',
  unspentKitty: 'Unspent money goes into your transfer kitty for mid-season decisions and the January window.',
  reviewSquad: 'Review squad →',
  tapToScout: 'Tap a position to scout it',
  tapToScoutDesc:
    'You choose the order. Chasing the stars first is tempting, but cheap gems late in the draft can win a title. Every scout offers one star, one solid pro and some wildcards.',
  signed: 'Signed',

  // review
  backToDraft: '← Back to draft',
  rotation: {
    rotate: { label: 'Rotate', desc: 'Rest tired players freely. Fresher legs for the big nights, but weaker teams in routine games.' },
    balanced: { label: 'Balanced', desc: 'Rest players when they are clearly tired and the bench can cope.' },
    strongest: { label: 'Strongest XI', desc: 'Your best XI plays almost every game. They will be exhausted by the spring, and injuries become more likely.' },
  } as Record<RotationPolicy, { label: string; desc: string }>,
  pundit: (ovr: number, chem: number) => {
    const c = chem >= 70 ? ' and they actually know each other' : chem < 40 ? ', but do these players even speak the same football language?' : '';
    if (ovr >= 92) return `"An all-time great side on paper${c}. Anything less than everything is failure."`;
    if (ovr >= 90) return `"Genuine contenders on every front${c}."`;
    if (ovr >= 88) return `"Strong, but the European giants will smell blood${c}."`;
    if (ovr >= 85) return `"A decent squad. Five trophies? I'll believe it when I see it${c}."`;
    return `"I fear for this team. The bookmakers are already paying out${c}."`;
  },
  overall: 'Overall',
  attack: 'Attack',
  defence: 'Defence',
  chemistry: 'Chemistry',
  spent: 'Spent',
  unused: (x: string) => `${x} unused`,
  squadRotation: 'Squad rotation',
  rotationNote:
    'Finals, semi-finals, European knockouts and games against your title rivals always get your strongest available XI. You can change this during the season.',
  seasonAhead: 'The season ahead',
  seasonAheadDesc: (names: string) =>
    `${names}. Your rivals are AI-drafted all-time Legends sides of the other great clubs. Win all five for a Clean Sweep.`,
  flowArrow: ' → ',
  kickOff: 'Kick off the season ⚽',

  // season
  status: { pending: 'Upcoming', active: 'Alive', won: 'Won', runnerUp: 'Runner-up', eliminated: 'Out' } as Record<string, string>,
  resW: 'W',
  resD: 'D',
  resL: 'L',
  resPens: ' (pens)',
  goalFallback: 'Goal',
  pens: (a: number, b: number) => `pens ${ltr(`${a}–${b}`)}`,
  aet: 'aet',
  seasonLine: (played: number, w: number, d: number, l: number, gf: number, ga: number, pos: number) =>
    `${played} played · ${w}W ${d}D ${l}L · ${ltr(`${gf}–${ga}`)} goals · League ${ord(pos)}`,
  confirmAbandonSeason: 'Abandon this season?',
  fullTime: 'Full time on the season.',
  seeVerdict: 'See the verdict 🏆',
  nextUp: 'Next up',
  restOfSeason: 'Rest of the season',
  playNext: '▶ Play next',
  sim5: '⏩ Sim 5',
  simEndShort: 'End',
  simEnd: 'Sim to end',
  tabs: { overview: 'Overview', league: 'League', europe: 'Europe', cups: 'Cups', squad: 'Squad', results: 'Results' } as Record<string, string>,
  seasonStarts: 'The season starts with the Super Cup. Press Play next.',
  leagueTop6: 'League top 6',
  dressingRoom: 'Dressing room',
  allQuiet: 'All quiet.',
  leagueLegend: '⭐ = all-time Legends side · gold rows = title rivals',
  knockouts: (comp: string) => `${comp}: knockouts`,
  euroDrawNote: 'The knockout draw happens after the group stage.',
  cwcNote: 'Played after the European Cup final: the top European finishers meet the best from the rest of the world.',
  notStarted: 'Not started yet.',
  noMatches: 'No matches played yet.',
  venueH: 'H',
  venueA: 'A',
  venueN: 'N',
  rotationPolicy: 'Rotation policy',
  thPos: 'Pos',
  thPlayer: 'Player',
  thFitness: 'Fitness',
  thApps: 'Apps',
  thG: 'G',
  thA: 'A',
  injuredGames: (n: number) => `🚑 ${n} ${s(n, 'game', 'games')}`,

  // tables
  thTeam: 'Team',
  thP: 'P',
  thW: 'W',
  thD: 'D',
  thL: 'L',
  thGD: 'GD',
  thPts: 'Pts',
  thForm: 'Form',


  // mid-season decisions
  decisionsOption: 'Mid-season decisions',
  decisionsOn: 'On',
  decisionsOff: 'Off',
  decisionsOnSub: 'Contract rows, dressing-room drama, a January transfer window and tactics you can change at any time.',
  decisionsOffSub: 'Classic: draft your squad, then watch the season unfold.',
  bankLabel: 'Transfer kitty',
  bankShort: (x: string) => `💰 ${x}`,
  decisionWaiting: 'A decision is waiting',
  decisionHint: 'Make your call below to continue the season.',
  decisionUnavailable: 'Not enough money in the transfer kitty',
  dec: {
    contract: {
      title: '✍️ Contract stand-off',
      body: (x) => `${x.a} wants a new contract, and the agent is already talking to the press. Meeting the demands costs ${x.amount} from the transfer kitty.`,
      opts: {
        pay: { label: () => 'Pay up', effect: (x) => `−${x.amount} · ${x.a}: +2 rating for the rest of the season` },
        refuse: { label: () => 'Refuse', effect: (x) => `${x.a} sulks: −4 rating for 8 matches` },
      },
    },
    rift: {
      title: '🥊 Dressing-room rift',
      body: (x) => `${x.a} and ${x.b} came to blows in training. The whole squad is watching how you handle it.`,
      opts: {
        backA: { label: (x) => `Back ${x.a}`, effect: (x) => `${x.b}: −3 rating for 10 matches` },
        backB: { label: (x) => `Back ${x.b}`, effect: (x) => `${x.a}: −3 rating for 10 matches` },
        fineBoth: { label: () => 'Fine them both', effect: () => 'Both: −1 rating for 5 matches' },
      },
    },
    rivalBid: {
      title: '📨 Transfer bid',
      body: (x) => `${x.club} have bid ${x.amount} for ${x.a}. If you accept, an academy player takes the bench spot until you find a replacement.`,
      opts: {
        accept: { label: () => 'Accept the bid', effect: (x) => `+${x.amount} to the kitty · ${x.a} leaves` },
        reject: { label: () => 'Reject it', effect: (x) => `${x.a} is unsettled: −2 rating for 6 matches` },
      },
    },
    winterBreak: {
      title: '❄️ Winter break',
      body: () => 'The league pauses for the winter. How should the squad spend it?',
      opts: {
        tour: { label: () => 'Friendly tour in Asia', effect: () => '+€25M · everyone loses 25 fitness' },
        camp: { label: () => 'Warm-weather training camp', effect: () => '−€5M · the whole squad back to full fitness' },
        rest: { label: () => 'Send them on holiday', effect: () => '+15 fitness for everyone' },
      },
    },
    injuryRush: {
      title: '🚑 Rush the star back?',
      body: (x) => `${x.a} is still out for ${x.n} more ${s(x.n, 'game', 'games')}. The physio thinks a return could come sooner, at a risk.`,
      opts: {
        rush: { label: () => 'Rush back now', effect: (x) => `${x.a} plays now at 65 fitness: −1 rating and triple injury risk for 6 matches` },
        wait: { label: () => 'Be patient', effect: () => 'No risk. Wait for a full recovery.' },
      },
    },
    teamTalk: {
      title: '🎙️ Big European night',
      body: () => 'The European knockouts start now. What do you tell the players?',
      opts: {
        fireUp: { label: () => 'Fire them up', effect: () => '+3 attack for 2 matches, higher injury risk' },
        calm: { label: () => 'Stay calm and compact', effect: () => '+3 defence for 2 matches' },
        rest: { label: () => 'Extra recovery session', effect: () => '+20 fitness for the starting XI' },
      },
    },
  } as Record<DilemmaKey, DecText>,
  decisionNews: (title: string, choice: string) => `📋 ${title}: ${choice}`,
  signedNews: (player: string, out: string, fee: string) => `✍️ ${player} signs for ${fee}, replacing ${out}.`,
  janTitle: '🔁 January transfer window',
  janIntro: (n: number, rate: number) =>
    `Replace up to ${n} players. Selling returns ${rate}% of the fee you paid, and you can scout each position once.`,
  janSignings: (used: number, max: number) => `Signings ${used}/${max}`,
  janSale: (x: string) => `sale ${x}`,
  janReplace: 'Find a replacement',
  janBack: 'Keep current player',
  janBudgetFor: (x: string) => `Up to ${x} for this position`,
  janScouting: (pos: string, name: string) => `Replacing ${name} (${pos})`,
  janSignedTag: 'New signing',
  janClose: 'Close the window →',
  janFull: 'No more signings this window.',
  tactics: 'Tactics',
  mentality: {
    defensive: { label: 'Defensive', desc: 'Low block: +2.5 defence, −2 attack, 15% less fatigue.' },
    balanced: { label: 'Balanced', desc: 'No adjustments.' },
    attacking: { label: 'Attacking', desc: 'High press: +2.5 attack, −1.5 defence, 20% more fatigue.' },
  } as Record<Mentality, { label: string; desc: string }>,
  formation: 'Formation',
  formationNote: 'Changing shape moves your starting XI to the best-fitting positions. Out-of-position players lose rating.',
  modTitle: (n: number) => (n > 900 ? 'For the rest of the season' : `For ${n} more ${s(n, 'match', 'matches')}`),

  // summary
  headlines: ['Trophyless', 'Silverware', 'The Double', 'The Treble', 'The Quadruple', 'CLEAN SWEEP'],
  sublines: [
    'The board has called an emergency meeting.',
    'A trophy is a trophy. The fans wanted more.',
    'A fine season. Not a perfect one.',
    'Historic. But the cabinet still has two empty shelves.',
    'So close to immortality. One trophy away.',
    'Five for five. Every trophy, one season. Immortal.',
  ],
  achievements: {
    sweep: { name: 'Clean Sweep', desc: 'Win all five trophies' },
    perfect: { name: 'Perfect League', desc: 'Win all 38 league games' },
    invincible: { name: 'Invincibles', desc: 'Go the league season unbeaten' },
    unbeaten: { name: 'Untouchable', desc: 'No defeats in any competition (shoot-outs count as draws)' },
    centurions: { name: 'Centurions', desc: '100+ league points' },
    machine: { name: 'Goal Machine', desc: 'A player scores 60+ in all competitions' },
  } as Record<string, { name: string; desc: string }>,
  allComps: 'All competitions',
  league: 'League',
  topScorer: 'Top scorer',
  topAssists: 'Top assists',
  everPresent: 'Ever-present',
  matches: 'Matches',
  scoredConceded: (gf: number, ga: number) => `${gf} scored · ${ga} conceded`,
  points: (n: number) => `${n} points`,
  appsOf: (name: string) => `${name} (apps)`,
  inFiveComps: 'in a 5-competition season',
  oddsTitle: 'What were the odds?',
  replaying: 'Re-playing your season 300 times with the same squad and opponents…',
  sweepChance: 'Clean Sweep chance',
  expected: (avg: string, won: number) => `Expected ${avg} trophies; you won ${won}.`,
  luckGood: 'The football gods smiled on you.',
  luckBad: 'Cruel luck. The squad deserved more.',
  luckFair: 'About what the squad deserved.',
  perfectRuns: (pct: string) => ` A ${ltr('38-0')} league happened in ${pct}% of runs.`,
  won: 'Won',
  lost: 'Lost',
  achievementsTitle: 'Achievements',
  playAgain: '🎲 Play again',
  copied: '✅ Copied!',
  share: '📋 Share result',
  newSetup: '🏠 New setup',
  copyPrompt: 'Copy your result:',
  shareTitle: (team: string, diff: string) => `Clean Sweep ⚽ ${team} (${diff})`,
  shareLine: (n: number, w: number, d: number, l: number, pts: number, rec: string) =>
    `${n}/5 · League ${w}-${d}-${l} (${pts} pts) · All comps ${rec}`,
  shareOdds: (pct: string) => `Sweep odds were ${pct}%`,
  shareSeed: (seed: string) => `Seed: ${seed}`,
};

export type Dict = typeof en;
