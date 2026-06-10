// Verifies every World Cup squad has a Spanish flavour line and the
// localization helpers resolve in both languages.
import { WC_TEAMS, availableEras, getTeam, NATIONS_ES, localizedTeamName, localizedEraNotes } from '../data';
import { eraDisplayLabel } from '../data/eras';

const spain = getTeam('spain')!;
console.log('[es]', eraDisplayLabel('2010', 'es'), '|', localizedTeamName(spain, 'es'), '|', localizedEraNotes('spain', '2010', spain.eras['2010']!.notes, 'es'));
console.log('[en]', eraDisplayLabel('2010', 'en'), '|', localizedTeamName(spain, 'en'), '|', localizedEraNotes('spain', '2010', spain.eras['2010']!.notes, 'en'));

let missing = 0;
for (const t of WC_TEAMS) {
  for (const e of availableEras(t)) {
    if (!NATIONS_ES[t.id]?.notes[e]) {
      missing++;
      console.error('missing es note:', t.id, e);
    }
  }
}
console.log(missing === 0 ? '✅ all squads have Spanish notes' : `❌ ${missing} missing`);
if (missing > 0) process.exit(1);
