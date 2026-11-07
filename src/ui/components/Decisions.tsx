import { useState } from 'react';
import { candidateCompatriots, candidateLinks } from '../../engine/chemistry';
import {
  DILEMMA_OPTIONS, JANUARY, januaryBudget, januaryCanSign, optionAvailable, saleValue,
} from '../../engine/decisions';
import { allSlots, getFormation } from '../../engine/formations';
import { USER_ID } from '../../engine/opponents';
import { formatPrice } from '../../engine/pricing';
import type { SeasonState } from '../../engine/season';
import type { DecisionEvent, Player } from '../../engine/types';
import { iso, playerName, slotName, teamName, useT, type Dict } from '../../i18n';
import type { DecArgs } from '../../i18n/en';
import { useGame } from '../../store/gameStore';
import { flag } from '../nations';
import { CandidateCard } from '../screens/Draft';
import { RatingBadge } from './common';

function squadPlayer(s: SeasonState, uid?: string): Player | undefined {
  if (!uid) return undefined;
  const all = [...Object.values(s.world.teams[USER_ID].squad!.picks), ...s.departed];
  return all.find((p) => p?.uid === uid) ?? undefined;
}

export function decArgs(t: Dict, s: SeasonState, ev: DecisionEvent): DecArgs {
  const c = ev.ctx ?? {};
  const name = (uid?: string) => iso(playerName(t, squadPlayer(s, uid)?.name ?? '?'));
  return {
    a: name(c.a),
    b: name(c.b),
    amount: formatPrice(c.amount ?? 0),
    n: c.n ?? 0,
    club: c.team ? teamName(t, s.world.teams[c.team]?.name ?? c.team) : '',
  };
}

/** The open decision, if any: a dilemma card or the January window. */
export function DecisionPanel({ s }: { s: SeasonState }) {
  const ev = s.decisions.find((e) => e.id === s.pendingDecision);
  if (!ev) return null;
  return ev.type === 'january' ? <JanuaryWindow s={s} ev={ev} /> : <Dilemma s={s} ev={ev} />;
}

function Dilemma({ s, ev }: { s: SeasonState; ev: DecisionEvent }) {
  const t = useT();
  const decide = useGame((g) => g.decide);
  if (ev.type === 'january') return null;
  const d = t.dec[ev.type];
  const args = decArgs(t, s, ev);
  const involved = [ev.ctx?.a, ev.ctx?.b].map((uid) => squadPlayer(s, uid)).filter((p): p is Player => !!p);
  const opts = DILEMMA_OPTIONS[ev.type];
  return (
    <section className="panel pop mb-4 border-gold/60 p-4 sm:p-5" aria-live="polite">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gold">{t.decisionWaiting}</div>
      <h2 className="display mt-0.5 text-3xl leading-tight">{d.title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">{d.body(args)}</p>
      {involved.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {involved.map((p) => (
            <span key={p.uid} className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel2 px-2 py-1 text-sm">
              <RatingBadge rating={p.rating} size="sm" />
              {p.nation !== '---' && <span>{flag(p.nation)}</span>}
              <span className="font-semibold">{playerName(t, p.name)}</span>
            </span>
          ))}
        </div>
      )}
      <div className={`mt-4 grid gap-2 ${opts.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {opts.map((o) => {
          const ok = optionAvailable(s, ev, o);
          const text = d.opts[o];
          return (
            <button
              key={o}
              disabled={!ok}
              onClick={() => decide(ev.id, o)}
              className="flex flex-col items-stretch justify-start rounded-xl border border-line bg-panel2 p-3 text-start transition hover:-translate-y-0.5 hover:border-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            >
              <span className="font-semibold">{text.label(args)}</span>
              <span className="mt-1 text-xs text-muted">{ok ? text.effect(args) : t.decisionUnavailable}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function JanuaryWindow({ s, ev }: { s: SeasonState; ev: DecisionEvent }) {
  const t = useT();
  const { janScout, janSign, janClose } = useGame();
  const [active, setActive] = useState<string>();
  const squad = s.world.teams[USER_ID].squad!;
  const slots = allSlots(squad.formationId);
  const signings = ev.signings ?? [];
  const full = signings.length >= JANUARY.maxSignings;
  const signedIn = new Set(signings.map((x) => x.in.uid));
  const activeSlot = slots.find((x) => x.id === active);
  const candidates = active ? ev.scouted?.[active] : undefined;

  return (
    <section className="panel pop mb-4 border-gold/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gold">{t.decisionWaiting}</div>
          <h2 className="display mt-0.5 text-3xl leading-tight">{t.janTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t.janIntro(JANUARY.maxSignings, Math.round(JANUARY.saleRate * 100))}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-end">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t.bankLabel}</div>
            <div className="display text-3xl leading-none text-gold">{formatPrice(s.bank)}</div>
            <div className="text-xs text-muted">{t.janSignings(signings.length, JANUARY.maxSignings)}</div>
          </div>
          <button className="btn-primary" onClick={janClose}>
            {t.janClose}
          </button>
        </div>
      </div>

      {activeSlot && candidates ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <b>{t.janScouting(slotName(t, activeSlot), playerName(t, squad.picks[activeSlot.id]!.name))}</b>
              <span className="ms-2 text-muted">{t.janBudgetFor(formatPrice(januaryBudget(s, activeSlot.id)))}</span>
            </div>
            <button className="btn-ghost" onClick={() => setActive(undefined)}>
              {t.janBack}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {candidates.map((c, i) => {
              const budget = januaryBudget(s, activeSlot.id);
              const xi = getFormation(squad.formationId).slots.filter((x) => x.id !== activeSlot.id).map((x) => squad.picks[x.id]!);
              return (
                <CandidateCard
                  key={c.uid}
                  p={c}
                  slot={activeSlot}
                  index={i}
                  affordable={c.price <= budget + 1e-9 && januaryCanSign(ev, activeSlot.id)}
                  maxAfford={budget}
                  links={activeSlot.kind === 'xi' ? candidateLinks(c, xi) : 0}
                  compatriots={activeSlot.kind === 'xi' ? candidateCompatriots(c, xi) : 0}
                  onPick={() => {
                    janSign(activeSlot.id, c.uid);
                    setActive(undefined);
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {full && <p className="mb-2 text-sm font-semibold text-accent">{t.janFull}</p>}
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {slots.map((slot) => {
              const p = squad.picks[slot.id]!;
              const isNew = signedIn.has(p.uid);
              const can = januaryCanSign(ev, slot.id);
              const st = s.players[p.uid];
              return (
                <li key={slot.id} className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-sm ${isNew ? 'border-accent/60 bg-accent/10' : 'border-line bg-panel2'}`}>
                  <span className="w-14 shrink-0 text-[11px] font-semibold text-muted">{slotName(t, slot)}</span>
                  <RatingBadge rating={p.rating} size="sm" />
                  <span className="min-w-0 flex-1 truncate">
                    {playerName(t, p.name)}
                    {st && st.injuredFor > 0 && <span className="ms-1" title={t.injured}>🚑</span>}
                    {isNew && <span className="chip ms-1 bg-accent/20 text-accent">{t.janSignedTag}</span>}
                  </span>
                  {!isNew && <span className="hidden shrink-0 text-[11px] text-muted sm:inline">{t.janSale(formatPrice(saleValue(p)))}</span>}
                  {can && (
                    <button
                      className="shrink-0 rounded-lg border border-line bg-panel px-2 py-1 text-xs font-semibold hover:border-accent"
                      aria-label={t.janReplace}
                      title={t.janReplace}
                      onClick={() => {
                        janScout(slot.id);
                        setActive(slot.id);
                      }}
                    >
                      {ev.scouted?.[slot.id] ? '👀' : '🔍'} <span className="hidden sm:inline">{t.janReplace}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
