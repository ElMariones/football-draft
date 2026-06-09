// Seeds the public leaderboard with plausible runs from fictional users so the
// app feels lively before real players show up. Uses the real draft + sim code,
// so every seeded run is a fully replayable season (payload, XI, manager).
//
// Squads are intentionally mid-tier (player cap ~82-86 OVR, no elite managers)
// and runs that finish too high (top-3 league / CL final+) are re-simulated, so
// real users can climb past the bots.
//
// Run: npx tsx scripts/seed-leaderboard.ts
// Safe to re-run: previous seed data is wiped first (seed users keep their ids).

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { like } from 'drizzle-orm';
import { users, seasons } from '../lib/db/schema';
import { EraKey, Formation, Team } from '../data/types';
import { buildManagerPool } from '../data/managers';
import { buildEmptyXI, canFill, DraftSlot, MODES, Mode } from '../lib/draft';
import { buildFantasySnapshot, simulateSeasonForSnapshot } from '../lib/simulation';
import { simulateCLSeason } from '../lib/championsLeague';
import { computeAggregates } from '../lib/leaderboardAggregates';
import { pickOne, randInt } from '../lib/random';

const DATABASE_URL = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '');
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set (expected in .env.local).');
  process.exit(1);
}
const db = drizzle(neon(DATABASE_URL));

// ---------- fixture data ----------

interface SeedUser {
  id: string;
  name: string;
  nickname: string;
}

const SEED_USERS: SeedUser[] = [
  { id: 'seed-user-01', name: 'Dani Romero',    nickname: 'DaniElMister' },
  { id: 'seed-user-02', name: 'Tom Whitfield',  nickname: 'KopKing88' },
  { id: 'seed-user-03', name: 'Marta Vidal',    nickname: 'TikiTakaMarta' },
  { id: 'seed-user-04', name: 'Olly Burns',     nickname: 'RouteOneOlly' },
  { id: 'seed-user-05', name: 'Iker Zubeldia',  nickname: 'LaCanteraIker' },
  { id: 'seed-user-06', name: 'Carlo Bensi',    nickname: 'CatenaccioCarlo' },
  { id: 'seed-user-07', name: 'Sophie Hart',    nickname: 'FalseNineSophie' },
  { id: 'seed-user-08', name: 'Pablo Ferrer',   nickname: 'DoblePivote' },
  { id: 'seed-user-09', name: 'Greg Hansen',    nickname: 'GegenGreg' },
  { id: 'seed-user-10', name: 'Lucía Mendez',   nickname: 'VamosLucia' },
  { id: 'seed-user-11', name: 'Ben Okafor',     nickname: 'WingPlayBen' },
  { id: 'seed-user-12', name: 'Álex Cano',      nickname: 'MediapuntaAlex' },
];

const TEAM_NAMES = [
  'Vintage Vipers', 'Old School XI', 'The Throwbacks', 'Retro Royals',
  'Midweek Legends', 'Bargain Bin FC', 'Second Ballers', 'Park the Bus FC',
  'Counter Attack XI', 'Sunday League Heroes', 'The Journeymen', 'Cult Heroes XI',
  'Golden Oldies', 'The Underdogs', 'Mixtape FC', 'Throwback Thunder',
];

const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '4-5-1', '3-4-3'];

// ---------- squad generation ----------

// Drafts a deliberately mid-tier XI: players capped at `maxOvr`, drawn from
// random club-eras of the mode's pool, respecting position compatibility.
function draftMidXI(pool: Team[], formation: Formation, maxOvr: number): DraftSlot[] {
  const xi = buildEmptyXI(formation);
  for (let i = 0; i < xi.length; i++) {
    const slot = xi[i];
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const team = pickOne(pool);
      const eraKeys = Object.keys(team.eras) as EraKey[];
      const eraKey = pickOne(eraKeys);
      const era = team.eras[eraKey];
      if (!era) continue;
      // Loosen the cap as attempts climb so GK-scarce formations always fill.
      const cap = attempt < 150 ? maxOvr : 99;
      const candidates = era.players.filter(
        p => canFill(p.position, slot.position) && p.overall <= cap,
      );
      if (candidates.length === 0) continue;
      const p = pickOne(candidates);
      xi[i] = {
        ...slot,
        player: {
          player: p,
          sourceTeamId: team.id,
          sourceTeamName: team.name,
          sourceEra: eraKey,
        },
      };
      placed = true;
    }
    if (!placed) throw new Error(`Could not fill slot ${slot.position}`);
  }
  return xi;
}

function initialsOf(name: string): string {
  return name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 3).join('').toUpperCase() || 'XI';
}

function randomPastDate(maxDaysAgo = 21): Date {
  const ms = randInt(maxDaysAgo * 24 * 60) * 60 * 1000 + randInt(60_000);
  return new Date(Date.now() - ms);
}

// ---------- run generation ----------

function generateRun(mode: Mode, teamName: string) {
  const pool = MODES[mode].pool;
  const maxOvr = 82 + randInt(5); // 82-86 player cap → squads land ~75-82 overall
  // Keep seeded managers below elite level so bots don't get the best boosts.
  const managerPool = buildManagerPool(pool).filter(m => m.overall <= 87);

  for (let attempt = 0; attempt < 8; attempt++) {
    const formation = pickOne(FORMATIONS);
    const xi = draftMidXI(pool, formation, maxOvr);
    const manager = pickOne(managerPool);
    const snapshot = buildFantasySnapshot(xi, {
      formation,
      name: teamName,
      shortName: initialsOf(teamName),
      manager: manager.name,
      managerRating: manager.overall,
      managerSource: `${manager.teamName} ${manager.era}`,
      colors:
        mode === 'cl'
          ? { primary: '#3DA9FC', secondary: '#0a0a0f' }
          : mode === 'll'
          ? { primary: '#C8102E', secondary: '#FFFFFF' }
          : undefined,
    });

    const xiSummary = xi.map(s => ({
      slot: s.position,
      name: s.player!.player.name,
      position: s.player!.player.position,
      overall: s.player!.player.overall,
      teamId: s.player!.sourceTeamId,
      teamName: s.player!.sourceTeamName,
      era: s.player!.sourceEra,
    }));

    if (mode === 'cl') {
      const result = simulateCLSeason(snapshot);
      // No bot lifts the trophy or reaches the final — leave that to humans.
      if (result.playerStage === 'champion' || result.playerStage === 'final') continue;
      return { formation, payload: result, xiSummary, finalPosition: null, clStage: result.playerStage };
    }

    const season = simulateSeasonForSnapshot(snapshot, pool);
    // Skip podium finishes to keep the board beatable.
    if (season.finalPosition <= 3) continue;
    return { formation, payload: season, xiSummary, finalPosition: season.finalPosition, clStage: null };
  }
  return null; // extremely unlucky — caller just skips this run
}

// ---------- main ----------

async function main() {
  console.log('Wiping previous seed data…');
  await db.delete(seasons).where(like(seasons.userId, 'seed-user-%'));

  const modes: Mode[] = ['pl', 'll', 'cl'];
  const usedTeamNames = new Set<string>();
  let inserted = 0;

  for (const u of SEED_USERS) {
    await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        email: `${u.id}@seed.footballdraft.app`,
      })
      .onConflictDoNothing();

    // 1-3 runs per user, each in a random mode (no duplicate mode per user so
    // they spread across the three leaderboards).
    const runCount = 1 + randInt(3);
    const userModes = [...modes].sort(() => Math.random() - 0.5).slice(0, runCount);

    for (const mode of userModes) {
      const available = TEAM_NAMES.filter(n => !usedTeamNames.has(n));
      const teamName = available.length ? pickOne(available) : pickOne(TEAM_NAMES);
      usedTeamNames.add(teamName);

      const run = generateRun(mode, teamName);
      if (!run) {
        console.warn(`  ${u.nickname}: could not generate a modest ${mode} run, skipping`);
        continue;
      }

      const agg = computeAggregates(mode, run.payload as any);
      await db.insert(seasons).values({
        userId: u.id,
        createdAt: randomPastDate(),
        mode,
        teamName,
        formation: run.formation,
        finalPosition: run.finalPosition,
        clStage: run.clStage,
        payload: run.payload,
        xiSummary: run.xiSummary,
        overall: agg.overall,
        wins: agg.wins,
        draws: agg.draws,
        losses: agg.losses,
        points: agg.points,
      });
      inserted++;
      const outcome = mode === 'cl' ? run.clStage : `#${run.finalPosition}`;
      console.log(`  ${u.nickname}: ${mode} · "${teamName}" · OVR ${agg.overall} · ${outcome}`);
    }
  }

  console.log(`Done. Inserted ${inserted} seeded runs for ${SEED_USERS.length} users.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
