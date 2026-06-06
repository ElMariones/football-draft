import { NextResponse } from 'next/server';
import { TEAMS } from '@/data';
import { Player, Position } from '@/data/types';
import {
  buildFantasySnapshot,
  simulateSeasonForSnapshot,
} from '@/lib/simulation';
import { buildEmptyXI, canFill, DEFAULT_FORMATION } from '@/lib/draft';

// GET /api/sim-test -> runs a full simulation end-to-end with a random XI
// drafted across teams. Hit this in your browser to verify the season engine
// works independently of UI state.
export async function GET() {
  try {
    const xi = buildEmptyXI(DEFAULT_FORMATION);

    // Walk slots in order, pick the first available compatible player.
    for (let i = 0; i < xi.length; i++) {
      const slot = xi[i];
      let placed = false;
      for (const team of TEAMS) {
        const eraKeys = Object.keys(team.eras);
        for (const eraKey of eraKeys) {
          const era = team.eras[eraKey as keyof typeof team.eras];
          if (!era) continue;
          const cand = era.players.find((p: Player) =>
            canFill(p.position as Position, slot.position),
          );
          if (cand) {
            xi[i] = {
              ...slot,
              player: {
                player: cand,
                sourceTeamId: team.id,
                sourceTeamName: team.name,
                sourceEra: eraKey as any,
              },
            };
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }

    const snapshot = buildFantasySnapshot(xi, {
      formation: DEFAULT_FORMATION,
      name: 'Sim Test XI',
      shortName: 'TST',
    });
    const season = simulateSeasonForSnapshot(snapshot);

    return NextResponse.json({
      ok: true,
      summary: {
        playerTeamId: season.playerTeam.id,
        playerTeamName: season.playerTeam.name,
        ratings: {
          atk: season.playerTeam.attackRating,
          def: season.playerTeam.defenseRating,
          ovr: season.playerTeam.overallRating,
        },
        fixtures: season.fixtures.length,
        allFixtures: season.allFixtures.length,
        tableRows: season.table.length,
        finalPosition: season.finalPosition,
        topScorerName: season.topScorers[0]?.playerName,
        mvpName: season.mvp?.player?.name,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
