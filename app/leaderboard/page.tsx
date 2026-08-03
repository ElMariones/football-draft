import Link from 'next/link';
import LeaderboardTabs from './Tabs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function LeaderboardPage({
  searchParams,
}: { searchParams?: { tab?: string } }) {
  const only = searchParams?.tab === 'career' ? 'career' as const
    : searchParams?.tab === 'draft' ? 'draft' as const
      : undefined;
  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-12 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="btn-ghost text-xs inline-block mb-3">← Back</Link>
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide">Leaderboard</h1>
        <p className="text-sm text-white/50 mt-1">
          {only === 'career'
            ? 'Whole careers, ranked. No account needed — the name you give your player is the entry.'
            : 'Draft XI ranks squads and campaigns, best run per player. Career mode ranks whole careers — no account needed, rolled seeds only.'}
        </p>
      </div>
      <LeaderboardTabs only={only} />
    </main>
  );
}
