import { useEffect } from 'react';
import { useT } from './i18n';
import { useGame } from './store/gameStore';
import { Draft } from './ui/screens/Draft';
import { Formation } from './ui/screens/Formation';
import { Home } from './ui/screens/Home';
import { Review } from './ui/screens/Review';
import { Season } from './ui/screens/Season';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { Summary } from './ui/screens/Summary';

export const REPO_URL = 'https://github.com/yuvalez/clean-sweep';

export default function App() {
  const { screen, draft, season, goto, lang, setLang } = useGame();
  const t = useT();

  useEffect(() => {
    document.documentElement.lang = t.locale;
    document.documentElement.dir = t.dir;
    document.title = t.docTitle;
  }, [t]);

  // Guard against stale persisted screens.
  useEffect(() => {
    if ((screen === 'draft' || screen === 'review') && !draft) goto('home');
    if ((screen === 'season' || screen === 'summary') && !season) goto('home');
  }, [screen, draft, season, goto]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-3">
        <button className="display text-xl uppercase tracking-wider text-muted hover:text-ink" onClick={() => goto('home')}>
          {t.brandA} <span className="text-gold">{t.brandB}</span>
        </button>
        <div className="flex items-center gap-3">
          {season && !season.done && screen !== 'season' && (
            <button className="text-xs font-semibold text-accent" onClick={() => goto('season')}>
              {t.backToSeason}
            </button>
          )}
          <button
            className="rounded-lg border border-line bg-panel2 px-2.5 py-1 text-xs font-semibold text-muted hover:border-accent/60 hover:text-ink"
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            aria-label={t.switchToLabel}
            lang={lang === 'he' ? 'en' : 'he'}
          >
            {t.switchTo}
          </button>
        </div>
      </nav>
      <ErrorBoundary>
        {screen === 'home' && <Home />}
        {screen === 'formation' && <Formation />}
        {screen === 'draft' && <Draft />}
        {screen === 'review' && <Review />}
        {screen === 'season' && <Season />}
        {screen === 'summary' && <Summary />}
      </ErrorBoundary>
      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2 text-center text-[11px] leading-relaxed text-muted">
        <p>{t.disclaimer}</p>
        <a className="underline hover:text-ink" href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
          {t.contact}
        </a>
      </footer>
    </div>
  );
}
