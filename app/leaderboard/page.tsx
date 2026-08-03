import LeaderboardHeader from './Header';
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
      <LeaderboardHeader only={only} />
      <LeaderboardTabs only={only} />
    </main>
  );
}
