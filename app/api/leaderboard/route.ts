import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public endpoint. Returns the top 10 best run per user per mode, ranked by
// either squad rating ("ovr") or campaign results ("results").
//
// Query params:
//   mode = 'pl' | 'cl' | 'll'   (defaults to 'pl')
//   sort = 'ovr' | 'results'    (defaults to 'ovr')
export async function GET(req: Request) {
  const url = new URL(req.url);
  const modeParam = url.searchParams.get('mode');
  const sortParam = url.searchParams.get('sort');
  const mode = modeParam === 'cl' || modeParam === 'll' ? modeParam : 'pl';
  const sort = sortParam === 'results' ? 'results' : 'ovr';

  // We use DISTINCT ON to pick a single best row per user. The ORDER BY
  // inside the subquery determines which row "wins" the DISTINCT ON.
  // The outer ORDER BY then ranks those best rows for the final leaderboard.
  //
  // For CL "results" ranking, we encode the stage as a numeric rank inline.
  const rows = await (async () => {
    if (mode === 'cl' && sort === 'results') {
      const r = await db.execute(sql`
        SELECT * FROM (
          SELECT DISTINCT ON (s."userId")
            s.id, s."userId", s.mode, s."teamName", s.formation, s."clStage",
            s.overall, s.wins, s.draws, s.losses, s.points, s."createdAt",
            COALESCE(u.nickname, u.name) AS user_name, u.image AS user_image,
            CASE s."clStage"
              WHEN 'champion'       THEN 4
              WHEN 'final'          THEN 3
              WHEN 'semi-finals'    THEN 2
              WHEN 'quarter-finals' THEN 1
              WHEN 'group'          THEN 0
              ELSE -1
            END AS stage_rank
          FROM seasons s
          JOIN "user" u ON s."userId" = u.id
          WHERE s.mode = ${mode} AND s.overall IS NOT NULL
          ORDER BY s."userId",
            CASE s."clStage"
              WHEN 'champion'       THEN 4
              WHEN 'final'          THEN 3
              WHEN 'semi-finals'    THEN 2
              WHEN 'quarter-finals' THEN 1
              WHEN 'group'          THEN 0
              ELSE -1
            END DESC,
            s.wins DESC,
            s.losses ASC
        ) sub
        ORDER BY sub.stage_rank DESC, sub.wins DESC, sub.losses ASC
        LIMIT 10
      `);
      return r.rows ?? r;
    }
    if (sort === 'results') {
      // League modes: rank by points, then wins, then fewer losses.
      const r = await db.execute(sql`
        SELECT * FROM (
          SELECT DISTINCT ON (s."userId")
            s.id, s."userId", s.mode, s."teamName", s.formation, s."finalPosition",
            s.overall, s.wins, s.draws, s.losses, s.points, s."createdAt",
            COALESCE(u.nickname, u.name) AS user_name, u.image AS user_image
          FROM seasons s
          JOIN "user" u ON s."userId" = u.id
          WHERE s.mode = ${mode} AND s.overall IS NOT NULL
          ORDER BY s."userId", s.points DESC NULLS LAST, s.wins DESC, s.losses ASC
        ) sub
        ORDER BY sub.points DESC NULLS LAST, sub.wins DESC, sub.losses ASC
        LIMIT 10
      `);
      return r.rows ?? r;
    }
    // sort by squad overall (works for all modes the same way)
    const r = await db.execute(sql`
      SELECT * FROM (
        SELECT DISTINCT ON (s."userId")
          s.id, s."userId", s.mode, s."teamName", s.formation, s."finalPosition", s."clStage",
          s.overall, s.wins, s.draws, s.losses, s.points, s."createdAt",
          COALESCE(u.nickname, u.name) AS user_name, u.image AS user_image
        FROM seasons s
        JOIN "user" u ON s."userId" = u.id
        WHERE s.mode = ${mode} AND s.overall IS NOT NULL
        ORDER BY s."userId", s.overall DESC NULLS LAST
      ) sub
      ORDER BY sub.overall DESC NULLS LAST
      LIMIT 10
    `);
    return r.rows ?? r;
  })();

  return NextResponse.json({ mode, sort, rows });
}
