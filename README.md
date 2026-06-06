# Football Draft ⚽

Spin a Premier League team. Pick one player. Do it 11 times. Then watch your fantasy XI play a full 38-game season and get an AI-written verdict.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Zustand** for game state
- **OpenAI** (`gpt-4o-mini`) for end-of-season analysis (server route, user-supplied key)

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How it plays

1. Pick a difficulty:
   - **Easy** — 1 team reroll + 1 era reroll *per pick*.
   - **Normal** — 3 team rerolls + 3 era rerolls shared across the whole 11-pick draft.
   - **Sandbox** — unlimited rerolls.
2. Hit SPIN. Two reels (team + era) settle on a Premier League side from a random era. Their full XI is shown on the left; your empty 4-3-3 fantasy pitch is on the right.
3. Optional: spend a reroll to change the team (keeping the era) or the era (keeping the team).
4. Click a player you like. Compatible empty slots on your XI glow gold. Click a slot to place them.
5. Repeat until your XI is full.
6. Click **Start Season** and watch all 38 matchdays animate, with a live league table re-sorting between rounds.
7. See the headline result (position, W/D/L, points), MVP, league top scorers, and per-player stats.
8. Click **Get AI Season Analysis** and your season JSON goes to `gpt-4o-mini`, which writes a 4-paragraph verdict.

## Project layout

```
app/
  page.tsx              -- main screen, phase router
  layout.tsx
  globals.css
  api/analyze/route.ts  -- OpenAI server proxy

components/
  SpinWheel.tsx
  DifficultyPicker.tsx
  PoolView.tsx          -- the rolled team's XI (clickable to pick)
  FantasyXIBoard.tsx    -- your XI with empty slots / placement highlights
  Pitch.tsx             -- (kept for future reuse: full XI on a pitch)
  PlayerCard.tsx
  SeasonView.tsx        -- match-by-match playback + live table
  FinalResults.tsx
  AIAnalysisView.tsx
  ApiKeyModal.tsx

data/
  types.ts              -- Player / Team / TeamEra / Formation / EraKey
  eras.ts               -- 7 era buckets: 90-95, 95-00, ..., 20-25
  formations.ts         -- formation → 11 (x,y) slots on a 100x100 pitch
  helpers.ts            -- eraTBD() placeholder helper
  index.ts              -- TEAMS registry
  teams/                -- one file per club (20 clubs)

lib/
  randomizer.ts         -- spin / reroll logic
  draft.ts              -- difficulty config, position compatibility, XI helpers
  simulation.ts         -- Poisson match sim, season builder, fantasy XI snapshot
  storage.ts            -- localStorage for API key

store/
  gameStore.ts          -- Zustand state machine for the draft + season
```

## Difficulty modes

Defined in `lib/draft.ts → DIFFICULTIES`:

```ts
easy:    perPick: { team: 1, era: 1 }
normal:  global:  { team: 3, era: 3 }
sandbox: perPick: { team: 999, era: 999 }
```

To add a new mode, add an entry to `DIFFICULTIES` and to the `Difficulty` union. The store reads from this config automatically, no other code changes needed.

## Position compatibility

`lib/draft.ts → COMPAT` maps each player position to the list of slot positions that player can fill. For example, an RM player can fill RM / RW / CAM / RB slots. Tune this list to make the draft tighter or more flexible.

## Editing teams and eras

Each team lives in its own file at `data/teams/<id>.ts`. Format:

```ts
import { Team } from '../types';
import { eraTBD } from '../helpers';

export const arsenal: Team = {
  id: 'arsenal',
  name: 'Arsenal',
  shortName: 'ARS',
  city: 'London',
  colors: { primary: '#EF0107', secondary: '#FFFFFF' },
  eras: {
    '90-95': eraTBD('4-4-2', 80, 'Graham era'),
    '00-05': {
      formation: '4-4-2',
      manager: 'Arsène Wenger',
      notes: 'The Invincibles',
      players: [
        { name: 'Jens Lehmann',  position: 'GK', overall: 86 },
        { name: 'Lauren',        position: 'RB', overall: 82 },
        // ...exactly 11, in the order defined by FORMATION_LAYOUTS
      ],
    },
    // ...
  },
};
```

The player array order must match the formation's slot order in `data/formations.ts`. Iconic eras are already filled in as examples; the rest use `eraTBD()` placeholders.

### Adding a new team

1. Create `data/teams/my-club.ts` exporting a `Team`.
2. Import + add it to the `TEAMS` array in `data/index.ts`.

### Adding a new era

1. Add the new key to the `EraKey` union in `data/types.ts`.
2. Add `{ key: '...', label: '...' }` to `ERAS` in `data/eras.ts`.

### Adding a new formation (for the fantasy XI)

1. Add the key to the `Formation` union in `data/types.ts`.
2. Add an 11-slot layout to `FORMATION_LAYOUTS` in `data/formations.ts`.
3. Change `DEFAULT_FORMATION` in `lib/draft.ts` (or add UI to let the user choose).

## How a season runs

1. `buildFantasySnapshot(xi, opts)` turns your 11 drafted players into a `TeamSnapshot` with attack/defense ratings derived from the XI.
2. `simulateSeasonForSnapshot(snapshot)` builds a 20-team league: your snapshot + 19 random PL teams each from a random era.
3. Round-robin (Berger circle method) → 38 matchdays.
4. Each match: goals sampled from a Poisson distribution where λ depends on attack/defense ratios + home advantage. Goalscorers and assisters chosen via position-and-rating-weighted sampling.
5. `SeasonView` plays back your 38 matches with smooth re-sorting of the live league table.
6. `FinalResults` shows final position, MVP, top scorers, and per-player stats.
7. AI verdict: `seasonToCompactJSON(season)` → POST to `/api/analyze` with `{ apiKey, payload }`. The route calls `gpt-4o-mini` and returns a 4-paragraph analysis.

## API key

Open Settings (top right gear) and paste your `sk-...` key. Stored in `localStorage` only and posted directly to the local proxy route. Never committed, never leaves your machine except on the OpenAI call.
