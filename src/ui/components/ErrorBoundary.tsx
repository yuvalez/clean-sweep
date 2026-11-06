import { Component, type ReactNode } from 'react';
import { getT } from '../../i18n';

const SAVE_KEY = 'clean-sweep-v1';

/** Last line of defence: if a screen crashes (e.g. an incompatible saved game), offer a reset. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Clean Sweep crashed:', error);
  }

  reset = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* storage blocked: reloading still clears the in-memory state */
    }
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const t = getT();
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-5xl">🩹</div>
        <h1 className="display mt-3 text-4xl">{t.crashTitle}</h1>
        <p className="mt-2 text-sm text-muted">{t.crashBody}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn-ghost" onClick={() => location.reload()}>
            {t.crashReload}
          </button>
          <button className="btn-primary" onClick={this.reset}>
            {t.crashReset}
          </button>
        </div>
      </div>
    );
  }
}
