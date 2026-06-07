import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { seasons } from '@/lib/db/schema';
import HistoryList from './HistoryList';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }
  const rows = await db
    .select({
      id: seasons.id,
      createdAt: seasons.createdAt,
      mode: seasons.mode,
      teamName: seasons.teamName,
      formation: seasons.formation,
      finalPosition: seasons.finalPosition,
      clStage: seasons.clStage,
    })
    .from(seasons)
    .where(eq(seasons.userId, session.user.id))
    .orderBy(desc(seasons.createdAt))
    .limit(100);

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-12 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="btn-ghost text-xs inline-block mb-3">← Back</Link>
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide">Your Seasons</h1>
        <p className="text-sm text-white/50 mt-1">{rows.length} saved run{rows.length === 1 ? '' : 's'}</p>
      </div>
      <HistoryList initialRows={rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
    </main>
  );
}
