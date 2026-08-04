import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { careerRuns } from '@/lib/db/schema';
import { validateSubmission, type CareerSubmission } from '@/lib/career/submission';

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

  const bad = validateSubmission(body);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  // An unguarded insert turned every database problem into a bare 500 and, on
  // screen, into "Could not submit" with nothing after it — which is how a
  // column that rejected half of all seeds went unnoticed for so long. Say what
  // went wrong, both in the log and to the player.
  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[career-runs] insert failed:', message);
    // The table not existing is the one failure the player can do nothing about
    // and the operator can fix in one command, so name it specifically.
    if (/relation .*careerRun.* does not exist/i.test(message)) {
      return NextResponse.json(
        { error: 'The leaderboard table has not been created yet. Run the migrations.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Could not save the run.' }, { status: 500 });
  }
}
