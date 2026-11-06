import { useId, type ReactNode } from 'react';
import { formatPrice } from '../../engine/pricing';
import type { Team } from '../../engine/types';
import { useT } from '../../i18n';
import { crestFor, monogramColors, patternShapes, SHAPE_PATH } from '../crest';

export function TeamBadge({
  team, size = 28,
}: { team: Pick<Team, 'short' | 'color' | 'color2' | 'kind'> & Partial<Pick<Team, 'id' | 'name'>>; size?: number }) {
  const t = useT();
  const uid = useId().replace(/:/g, '');
  const spec = crestFor(team);
  const path = SHAPE_PATH[spec.shape];
  const { rects, polys } = patternShapes(spec.pattern);
  const mono = monogramColors(spec);
  const showText = size >= 26;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-sm">
        <defs>
          <clipPath id={`c${uid}`}>
            <path d={path} />
          </clipPath>
          <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#c${uid})`}>
          <rect width="100" height="100" fill={spec.c1} />
          {rects.map(([x, y, w, h], i) => (
            <rect key={`r${i}`} x={x} y={y} width={w} height={h} fill={spec.c2} />
          ))}
          {polys.map((pts, i) => (
            <polygon key={`p${i}`} points={pts} fill={spec.c2} />
          ))}
          {spec.ring && <circle cx="50" cy="50" r="39" fill="none" stroke={spec.ring} strokeWidth="9" />}
          <rect width="100" height="100" fill={`url(#g${uid})`} />
        </g>
        <path d={path} fill="none" stroke={spec.trim} strokeWidth="6" strokeLinejoin="round" />
        {showText && (
          <text
            x="50"
            y="51"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Bebas Neue', Impact, sans-serif"
            fontSize={spec.text.length > 3 ? 24 : 30}
            letterSpacing="1"
            fill={mono.fill}
            stroke={mono.stroke}
            strokeWidth="5"
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            {spec.text}
          </text>
        )}
      </svg>
      {team.kind === 'legends' && (
        <span className="absolute -end-1 -top-1 text-[10px]" title={t.legendsTitle}>⭐</span>
      )}
    </span>
  );
}

export function RatingBadge({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const r = Math.round(rating);
  const tone =
    r >= 93 ? 'bg-gold text-black' : r >= 88 ? 'bg-accent text-black' : r >= 80 ? 'bg-sky-400 text-black' : r >= 72 ? 'bg-panel2 text-ink border border-line' : 'bg-panel2 text-muted border border-line';
  const dims = size === 'lg' ? 'h-12 w-12 text-2xl' : size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-9 w-9 text-base';
  return <span className={`display inline-flex shrink-0 items-center justify-center rounded-lg ${tone} ${dims} tabular`}>{r}</span>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'gold' | 'accent' | 'danger' }) {
  const color = tone === 'gold' ? 'text-gold' : tone === 'accent' ? 'text-accent' : tone === 'danger' ? 'text-danger' : 'text-ink';
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`display text-2xl leading-tight tabular ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Meter({ value, max = 100, tone = 'accent', marker }: { value: number; max?: number; tone?: 'accent' | 'gold' | 'danger'; marker?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = tone === 'gold' ? 'bg-gold' : tone === 'danger' ? 'bg-danger' : 'bg-accent';
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-panel2">
      <div className={`h-full rounded-full ${bg} transition-all duration-500`} style={{ width: `${pct}%` }} />
      {marker !== undefined && (
        <div className="absolute top-0 h-full w-0.5 bg-ink/70" style={{ insetInlineStart: `${Math.max(0, Math.min(100, (marker / max) * 100))}%` }} />
      )}
    </div>
  );
}

export function Price({ m, className = '' }: { m: number; className?: string }) {
  return <span className={`tabular ${className}`}>{formatPrice(m)}</span>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <h2 className="display text-2xl tracking-wide">{children}</h2>
      {right}
    </div>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, size = 'md',
}: { value: T; options: { value: T; label: ReactNode; sub?: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="grid gap-1.5 rounded-xl border border-line bg-panel2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-2 ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'} font-semibold transition ${
            value === o.value ? 'bg-accent text-black shadow' : 'text-muted hover:text-ink'
          }`}
        >
          <div>{o.label}</div>
          {o.sub && <div className={`text-[10px] font-medium ${value === o.value ? 'text-black/70' : 'text-muted'}`}>{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}

export const TROPHY_ICON: Record<string, string> = { super: '🛡️', league: '🏆', cup: '🏺', euro: '⭐', cwc: '🌍' };
