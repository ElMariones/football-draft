# Football Draft ⚽

Spin the wheel. Get a random club from a random era. Pick one player. Do it eleven times — that's your fantasy XI. Then watch them play a full 38-game season and get an AI-written verdict on how it all went.

## What you can do

### Three competitions

- **Premier League** — 20 English clubs across every era. Full 38-game league season.
- **La Liga** — 20 Spanish clubs from the Real Madrid Galácticos to Aspas-era Celta. Full Spanish season.
- **Champions League** — 16 European giants. Group stage, single-leg knockouts, penalty shootouts.

Each comes with its own pool of legendary teams and historic squads — pick the era and the players are who you'd expect from that side at that moment in time.

### Draft your XI

1. Pick a difficulty:
   - **Easy** — 1 team reroll + 1 era reroll *per pick*.
   - **Normal** — 3 team rerolls + 3 era rerolls shared across the whole draft.
   - **Sandbox** — unlimited rerolls.
2. Optional: turn on **Hardcore mode** to hide player ratings during the draft. Trust your knowledge, not the numbers.
3. Hit SPIN. Two reels settle on a club and an era. Their full XI shows up on the left, your empty pitch on the right.
4. Optional: spend a reroll to change the team (keeping the era) or the era (keeping the team).
5. Click a player. Compatible empty slots on your XI glow gold. Click a slot to place them.
6. Repeat eleven times.

Formations available: 4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 4-5-1, 3-4-3.

### Play the season

- **League modes**: all 38 matchdays animate, with the table re-sorting between rounds. You see your headline result — position, W/D/L, points — plus an MVP, league top scorers, and per-player stats.
- **Champions League**: group stage, single-leg knockouts from the QFs, penalty shootouts where it matters, all the way to the final.

### Get an AI verdict

Drop in your OpenAI API key (top-right gear) and get a 4-paragraph season analysis written like a football journalist. The prompt adapts to the competition — the La Liga verdict reads differently from the Champions League one.

### Sign in with Google (optional)

Sign in to:

- **Save your seasons**. Every completed run gets saved to your account, with the full XI, table, top scorers, the lot. Browse them at any time under "My Seasons" and open one to relive it.
- **Keep your OpenAI key on your account**, encrypted and re-used across devices.

If you'd rather not sign in, you don't have to — the whole game works as a guest, history just doesn't persist between visits.

### Languages

English and Spanish. The toggle is in the header. The AI verdict is generated in the language you've selected.

## Tech

Built with **Next.js 14** (App Router) + **TypeScript**, **Tailwind CSS**, **Framer Motion** for animations, **Zustand** for game state. Season simulation is custom — Poisson-distributed goals weighted by team attack/defense ratings, with position-and-rating-weighted goalscorer selection. The optional Google sign-in uses **Auth.js v5** with a **Neon Postgres** database via **Drizzle ORM**. AI season analysis is powered by **OpenAI** — bring your own key.
