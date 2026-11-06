import { useEffect, useMemo, useState } from 'react';
import { USER_ID } from '../../engine/opponents';
import { COMP_ORDER, trophies, userRecord } from '../../engine/season';
import { fmtMsg, teamName, useT } from '../../i18n';
import { saveToHall, useGame } from '../../store/gameStore';
import { playerNames } from '../components/Competition';
import { Meter, Stat, TROPHY_ICON } from '../components/common';

export function Summary() {
  const { season: s, odds, oddsProgress, computeOdds, playAgain, abandon, seed } = useGame();
  const t = useT();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    saveToHall();
    void computeOdds();
  }, [computeOdds]);
  const names = useMemo(() => (s ? playerNames(s, t) : {}), [s, t]);
  if (!s) return null;
  const won = trophies(s);
  const rec = userRecord(s);
  const lt = s.league.table[USER_ID];
  const players = Object.values(s.players);
  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];
  const topAssist = [...players].sort((a, b) => b.assists - a.assists)[0];
  const ironman = [...players].sort((a, b) => b.apps - a.apps)[0];
  const sweep = won.length === 5;

  const achievements = [
    { id: 'sweep', icon: '🧹', got: sweep },
    { id: 'perfect', icon: '💯', got: lt.w === 38 },
    { id: 'invincible', icon: '🛡️', got: lt.l === 0 },
    { id: 'unbeaten', icon: '🧱', got: rec.l === 0 },
    { id: 'centurions', icon: '💪', got: lt.pts >= 100 },
    { id: 'machine', icon: '🎯', got: (topScorer?.goals ?? 0) >= 60 },
  ].map((a) => ({ ...a, ...t.achievements[a.id] }));

  const team = teamName(t, s.setup.teamName);
  const diffLabel = t.diff[s.setup.difficulty].label;
  const share = [
    t.shareTitle(team, diffLabel),
    COMP_ORDER.map((c) => (won.includes(c) ? TROPHY_ICON[c] : '⬛')).join(''),
    t.shareLine(won.length, lt.w, lt.d, lt.l, lt.pts, `${rec.w}-${rec.d}-${rec.l}`),
    odds ? t.shareOdds((odds.sweep * 100).toFixed(0)) : '',
    t.shareSeed(seed),
  ]
    .filter(Boolean)
    .join('\n');

  const luck = odds ? won.length - odds.avgTrophies : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6">
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">{team} · {diffLabel}</div>
        <h1 className={`display pop mt-1 text-6xl leading-none sm:text-8xl ${sweep ? 'text-gold' : ''}`}>{t.headlines[won.length]}</h1>
        <p className="mt-2 text-muted">{t.sublines[won.length]}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {COMP_ORDER.map((c, i) => {
          const st = s.status[c];
          const got = st.status === 'won';
          return (
            <div
              key={c}
              style={{ animationDelay: `${i * 120}ms` }}
              className={`pop panel flex flex-col items-center p-4 text-center ${got ? 'border-gold bg-gold/10' : ''}`}
            >
              <div className={`text-5xl ${got ? '' : 'opacity-25 grayscale'}`}>{TROPHY_ICON[c]}</div>
              <div className="mt-2 text-sm font-semibold">{t.comp(c, s.setup.country)}</div>
              <div className={`text-[11px] ${got ? 'text-gold' : 'text-danger'}`}>{st.note ? fmtMsg(t, s, st.note) : got ? t.won : t.lost}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="panel grid grid-cols-2 gap-4 p-4">
          <Stat label={t.allComps} value={<span dir="ltr">{`${rec.w}-${rec.d}-${rec.l}`}</span>} sub={t.scoredConceded(rec.gf, rec.ga)} />
          <Stat label={t.league} value={<span dir="ltr">{`${lt.w}-${lt.d}-${lt.l}`}</span>} sub={t.points(lt.pts)} />
          <Stat label={t.topScorer} value={topScorer?.goals ?? 0} sub={topScorer ? names[topScorer.uid] : '—'} tone="gold" />
          <Stat label={t.topAssists} value={topAssist?.assists ?? 0} sub={topAssist ? names[topAssist.uid] : '—'} />
          <Stat label={t.everPresent} value={ironman?.apps ?? 0} sub={ironman ? t.appsOf(names[ironman.uid]) : '—'} />
          <Stat label={t.matches} value={rec.played} sub={t.inFiveComps} />
        </div>

        <div className="panel p-4">
          <div className="mb-2 font-semibold">{t.oddsTitle}</div>
          {!odds ? (
            <div>
              <p className="mb-2 text-sm text-muted">{t.replaying}</p>
              <Meter value={oddsProgress} max={300} />
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-muted">{t.sweepChance}</span>
                <span className="display text-3xl text-gold">{(odds.sweep * 100).toFixed(odds.sweep < 0.1 ? 1 : 0)}%</span>
              </div>
              {COMP_ORDER.map((c) => (
                <div key={c} className="grid grid-cols-[1fr_120px_44px] items-center gap-2">
                  <span className="truncate text-muted">{TROPHY_ICON[c]} {t.comp(c, s.setup.country)}</span>
                  <Meter value={odds.perComp[c] * 100} tone={won.includes(c) ? 'gold' : 'accent'} />
                  <span className="text-end tabular">{Math.round(odds.perComp[c] * 100)}%</span>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted">
                {t.expected(odds.avgTrophies.toFixed(1), won.length)}{' '}
                {luck > 0.8 ? t.luckGood : luck < -0.8 ? t.luckBad : t.luckFair}
                {odds.perfect > 0 && t.perfectRuns((odds.perfect * 100).toFixed(1))}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="panel mt-4 p-4">
        <div className="mb-3 font-semibold">{t.achievementsTitle}</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {achievements.map((a) => (
            <div key={a.id} className={`flex items-center gap-3 rounded-xl border p-3 ${a.got ? 'border-gold/60 bg-gold/10' : 'border-line bg-panel2 opacity-60'}`}>
              <span className={`text-2xl ${a.got ? '' : 'grayscale'}`}>{a.icon}</span>
              <div>
                <div className="text-sm font-semibold">{a.name}</div>
                <div className="text-[11px] text-muted">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="btn-primary px-8 py-3" onClick={playAgain}>
          {t.playAgain}
        </button>
        <button
          className="btn-ghost px-6 py-3"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(share);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              prompt(t.copyPrompt, share);
            }
          }}
        >
          {copied ? t.copied : t.share}
        </button>
        <button className="btn-ghost px-6 py-3" onClick={abandon}>
          {t.newSetup}
        </button>
      </div>
    </div>
  );
}
