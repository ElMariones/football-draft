import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { careerRuns } from '@/lib/db/schema';
import type { CareerSubmission } from '@/lib/career/submission';

export const runtime = 'nodejs';

// GET — the signed-in user's own submitted careers, newest first.
export async function GET() {
  const session = await auth();
  // Anonymous players have no server-side "my runs" — theirs live on the local
  // board. An empty list is the honest answer, not a 401.
  if (!session?.user?.id) return NextResponse.json({ runs: [] });
  const rows = await db
    .select()
    .from(careerRuns)
    .where(eq(careerRuns.userId, session.user.id))
    .orderBy(desc(careerRuns.score))
    .limit(50);
  return NextResponse.json({ runs: rows });
}

/** Reject anything that is not a finishable, plausibly-real career. */
function validate(s: CareerSubmission): string | null {
  if (s.seedSource !== 'random') {
    // The whole point of the board. A typed seed can be retried until the world
    // cooperates, so it is not comparable with a seed you were handed.
    return 'Only runs with a rolled seed are eligible for the leaderboard.';
  }
  if (!s.surname || s.surname.length > 14) return 'Bad surname.';
  if (!s.nationCode || s.nationCode.length > 3) return 'Bad nation.';
  if (!s.position || s.position.length > 4) return 'Bad position.';
  if (!Number.isInteger(s.seed) || s.seed <= 0) return 'Bad seed.';

  // Bounds come straight from the engine's own limits: a career runs from 16 to
  // at most 40, overall is capped at 99, and the score is a linear function of
  // those, so anything outside cannot have come from a real run.
  if (!Number.isFinite(s.score) || s.score < 0 || s.score > 20000) return 'Score out of range.';
  if (s.seasonsPlayed < 1 || s.seasonsPlayed > 25) return 'Seasons out of range.';
  if (s.peakOverall < 40 || s.peakOverall > 99) return 'Overall out of range.';
  if (s.apps < 0 || s.apps > 1400) return 'Apps out of range.';
  if (s.goals < 0 || s.goals > s.apps * 3) return 'Goals out of range.';
  if (s.assists < 0 || s.assists > s.apps * 3) return 'Assists out of range.';
  if (s.trophies < 0 || s.trophies > 400) return 'Trophies out of range.';
  if (s.ballonDors < 0 || s.ballonDors > s.seasonsPlayed) return 'Ballon d\'Or count out of range.';
  if (!s.history || !Array.isArray(s.history.spells)) return 'Missing history.';
  if (s.history.spells.length > 30) return 'History too long.';
  return null;
}

// POST — submit a finished career. No account needed: the name you gave the
// player is the entry. If someone happens to be signed in we link the row so
// their avatar can show, but it is never required.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let body: CareerSubmission;
  try {
    body = (await req.json()) as CareerSubmission;
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const bad = validate(body);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  const [row] = await db
    .insert(careerRuns)
    .values({
      userId,
      surname: body.surname.slice(0, 14),
      nationCode: body.nationCode,
      position: body.position,
      score: Math.round(body.score),
      peakOverall: Math.round(body.peakOverall),
      seasonsPlayed: body.seasonsPlayed,
      trophies: body.trophies,
      goals: body.goals,
      assists: body.assists,
      apps: body.apps,
      ballonDors: body.ballonDors,
      seed: body.seed,
      seedSource: 'random',
      history: body.history,
    })
    .returning({ id: careerRuns.id });

  return NextResponse.json({ ok: true, id: row.id });
}
