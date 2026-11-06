import type { Country } from './clubs';

/** [name, short, rating (Normal), colour] */
export type FillerDef = [string, string, number, string];

export interface LeagueMeta {
  country: Country;
  flag: string;
  adjective: string;
  /** Top-flight clubs that are not in the legends dataset, strongest first. */
  filler: FillerDef[];
  /** Stand-in title challengers when the country has fewer than 2 legends rivals. */
  challengers: FillerDef[];
  /** Lower-division sides that join the domestic cup. */
  lower: string[];
}

export const LEAGUES: Record<Country, LeagueMeta> = {
  ESP: {
    country: 'ESP', flag: '🇪🇸', adjective: 'Spanish',
    filler: [
      ['Athletic Club', 'ATH', 79, '#ee2523'], ['Villarreal', 'VIL', 79, '#ffe667'], ['Sevilla', 'SEV', 78, '#f43333'],
      ['Real Sociedad', 'RSO', 78, '#0067b1'], ['Real Betis', 'BET', 77, '#0bb363'], ['Valencia', 'VAL', 76, '#ee3524'],
      ['Girona', 'GIR', 75, '#cd2534'], ['Celta Vigo', 'CEL', 74, '#8ac3ee'], ['Osasuna', 'OSA', 74, '#d91a21'],
      ['Rayo Vallecano', 'RAY', 73, '#e53027'], ['Mallorca', 'MLL', 73, '#e20613'], ['Getafe', 'GET', 72, '#005999'],
      ['Espanyol', 'ESP', 72, '#007fc8'], ['Alavés', 'ALA', 71, '#0761af'], ['Las Palmas', 'LPA', 70, '#ffe400'],
      ['Elche', 'ELC', 69, '#05642c'], ['Leganés', 'LEG', 69, '#0055a5'], ['Levante', 'LEV', 68, '#b4053f'],
      ['Real Oviedo', 'OVI', 67, '#0047ab'], ['Valladolid', 'VLL', 67, '#921b88'],
    ],
    challengers: [],
    lower: ['Sporting Gijón', 'Real Zaragoza', 'Deportivo', 'Racing Santander', 'Málaga', 'Tenerife', 'Albacete', 'Eibar', 'Huesca', 'Cádiz', 'Granada', 'Almería'],
  },
  ENG: {
    country: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', adjective: 'English',
    filler: [
      ['Tottenham', 'TOT', 80, '#132257'], ['Newcastle', 'NEW', 80, '#241f20'], ['Aston Villa', 'AVL', 79, '#670e36'],
      ['Nottingham Forest', 'NFO', 76, '#dd0000'], ['Brighton', 'BHA', 77, '#0057b8'], ['Crystal Palace', 'CRY', 76, '#1b458f'],
      ['West Ham', 'WHU', 75, '#7a263a'], ['Bournemouth', 'BOU', 75, '#da291c'], ['Brentford', 'BRE', 75, '#e30613'],
      ['Fulham', 'FUL', 74, '#f4f4f4'], ['Everton', 'EVE', 74, '#003399'], ['Wolves', 'WOL', 73, '#fdb913'],
      ['Leeds United', 'LEE', 72, '#ffcd00'], ['Leicester', 'LEI', 71, '#003090'], ['Sunderland', 'SUN', 71, '#eb172b'],
      ['Burnley', 'BUR', 70, '#6c1d45'], ['Southampton', 'SOU', 69, '#d71920'], ['Ipswich', 'IPS', 68, '#3a64a3'],
    ],
    challengers: [],
    lower: ['Middlesbrough', 'Sheffield United', 'Norwich', 'Coventry', 'West Brom', 'Stoke', 'Hull City', 'QPR', 'Millwall', 'Watford', 'Swansea', 'Bristol City'],
  },
  GER: {
    country: 'GER', flag: '🇩🇪', adjective: 'German',
    filler: [
      ['RB Leipzig', 'RBL', 79, '#dd0741'], ['Eintracht Frankfurt', 'SGE', 78, '#e1000f'], ['Stuttgart', 'VFB', 77, '#e32219'],
      ['Freiburg', 'SCF', 76, '#5b5b5b'], ['Mainz', 'M05', 74, '#c3141e'], ['Wolfsburg', 'WOB', 74, '#65b32e'],
      ['Gladbach', 'BMG', 74, '#1a1a1a'], ['Union Berlin', 'FCU', 73, '#eb1923'], ['Werder Bremen', 'SVW', 73, '#1d9053'],
      ['Hoffenheim', 'TSG', 73, '#1961b5'], ['Augsburg', 'FCA', 71, '#ba3733'], ['Köln', 'KOE', 70, '#ed1c24'],
      ['Hamburg', 'HSV', 70, '#0a3f86'], ['Schalke', 'S04', 70, '#004d9d'], ['Heidenheim', 'HDH', 69, '#e2001a'],
      ['St. Pauli', 'STP', 69, '#6b4c3b'], ['Bochum', 'BOC', 68, '#005ca9'], ['Holstein Kiel', 'KSV', 67, '#004b93'],
    ],
    challengers: [['Bayer Leverkusen', 'B04', 0, '#e32221'], ['Golden-Era Hamburg', 'HSG', 0, '#0a3f86']],
    lower: ['Hertha Berlin', 'Düsseldorf', 'Hannover', 'Nürnberg', 'Kaiserslautern', 'Karlsruhe', 'Paderborn', 'Darmstadt', 'Magdeburg', 'Greuther Fürth', 'Elversberg', 'Braunschweig'],
  },
  ITA: {
    country: 'ITA', flag: '🇮🇹', adjective: 'Italian',
    filler: [
      ['Napoli', 'NAP', 81, '#12a0d7'], ['Atalanta', 'ATA', 80, '#1e71b8'], ['Roma', 'ROM', 78, '#8e1f2f'],
      ['Lazio', 'LAZ', 77, '#87d8f7'], ['Fiorentina', 'FIO', 76, '#482e92'], ['Bologna', 'BOL', 76, '#1a2f48'],
      ['Como', 'COM', 73, '#1d4f91'], ['Torino', 'TOR', 73, '#881f19'], ['Udinese', 'UDI', 72, '#1a1a1a'],
      ['Genoa', 'GEN', 72, '#a61b2b'], ['Cagliari', 'CAG', 70, '#a51e36'], ['Parma', 'PAR', 70, '#ffd200'],
      ['Sassuolo', 'SAS', 70, '#00a752'], ['Lecce', 'LEC', 69, '#f6d200'], ['Verona', 'VER', 69, '#1d3c87'],
      ['Empoli', 'EMP', 69, '#0059a6'], ['Venezia', 'VEN', 68, '#ef7d00'], ['Cremonese', 'CRE', 67, '#c8102e'],
    ],
    challengers: [],
    lower: ['Sampdoria', 'Palermo', 'Bari', 'Brescia', 'Spezia', 'Salernitana', 'Frosinone', 'Monza', 'Pisa', 'Modena', 'Catanzaro', 'Cesena'],
  },
  FRA: {
    country: 'FRA', flag: '🇫🇷', adjective: 'French',
    filler: [
      ['Monaco', 'ASM', 78, '#e51b22'], ['Lille', 'LIL', 78, '#e01e13'], ['Nice', 'NIC', 76, '#c8102e'],
      ['Lens', 'RCL', 76, '#ffd400'], ['Rennes', 'REN', 75, '#e13327'], ['Strasbourg', 'RCS', 74, '#009fe3'],
      ['Brest', 'SB29', 73, '#e30613'], ['Toulouse', 'TFC', 72, '#5b2c86'], ['Nantes', 'FCN', 71, '#fce500'],
      ['Reims', 'SDR', 71, '#e2001a'], ['Montpellier', 'MHSC', 70, '#f68b1f'], ['Auxerre', 'AJA', 69, '#0055a4'],
      ['Saint-Étienne', 'ASSE', 69, '#00a650'], ['Angers', 'SCO', 68, '#1a1a1a'], ['Le Havre', 'HAC', 68, '#5eb2e3'],
      ['Lorient', 'FCL', 68, '#f58220'], ['Metz', 'FCM', 67, '#7c1d3e'], ['Paris FC', 'PFC', 67, '#1b365d'],
    ],
    challengers: [['Marseille', 'OM', 0, '#2faee0'], ['Lyon', 'OL', 0, '#1e3f8f']],
    lower: ['Bordeaux', 'Caen', 'Guingamp', 'Bastia', 'Grenoble', 'Amiens', 'Sochaux', 'Laval', 'Troyes', 'Dunkerque', 'Annecy', 'Clermont'],
  },
};

/** European sides outside the legends dataset. */
export const EURO_FILLER: FillerDef[] = [
  ['Benfica', 'BEN', 80, '#e3001b'], ['Porto', 'POR', 79, '#00428c'], ['Sporting CP', 'SCP', 79, '#00805f'],
  ['Ajax', 'AJX', 78, '#d2122e'], ['PSV', 'PSV', 78, '#ed1c24'], ['Feyenoord', 'FEY', 77, '#e3000b'],
  ['Club Brugge', 'CLB', 76, '#0068b3'], ['Galatasaray', 'GAL', 76, '#a90432'], ['Celtic', 'CEL', 75, '#018749'],
  ['Fenerbahçe', 'FEN', 75, '#163962'], ['Olympiacos', 'OLY', 73, '#e30613'], ['Shakhtar Donetsk', 'SHA', 73, '#f37021'],
  ['Red Bull Salzburg', 'RBS', 73, '#d0021b'], ['Rangers', 'RAN', 73, '#1b458f'], ['Dinamo Zagreb', 'DZG', 72, '#0055a4'],
  ['Red Star Belgrade', 'RSB', 72, '#e2001a'], ['Young Boys', 'YB', 71, '#ffd200'], ['Copenhagen', 'FCK', 71, '#f4f4f4'],
  ['Slavia Prague', 'SLA', 71, '#e2001a'], ['Sparta Prague', 'SPA', 71, '#a6192e'],
];

/** Top non-dataset sides of the big leagues that can also qualify for Europe. */
export const EURO_LEAGUE_QUALIFIERS: Record<Country, number> = { ESP: 2, ENG: 3, GER: 2, ITA: 2, FRA: 1 };

/** Clubs from outside Europe for the Club World Cup. */
export const WORLD_FILLER: FillerDef[] = [
  ['Flamengo', 'FLA', 78, '#c4161c'], ['Palmeiras', 'PAL', 77, '#006437'], ['Al Hilal', 'HIL', 77, '#0f4ea1'],
  ['River Plate', 'RIV', 76, '#e2001a'], ['Botafogo', 'BOT', 75, '#1a1a1a'], ['Boca Juniors', 'BOC', 75, '#003d8f'],
  ['Fluminense', 'FLU', 74, '#7a1335'], ['Inter Miami', 'MIA', 73, '#f7b5cd'], ['Al Ahly', 'AHL', 72, '#c8102e'],
  ['Monterrey', 'MTY', 72, '#0b2b5b'], ['Mamelodi Sundowns', 'MSU', 71, '#ffd200'], ['Seattle Sounders', 'SEA', 70, '#5d9741'],
  ['Urawa Reds', 'URA', 68, '#e60012'], ['Espérance', 'EST', 68, '#d1001c'], ['Auckland City', 'AKL', 60, '#003a70'],
];
