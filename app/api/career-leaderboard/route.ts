import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The Neon driver queries Postgres over fetch(), which Vercel would otherwise
// cache in the framework Data Cache and freeze the board at its first result.
export const fetchCache = 'force-no-store';

// Public. One row per user — their single best career — ranked by the chosen
// column. Only rolled-seed runs are ever in the table, so no filter is needed
// here; the gate is at write time in POST /api/career-runs.
//
// ?sort = score | trophies | goals | overall   (defaults to score)
export async function GET(req: Request) {
  const sortParam = new URL(req.url).searchParams.get('sort');
  const sort =
    sortParam === 'trophies' || sortParam === 'goals' || sortParam === 'overall'
      ? sortParam
      : 'score';

  // DISTINCT ON picks each user's best row; the inner ORDER BY decides which
  // row wins, the outer one ranks the winners.
  // Two fragments, not one: inside the subquery the table is aliased `r`, but
  // the outer ORDER BY sees only the subquery, aliased `best`. Reusing the inner
  // fragment outside produced `ORDER BY r.score` against `best` and failed.
  const inner = {
    score: sql`r.score`,
    trophies: sql`r.trophies`,
    goals: sql`r.goals`,
    overall: sql`r."peakOverall"`,
  }[sort];
  const outer = {
    score: sql`best.score`,
    trophies: sql`best.trophies`,
    goals: sql`best.goals`,
    overall: sql`best."peakOverall"`,
  }[sort];

  try {
    const rows = await db.execute(sql`
      SELECT * FROM (
        SELECT DISTINCT ON (r."userId")
          r.id, r."userId", r.surname, r."nationCode", r.position,
          r.score, r."peakOverall", r."seasonsPlayed", r.trophies,
          r.goals, r.assists, r.apps, r."ballonDors", r.seed,
          r.history, r."createdAt",
          COALESCE(u.nickname, u.name) AS user_name,
          u.image AS user_image
        FROM "careerRun" r
        JOIN "user" u ON r."userId" = u.id
        ORDER BY r."userId", ${inner} DESC, r."createdAt" ASC
      ) best
      ORDER BY ${outer} DESC, best."createdAt" ASC
      LIMIT 50
    `);
    return NextResponse.json({ sort, entries: rows.rows ?? rows });
  } catch (err) {
    // An unmigrated database should render an empty board, not a 500 page — but
    // this must only catch a *missing table*. Matching on the table name alone
    // swallowed a genuine query error and reported it as "not migrated", which
    // is a much more confusing thing to debug than a 500.
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .*careerRun.* does not exist/i.test(msg)) {
      return NextResponse.json({ sort, entries: [], notMigrated: true });
    }
    // eslint-disable-next-line no-console
    console.error('[career-leaderboard] query failed:', msg);
    return NextResponse.json({ sort, entries: [], error: msg }, { status: 500 });
  }
}
