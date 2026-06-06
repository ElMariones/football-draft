'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Shows up in the browser console (F12 → Console).
    console.error('[FootballDraft] Render error caught by boundary:', error);
    console.error('Component stack:', info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl w-full glass p-6 border border-red-500/40">
            <div className="font-display text-xs tracking-[0.3em] text-red-400 mb-1">
              SOMETHING BROKE
            </div>
            <div className="font-display text-2xl mb-2">Render error</div>
            <pre className="text-xs bg-black/40 p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap text-red-200">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <p className="text-xs text-white/60 mt-3">
              Open the browser console (F12) for the full stack. Click below to try again.
            </p>
            <button onClick={this.reset} className="btn-primary mt-4">
              Reset
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
