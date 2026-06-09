'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function AuthMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/nickname')
        .then(r => r.ok ? r.json() : null)
        .then(json => { if (json?.nickname) setNickname(json.nickname); })
        .catch(() => {});
    }
  }, [status]);

  async function saveNickname() {
    setNicknameSaving(true);
    try {
      const res = await fetch('/api/user/nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });
      if (res.ok) setEditingNickname(false);
    } finally {
      setNicknameSaving(false);
    }
  }

  if (status === 'loading') {
    return <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn('google')}
        className="btn-icon sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 text-xs flex items-center gap-2"
        title={t.auth.signInTitle}
      >
        <GoogleGlyph />
        <span className="hidden sm:inline">{t.auth.signIn}</span>
      </button>
    );
  }

  const initial = (session.user.name?.[0] ?? session.user.email?.[0] ?? '?').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/40 to-gold/10 border border-gold/40 text-sm font-display flex items-center justify-center overflow-hidden hover:border-gold/70 transition-colors"
        title={session.user.email ?? ''}
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[220px] glass p-2 text-sm">
          <div className="px-3 py-2 border-b border-white/10 mb-1">
            <div className="font-display text-sm truncate">{nickname || session.user.name || t.auth.account}</div>
            {session.user.email && (
              <div className="text-[10px] text-white/50 truncate">{session.user.email}</div>
            )}
          </div>
          {/* Nickname editor */}
          <div className="px-3 py-2 border-b border-white/10 mb-1">
            {editingNickname ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value.slice(0, 24))}
                  placeholder="Nickname"
                  className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold/50"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveNickname(); }}
                />
                <button
                  onClick={saveNickname}
                  disabled={nicknameSaving}
                  className="text-xs px-2 py-1.5 text-gold hover:text-white"
                >
                  {nicknameSaving ? '...' : '✓'}
                </button>
                <button
                  onClick={() => setEditingNickname(false)}
                  className="text-xs px-2 py-1.5 text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingNickname(true)}
                className="text-xs py-1 text-white/50 hover:text-white/80 transition-colors"
              >
                {nickname ? `✏ ${nickname}` : '✏ Set nickname'}
              </button>
            )}
          </div>
          <Link
            href="/history"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-3 py-2 rounded hover:bg-white/5 transition-colors"
          >
            {t.auth.history}
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="block w-full text-left px-3 py-2 rounded hover:bg-white/5 transition-colors text-white/80"
          >
            {t.auth.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.2 8-11.3 8a12 12 0 0 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.6l6.2 5.2A20 20 0 0 0 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
