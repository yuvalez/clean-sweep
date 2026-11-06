import type { Rng } from '../rng';
import type { MatchResult, TableRow } from '../types';

export type Fixture = [string, string]; // [home, away]

/** Double round robin (circle method). Returns 2*(n-1) rounds; second half mirrors the first. */
export function doubleRoundRobin(teamIds: string[], rng: Rng): Fixture[][] {
  const ids = rng.shuffle(teamIds);
  if (ids.length % 2) ids.push('__bye');
  const n = ids.length;
  const first: Fixture[][] = [];
  const arr = ids.slice();
  for (let r = 0; r < n - 1; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === '__bye' || b === '__bye') continue;
      // alternate home/away so nobody gets long home streaks
      round.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    first.push(round);
    // rotate all but the first
    arr.splice(1, 0, arr.pop()!);
  }
  const second = first.map((round) => round.map(([h, a]) => [a, h] as Fixture));
  return [...first, ...second];
}

export function emptyTable(teamIds: string[]): Record<string, TableRow> {
  const t: Record<string, TableRow> = {};
  for (const id of teamIds) t[id] = { teamId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  return t;
}

export function applyResult(table: Record<string, TableRow>, m: MatchResult): void {
  const h = table[m.homeId];
  const a = table[m.awayId];
  h.p++; a.p++;
  h.gf += m.hg; h.ga += m.ag;
  a.gf += m.ag; a.ga += m.hg;
  const push = (row: TableRow, r: 'W' | 'D' | 'L') => {
    row.form.push(r);
    if (row.form.length > 5) row.form.shift();
  };
  if (m.hg > m.ag) {
    h.w++; h.pts += 3; a.l++;
    push(h, 'W'); push(a, 'L');
  } else if (m.hg < m.ag) {
    a.w++; a.pts += 3; h.l++;
    push(a, 'W'); push(h, 'L');
  } else {
    h.d++; a.d++; h.pts++; a.pts++;
    push(h, 'D'); push(a, 'D');
  }
}

export function sortTable(table: Record<string, TableRow>): TableRow[] {
  return Object.values(table).sort(
    (x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.teamId.localeCompare(y.teamId),
  );
}
