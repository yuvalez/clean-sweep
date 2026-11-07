import { CHEM_RULES, chemBonus, MAX_PER_PLAYER, type ChemistryReport } from '../../engine/chemistry';
import { getFormation } from '../../engine/formations';
import type { Picks } from '../../engine/types';
import { ltr, playerName, useT } from '../../i18n';
import { flag } from '../nations';
import { RatingBadge } from './common';

function Pips({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" dir="ltr" aria-label={`${n}/${MAX_PER_PLAYER}`}>
      {Array.from({ length: MAX_PER_PLAYER }, (_, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i < n ? 'bg-gold' : 'bg-line'}`} />
      ))}
    </span>
  );
}

const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`;

/** Explains where a team's chemistry comes from, player by player. */
export function ChemistryBreakdown({ formationId, picks, chem, collapsible }: { formationId: string; picks: Picks; chem: ChemistryReport; collapsible?: boolean }) {
  const t = useT();
  const slots = getFormation(formationId).slots.filter((s) => picks[s.id]);
  const total = slots.reduce((a, s) => a + (chem.detail[s.id]?.points ?? 0), 0);
  const max = slots.length * MAX_PER_PLAYER;
  const body = (
    <>
      <ul className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
        <li className="chip bg-panel2 text-ink">📍 {t.chemRuleNatural(CHEM_RULES.natural)}</li>
        <li className="chip bg-gold/15 text-gold">🔗 {t.chemRuleTeammates(CHEM_RULES.perTeammate, CHEM_RULES.maxTeammates)}</li>
        <li className="chip bg-sky-500/15 text-sky-500">🏳️ {t.chemRuleNation(CHEM_RULES.perCompatriot, CHEM_RULES.maxCompatriots)}</li>
        <li className="chip bg-panel2 text-muted">{t.chemRuleCap(MAX_PER_PLAYER)}</li>
      </ul>
      {slots.length === 0 ? (
        <p className="text-sm text-muted">{t.chemEmpty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="py-1 text-start">{t.thPos}</th>
                <th className="text-start">{t.thPlayer}</th>
                <th className="px-1 text-center" title={t.chemNaturalCol}>📍</th>
                <th className="px-1 text-center" title={t.legendTeammates}>🔗</th>
                <th className="px-1 text-center" title={t.chemNationCol}>🏳️</th>
                <th className="ps-2 text-end">{t.chemShort}</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => {
                const p = picks[s.id]!;
                const d = chem.detail[s.id];
                if (!d) return null;
                return (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-1.5 text-[11px] font-semibold text-muted">{s.pos}</td>
                    <td className="max-w-[150px] truncate">
                      <span className="me-1 inline-block align-middle"><RatingBadge rating={p.rating} size="sm" /></span>
                      {p.nation !== '---' && <span className="me-1">{flag(p.nation)}</span>}
                      {playerName(t, p.name)}
                    </td>
                    <td className={`px-1 text-center ${d.natural ? 'text-accent' : 'text-danger'}`}>{d.natural ? '✓' : '✗'}</td>
                    <td className={`px-1 text-center ${d.teammates ? 'text-gold' : 'text-muted'}`}>{d.teammates || '–'}</td>
                    <td className={`px-1 text-center ${d.compatriots ? 'text-sky-500' : 'text-muted'}`}>{d.compatriots || '–'}</td>
                    <td className="ps-2 text-end"><Pips n={d.points} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {slots.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {t.chemSummary(total, max, chem.score)} · <b className="text-ink">{t.chemEffect(ltr(signed(chemBonus(chem.score))))}</b>. {t.chemRange}
        </p>
      )}
    </>
  );
  const head = (
    <span className="flex items-center justify-between gap-2">
      <span className="font-semibold">{t.chemTitle}</span>
      <span className="text-sm text-muted">
        <b className="display text-xl text-gold">{chem.score}</b>/100 · <span dir="ltr">{signed(chemBonus(chem.score))}</span>
      </span>
    </span>
  );
  return collapsible ? (
    <details className="panel group p-4" open>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {head}
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  ) : (
    <div className="panel p-4">
      <div className="mb-3">{head}</div>
      {body}
    </div>
  );
}
