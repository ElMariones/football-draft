// One-shot: walk every row in `seasons`, compute leaderboard aggregates from
// the stored payload, and write them back. Safe to re-run — rows already
// populated will simply be rewritten with the same values.
//
// Run: node scripts/backfill-aggregates.mjs
//
// Requires DATABASE_URL (loaded from .env.local).
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';

loadEnv({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

function clStageRank(stage) {
  switch (stage) {
    case 'champion':       return 4;
    case 'final':          return 3;
    case 'semi-finals':    return 2;
    case 'quarter-finals': return 1;
    case 'group':          return 0;
    default:               return -1;
  }
}

function fromLeague(s) {
  const row = (s.table ?? []).find(r => r.teamId === s.playerTeam?.id);
  return {
    overall: Math.round(s.playerTeam?.overallRating ?? 0),
    wins:    row?.won    ?? 0,
    draws:   row?.drawn  ?? 0,
    losses:  row?.lost   ?? 0,
    points:  row?.points ?? 0,
  };
}

function fromCL(r) {
  const playerId = r.playerTeam?.id;
  let wins = 0, draws = 0, losses = 0;

  const grp = (r.groups ?? []).find(g => g.teamIds?.includes(playerId));
  for (const m of grp?.matches ?? []) {
    const involved = m.home.teamId === playerId || m.away.teamId === playerId;
    if (!involved) continue;
    const mine  = m.home.teamId === playerId ? m.home.goals : m.away.goals;
    const their = m.home.teamId === playerId ? m.away.goals : m.home.goals;
    if (mine > their) wins++; else if (mine === their) draws++; else losses++;
  }
  for (const tie of r.knockout ?? []) {
    for (const leg of [tie.leg1, tie.leg2].filter(Boolean)) {
      const involved = leg.home.teamId === playerId || leg.away.teamId === playerId;
      if (!involved) continue;
      const mine  = leg.home.teamId === playerId ? leg.home.goals : leg.away.goals;
      const their = leg.home.teamId === playerId ? leg.away.goals : leg.home.goals;
      if (mine > their) wins++; else if (mine === their) draws++; else losses++;
    }
  }
  return {
    overall: Math.round(r.playerTeam?.overallRating ?? 0),
    wins, draws, losses,
    points: null,
  };
}

const rows = await sql`SELECT id, mode, payload FROM seasons`;
console.log(`Backfilling ${rows.length} rows…`);

let ok = 0, fail = 0;
for (const r of rows) {
  try {
    const agg = r.mode === 'cl' ? fromCL(r.payload) : fromLeague(r.payload);
    await sql`
      UPDATE seasons
      SET overall = ${agg.overall},
          wins    = ${agg.wins},
          draws   = ${agg.draws},
          losses  = ${agg.losses},
          points  = ${agg.points}
      WHERE id = ${r.id}
    `;
    ok++;
  } catch (e) {
    console.error(`Row ${r.id} (mode=${r.mode}) failed:`, e.message);
    fail++;
  }
}
console.log(`Done. OK: ${ok}, failed: ${fail}.`);
