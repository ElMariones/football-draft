import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { seasons } from '@/lib/db/schema';
import { computeAggregates } from '@/lib/leaderboardAggregates';
import type { SeasonResult } from '@/lib/simulation';
import type { CLResult } from '@/lib/championsLeague';
import type { WCResult } from '@/lib/worldCup';

export const runtime = 'nodejs';

// GET — list the current user's saved runs (most recent first).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      xiSummary: seasons.xiSummary,
    })
    .from(seasons)
    .where(eq(seasons.userId, session.user.id))
    .orderBy(desc(seasons.createdAt))
    .limit(100);
  return NextResponse.json({ seasons: rows });
}

// POST — save a completed run.
// Body: { mode, teamName, formation, finalPosition?, clStage?, payload, xiSummary }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: {
    mode?: string;
    teamName?: string;
    formation?: string;
    finalPosition?: number | null;
    clStage?: string | null;
    payload?: unknown;
    xiSummary?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== 'pl' && mode !== 'cl' && mode !== 'll' && mode !== 'wc') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }
  if (!body.teamName || !body.formation || !body.payload || !body.xiSummary) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Compute leaderboard aggregates from the payload at write time so the
  // /api/leaderboard query can sort without parsing jsonb. Tolerate failures —
  // a malformed payload shouldn't block the save.
  let agg: ReturnType<typeof computeAggregates> | null = null;
  try {
    agg = computeAggregates(mode, body.payload as SeasonResult | CLResult | WCResult);
  } catch {
    agg = null;
  }

  const [row] = await db
    .insert(seasons)
    .values({
      userId: session.user.id,
      mode,
      teamName: body.teamName,
      formation: body.formation,
      finalPosition: typeof body.finalPosition === 'number' ? body.finalPosition : null,
      clStage: typeof body.clStage === 'string' ? body.clStage : null,
      payload: body.payload as object,
      xiSummary: body.xiSummary as object,
      overall: agg?.overall ?? null,
      wins: agg?.wins ?? null,
      draws: agg?.draws ?? null,
      losses: agg?.losses ?? null,
      points: agg?.points ?? null,
    })
    .returning({ id: seasons.id });

  return NextResponse.json({ id: row.id });
}
