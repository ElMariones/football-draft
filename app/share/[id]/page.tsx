import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { seasons, users } from '@/lib/db/schema';
import type { SeasonResult } from '@/lib/simulation';
import type { CLResult } from '@/lib/championsLeague';
import type { Metadata } from 'next';
import Link from 'next/link';
import ShareView from './ShareView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [row] = await db
    .select({
      id: seasons.id,
      mode: seasons.mode,
      teamName: seasons.teamName,
      formation: seasons.formation,
      finalPosition: seasons.finalPosition,
      clStage: seasons.clStage,
      userId: seasons.userId,
    })
    .from(seasons)
    .where(eq(seasons.id, params.id));

  if (!row) {
    return { title: 'Football Draft — Not Found' };
  }

  const [user] = await db
    .select({ nickname: users.nickname, name: users.name })
    .from(users)
    .where(eq(users.id, row.userId));

  const displayName = user?.nickname || user?.name || 'Someone';
  const modeLabel = row.mode === 'cl' ? 'Champions League' : row.mode === 'll' ? 'La Liga' : 'Premier League';
  const resultText = row.mode === 'cl'
    ? (row.clStage === 'champion' ? 'won the Champions League!' : `reached the ${row.clStage}`)
    : `finished #${row.finalPosition}`;

  const title = `${displayName}'s XI — ${row.teamName}`;
  const description = `${displayName} ${resultText} in ${modeLabel} with ${row.teamName} (${row.formation}). Can you do better?`;

  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [`${baseUrl}/api/og?id=${row.id}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/api/og?id=${row.id}`],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const [row] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, params.id));

  if (!row) {
    return (
      <main className="min-h-screen px-4 sm:px-8 py-12 max-w-3xl mx-auto">
        <Link href="/" className="btn-ghost text-xs inline-block mb-6">← Home</Link>
        <div className="glass p-8 text-center text-white/60">Run not found or has been deleted.</div>
      </main>
    );
  }

  const [user] = await db
    .select({ nickname: users.nickname, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, row.userId));

  return (
    <main className="min-h-screen px-4 sm:px-8 py-6 sm:py-10 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="btn-ghost text-xs">← Play Football Draft</Link>
        <span className="text-xs text-white/40">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      </div>
      <ShareView
        mode={row.mode as 'pl' | 'cl' | 'll'}
        teamName={row.teamName}
        formation={row.formation}
        finalPosition={row.finalPosition}
        clStage={row.clStage}
        payload={row.payload as SeasonResult | CLResult}
        xiSummary={row.xiSummary as any[]}
        userName={user?.nickname || user?.name || 'Anonymous'}
        userImage={user?.image || null}
      />
    </main>
  );
}
