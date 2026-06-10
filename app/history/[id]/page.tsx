import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { seasons } from '@/lib/db/schema';
import SeasonReplay from './SeasonReplay';
import type { SeasonResult } from '@/lib/simulation';
import type { CLResult } from '@/lib/championsLeague';
import type { WCResult } from '@/lib/worldCup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function SeasonHistoryPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }
  const [row] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.id, params.id), eq(seasons.userId, session.user.id)));

  if (!row) {
    return (
      <main className="min-h-screen px-4 sm:px-8 py-12 max-w-3xl mx-auto">
        <Link href="/history" className="btn-ghost text-xs inline-block mb-6">← Back</Link>
        <div className="glass p-8 text-center text-white/60">Run not found.</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 sm:px-8 py-6 sm:py-10 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/history" className="btn-ghost text-xs">← Back to history</Link>
        <span className="text-xs text-white/40">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      </div>
      <SeasonReplay
        mode={row.mode as 'pl' | 'cl' | 'll' | 'wc'}
        payload={row.payload as SeasonResult | CLResult | WCResult}
      />
    </main>
  );
}
