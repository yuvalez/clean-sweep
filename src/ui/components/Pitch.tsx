import type { ChemistryReport } from '../../engine/chemistry';
import { BENCH_SLOTS, getFormation } from '../../engine/formations';
import { slotFit } from '../../engine/positions';
import type { Picks, Player, Slot } from '../../engine/types';
import { playerName, slotName, slotToken, useT } from '../../i18n';
import { flag } from '../nations';
import { Price } from './common';

function surname(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) return name;
  const last = parts.slice(1).join(' ');
  return last.length > 13 ? parts[parts.length - 1] : last;
}

interface TokenProps {
  slot: Slot;
  player?: Player;
  active?: boolean;
  disabled?: boolean;
  chem?: number;
  status?: { fitness: number; injured: boolean };
  showPrice?: boolean;
  onClick?: () => void;
}

export function SlotToken({ slot, player, active, disabled, chem, status, showPrice, onClick }: TokenProps) {
  const t = useT();
  const fit = player ? slotFit(player, slot) : 0;
  const clickable = !!onClick && !disabled;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={`group flex w-[58px] flex-col items-center gap-0.5 sm:w-[78px] ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      aria-label={player ? `${slotName(t, slot)}: ${playerName(t, player.name)}` : t.ariaScout(slotName(t, slot))}
    >
      <div
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold shadow-md transition sm:h-12 sm:w-12 ${
          player
            ? 'border-white/80 bg-[#0b1410] text-white'
            : active
              ? 'animate-pulse border-gold bg-gold/30 text-white'
              : clickable
                ? 'border-dashed border-white/70 bg-black/25 text-white/90 group-hover:border-gold group-hover:bg-black/40'
                : 'border-dashed border-white/40 bg-black/20 text-white/50'
        }`}
      >
        {player ? (
          <span className="display text-xl tabular">{player.rating}</span>
        ) : (
          <span className="text-[11px]">{slotToken(t, slot)}</span>
        )}
        {player && fit < 0 && (
          <span className="absolute -bottom-1 -right-1 rounded bg-danger px-1 text-[9px] font-bold text-white" title={t.outOfPositionShort}>
            {fit}
          </span>
        )}
        {player && chem !== undefined && (
          <span className="absolute -left-1 -top-1 flex gap-[1px]" title={t.chemPips(chem)}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < chem ? 'bg-gold' : 'bg-white/25'}`} />
            ))}
          </span>
        )}
        {status?.injured && <span className="absolute -right-1 -top-1 text-xs" title={t.injured}>🚑</span>}
      </div>
      <div className="w-full truncate rounded bg-black/55 px-1 text-center text-[10px] font-semibold leading-4 text-white sm:text-[11px]">
        {player ? (
          <>
            {player.nation !== '---' && <span className="me-0.5">{flag(player.nation)}</span>}
            {surname(playerName(t, player.name))}
          </>
        ) : (
          <span className="opacity-80">{active ? t.scouting : t.scout}</span>
        )}
      </div>
      {status && !status.injured && (
        <div className="h-1 w-10 overflow-hidden rounded bg-black/40">
          <div
            className={`h-full ${status.fitness > 75 ? 'bg-accent' : status.fitness > 55 ? 'bg-gold' : 'bg-danger'}`}
            style={{ width: `${status.fitness}%` }}
          />
        </div>
      )}
      {showPrice && player && (
        <div className="text-[10px] font-medium text-white/80">
          <Price m={player.price} />
        </div>
      )}
    </button>
  );
}

interface PitchProps {
  formationId: string;
  picks: Picks;
  activeSlotId?: string;
  locked?: boolean;
  chem?: ChemistryReport;
  status?: Record<string, { fitness: number; injured: boolean }>;
  showPrice?: boolean;
  onSlot?: (slotId: string) => void;
  showBench?: boolean;
}

export function Pitch({ formationId, picks, activeSlotId, locked, chem, status, showPrice, onSlot, showBench = true }: PitchProps) {
  const t = useT();
  const f = getFormation(formationId);
  const slotById = Object.fromEntries(f.slots.map((s) => [s.id, s]));
  return (
    // The pitch is a diagram: keep it left-to-right in every language.
    <div className="w-full" dir="ltr">
      <div className="pitch-bg relative mx-auto aspect-[68/92] w-full max-w-[460px] overflow-hidden rounded-2xl border-2 border-white/20 shadow-inner">
        {/* markings */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 68 92" preserveAspectRatio="none" aria-hidden>
          <g fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.35">
            <rect x="2" y="2" width="64" height="88" />
            <line x1="2" y1="46" x2="66" y2="46" />
            <circle cx="34" cy="46" r="7" />
            <rect x="15" y="2" width="38" height="13" />
            <rect x="25" y="2" width="18" height="5" />
            <rect x="15" y="77" width="38" height="13" />
            <rect x="25" y="85" width="18" height="5" />
          </g>
        </svg>
        {chem && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {chem.links.map((l, i) => {
              const a = slotById[l.a];
              const b = slotById[l.b];
              if (!a || !b) return null;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={100 - a.y}
                  x2={b.x}
                  y2={100 - b.y}
                  stroke={l.kind === 'teammates' ? 'rgba(250,204,21,.75)' : 'rgba(125,211,252,.6)'}
                  strokeWidth={l.kind === 'teammates' ? 0.9 : 0.6}
                  strokeDasharray={l.kind === 'nation' ? '1.5 1' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        )}
        {f.slots.map((s) => (
          <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${100 - s.y}%` }}>
            <SlotToken
              slot={s}
              player={picks[s.id]}
              active={activeSlotId === s.id}
              disabled={locked || !!picks[s.id] || (!!activeSlotId && activeSlotId !== s.id)}
              chem={chem?.perSlot[s.id]}
              status={status && picks[s.id] ? status[picks[s.id]!.uid] : undefined}
              showPrice={showPrice}
              onClick={onSlot ? () => onSlot(s.id) : undefined}
            />
          </div>
        ))}
      </div>
      {showBench && (
        <div className="mx-auto mt-3 flex max-w-[460px] items-start justify-between gap-0.5 rounded-2xl border-2 border-white/20 bg-[rgb(var(--pitch))] px-1 py-2 sm:gap-1 sm:px-2 brightness-90">
          <span className="display mt-3 hidden rotate-180 text-sm text-white/70 [writing-mode:vertical-rl] sm:inline">{t.bench}</span>
          {BENCH_SLOTS.map((s) => (
            <div key={s.id}>
              <SlotToken
                slot={s}
                player={picks[s.id]}
                active={activeSlotId === s.id}
                disabled={locked || !!picks[s.id] || (!!activeSlotId && activeSlotId !== s.id)}
                status={status && picks[s.id] ? status[picks[s.id]!.uid] : undefined}
                showPrice={showPrice}
                onClick={onSlot ? () => onSlot(s.id) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
