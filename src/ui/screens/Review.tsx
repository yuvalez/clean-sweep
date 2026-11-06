import { chemistry } from '../../engine/chemistry';
import * as D from '../../engine/draft';
import { getFormation } from '../../engine/formations';
import { formatPrice } from '../../engine/pricing';
import { COMP_ORDER } from '../../engine/season';
import { squadStrength } from '../../engine/strength';
import type { RotationPolicy } from '../../engine/types';
import { teamName, useT } from '../../i18n';
import { teamIdentity, useGame } from '../../store/gameStore';
import { Stat, TROPHY_ICON } from '../components/common';
import { Pitch } from '../components/Pitch';

export function Review() {
  const { draft, config, rotation, setRotation, startSeason, goto } = useGame();
  const t = useT();
  if (!draft || !D.isComplete(draft)) return null;
  const squad = D.toSquad(draft);
  const f = getFormation(squad.formationId);
  const xi = Object.fromEntries(f.slots.map((s) => [s.id, squad.picks[s.id]]));
  const chem = chemistry(f, xi);
  const s = squadStrength(squad);
  const id = teamIdentity(config);
  const spent = D.spent(draft.picks);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <button className="mb-3 text-sm text-muted hover:text-ink" onClick={() => goto('draft')}>
        {t.backToDraft}
      </button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <Pitch formationId={squad.formationId} picks={squad.picks} chem={chem} locked />
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider text-accent">{t.diff[config.difficulty].label} · <span dir="ltr">{f.name}</span></div>
            <h1 className="display text-5xl leading-none">{teamName(t, id.teamName)}</h1>
            <p className="mt-2 italic text-muted">{t.pundit(s.overall, chem.score)}</p>
          </div>
          <div className="panel grid grid-cols-3 gap-4 p-4 sm:grid-cols-5">
            <Stat label={t.overall} value={s.overall.toFixed(1)} tone="accent" />
            <Stat label={t.attack} value={s.att.toFixed(1)} />
            <Stat label={t.defence} value={s.def.toFixed(1)} />
            <Stat label={t.chemistry} value={chem.score} tone="gold" />
            <Stat label={t.spent} value={formatPrice(spent)} sub={t.unused(formatPrice(draft.budget - spent))} />
          </div>
          <div className="panel p-4">
            <div className="mb-2 font-semibold">{t.squadRotation}</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(t.rotation) as RotationPolicy[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRotation(r)}
                  className={`flex flex-col items-stretch justify-start rounded-xl border p-3 text-start transition ${rotation === r ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-line bg-panel2 hover:border-accent/50'}`}
                >
                  <div className="text-sm font-semibold">{t.rotation[r].label}</div>
                  <div className="mt-1 text-xs text-muted">{t.rotation[r].desc}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{t.rotationNote}</p>
          </div>
          <div className="panel p-4 text-sm text-muted">
            <div className="mb-1 font-semibold text-ink">{t.seasonAhead}</div>
            {t.seasonAheadDesc(COMP_ORDER.map((c) => `${TROPHY_ICON[c]} ${t.comp(c, id.country)}`).join(t.flowArrow))}
          </div>
          <button className="btn-primary py-4 text-lg" onClick={startSeason}>
            {t.kickOff}
          </button>
        </div>
      </div>
    </div>
  );
}
