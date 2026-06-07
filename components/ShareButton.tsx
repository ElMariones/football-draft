'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useT } from '@/lib/i18n';

interface Props {
  seasonId?: string | null;
  mode: 'pl' | 'cl' | 'll';
  teamName: string;
  result: string;
}

export default function ShareButton({ seasonId, mode, teamName, result }: Props) {
  const { status } = useSession();
  const [copied, setCopied] = useState(false);
  const t = useT();

  if (status !== 'authenticated' || !seasonId) return null;

  const shareUrl = `${window.location.origin}/share/${seasonId}`;
  const modeLabel = mode === 'cl' ? 'Champions League' : mode === 'll' ? 'La Liga' : 'Premier League';
  const shareText = `My team "${teamName}" finished ${result} in ${modeLabel} on Football Draft! Can you do better?`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Football Draft — ${teamName}`, text: shareText, url: shareUrl });
        return;
      } catch {
        // User cancelled or share API failed — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={handleShare} className="btn-ghost text-sm flex items-center gap-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      {copied ? t.postSim.copied : t.postSim.share}
    </button>
  );
}
