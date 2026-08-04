import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { dayKey } from '@/lib/career/daily';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The Neon driver queries Postgres over fetch(), which Vercel would otherwise
// cache in the framework Data Cache and freeze the board at its first result.
export const fetchCache = 'force-no-store';

// Public. One row per user — their single best career — ranked by the chosen
// column. Only rolled-seed runs are ever in the table, so no filter is needed
// here; the gate is at write time in POST /api/career-runs.
//
// ?sort  = score | trophies | goals | overall   (defaults to score)
// ?board = all | daily                          (defaults to all)
//
// The daily board is a different competition, not a filter on the same one:
// everyone on it played the identical world, so the only difference between two
// rows is the decisions taken. Mixing it into the all-time board would compare
// careers that never had the same chances.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const sortParam = params.get('sort');
  const sort =
    sortParam === 'trophies' || sortParam === 'goals' || sortParam === 'overall'
      ? sortParam
      : 'score';
  const daily = params.get('board') === 'daily';
  const day = dayKey();

  // Every run is its own entry. Deduplicating per user was right when an account
  // was required; now that the player's name is the entry, most rows have no
  // user at all and DISTINCT ON (userId) would collapse every anonymous career
  // in the table into a single line.
  const col = {
    score: sql`r.score`,
    trophies: sql`r.trophies`,
    goals: sql`r.goals`,
    overall: sql`r."peakOverall"`,
  }[sort];

  // Today only for the daily board; everything else excludes daily runs, since
  // a world handed to everyone is not comparable with one rolled for you alone.
  const scope = daily
    ? sql`WHERE r."seedSource" = 'daily' AND r."dayKey" = ${day}`
    : sql`WHERE r."seedSource" IS DISTINCT FROM 'daily'`;

  try {
    const rows = await db.execute(sql`
      SELECT
        r.id, r."userId", r.surname, r."nationCode", r.position,
        r.score, r."peakOverall", r."seasonsPlayed", r.trophies,
        r.goals, r.assists, r.apps, r."ballonDors", r.seed,
        r.history, r."createdAt",
        COALESCE(u.nickname, u.name) AS user_name,
        u.image AS user_image
      FROM "careerRun" r
      LEFT JOIN "user" u ON r."userId" = u.id
      ${scope}
      ORDER BY ${col} DESC, r."createdAt" ASC
      LIMIT 50
    `);
    // `seed` is bigint, and the driver hands int8 back as a *string* to protect
    // precision it does not know it has. This is raw SQL, so drizzle's column
    // mappers do not run — normalise here or the board ships a string behind a
    // field the client has typed as a number. A 32-bit seed is exact in a JS
    // number with 21 bits to spare.
    const entries = ((rows.rows ?? rows) as Record<string, unknown>[]).map(r => ({
      ...r,
      seed: r.seed == null ? null : Number(r.seed),
    }));
    return NextResponse.json({ sort, board: daily ? 'daily' : 'all', day: daily ? day : undefined, entries });
  } catch (err) {
    // An unmigrated database should render an empty board, not a 500 page — but
    // this must only catch a *missing table*. Matching on the table name alone
    // swallowed a genuine query error and reported it as "not migrated", which
    // is a much more confusing thing to debug than a 500.
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .*careerRun.* does not exist/i.test(msg)) {
      return NextResponse.json({ sort, board: daily ? 'daily' : 'all', entries: [], notMigrated: true });
    }
    // eslint-disable-next-line no-console
    console.error('[career-leaderboard] query failed:', msg);
    return NextResponse.json({ sort, board: daily ? 'daily' : 'all', entries: [], error: msg }, { status: 500 });
  }
}
