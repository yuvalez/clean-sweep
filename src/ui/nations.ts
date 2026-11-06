const ISO2: Record<string, string> = {
  ESP: 'ES', ITA: 'IT', FRA: 'FR', GER: 'DE', BRA: 'BR', ARG: 'AR', NED: 'NL', POR: 'PT', BEL: 'BE', URU: 'UY',
  IRL: 'IE', CRO: 'HR', DEN: 'DK', SWE: 'SE', POL: 'PL', SUI: 'CH', SRB: 'RS', CMR: 'CM', CHI: 'CL', CIV: 'CI',
  NOR: 'NO', GHA: 'GH', COL: 'CO', USA: 'US', NGA: 'NG', MEX: 'MX', CZE: 'CZ', UKR: 'UA', TUR: 'TR', BIH: 'BA',
  SEN: 'SN', NIR: 'GB', MNE: 'ME', MAR: 'MA', RUS: 'RU', MLI: 'ML', HUN: 'HU', GEO: 'GE', ECU: 'EC', BUL: 'BG',
  ALG: 'DZ', ZIM: 'ZW', SVN: 'SI', SVK: 'SK', ROU: 'RO', LBR: 'LR', KOR: 'KR', GRE: 'GR', GAB: 'GA', EGY: 'EG',
  CRC: 'CR', AUT: 'AT', ARM: 'AM', TRI: 'TT', TOG: 'TG', PER: 'PE', PAR: 'PY', MKD: 'MK', JPN: 'JP', ISL: 'IS',
  IRN: 'IR', GUI: 'GN', FIN: 'FI', CAN: 'CA', BLR: 'BY', BER: 'BM', AUS: 'AU',
};
const SUBDIVISION: Record<string, string> = {
  ENG: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  SCO: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  WAL: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

export function flag(code: string): string {
  if (SUBDIVISION[code]) return SUBDIVISION[code];
  const iso = ISO2[code];
  if (!iso) return '🌱';
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
