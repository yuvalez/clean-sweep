import { useMemo, useState } from 'react';
import { sortTable } from '../../engine/competitions/league';
import { ratingMod } from '../../engine/decisions';
import { allSlots, FORMATIONS } from '../../engine/formations';
import { formatPrice } from '../../engine/pricing';
import { USER_ID } from '../../engine/opponents';
import { COMP_ORDER, nextUserFixture, userRecord, type SeasonState } from '../../engine/season';
import type { CompetitionStatus, MatchResult, Mentality, RotationPolicy } from '../../engine/types';
import { dayLabel, fmtMsg, ltr, playerName, slotName, teamName, useT } from '../../i18n';
import { useGame } from '../../store/gameStore';
import { Bracket, LeagueTable, playerNames, scoreLine, TeamName } from '../components/Competition';
import { RatingBadge, Segmented, TeamBadge, TROPHY_ICON } from '../components/common';
import { DecisionPanel } from '../components/Decisions';
import { Pitch } from '../components/Pitch';

type Tab = 'overview' | 'league' | 'europe' | 'cups' | 'squad' | 'results';

const STATUS_CLS: Record<CompetitionStatus['status'], string> = {
  pending: 'border-line bg-panel2 text-muted',
  active: 'border-sky-400/50 bg-sky-400/10 text-sky-300',
  won: 'border-gold bg-gold/15 text-gold',
  runnerUp: 'border-danger/50 bg-danger/10 text-danger',
  eliminated: 'border-danger/50 bg-danger/10 text-danger',
};

function StatusChip({ s, st }: { s: SeasonState; st: CompetitionStatus }) {
  const t = useT();
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 ${STATUS_CLS[st.status]}`} title={st.note && fmtMsg(t, s, st.note)}>
      <span className={`text-lg ${st.status === 'won' ? '' : st.status === 'eliminated' || st.status === 'runnerUp' ? 'grayscale opacity-50' : ''}`}>
        {TROPHY_ICON[st.id]}
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[11px] font-semibold text-ink">{t.comp(st.id, s.setup.country)}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider">{t.status[st.status]}</div>
      </div>
    </div>
  );
}

export function MatchCard({ s, m, names, big }: { s: SeasonState; m: MatchResult; names: Record<string, string>; big?: boolean }) {
  const t = useT();
  const home = s.world.teams[m.homeId];
  const away = s.world.teams[m.awayId];
  const userHome = m.homeId === USER_ID;
  const gf = userHome ? m.hg : m.ag;
  const ga = userHome ? m.ag : m.hg;
  const res = gf > ga ? 'W' : gf < ga ? 'L' : m.pens ? (m.winnerId === USER_ID ? 'W*' : 'L*') : 'D';
  const tone = res.startsWith('W') ? 'text-accent' : res.startsWith('L') ? 'text-danger' : 'text-muted';
  const resText = { W: t.resW, D: t.resD, L: t.resL }[res[0] as 'W' | 'D' | 'L'] + (res.endsWith('*') ? t.resPens : '');
  const goals = (teamId: string) =>
    m.goals
      .filter((g) => g.teamId === teamId)
      .map((g) => `${g.scorer ? names[g.scorer]?.split(' ').slice(-1)[0] ?? '?' : t.goalFallback} ${g.minute}'`);
  return (
    <div className={`rounded-2xl border border-line bg-panel2 ${big ? 'p-4' : 'p-3'}`}>
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
        <span>{TROPHY_ICON[m.comp]} {t.comp(m.comp, s.setup.country)} · {fmtMsg(t, s, m.stage)}</span>
        <span className={`font-bold ${tone}`}>{resText}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 flex-col items-end gap-1 text-end">
          <TeamBadge team={home} size={big ? 40 : 28} />
          <div className={`w-full truncate text-sm ${m.homeId === USER_ID ? 'font-bold text-accent' : 'font-semibold'}`}>{teamName(t, home.name)}</div>
        </div>
        <div className="text-center">
          <div className={`display flex justify-center gap-1 ${big ? 'text-5xl' : 'text-3xl'} tabular leading-none`}>
            <span>{m.hg}</span>
            <span>–</span>
            <span>{m.ag}</span>
          </div>
          {(m.et || m.pens) && <div className="text-[10px] text-muted">{m.pens ? t.pens(m.pens[0], m.pens[1]) : t.aet}</div>}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <TeamBadge team={away} size={big ? 40 : 28} />
          <div className={`w-full truncate text-sm ${m.awayId === USER_ID ? 'font-bold text-accent' : 'font-semibold'}`}>{teamName(t, away.name)}</div>
        </div>
      </div>
      {m.goals.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted">
          <div className="text-end">{ltr(goals(m.homeId).join(', '))}</div>
          <div>{ltr(goals(m.awayId).join(', '))}</div>
        </div>
      )}
    </div>
  );
}

export function Season() {
  const { season: s, playNext, simMatches, simToEnd, goto, rotation, setRotation, abandon } = useGame();
  const t = useT();
  const [tab, setTab] = useState<Tab>('overview');
  const names = useMemo(() => (s ? playerNames(s, t) : {}), [s?.world, t]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return null;
  const user = s.world.teams[USER_ID];
  const rec = userRecord(s);
  const next = nextUserFixture(s);
  const lastMatches = s.userMatches.slice(-4).reverse().map((id) => s.results[id]);
  const recentNews = s.news.slice(-8).reverse();
  const sortedLeague = sortTable(s.league.table);
  const leaguePos = sortedLeague.findIndex((r) => r.teamId === USER_ID) + 1;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TeamBadge team={user} size={44} />
          <div>
            <h1 className="display text-4xl leading-none">{teamName(t, user.name)}</h1>
            <div className="text-xs text-muted tabular">
              {t.seasonLine(rec.played, rec.w, rec.d, rec.l, rec.gf, rec.ga, leaguePos)}
              {s.setup.decisions && <span className="ms-2 font-semibold text-gold" title={t.bankLabel}>{t.bankShort(formatPrice(s.bank))}</span>}
            </div>
          </div>
        </div>
        <button className="text-xs text-muted hover:text-danger" onClick={() => confirm(t.confirmAbandonSeason) && abandon()}>
          {t.abandonRun}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {COMP_ORDER.map((c) => (
          <StatusChip key={c} s={s} st={s.status[c]} />
        ))}
      </div>

      {/* Controls */}
      <div className="panel sticky top-2 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 p-3 shadow-lg shadow-black/20">
        {s.pendingDecision ? (
          <div className="min-w-0 text-sm">
            <div className="font-semibold text-gold">🧠 {t.decisionWaiting}</div>
            <div className="text-xs text-muted">{t.decisionHint}</div>
          </div>
        ) : s.done ? (
          <>
            <div className="font-semibold">{t.fullTime}</div>
            <button className="btn-primary px-6" onClick={() => goto('summary')}>
              {t.seeVerdict}
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0 text-sm">
              <div className="text-[11px] uppercase tracking-wider text-muted">{t.nextUp}</div>
              {next?.oppId ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span>{TROPHY_ICON[next.day.comp]}</span>
                  <span className="truncate font-semibold">
                    {next.home ? t.vs : t.at} {teamName(t, s.world.teams[next.oppId].name)}
                  </span>
                  <RatingBadge rating={s.world.teams[next.oppId].strength.overall} size="sm" />
                  <span className="hidden truncate text-xs text-muted sm:inline">{dayLabel(t, s.setup.country, next.day)}</span>
                </div>
              ) : (
                <div className="font-semibold">{next ? dayLabel(t, s.setup.country, next.day) : t.restOfSeason}</div>
              )}
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
              <button className="btn-primary px-2 sm:px-4" onClick={playNext}>
                {t.playNext}
              </button>
              <button className="btn-ghost px-2 sm:px-4" onClick={() => simMatches(5)}>
                {t.sim5}
              </button>
              <button className="btn-ghost px-2 sm:px-4" onClick={simToEnd}>
                ⏭ <span className="sm:hidden">{t.simEndShort}</span><span className="hidden sm:inline">{t.simEnd}</span>
              </button>
            </div>
          </>
        )}
      </div>

      <DecisionPanel s={s} />

      <div className="mb-4 overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-xl border border-line bg-panel2 p-1">
          {(['overview', 'league', 'europe', 'cups', 'squad', 'results'] as Tab[]).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${tab === id ? 'bg-accent text-black' : 'text-muted hover:text-ink'}`}
            >
              {t.tabs[id]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="flex flex-col gap-3">
            {lastMatches.length === 0 ? (
              <div className="panel p-8 text-center text-muted">
                <div className="text-4xl">⚽</div>
                <div className="mt-2">{t.seasonStarts}</div>
              </div>
            ) : (
              lastMatches.map((m, i) => <MatchCard key={m.id} s={s} m={m} names={names} big={i === 0} />)
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="panel p-4">
              <div className="mb-2 text-sm font-semibold">{t.leagueTop6}</div>
              <LeagueTable
                s={s}
                rows={Object.fromEntries(sortedLeague.slice(0, 6).map((r) => [r.teamId, r]))}
                compact
                highlight={s.world.rivalIds}
              />
            </div>
            <div className="panel p-4">
              <div className="mb-2 text-sm font-semibold">{t.dressingRoom}</div>
              {recentNews.length === 0 ? (
                <p className="text-sm text-muted">{t.allQuiet}</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {recentNews.map((n, i) => (
                    <li key={i} className={n.kind === 'trophy' ? 'text-gold' : n.kind === 'out' ? 'text-danger' : n.kind === 'injury' ? 'text-ink' : 'text-muted'}>
                      {n.kind === 'injury' ? '🚑 ' : n.kind === 'return' ? '✅ ' : ''}
                      {fmtMsg(t, s, n.msg)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'league' && (
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">{t.comp('league', s.setup.country)}</div>
            <div className="text-xs text-muted">{t.leagueLegend}</div>
          </div>
          <LeagueTable s={s} rows={s.league.table} highlight={s.world.rivalIds} />
        </div>
      )}

      {tab === 'europe' && (
        <div className="flex flex-col gap-4">
          <div className="panel p-4">
            <div className="mb-2 font-semibold">{t.knockouts(t.comp('euro', s.setup.country))}</div>
            <Bracket s={s} rounds={s.ko.euro} empty={t.euroDrawNote} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[...s.euroGroups]
              .sort((a, b) => (b.teamIds.includes(USER_ID) ? 1 : 0) - (a.teamIds.includes(USER_ID) ? 1 : 0))
              .map((g) => (
                <div key={g.name} className={`panel p-3 ${g.teamIds.includes(USER_ID) ? 'border-accent/60' : ''}`}>
                  <div className="mb-1 text-sm font-semibold">{t.group(g.name)}</div>
                  <LeagueTable s={s} rows={g.table} compact />
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === 'cups' && (
        <div className="flex flex-col gap-4">
          {(['super', 'cup', 'cwc'] as const).map((c) => (
            <div key={c} className="panel p-4">
              <div className="mb-2 font-semibold">
                {TROPHY_ICON[c]} {t.comp(c, s.setup.country)}
              </div>
              <Bracket
                s={s}
                rounds={s.ko[c]}
                empty={c === 'cwc' ? t.cwcNote : t.notStarted}
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'squad' && <SquadTab s={s} rotation={rotation} setRotation={setRotation} />}

      {tab === 'results' && (
        <div className="panel p-2 sm:p-4">
          {s.userMatches.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">{t.noMatches}</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...s.userMatches].reverse().map((id) => {
                const m = s.results[id];
                const userHome = m.homeId === USER_ID;
                const opp = s.world.teams[userHome ? m.awayId : m.homeId];
                const gf = userHome ? m.hg : m.ag;
                const ga = userHome ? m.ag : m.hg;
                const r = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
                return (
                  <li key={id} className="flex items-center gap-2 px-1 py-2 text-sm">
                    <span className={`w-6 shrink-0 text-center text-xs font-bold ${r === 'W' ? 'text-accent' : r === 'L' ? 'text-danger' : 'text-muted'}`}>{{ W: t.resW, D: t.resD, L: t.resL }[r]}</span>
                    <span className="shrink-0">{TROPHY_ICON[m.comp]}</span>
                    <span className="w-8 shrink-0 text-xs text-muted">{userHome ? t.venueH : m.neutral ? t.venueN : t.venueA}</span>
                    <span className="min-w-0 flex-1">
                      <TeamName team={opp} />
                    </span>
                    <span className="hidden text-xs text-muted sm:inline">{fmtMsg(t, s, m.stage)}</span>
                    <span className="tabular w-28 shrink-0 text-end font-semibold">{scoreLine(m, t)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SquadTab({ s, rotation, setRotation }: { s: SeasonState; rotation: RotationPolicy; setRotation: (r: RotationPolicy) => void }) {
  const t = useT();
  const squad = s.world.teams[USER_ID].squad!;
  const status = Object.fromEntries(Object.values(s.players).map((p) => [p.uid, { fitness: p.fitness, injured: p.injuredFor > 0 }]));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div>
        <Pitch formationId={squad.formationId} picks={squad.picks} status={status} locked />
      </div>
      <div className="flex flex-col gap-4">
        {s.setup.decisions && <TacticsPanel s={s} />}
        <div className="panel p-4">
          <div className="mb-2 text-sm font-semibold">{t.rotationPolicy}</div>
          <Segmented
            size="sm"
            value={rotation}
            onChange={setRotation}
            options={(Object.keys(t.rotation) as RotationPolicy[]).map((r) => ({ value: r, label: t.rotation[r].label }))}
          />
          <p className="mt-2 text-xs text-muted">{t.rotation[rotation].desc}</p>
        </div>
        <div className="panel overflow-x-auto p-3">
          <table className="w-full text-sm tabular">
            <thead>
              <tr className="text-start text-[11px] uppercase tracking-wider text-muted">
                <th className="py-1 text-start">{t.thPos}</th>
                <th className="text-start">{t.thPlayer}</th>
                <th className="w-24 text-start">{t.thFitness}</th>
                <th className="px-1 text-end">{t.thApps}</th>
                <th className="px-1 text-end">{t.thG}</th>
                <th className="px-1 text-end">{t.thA}</th>
              </tr>
            </thead>
            <tbody>
              {allSlots(squad.formationId).map((slot) => {
                const p = squad.picks[slot.id]!;
                const st = s.players[p.uid];
                return (
                  <tr key={slot.id} className="border-t border-line">
                    <td className="py-1.5 text-[11px] font-semibold text-muted">{slotName(t, slot)}</td>
                    <td className="max-w-[160px] truncate">
                      <span className="me-1 inline-block align-middle"><RatingBadge rating={p.rating} size="sm" /></span>
                      {playerName(t, p.name)}
                      <ModChip s={s} uid={p.uid} />
                    </td>
                    <td>
                      {st.injuredFor > 0 ? (
                        <span className="text-xs text-danger" title={st.injury && (t.injuries[st.injury] ?? st.injury)}>{t.injuredGames(st.injuredFor)}</span>
                      ) : (
                        <div className="h-1.5 w-20 overflow-hidden rounded bg-panel2">
                          <div className={`h-full ${st.fitness > 75 ? 'bg-accent' : st.fitness > 55 ? 'bg-gold' : 'bg-danger'}`} style={{ width: `${st.fitness}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-1 text-end">{st.apps}</td>
                    <td className="px-1 text-end">{st.goals}</td>
                    <td className="px-1 text-end">{st.assists}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TacticsPanel({ s }: { s: SeasonState }) {
  const t = useT();
  const { setMentality, changeFormation } = useGame();
  const current = s.world.teams[USER_ID].squad!.formationId;
  return (
    <div className="panel p-4">
      <div className="mb-2 text-sm font-semibold">{t.tactics}</div>
      <Segmented
        size="sm"
        value={s.mentality}
        onChange={(m: Mentality) => setMentality(m)}
        options={(['defensive', 'balanced', 'attacking'] as Mentality[]).map((m) => ({ value: m, label: t.mentality[m].label }))}
      />
      <p className="mt-2 text-xs text-muted">{t.mentality[s.mentality].desc}</p>
      <div className="mb-1.5 mt-4 text-xs font-semibold text-muted">{t.formation}</div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6" dir="ltr">
        {FORMATIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => changeFormation(f.id)}
            className={`display rounded-lg border px-1 py-1.5 text-lg transition ${f.id === current ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-panel2 text-muted hover:border-accent/60 hover:text-ink'}`}
          >
            {f.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t.formationNote}</p>
    </div>
  );
}

/** Shows a player's temporary rating change from decisions (e.g. a sulking star). */
function ModChip({ s, uid }: { s: SeasonState; uid: string }) {
  const t = useT();
  const d = ratingMod(s, uid);
  if (!d) return null;
  const left = Math.min(...s.mods.filter((m) => m.uid === uid && m.rating).map((m) => m.matches));
  return (
    <span className={`chip ms-1 ${d > 0 ? 'bg-accent/20 text-accent' : 'bg-danger/15 text-danger'}`} title={t.modTitle(left)} dir="ltr">
      {d > 0 ? '+' : '−'}{Math.abs(d)}
    </span>
  );
}
