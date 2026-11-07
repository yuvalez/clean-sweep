import { FORMATIONS } from '../../engine/formations';
import { LINE_OF } from '../../engine/positions';
import { ltr, useT } from '../../i18n';
import { useGame } from '../../store/gameStore';

function MiniPitch({ id }: { id: string }) {
  const f = FORMATIONS.find((f) => f.id === id)!;
  return (
    <div className="pitch-bg relative aspect-[68/56] w-full overflow-hidden rounded-xl border border-white/20">
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
      {f.slots.map((s) => (
        <span
          key={s.id}
          className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 ${
            LINE_OF[s.pos!] === 'ATT' ? 'bg-gold' : LINE_OF[s.pos!] === 'MID' ? 'bg-sky-400' : LINE_OF[s.pos!] === 'DEF' ? 'bg-white' : 'bg-orange-400'
          }`}
          style={{ left: `${s.x}%`, top: `${100 - s.y}%` }}
          title={s.pos}
        />
      ))}
    </div>
  );
}

export function Formation() {
  const { chooseFormation, goto, seed } = useGame();
  const t = useT();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <button className="mb-4 text-sm text-muted hover:text-ink" onClick={() => goto('home')}>
        {t.back}
      </button>
      <h1 className="display text-5xl">{t.pickShape}</h1>
      <p className="mt-1 text-muted">
        {t.formationIntro}
      </p>
      <p className="mt-1 text-xs text-muted">{t.seed}: <code className="text-ink">{seed}</code></p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {FORMATIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => chooseFormation(f.id)}
            className="panel group flex flex-col items-stretch justify-start p-3 text-start transition hover:-translate-y-0.5 hover:border-accent"
          >
            <MiniPitch id={f.id} />
            <div className="mt-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <span className="display whitespace-nowrap text-3xl leading-none" dir="ltr">{f.name}</span>
              <span className="whitespace-nowrap text-[11px] text-muted">
                {t.atk} {ltr(`${f.attMod >= 0 ? '+' : ''}${f.attMod}`)} · {t.def} {ltr(`${f.defMod >= 0 ? '+' : ''}${f.defMod}`)}
              </span>
            </div>
            <div className="text-xs text-muted">{t.formationBlurb[f.id] ?? f.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
