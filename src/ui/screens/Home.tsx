import { useMemo } from 'react';
import { CLUBS, type Country } from '../../data/clubs';
import { LEAGUES } from '../../data/leagues';
import { stintsForClub } from '../../data/players';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../engine/difficulty';
import { formatPrice } from '../../engine/pricing';
import { dailySeed } from '../../engine/rng';
import type { Difficulty } from '../../engine/types';
import { teamName, useT } from '../../i18n';
import { useGame } from '../../store/gameStore';
import { Segmented, TeamBadge, TROPHY_ICON } from '../components/common';

const COMP_ORDER = ['super', 'league', 'cup', 'euro', 'cwc'] as const;

function starPower(clubId: string): number {
  const stars = stintsForClub(clubId).filter((s) => s.rating >= 88).length;
  // 5★ ≈ 28+ elite players (Barça, Real), 1★ ≈ under 8 (Atlético)
  return Math.max(1, Math.min(5, Math.round(stars / 6)));
}

export function Home() {
  const { config, configure, startRun, draft, season, goto, hallOfFame, screen } = useGame();
  const t = useT();
  const power = useMemo(() => Object.fromEntries(CLUBS.map((c) => [c.id, starPower(c.id)])), []);
  const inProgress = (draft || season) && screen === 'home';

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <header className="pb-6 pt-8 text-center sm:pt-12">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">{t.tagline}</div>
        <h1 className="display mt-2 text-6xl leading-none sm:text-8xl">
          {t.brandA} <span className="text-gold">{t.brandB}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          {t.intro}
        </p>
        <div className="mt-4 flex justify-center gap-2 text-2xl" aria-hidden>
          {COMP_ORDER.map((c) => (
            <span key={c}>{TROPHY_ICON[c]}</span>
          ))}
        </div>
      </header>

      {inProgress && (
        <div className="panel mb-6 flex flex-wrap items-center justify-between gap-3 border-accent/50 p-4">
          <div>
            <div className="font-semibold">{t.runInProgress}</div>
            <div className="text-sm text-muted">{season ? t.seasonUnderway(teamName(t, season.setup.teamName)) : t.draftInProgress}</div>
          </div>
          <button className="btn-primary" onClick={() => goto(season ? (season.done ? 'summary' : 'season') : 'draft')}>
            {t.continue}
          </button>
        </div>
      )}

      <section className="panel p-4 sm:p-6">
        <div className="mb-5">
          <Segmented
            value={config.mode}
            onChange={(mode) => configure({ mode })}
            options={[
              { value: 'club', label: t.modeClub, sub: t.modeClubSub },
              { value: 'global', label: t.modeGlobal, sub: t.modeGlobalSub },
            ]}
          />
        </div>

        {config.mode === 'club' ? (
          <div>
            <div className="mb-2 text-sm font-semibold text-muted">{t.chooseClub}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {CLUBS.map((c) => {
                const sel = config.clubId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => configure({ clubId: c.id, country: c.country })}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-start transition ${
                      sel ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-line bg-panel2 hover:border-accent/50'
                    }`}
                  >
                    <TeamBadge team={{ ...c, kind: 'filler' }} size={36} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{teamName(t, c.name)}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted">
                        <span>{LEAGUES[c.country].flag}</span>
                        <span className="text-gold" title={t.starPowerTitle}>
                          {'★'.repeat(power[c.id])}
                          <span className="text-muted/40">{'★'.repeat(5 - power[c.id])}</span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">{t.starPowerNote}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold text-muted">{t.yourLeague}</div>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(LEAGUES) as Country[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => configure({ country: c })}
                    className={`rounded-xl border p-2 text-center transition ${
                      config.country === c ? 'border-accent bg-accent/10' : 'border-line bg-panel2 hover:border-accent/50'
                    }`}
                  >
                    <div className="text-2xl">{LEAGUES[c].flag}</div>
                    <div className="text-[10px] font-semibold text-muted">{t.country[c]}</div>
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <div className="mb-2 text-sm font-semibold text-muted">{t.teamName}</div>
              <input
                value={config.teamName}
                onChange={(e) => configure({ teamName: e.target.value.slice(0, 24) })}
                placeholder={t.teamNamePlaceholder}
                className="w-full rounded-xl border border-line bg-panel2 px-3 py-3 outline-none focus:border-accent"
              />
            </label>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold text-muted">{t.difficulty}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DIFFICULTY_ORDER.map((d: Difficulty) => {
              const cfg = DIFFICULTIES[d];
              const sel = config.difficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => configure({ difficulty: d })}
                  className={`flex flex-col items-stretch justify-start rounded-xl border p-3 text-start transition ${
                    sel ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-line bg-panel2 hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{t.diff[d].label}</span>
                    <span className="display text-xl text-gold">{formatPrice(cfg.budget)}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    {t.rerollsOptions(cfg.rerolls, cfg.candidates)}
                  </div>
                  <div className="mt-1 text-xs text-muted">{t.diff[d].blurb}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-center sm:gap-4">
          <div>
            <div className="mb-2 text-sm font-semibold text-muted">{t.decisionsOption}</div>
            <Segmented
              size="sm"
              value={config.decisions === false ? 'off' : 'on'}
              onChange={(v) => configure({ decisions: v === 'on' })}
              options={[
                { value: 'on', label: `🧠 ${t.decisionsOn}` },
                { value: 'off', label: t.decisionsOff },
              ]}
            />
          </div>
          <p className="text-xs text-muted sm:pt-6">{config.decisions === false ? t.decisionsOffSub : t.decisionsOnSub}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-2 text-sm font-semibold text-muted">{t.seasonSeed}</div>
            <div className="flex flex-wrap gap-2">
              <Segmented
                size="sm"
                value={config.seedMode}
                onChange={(seedMode) => configure({ seedMode })}
                options={[
                  { value: 'random', label: t.seedRandom },
                  { value: 'daily', label: t.seedDaily },
                  { value: 'custom', label: t.seedCustom },
                ]}
              />
              {config.seedMode === 'custom' && (
                <input
                  value={config.customSeed}
                  onChange={(e) => configure({ customSeed: e.target.value.slice(0, 32) })}
                  placeholder={t.seedPlaceholder}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              )}
            </div>
            {config.seedMode === 'daily' && (
              <div className="mt-1 text-xs text-muted">
                {t.dailyNote(dailySeed().slice(6))}
              </div>
            )}
          </div>
          <button className="btn-primary px-8 py-3.5 text-base" onClick={startRun}>
            {t.startDraft}
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="panel p-4 sm:p-6">
          <h2 className="display mb-3 text-2xl">{t.howItWorks}</h2>
          <ol className="space-y-2 text-sm text-muted">
            {t.steps.map(([title, body]) => (
              <li key={title}>
                <b className="text-ink">{title}</b> {body}
              </li>
            ))}
          </ol>
        </div>
        <div className="panel p-4 sm:p-6">
          <h2 className="display mb-3 text-2xl">{t.hallOfFame}</h2>
          {hallOfFame.length === 0 ? (
            <p className="text-sm text-muted">{t.hallEmpty}</p>
          ) : (
            <ul className="space-y-1.5">
              {hallOfFame.slice(0, 8).map((h) => (
                <li key={h.id + h.date} className="flex items-center justify-between gap-2 rounded-lg bg-panel2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {teamName(t, h.team)} <span className="text-xs font-normal text-muted">· {t.diff[h.difficulty].label}</span>
                    </div>
                    <div className="text-[11px] text-muted">
                      {t.hallLine(h.record, h.leagueRecord)}
                      {h.sweepChance !== undefined && t.sweepOddsShort((h.sweepChance * 100).toFixed(0))}
                    </div>
                  </div>
                  <div className="shrink-0 text-lg tracking-tighter" title={t.trophiesCount(h.won.length)}>
                    {h.won.length === 0 ? <span className="text-xs text-muted">—</span> : h.won.map((c) => TROPHY_ICON[c]).join('')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
