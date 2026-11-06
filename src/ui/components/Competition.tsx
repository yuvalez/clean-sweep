import { sortTable } from '../../engine/competitions/league';
import { tieAggregate } from '../../engine/competitions/knockout';
import { USER_ID } from '../../engine/opponents';
import type { SeasonState } from '../../engine/season';
import type { KnockoutRound, MatchResult, TableRow, Team } from '../../engine/types';
import { ltr, playerName, roundName, teamName, useT, type Dict } from '../../i18n';
import { TeamBadge } from './common';

export function playerNames(s: SeasonState, t: Dict): Record<string, string> {
  const out: Record<string, string> = { youth: t.academyKid };
  for (const team of Object.values(s.world.teams)) {
    for (const p of Object.values(team.squad?.picks ?? {})) if (p) out[p.uid] = playerName(t, p.name);
  }
  for (const p of s.departed ?? []) out[p.uid] ??= playerName(t, p.name);
  return out;
}

export function TeamName({ team, bold, short }: { team: Team; bold?: boolean; short?: boolean }) {
  const t = useT();
  const isUser = team.id === USER_ID;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${isUser ? 'text-accent' : ''} ${bold ? 'font-bold' : ''}`}>
      <TeamBadge team={team} size={20} />
      <span className="truncate">{short ? team.short : teamName(t, team.name)}</span>
    </span>
  );
}

export function LeagueTable({ s, rows, compact, highlight = [] }: { s: SeasonState; rows: Record<string, TableRow>; compact?: boolean; highlight?: string[] }) {
  const t = useT();
  const sorted = sortTable(rows);
  const formLetter = { W: t.resW, D: t.resD, L: t.resL };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="text-start text-[11px] uppercase tracking-wider text-muted">
            <th className="w-6 py-1 pe-1 text-start">#</th>
            <th className="py-1 text-start">{t.thTeam}</th>
            <th className="px-1 text-end">{t.thP}</th>
            {!compact && <th className="px-1 text-end">{t.thW}</th>}
            {!compact && <th className="px-1 text-end">{t.thD}</th>}
            {!compact && <th className="px-1 text-end">{t.thL}</th>}
            <th className="px-1 text-end">{t.thGD}</th>
            <th className="px-1 text-end">{t.thPts}</th>
            {!compact && <th className="hidden ps-2 text-start sm:table-cell">{t.thForm}</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const team = s.world.teams[r.teamId];
            const isUser = r.teamId === USER_ID;
            const gd = r.gf - r.ga;
            return (
              <tr key={r.teamId} className={`border-t border-line ${isUser ? 'bg-accent/10' : highlight.includes(r.teamId) ? 'bg-gold/5' : ''}`}>
                <td className="py-1.5 pe-1 text-muted">{i + 1}</td>
                <td className="max-w-[160px] py-1.5">
                  <TeamName team={team} bold={isUser} />
                </td>
                <td className="px-1 text-end text-muted">{r.p}</td>
                {!compact && <td className="px-1 text-end">{r.w}</td>}
                {!compact && <td className="px-1 text-end">{r.d}</td>}
                {!compact && <td className="px-1 text-end">{r.l}</td>}
                <td className="px-1 text-end"><span dir="ltr">{gd > 0 ? '+' : ''}{gd}</span></td>
                <td className="px-1 text-end font-bold">{r.pts}</td>
                {!compact && (
                  <td className="hidden ps-2 sm:table-cell">
                    <span className="flex gap-0.5">
                      {r.form.map((f, j) => (
                        <span key={j} className={`h-2 w-2 rounded-full ${f === 'W' ? 'bg-accent' : f === 'D' ? 'bg-muted' : 'bg-danger'}`} title={formLetter[f]} />
                      ))}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Home-away score with extra-time / penalty suffix, safe inside RTL text. */
export function scoreLine(m: MatchResult, t: Dict): string {
  let s = ltr(`${m.hg}–${m.ag}`);
  if (m.pens) s += ` (${t.pens(m.pens[0], m.pens[1])})`;
  else if (m.et) s += ` ${t.aet}`;
  return s;
}

export function Bracket({ s, rounds, empty }: { s: SeasonState; rounds: KnockoutRound[]; empty: string }) {
  const t = useT();
  if (!rounds.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {rounds.map((r) => (
          <div key={r.name} className="w-[210px] shrink-0">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{roundName(t, r.name)}</div>
            <div className="flex flex-col justify-around gap-2">
              {r.ties.map((tie) => {
                const [aa, bb] = tieAggregate(tie, s.results);
                const played = tie.results.length > 0;
                const userTie = tie.a === USER_ID || tie.b === USER_ID;
                const legs = tie.results.map((id) => s.results[id]);
                const last = legs[legs.length - 1];
                return (
                  <div key={tie.id} className={`rounded-lg border px-2 py-1.5 text-xs ${userTie ? 'border-accent/60 bg-accent/5' : 'border-line bg-panel2'}`}>
                    {[tie.a, tie.b].map((id, k) => (
                      <div key={id} className={`flex items-center justify-between gap-1 ${tie.winnerId && tie.winnerId !== id ? 'opacity-50' : ''}`}>
                        <TeamName team={s.world.teams[id]} bold={tie.winnerId === id} />
                        <span className="tabular font-semibold">{played ? (k === 0 ? aa : bb) : ''}</span>
                      </div>
                    ))}
                    {last && (last.pens || last.et || tie.legs === 2) && (
                      <div className="mt-0.5 text-[10px] text-muted">
                        {tie.legs === 2 ? ltr(legs.map((m) => `${m.hg}–${m.ag}`).join(', ')) : ''}
                        {last.pens ? ` · ${t.pens(last.pens[0], last.pens[1])}` : last.et ? ` · ${t.aet}` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
