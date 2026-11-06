export type Pos =
  | 'GK' | 'LB' | 'CB' | 'RB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'ST';

export type Line = 'GK' | 'DEF' | 'MID' | 'ATT';
export type BenchRole = 'GK' | 'DEF' | 'MID' | 'ATT' | 'ANY';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'legendary';
export type Mode = 'club' | 'global';
export type RotationPolicy = 'rotate' | 'balanced' | 'strongest';

/** One player's spell at one club. */
export interface Stint {
  id: string; // slug of the player's name, shared across clubs
  name: string;
  nation: string; // ISO-ish 3-letter code
  club: string; // club id
  from: number;
  to: number;
  pos: Pos[]; // primary first
  rating: number; // peak at that club, 60-99
}

/** A stint priced for a specific run. */
export interface Player extends Stint {
  uid: string; // `${id}@${club}`
  price: number; // €M
  bargain: boolean;
}

export interface Slot {
  id: string;
  kind: 'xi' | 'bench';
  pos?: Pos; // xi slots
  role?: BenchRole; // bench slots
  x: number; // 0-100 (left→right)
  y: number; // 0-100 (own goal→opponent goal)
}

export interface Formation {
  id: string;
  name: string;
  slots: Slot[]; // 11 xi slots
  attMod: number;
  defMod: number;
  blurb: string;
}

export type Picks = Record<string, Player | undefined>; // slotId → player

export interface Squad {
  formationId: string;
  picks: Picks; // xi + bench
}

export interface TeamStrength {
  att: number;
  def: number;
  gk: number;
  overall: number;
}

export type TeamKind = 'user' | 'legends' | 'filler';

export interface Team {
  id: string;
  name: string;
  short: string;
  color: string;
  color2: string;
  kind: TeamKind;
  country: string;
  strength: TeamStrength;
  squad?: Squad; // user + legends
}

export interface GoalEvent {
  teamId: string;
  scorer?: string; // player uid
  assist?: string;
  minute: number;
}

export interface MatchResult {
  id: string;
  comp: CompId;
  stage: Msg; // structured label, rendered (and translated) by the UI
  homeId: string;
  awayId: string;
  hg: number;
  ag: number;
  et?: boolean;
  pens?: [number, number];
  winnerId?: string; // knockouts only (or decided matches)
  goals: GoalEvent[];
  neutral?: boolean;
}

export type CompId = 'super' | 'league' | 'cup' | 'euro' | 'cwc';

export interface TableRow {
  teamId: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  form: ('W' | 'D' | 'L')[];
}

export interface Tie {
  id: string;
  a: string; // team ids (a hosts first leg)
  b: string;
  legs: 1 | 2;
  results: string[]; // match ids
  winnerId?: string;
}

export interface KnockoutRound {
  name: string;
  ties: Tie[];
}

export interface PlayerSeasonState {
  uid: string;
  fitness: number; // 0-100
  injuredFor: number; // matches remaining
  injury?: string;
  apps: number;
  goals: number;
  assists: number;
}

export interface CompetitionStatus {
  id: CompId;
  name: string;
  status: 'pending' | 'active' | 'won' | 'eliminated' | 'runnerUp';
  note?: Msg;
}

/** Structured, language-neutral message. The UI renders it in the player's language. */
export type Msg =
  | { k: 'matchday'; n: number }
  | { k: 'groupMd'; group: string; n: number }
  | { k: 'round'; round: string } // knockout round id, e.g. 'Quarter-final'
  | { k: 'leg'; round: string; leg: 1 | 2 }
  | { k: 'clinched'; left: number }
  | { k: 'points'; pts: number }
  | { k: 'outOfReach' }
  | { k: 'finished'; pos: number }
  | { k: 'groupOut'; pos: number; group: string }
  | { k: 'beatInFinal'; opp: string } // team id
  | { k: 'lostFinal'; opp: string }
  | { k: 'knockedOut'; opp: string; round: string }
  | { k: 'injury'; player: string; n: number; injury: string } // injury key
  | { k: 'return'; player: string }
  | { k: 'won'; comp: CompId; note?: Msg }
  | { k: 'out'; comp: CompId; note?: Msg }
  | { k: 'signed'; player: string; out: string; fee: number }
  | { k: 'decision'; key: DilemmaKey; opt: string; a?: string; b?: string };

// ---------------------------------------------------------------------------
// Mid-season decisions
// ---------------------------------------------------------------------------

export type Mentality = 'defensive' | 'balanced' | 'attacking';
export type DilemmaKey = 'contract' | 'rift' | 'rivalBid' | 'winterBreak' | 'injuryRush' | 'teamTalk';
export type DecisionType = DilemmaKey | 'january';

/** A temporary (or season-long) effect on one player (uid) or the whole team. */
export interface Modifier {
  uid?: string;
  rating?: number;
  att?: number;
  def?: number;
  injuryMult?: number;
  matches: number; // user matches remaining
}

export interface Signing {
  slotId: string;
  out: Player;
  in: Player;
  sale: number; // €M received for `out`
}

export interface DecisionEvent {
  id: string;
  day: number; // calendar day it interrupts (before that day is played)
  type: DecisionType;
  fallback?: DilemmaKey; // used if `type` has nothing to act on when it fires
  status: 'scheduled' | 'open' | 'done' | 'skipped';
  ctx?: { a?: string; b?: string; slotId?: string; amount?: number; team?: string; n?: number };
  choice?: string;
  scouted?: Record<string, Player[]>; // january: candidates per slot
  signings?: Signing[]; // january
}

export interface TacticsChange {
  day: number;
  mentality?: Mentality;
  formationId?: string;
}
