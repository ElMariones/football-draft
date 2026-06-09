'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

interface Row {
  id: string;
  createdAt: string;
  mode: string;
  teamName: string;
  formation: string;
  finalPosition: number | null;
  clStage: string | null;
  manager?: string | null;
}

const MODE_LABEL: Record<string, { label: string; color: string }> = {
  pl: { label: 'Premier League', color: '#FFD700' },
  cl: { label: 'Champions League', color: '#3DA9FC' },
  ll: { label: 'La Liga', color: '#C8102E' },
};

export default function HistoryList({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const t = useT();

  async function handleDelete(id: string) {
    if (!confirm(t.history.deleteConfirm)) return;
    const res = await fetch(`/api/seasons/${id}`, { method: 'DELETE' });
    if (res.ok) setRows(rows.filter(r => r.id !== id));
  }

  if (rows.length === 0) {
    return (
      <div className="glass p-8 text-center text-white/60">
        {t.history.empty}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(r => {
        const m = MODE_LABEL[r.mode] ?? { label: r.mode, color: '#888' };
        const outcome =
          r.mode === 'cl' && r.clStage
            ? t.history.clStage(r.clStage)
            : r.finalPosition
            ? t.history.finalPos(r.finalPosition)
            : '';
        return (
          <div key={r.id} className="glass p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-display tracking-widest uppercase px-2 py-0.5 rounded"
                style={{ background: `${m.color}22`, color: m.color, border: `1px solid ${m.color}66` }}
              >
                {m.label}
              </span>
              <span className="text-[10px] text-white/40">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="font-display text-lg leading-tight truncate">{r.teamName}</div>
            <div className="text-xs text-white/60">
              {r.formation} · {outcome}
            </div>
            {r.manager && r.manager !== 'You' && (
              <div className="text-[11px] text-white/45 truncate">🧠 {r.manager}</div>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
              <button
                onClick={() => handleDelete(r.id)}
                className="text-[10px] text-white/40 hover:text-red-300 transition-colors uppercase tracking-widest"
              >
                {t.history.delete}
              </button>
              <Link href={`/history/${r.id}`} className="text-xs text-gold hover:underline">
                {t.history.open}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
