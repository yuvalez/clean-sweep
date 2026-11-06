export type Country = 'ESP' | 'ENG' | 'GER' | 'ITA' | 'FRA';

export interface ClubMeta {
  id: string;
  name: string;
  short: string;
  country: Country;
  color: string;
  color2: string;
  founded: number;
}

export const CLUBS: ClubMeta[] = [
  { id: 'barcelona', name: 'Barcelona', short: 'BAR', country: 'ESP', color: '#a50044', color2: '#004d98', founded: 1899 },
  { id: 'real-madrid', name: 'Real Madrid', short: 'RMA', country: 'ESP', color: '#f4f4f4', color2: '#d4a72c', founded: 1902 },
  { id: 'atletico', name: 'Atlético Madrid', short: 'ATM', country: 'ESP', color: '#cb3524', color2: '#272e61', founded: 1903 },
  { id: 'man-united', name: 'Manchester United', short: 'MUN', country: 'ENG', color: '#da291c', color2: '#fbe122', founded: 1878 },
  { id: 'liverpool', name: 'Liverpool', short: 'LIV', country: 'ENG', color: '#c8102e', color2: '#00b2a9', founded: 1892 },
  { id: 'arsenal', name: 'Arsenal', short: 'ARS', country: 'ENG', color: '#ef0107', color2: '#f4f4f4', founded: 1886 },
  { id: 'chelsea', name: 'Chelsea', short: 'CHE', country: 'ENG', color: '#034694', color2: '#f4f4f4', founded: 1905 },
  { id: 'man-city', name: 'Manchester City', short: 'MCI', country: 'ENG', color: '#6cabdd', color2: '#1c2c5b', founded: 1880 },
  { id: 'bayern', name: 'Bayern Munich', short: 'BAY', country: 'GER', color: '#dc052d', color2: '#0066b2', founded: 1900 },
  { id: 'dortmund', name: 'Borussia Dortmund', short: 'BVB', country: 'GER', color: '#fde100', color2: '#121212', founded: 1909 },
  { id: 'juventus', name: 'Juventus', short: 'JUV', country: 'ITA', color: '#1a1a1a', color2: '#f4f4f4', founded: 1897 },
  { id: 'milan', name: 'AC Milan', short: 'MIL', country: 'ITA', color: '#fb090b', color2: '#121212', founded: 1899 },
  { id: 'inter', name: 'Inter', short: 'INT', country: 'ITA', color: '#0068a8', color2: '#121212', founded: 1908 },
  { id: 'psg', name: 'Paris Saint-Germain', short: 'PSG', country: 'FRA', color: '#004170', color2: '#da291c', founded: 1970 },
];

export function getClub(id: string): ClubMeta {
  const c = CLUBS.find((c) => c.id === id);
  if (!c) throw new Error(`Unknown club ${id}`);
  return c;
}
