'use client';

import { Component, ReactNode } from 'react';
import { translations, Language } from '@/lib/i18n';

interface Props { children: ReactNode }
interface State { error: Error | null }

function getLang(): Language {
  try {
    const v = localStorage.getItem('football-draft-lang') as Language | null;
    if (v === 'en' || v === 'es') return v;
    return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch { return 'en'; }
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[FootballDraft] Render error caught by boundary:', error);
    console.error('Component stack:', info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const t = translations[getLang()].error;
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl w-full glass p-6 border border-red-500/40">
            <div className="font-display text-xs tracking-[0.3em] text-red-400 mb-1">
              {t.title}
            </div>
            <div className="font-display text-2xl mb-2">{t.heading}</div>
            <pre className="text-xs bg-black/40 p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap text-red-200">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <p className="text-xs text-white/60 mt-3">{t.help}</p>
            <button onClick={this.reset} className="btn-primary mt-4">
              {t.reset}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
