// One-off smoke test for the World Cup engine: simulates many tournaments and
// asserts structural invariants. Run with: npx tsx scripts/wc-smoke.ts
import { simulateWorldCup, wcToCompactJSON } from '../lib/worldCup';
import { snapshotTeam } from '../lib/simulation';
import { WC_TEAMS, availableEras } from '../data';
import { buildManagerPool } from '../data/managers';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error('FAIL:', msg);
  }
}

// Data sanity: every nation era has >= 16 players, exactly 1+ GK in first 11,
// and 11+ players for the starting XI.
for (const team of WC_TEAMS) {
  const eras = availableEras(team);
  assert(eras.length >= 4, `${team.id} has only ${eras.length} editions`);
  for (const era of eras) {
    const squad = team.eras[era]!;
    assert(squad.players.length >= 16, `${team.id} ${era} has ${squad.players.length} players`);
    const starters = squad.players.slice(0, 11);
    const gks = starters.filter(p => p.position === 'GK').length;
    assert(gks === 1, `${team.id} ${era} has ${gks} GKs in starting XI`);
    assert(!!squad.manager, `${team.id} ${era} missing manager`);
    for (const p of squad.players) {
      assert(p.overall >= 60 && p.overall <= 99, `${team.id} ${era} ${p.name} overall ${p.overall}`);
    }
  }
}

const managerPool = buildManagerPool(WC_TEAMS);
assert(managerPool.length >= 30, `manager pool too small: ${managerPool.length}`);

const stages = new Set<string>();
for (let i = 0; i < 300; i++) {
  const team = WC_TEAMS[i % WC_TEAMS.length];
  const era = availableEras(team)[i % availableEras(team).length];
  const snap = snapshotTeam(team, era);
  const r = simulateWorldCup(snap);

  assert(r.groups.length === 4, 'must have 4 groups');
  r.groups.forEach(g => {
    assert(g.matches.length === 6, `group ${g.letter} has ${g.matches.length} matches`);
    assert(g.table.every(row => row.played === 3), `group ${g.letter} teams must play 3`);
  });
  assert(r.knockout.length === 8, `knockout must have 8 ties, got ${r.knockout.length}`);
  assert(r.knockout.filter(t => t.round === 'quarter-finals').length === 4, 'need 4 QFs');
  assert(r.knockout.filter(t => t.round === 'semi-finals').length === 2, 'need 2 SFs');
  assert(r.knockout.filter(t => t.round === 'third-place').length === 1, 'need third-place match');
  assert(r.knockout.filter(t => t.round === 'final').length === 1, 'need a final');
  assert(r.champion.id !== r.runnerUp.id, 'champion != runner-up');
  assert(r.thirdPlace.id !== r.champion.id && r.thirdPlace.id !== r.runnerUp.id, 'third != finalists');
  // Every knockout tie has a decisive winner.
  for (const tie of r.knockout) {
    const drawn = tie.match.home.goals === tie.match.away.goals;
    assert(!drawn || !!tie.shootout, `${tie.round}: draw without shootout`);
    assert(tie.winner.id === tie.home.id || tie.winner.id === tie.away.id, 'winner must be a participant');
  }
  stages.add(r.playerStage);
  // Stage / match count coherence.
  const counts: Record<string, number> = {
    group: 3, 'quarter-finals': 4, 'semi-finals': 6, 'third-place': 6, final: 6, champion: 6,
  };
  assert(r.playerMatches.length === counts[r.playerStage],
    `stage ${r.playerStage} but ${r.playerMatches.length} player matches`);
  // Compact JSON must serialize.
  assert(wcToCompactJSON(r).length > 100, 'compact JSON too short');
}

console.log('Stages seen across 300 sims:', [...stages].sort().join(', '));
assert(stages.has('champion'), 'no champion run in 300 sims (suspicious)');
assert(stages.has('group'), 'no group exit in 300 sims (suspicious)');

if (failures === 0) {
  console.log('✅ WC smoke test passed');
} else {
  console.error(`❌ ${failures} failures`);
  process.exit(1);
}
