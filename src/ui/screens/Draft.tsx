import { useEffect, useMemo, useRef, useState } from 'react';
import { getClub } from '../../data/clubs';
import { candidateCompatriots, candidateLinks, chemistry, wereTeammates } from '../../engine/chemistry';
import * as D from '../../engine/draft';
import { getFormation } from '../../engine/formations';
import { slotFit } from '../../engine/positions';
import { formatPrice, MIN_PRICE } from '../../engine/pricing';
import { squadStrength } from '../../engine/strength';
import type { Player, Slot } from '../../engine/types';
import { ltr, playerName, slotName, teamName, useT, type Dict } from '../../i18n';
import { poolFor, useGame } from '../../store/gameStore';
import { flag } from '../nations';
import { Meter, Price, RatingBadge, Stat } from '../components/common';
import { ChemistryBreakdown } from '../components/Chemistry';
import { Pitch } from '../components/Pitch';

function fitLabel(t: Dict, fit: number): { text: string; cls: string } {
  if (fit === 0) return { text: t.fitNatural, cls: 'text-accent' };
  if (fit === -1) return { text: t.fitComfortable, cls: 'text-accent/80' };
  return { text: t.fitOut(fit), cls: 'text-danger' };
}

export function CandidateCard({
  p, slot, affordable, maxAfford, links, compatriots = 0, index, onPick,
}: { p: Player; slot: Slot; affordable: boolean; maxAfford: number; links: number; compatriots?: number; index: number; onPick: () => void }) {
  const t = useT();
  const fit = slotFit(p, slot);
  const fl = fitLabel(t, fit);
  return (
    <button
      type="button"
      disabled={!affordable}
      onClick={onPick}
      style={{ animationDelay: `${index * 110}ms` }}
      className={`flip-in group relative flex w-full flex-col rounded-2xl border p-3 text-start transition ${
        affordable ? 'border-line bg-panel2 hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/10' : 'cursor-not-allowed border-line/60 bg-panel2/50'
      }`}
    >
      <div className={`flex items-start gap-3 ${affordable ? '' : 'opacity-45 grayscale'}`}>
        <RatingBadge rating={p.rating} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-tight">{playerName(t, p.name)}</div>
          <div className="mt-0.5 text-xs text-muted">
            {p.nation !== '---' && <span className="me-1">{flag(p.nation)}</span>}
            {p.club === 'academy' ? t.academy : ltr(`${p.from}–${p.to}`)}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {p.pos.map((pos, i) => (
              <span key={pos} className={`chip ${i === 0 ? 'bg-ink/15 text-ink' : 'bg-panel text-muted'}`}>{pos}</span>
            ))}
          </div>
        </div>
      </div>
      <div className={`mt-2 text-[11px] font-medium ${fl.cls} ${affordable ? '' : 'opacity-45'}`}>{slot.kind === 'xi' ? fl.text : t.squadPlayer}</div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-1 pt-2">
        <div className="flex flex-wrap gap-1">
          {p.bargain && <span className="chip bg-accent/20 text-accent">{t.bargain}</span>}
          {links > 0 && <span className="chip bg-gold/20 text-gold">{t.teammatesChip(links)}</span>}
          {compatriots > 0 && <span className="chip bg-sky-500/15 text-sky-500">{flag(p.nation)} {t.compatriotsChip(compatriots)}</span>}
        </div>
        <Price m={p.price} className={`display text-2xl ${affordable ? 'text-gold' : 'text-danger'}`} />
      </div>
      {!affordable && (
        <div className="absolute inset-x-2 top-2 rounded-lg bg-danger/90 px-2 py-1 text-center text-[11px] font-semibold text-white">
          {t.overBudget(formatPrice(Math.max(0, maxAfford)))}
        </div>
      )}
    </button>
  );
}

export function Draft() {
  const { draft, config, seed, spin, reroll, pick, goto, abandon } = useGame();
  const t = useT();
  const [revealing, setRevealing] = useState(false);
  const scoutRef = useRef<HTMLDivElement>(null);
  const pool = useMemo(() => poolFor(config, seed), [config.mode, config.clubId, config.era, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draft?.activeSlotId) return;
    setRevealing(true);
    if (window.innerWidth < 1024) scoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const t = setTimeout(() => setRevealing(false), 550);
    return () => clearTimeout(t);
  }, [draft?.spinCount, draft?.activeSlotId]);

  if (!draft) return null;
  const f = getFormation(draft.formationId);
  const slots = D.slotsOf(draft);
  const active = slots.find((s) => s.id === draft.activeSlotId);
  const remaining = D.remaining(draft);
  const empties = D.emptySlots(draft);
  const maxAfford = D.maxAffordable(draft);
  const complete = D.isComplete(draft);
  const xi: Record<string, Player | undefined> = {};
  for (const s of f.slots) xi[s.id] = draft.picks[s.id];
  const chem = chemistry(f, xi);
  const xiPlayers = Object.values(xi).filter(Boolean) as Player[];
  const avgXi = xiPlayers.length ? xiPlayers.reduce((a, p) => a + p.rating, 0) / xiPlayers.length : 0;
  const strength = complete ? squadStrength(D.toSquad(draft)) : undefined;
  const emptyXi = empties.filter((s) => s.kind === 'xi').length;
  const emptyBench = empties.length - emptyXi;
  const guide = emptyXi > 0 ? Math.max(MIN_PRICE, (remaining - emptyBench * 3) / emptyXi) : remaining / Math.max(1, emptyBench);
  const poolLabel = config.mode === 'club' ? t.poolClub(teamName(t, getClub(config.clubId).name)) : config.era === 'active' ? t.poolGlobalActive : t.poolGlobal;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="display text-4xl leading-none">{t.theDraft}</h1>
          <div className="text-xs text-muted">
            {poolLabel} · {t.poolInfo(pool.length, f.name)} · {t.seed} <code>{seed}</code>
          </div>
        </div>
        <button className="text-xs text-muted hover:text-danger" onClick={() => confirm(t.confirmAbandonRun) && abandon()}>
          {t.abandonRun}
        </button>
      </div>

      <div className="panel sticky top-1 z-20 mb-3 flex items-center justify-between gap-2 px-3 py-2 text-xs lg:hidden">
        <span><b className="display text-lg text-gold">{formatPrice(remaining)}</b> {t.leftShort}</span>
        <span>{t.slotsShort(empties.length)}</span>
        <span>🔄 {draft.rerollsLeft}</span>
        <span>{t.chemShort} <b className="text-accent">{chem.score}</b></span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div>
          <Pitch
            formationId={draft.formationId}
            picks={draft.picks}
            activeSlotId={draft.activeSlotId}
            chem={chem}
            showPrice
            onSlot={(id) => !draft.activeSlotId && spin(id)}
          />
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px] text-muted">
            <span><span className="me-1 inline-block h-0.5 w-4 bg-gold align-middle" />{t.legendTeammates}</span>
            <span><span className="me-1 inline-block h-0.5 w-4 border-t border-dashed border-sky-300 align-middle" />{t.legendCompatriots}</span>
            <span><span className="me-1 inline-block h-1.5 w-1.5 rounded-full bg-gold align-middle" />{t.legendPips}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="panel grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <Stat label={t.budgetLeft} value={formatPrice(remaining)} sub={t.ofBudget(formatPrice(draft.budget))} tone={remaining < empties.length * 3 ? 'danger' : 'gold'} />
            <Stat label={t.slotsLeft} value={empties.length} sub={empties.length ? t.perStarter(formatPrice(guide)) : t.squadComplete} />
            <Stat label={t.rerolls} value={draft.rerollsLeft} sub={t.reScout} />
            <Stat
              label={strength ? t.teamOverall : t.xiAverage}
              value={strength ? strength.overall.toFixed(1) : avgXi ? avgXi.toFixed(1) : '—'}
              sub={t.chemistryN(chem.score)}
              tone="accent"
            />
            <div className="col-span-2 sm:col-span-4">
              <Meter value={draft.budget - remaining} max={draft.budget} tone="gold" />
            </div>
          </div>

          {active && draft.candidates ? (
            <div ref={scoutRef} className="panel scroll-mt-16 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t.scoutingReport}</div>
                  <div className="display text-3xl leading-none">{slotName(t, active)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{t.maxSpend} <b className="text-ink">{formatPrice(maxAfford)}</b></span>
                  <button className="btn-ghost" disabled={draft.rerollsLeft <= 0 || revealing} onClick={reroll}>
                    {t.reroll(draft.rerollsLeft)}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {revealing
                  ? draft.candidates.map((c) => <div key={c.uid} className="shimmer h-[150px] rounded-2xl" />)
                  : draft.candidates.map((c, i) => (
                      <CandidateCard
                        key={`${draft.spinCount}-${c.uid}`}
                        p={c}
                        slot={active}
                        index={i}
                        affordable={D.canAfford(draft, c)}
                        maxAfford={maxAfford}
                        links={active.kind === 'xi' ? candidateLinks(c, xiPlayers) : 0}
                        compatriots={active.kind === 'xi' ? candidateCompatriots(c, xiPlayers) : 0}
                        onPick={() => pick(c.uid)}
                      />
                    ))}
              </div>
              <p className="mt-3 text-xs text-muted">{t.mustSign(formatPrice(MIN_PRICE))}</p>
            </div>
          ) : complete ? (
            <div className="panel pop flex flex-col items-center gap-3 p-6 text-center">
              <div className="text-4xl">✅</div>
              <div className="display text-3xl">{t.squadComplete}</div>
              <p className="max-w-md text-sm text-muted">
                {strength && t.completeLine(strength.att.toFixed(1), strength.def.toFixed(1), chem.score)}
                {config.decisions === false ? t.unspent : t.unspentKitty}
              </p>
              <button className="btn-primary px-8 py-3" onClick={() => goto('review')}>
                {t.reviewSquad}
              </button>
            </div>
          ) : (
            <div className="panel p-6 text-center">
              <div className="text-3xl">🔍</div>
              <div className="display mt-1 text-2xl">{t.tapToScout}</div>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                {t.tapToScoutDesc}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {empties.map((s) => (
                  <button key={s.id} className="chip border border-line bg-panel2 px-3 py-1 text-xs hover:border-accent" onClick={() => spin(s.id)}>
                    {slotName(t, s)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <SquadList draft={draft} />
          <ChemistryBreakdown formationId={draft.formationId} picks={draft.picks} chem={chem} collapsible />
        </div>
      </div>
    </div>
  );
}

function SquadList({ draft }: { draft: D.DraftState }) {
  const t = useT();
  const slots = D.slotsOf(draft);
  const picked = slots.filter((s) => draft.picks[s.id]);
  if (!picked.length) return null;
  const xiPicked = picked.filter((s) => s.kind === 'xi').map((s) => draft.picks[s.id]!);
  return (
    <div className="panel p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t.signed}</div>
      <ul className="divide-y divide-line text-sm">
        {picked.map((s) => {
          const p = draft.picks[s.id]!;
          const mates = s.kind === 'xi' ? xiPicked.filter((o) => wereTeammates(p, o)).length : 0;
          return (
            <li key={s.id} className="flex items-center gap-2 py-1.5">
              <span className="w-14 shrink-0 text-[11px] font-semibold text-muted">{slotName(t, s)}</span>
              <RatingBadge rating={p.rating} size="sm" />
              <span className="min-w-0 flex-1 truncate">
                {p.nation !== '---' && <span className="me-1">{flag(p.nation)}</span>}
                {playerName(t, p.name)}
                {mates > 0 && <span className="ms-1 text-[11px] text-gold">🔗{mates}</span>}
              </span>
              <Price m={p.price} className="text-xs text-muted" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
