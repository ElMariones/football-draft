import Link from 'next/link';
import LeaderboardTabs from './Tabs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-12 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="btn-ghost text-xs inline-block mb-3">← Back</Link>
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide">Leaderboard</h1>
        <p className="text-sm text-white/50 mt-1">
          Best run per player. Draft XI ranks squads and campaigns; career mode ranks
          whole careers, and only ones played on a rolled seed.
        </p>
      </div>
      <LeaderboardTabs />
    </main>
  );
}
