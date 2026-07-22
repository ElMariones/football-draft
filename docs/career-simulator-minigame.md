# Career Simulator Minigame — Design & Engine Spec (v2)

> A text-based "build your football career" minigame, inspired by Copero's
> **"Construí tu carrera futbolística"** but redesigned to be deeper and more replayable.
> Target stack: **FootballDraft** (Next.js 14 app router, TypeScript, Tailwind, Zustand,
> framer-motion, Drizzle/Neon).
>
> **What changed from v1 (the observed Copero game):**
> - **Year-by-year** simulation (one row per season, ~16→38) instead of 2-year blocks.
> - A real **engine backend**: seeded randomness, role & minutes model, OVR growth tied to
>   games played, value curve, club/international/individual **titles**.
> - A large **individual-awards** system (Ballon d'Or, Golden Shoe, best keeper/defender/
>   midfielder/forward, best young player, league/continental/world tiers…).
> - A big **random-events deck** (injuries, dilemmas, family, discipline, nationality
>   changes, contracts, off-field…) with eligibility, cooldowns and probabilistic outcomes.
> - **Two separate UI zones**: a **Random Events** zone and a **Transfer** zone.
> - A **Force Transfer** flow with **reroll + lock (hold)** slot-machine mechanics and a
>   desperation/loyalty cost model.

---

## 0. Design pillars

1. **Every season is a small story.** Sim the year, surface 1 event + 1 transfer window,
   let the player react. ~20–24 clicks per full career, 2–4 minutes.
2. **Choices have teeth.** Minutes vs prestige, force a move vs stay loyal, risky event vs
   safe — all trade real numbers (OVR growth, value, morale, titles).
3. **Legible randomness.** Seeded RNG, visible odds on gambles, deterministic-feeling
   growth so a good career feels *earned*, not lucky.
4. **Chase-worthy end state.** The summary (trophies + individual awards + per-club stats +
   national team) is the shareable payoff; awards give long-tail goals to replay for.

---

## 1. Timeline: year-by-year

- One **season** per year of age. Career spans **age 16 → retirement** (retirement window
  ~34–40, see §11). Typical run: **18–24 seasons**.
- Each season the engine runs the **season pipeline** (§4), writes **one timeline row**,
  then presents the **offseason**: the **Events zone** and the **Transfer zone** (§7).
- The timeline row stores the *snapshot at that season*; the HUD shows *current* state.

Timeline columns: **YEAR · AGE · CLUB · OVR · APP · GLS · AST · (CS for GK) · 🏆 titles**.

---

## 2. Player state model (hidden + visible stats)

The engine tracks more than the visible card. Create `data/career/types.ts`:

```ts
import type { Position } from '@/data/types';
export type Foot = 'left' | 'right';

export interface CareerPlayer {
  // identity
  nationCode: string;         // primary nation (eligible for NT)
  secondNationCode?: string;  // dual nationality → nationality-switch event
  ntNationCode: string;       // nation actually represented (may switch once)
  surname: string; number: number; foot: Foot; position: Position;

  // core progression
  age: number;                // 16..40
  overall: number;            // current visible rating, clamp [40,99]
  potential: number;          // hidden ceiling, rolled at creation
  value: number;              // € market value

  // hidden attributes (0–100 unless noted) — drive the engine & events
  form: number;               // rolling recent-performance modifier, decays to 50
  morale: number;             // happiness; affects growth, output, event triggers
  fitness: number;            // current sharpness (injuries/rotation reduce)
  injuryProneness: number;    // higher → more/longer injuries
  loyalty: number;            // rises staying, falls forcing transfers
  reputation: number;         // global fame; gates NT call-ups & award odds
  discipline: number;         // low → red cards, bans, scandal events
  consistency: number;        // hidden; variance of season output

  // peaks & bookkeeping
  peakOverall: number; peakValue: number;
  clubId: string | null;
  loanFromClubId?: string | null;
  contractYears: number;      // years left; 0 → free agent / renewal event
  seed: number;               // per-career RNG seed (reproducible runs)

  // career-cumulative
  apps: number; goals: number; assists: number; cleanSheets: number;
  ntCaps: number; ntGoals: number;
}

export interface SeasonRecord {
  year: number; age: number; clubId: string;
  competition: 'league';      // primary; continental handled via titles
  overallAtSeason: number;
  apps: number; goals: number; assists: number; cleanSheets: number;
  rating: number;             // 0–10 season rating (drives awards & value)
  onLoan: boolean;
  titles: TitleKey[];         // won this season (club + intl + individual)
  eventId?: string;           // random event that fired this offseason
}
```

Design note: `form`, `morale`, `fitness`, `loyalty`, `reputation`, `discipline` are the
levers that random events and transfer decisions push, and they feed back into the season
pipeline. This is what makes choices matter beyond a single stat.

---

## 3. Randomness architecture

Reuse `lib/random.ts` and extend. All RNG is **seeded per career** (`player.seed`) so a run
is reproducible/shareable and leaderboard-verifiable.

```ts
// lib/career/rng.ts — a small seeded PRNG (mulberry32) wrapped with helpers
export interface Rng {
  next(): number;                       // [0,1)
  int(maxExclusive: number): number;
  range(min: number, max: number): number;
  gauss(mean: number, sd: number): number;   // Box–Muller, clamp at call sites
  chance(p: number): boolean;                 // Bernoulli
  pick<T>(arr: T[]): T;
  weighted<T>(arr: T[], weightOf: (x:T)=>number): T; // roulette-wheel
}
export const logistic = (x:number, k=1) => 1/(1+Math.exp(-k*x));
```

Guidelines:
- **Probabilities** → `logistic` of a difference (e.g. player level − required level).
- **Stat noise** → `gauss` around an expected value scaled by `(100−consistency)`.
- **Discrete draws** (offers, events, titles field) → `weighted`.
- Seed the season with a per-year sub-seed (`hash(seed, year)`) so re-simulating a season
  is stable but each year differs.

---

## 4. Season pipeline (the engine core)

Ordered steps run once per season in `lib/career/engine.ts::simulateSeason(player, club)`:

### 4.1 Role & games played
The single most important number: **how much you play** depends on how you compare to the
club's level.

```
starterLevel = club.strength            // e.g. 84 for a CL club, 62 for mid-table
gap          = player.overall - starterLevel
roleScore    = gap + moraleBias + fitnessBias + ageEasing
// roleScore → minutesFactor via logistic, clamped
minutesFactor = clamp(0.10, 1.0, logistic(roleScore, k=0.35))
```

- `starterLevel` ≈ `club.strength` (the OVR you must roughly match to be a regular).
  Being **above** the club's level → nailed-on starter (also may trigger transfer interest).
  Being **below** → rotation/bench (fewer apps → less growth → the core "move for minutes"
  tension; this is what loans solve).
- **Available games** = `club.seasonGames` (league) `+ continentalGames` if the club is in a
  continental competition `+ cupGames`. E.g. league-only mid club ≈ 34; elite CL club ≈ 55.
- **Age easing**: 16–18 capped (youth eased in), 19–31 full, decline after 32 trims games.
- **Injuries** (from events / `injuryProneness`) subtract a `gamesMissed` amount.

```
apps = round( availableGames * minutesFactor * ageEasing ) - gamesMissed
apps = clamp(0, availableGames, apps)
```

### 4.2 Output (goals / assists / clean sheets)
Position-weighted, scaled by OVR, minutes, league difficulty and teammate quality.

```
per90Goal  = positionGoalRate[pos]  * (overall/70)^1.6 * leagueEase * form/50
per90Assist= positionAstRate[pos]   * (overall/70)^1.2 * teamCreativity * form/50
goals   = round( per90Goal   * (apps*minutesShare) + gauss(0, noise) )
assists = round( per90Assist * (apps*minutesShare) + gauss(0, noise) )
// GK/CB:
cleanSheets = onlyIf(GK/CB) round( apps * cleanSheetRate(club.strength, leagueEase) )
```

- `positionGoalRate`: ST high, W/CAM medium, CM low, FB/CB tiny, GK 0.
- `leagueEase`: **weaker leagues inflate output** (the Colo-Colo effect from the sampled
  run — 66 goals in a weak league). Top-5 leagues = harder = lower rate.
- `noise` scales with `(100 − consistency)` so "consistent" players vary less.
- Produce a **season rating 0–10** from normalized output vs position expectation + titles;
  this feeds value and awards.

### 4.3 Overall growth tied to games played
You improve by **playing**, capped by **potential**, shaped by **age**.

```
gap         = potential - overall                     // room to grow
devCurve    = developmentByAge(age)                   // §Tuning: ~1.0 at 17, ~0.2 at 26, 0 at 29
playFactor  = smoothstep(minGames=8, fullGames=35, apps)  // 0..1, sqrt-ish
formBonus   = (form-50)/200                            // hot seasons help
trophyBonus = 0.5 * bigTitlesWon                       // winners develop
moraleMod   = 0.5 + morale/100                         // unhappy players stagnate

growth  = GROWTH_K * devCurve * playFactor * (gap/25) * moraleMod + formBonus + trophyBonus
decline = declineByAge(age)                            // 0 until ~30, ramps to ~2.0+/yr later
overall = clamp(40, 99, overall + growth - decline + eventOvrDelta)
peakOverall = max(peakOverall, overall)
```

Key consequences (intended):
- **Benchwarming stunts youth**: low `apps` → low `playFactor` → little growth even with big
  potential. Encourages loans/moves for minutes.
- **Growth stops ~28–29**, decline accelerates after 31–32 (older = more games lost + OVR
  drop). A player can extend the peak by dropping to a weaker league (more minutes) or via
  events (e.g. "study/maturity" +1, "veteran leadership").

### 4.4 Value
Exponential in OVR, bell-curved by age, boosted by potential/form/league.

```
base   = 50_000 * pow(1.14, overall - 50)             // 50→~€50k ... 90→~€40M, tune
ageMul = ageValueCurve(age, potential)                // peak ~23–26; young+high-potential ↑
formMul= 0.85 + 0.30*(form/100) + 0.10*seasonRating/10
leaMul = leaguePremium[club.leagueId]                 // top-5 > rest
value  = round( base * ageMul * formMul * leaMul )
peakValue = max(peakValue, value)
```
Format `€K/€M` on the card.

### 4.5 Post-season updates
- `form` decays toward 50; nudged by `seasonRating` (good year → carries momentum).
- `morale`: up with titles/awards/starting; down with benching/losing/forced moves.
- `fitness` resets with off-season, minus a chunk if `injuryProneness` high.
- `reputation`: rises with apps in strong leagues, titles, awards, NT caps.
- `contractYears -= 1` → at 0, force a renewal/expiry transfer situation next window.

---

## 5. Titles engine

Rolled **after** the season sim, in `lib/career/titles.ts`. Three buckets.

### 5.1 Club titles
Per competition the club is in that season:

```
leagueWin  = chance( logistic((club.strength - leagueTopRivalStrength)*0.4)
                     * (0.9 + playerContribution) )
domesticCup= chance( 0.10 + 0.25*logistic((club.strength-70)*0.2) )
continental= onlyIf(club qualified) chance( knockoutRun(club.strength, competitionField) )
```

- `continental` = Champions League / Europa / Conference (Europe), Libertadores /
  Sudamericana (S. America), AFC/CAF/CONCACAF equivalents — chosen by the club's confed.
- **Qualification** carries season-to-season: winning/placing high → continental slot next
  year → Club World Cup if you win continental.
- `playerContribution` = normalized `seasonRating` so a star lifts the odds a little.

Club title keys: `league`, `domestic-cup`, `super-cup`, `champions`, `europa`,
`conference`, `libertadores`, `sudamericana`, `club-world-cup`.

### 5.2 International (national team) titles
- **Call-up** gated: `reputation` + `overall` vs a nation-strength threshold + position
  depth. First call-up fires a **random event** ("Primera convocatoria").
- Tournaments run on a **real 4-year cycle**: World Cup (y4), continental (Copa América /
  Euro / etc. every 2–4y), plus Nations League / Finalissima / Olympics (U-23) / youth
  (U-20, U-17) when age-eligible.
- `tournamentWin = chance( knockoutRun(nationStrength + playerBoost, field) )`.
- On a win, may also award **Golden Ball** (best player of tournament) and **Golden Boot
  (tournament)** to a high-`seasonRating` attacker on the winning/finalist side.
- NT title keys: `world-cup`, `continental-cup` (Copa/Euro/…), `nations-league`,
  `finalissima`, `olympic-gold`, `u20-world-cup`, `u17-world-cup`, `confederations`.

### 5.3 `seasonScore` — the currency of individual awards
A single normalized metric compared against **award bars** (§6). Position-aware.

```
seasonScore =
    0.45 * outputScore(pos, goals, assists, cleanSheets, apps, leagueEase)
  + 0.25 * titleScore(clubTitles, ntTitles)      // CL/WC winners rated highest
  + 0.20 * (overall/99)
  + 0.10 * (seasonRating/10)
  + reputationNudge
```
`outputScore` normalizes by position (a keeper's clean sheets, a defender's titles+rating,
a striker's goals). This lets a defender or keeper legitimately win top awards.

---

## 6. Individual awards (expanded)

We don't simulate a full world of players, so each award uses a **rolled competition bar**
per season (a threshold that represents "the field"), scaled by **era/reputation** and
gated by **position eligibility**. If `seasonScore ≥ bar` (and eligibility passes), you win.
Bars are noisy (`gauss`) so identical seasons don't always win — realistic scarcity.

```
function tryAward(award, player, season):
  if !eligiblePosition(award, player.position): return false
  bar = AWARD_BARS[award].base + gauss(0, AWARD_BARS[award].sd) - reputationRelief
  return player.seasonScore >= bar  &&  meetsPrereqs(award, season)
```

### 6.1 Award catalogue (implement all as `TitleKey`s)

**World tier**
| Award | Eligibility | Extra prereq (typical) |
|-------|-------------|------------------------|
| `ballon-dor` | any | very high seasonScore; usually a major title (CL/WC) |
| `the-best-fifa` | any | ~parallel to Ballon d'Or; can split winners |
| `world-best-young` (Kopa) | age ≤ 21 | high seasonScore for age |
| `fifpro-world-xi` | per position (11 slots) | top seasonScore at position, world |

**Continental tier** (Europe / S. America / etc., by where the club plays)
| Award | Eligibility |
|-------|-------------|
| `best-player-continent` (e.g. UEFA Men's POTY) | any, top continental score |
| `continent-top-scorer` (e.g. European Golden Shoe / `golden-shoe`) | attackers; most goals in top leagues |
| `best-young-continent` | age ≤ 21 |
| `continent-team-of-year` | per position |

**League tier**
| Award | Eligibility |
|-------|-------------|
| `league-mvp` | any |
| `league-top-scorer` (Pichichi / Golden Boot per league) | attackers |
| `league-top-assist` (Playmaker) | mid/att |
| `league-best-keeper` (Zamora/Golden Glove) | GK only |
| `league-best-defender` | CB/FB |
| `league-best-midfielder` | CDM/CM/CAM |
| `league-best-forward` | W/CF/ST |
| `league-best-young` | age ≤ 21 |
| `league-team-of-season` | per position |

**Positional world/continental specials** (the user's "best keeper/defender…")
| Award | Eligibility |
|-------|-------------|
| `world-best-keeper` (Yashin) | GK only, title-winning season |
| `world-best-defender` | CB/FB, top score + big titles |
| `world-best-midfielder` | midfielders |
| `world-best-forward` | forwards |

**Tournament specials** (NT / continental knockouts)
| Award | Eligibility |
|-------|-------------|
| `tournament-golden-ball` | any, finalist/winner + top score |
| `tournament-golden-boot` | attackers, top scorer of the tournament |
| `tournament-golden-glove` | GK, deep run |
| `tournament-best-young` | age ≤ 21 |

Design goals:
- **Position parity**: keepers/defenders/midfielders have their own ladders up to a world
  best; only the very top (Ballon d'Or/The Best) is truly universal, so an outfield defender
  winning it is rare but possible with enough titles — mirrors reality.
- **Youth awards** give early-career goals (age ≤ 21 windows) so you can "win something" even
  before your peak.
- Awards are stored like trophies with `{key, label, age, clubId?, kind:'individual', scope}`
  where `scope ∈ {league, continent, world, tournament}` for grouping in the summary.

---

## 7. Two-zone offseason UI

After each season the offseason screen shows **two clearly separated zones** (the user's
explicit request), plus the HUD and timeline:

```
┌───────────────────────────── OFFSEASON (age N → N+1) ─────────────────────────────┐
│  HUD (OVR, club, age, value, morale, form, PJ/GLS/AST, cabinet)                    │
├──────────────────────────────┬────────────────────────────────────────────────────┤
│  ZONE A — RANDOM EVENT        │  ZONE B — TRANSFER MARKET                           │
│  (0 or 1 event this year)     │  • Organic offers (0–3 club cards) + "Stay/Renew"   │
│  • dilemma card w/ options    │  • Contract status, role promise per offer          │
│  • probabilistic outcomes     │  • [ Pedir transferencia / Force Transfer ] button  │
│  • or "Sin novedades" (skip)  │      → opens Forced-Transfer board (reroll + lock)  │
├──────────────────────────────┴────────────────────────────────────────────────────┤
│  Timeline table (all seasons so far)                                               │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Resolution order: the player may resolve the **event** and the **transfer** independently;
"Continue to next season" is enabled once both zones are settled (event resolved or none;
an offer accepted or "stay"). Zones are **independent systems** — an event can fire in a
year with no transfer, and vice-versa.

---

## 8. Transfer system + Force Transfer

### 8.1 Organic offers (default each window)
```
for each club in interestPool(player):
    interest = logistic( (player.value / clubBudget(club)) inverted
                       + (player.overall - club.starterLevel)*k
                       + formBias + reputationBias )
    if chance(interest): candidate with terms { fee, wage, role, leagueTier }
keep top 0–3 by attractiveness; always offer "Quedarse / Renovar" at current club.
```
- **Role promise** per offer ∈ `Starter | Rotation | Bench/Prospect` → sets next-season
  `minutesFactor` bias (a big club may only promise Rotation; a smaller one, Starter — the
  minutes-vs-prestige tension).
- Offers scale with OVR/value: home league → top-5 Europe at the peak → step-down leagues in
  decline (exactly the arc from the sampled run).

### 8.2 Force Transfer (the new button)
If no offer tempts you (or none appeared), press **"Pedir transferencia"**. This opens the
**Forced-Transfer board** — a slot-machine-style negotiation:

```
Board: 3 offer slots.  Resources: rerollsLeft (start 3),  desperation (0..100).
Each slot = { club, fee, wage, role, league }, drawn from the interest pool.

Actions:
  • LOCK / HOLD a slot you like  → it's frozen while you reroll the others.
  • REROLL (unlocked slots)      → redraw them; rerollsLeft--, desperation += 25.
  • ACCEPT a slot                → transfer completes on those terms.
  • CANCEL                       → back out (see penalty).
```

**Desperation model (what makes it a real decision, not a free reroll):**
- Every reroll raises `desperation`. Higher desperation:
  - shrinks the interest pool (fewer/weaker clubs bite),
  - biases `role` toward Rotation/Bench and `wage`/`fee` **down** (clubs sense you want out),
  - small chance (rises with desperation) of a **"dream club" wildcard** slot appearing — a
    high-risk gamble reason to keep rerolling.
- **Loyalty & morale cost**: forcing a transfer sets `loyalty -= 15..25` and, if the current
  club blocks it, a `morale` hit. Low loyalty later blocks the **"club legend / testimonial"**
  event and can trigger **fan-conflict** events.
- **Cancel penalty**: backing out after requesting → `morale -=`, and the club may **freeze
  you out** (next-season `minutesFactor` capped → "punished in the reserves"), turning a
  failed power-play into a lost season.
- **Free-agent path**: if `contractYears === 0`, force-transfer offers have **no fee**, more
  suitors, and no loyalty penalty (a Bosman) — a strategic reason to run a contract down.

**Reroll/lock UX** (framer-motion): slots flip like reels; locked slots get a padlock and
gold border; a `desperation` meter fills red; `rerollsLeft` chips deplete. Beyond
`rerollsLeft = 0`, further rerolls cost a **value/wage penalty** or are disabled (tunable).

This gives the force-transfer real gameplay: *hold the one good offer you got, gamble the
other two slots for a dream move, but every spin risks cooling the whole market and denting
your legacy.*

### 8.3 Transfer outcomes → engine
Accepting sets `clubId`, `contractYears`, a `roleBias` for next season's `minutesFactor`,
adjusts `value`/`wage`, and (loan option) `loanFromClubId` for a future return event.

---

## 9. Random events system

`lib/career/events.ts` holds an **event deck**. Each offseason:

```
1. Build eligible pool: events whose `when(player, ctx)` passes AND cooldown elapsed
   AND (once-only not already fired).
2. eventChance = base 0.55, nudged by discipline/injuryProneness/morale/age.
3. if chance(eventChance): fire weighted-pick(pool); else "Sin novedades".
4. On resolve: roll outcome by weight, apply effects, set cooldown, log eventId.
```

```ts
export interface CareerEvent {
  id: string;
  category: EventCategory;         // 'injury'|'discipline'|'family'|'nation'|'contract'|...
  titleKey: string; descKey: string;
  weight: number;
  when: (p: CareerPlayer, ctx: Ctx) => boolean;  // eligibility
  onceOnly?: boolean; cooldown?: number;         // seasons
  options: Array<{
    labelKey: string; image?: string;
    outcomes: Array<{ weight: number; badgeKey: string; effects: Effect[] }>;
  }>;
}
export type Effect =
  | { type:'ovr'; delta:number } | { type:'ovrTemp'; delta:number; years:number }
  | { type:'value'; mult:number } | { type:'morale'; delta:number }
  | { type:'form'; delta:number } | { type:'fitness'; delta:number }
  | { type:'injury'; gamesMissed:number; pronenessDelta?:number }
  | { type:'loyalty'; delta:number } | { type:'reputation'; delta:number }
  | { type:'discipline'; delta:number } | { type:'minutesBias'; delta:number; years:number }
  | { type:'unlockNation'; code:string } | { type:'switchNation'; code:string }
  | { type:'title'; key:TitleKey } | { type:'retire' } | { type:'contract'; years:number };
```

- **Eligibility (`when`)** filters by age band, position, nation, club tier, loan status,
  hidden stats (e.g. low `discipline` unlocks scandal events), and career flags.
- **Cooldowns / once-only** prevent spam (e.g. ACL, marriage, first call-up).
- Outcomes show **badges with odds up front** (like the doping card): deterministic = one
  badge; gamble = one badge per outcome with `%`.

---

## 10. Random-event catalogue (design many)

A representative deck (~35 events across 8 categories). Each is `id — trigger → options`.
Ship the first ~15, expand later; all share the schema in §9.

### Injuries & fitness
- `injury-knock` — *minor knock*: Rest (miss few games, keep fitness) vs Play through
  (75% fine / 25% aggravate → longer layoff, `injuryProneness+`).
- `injury-hamstring` — layoff, `ovrTemp -2 (1y)`, miss ~8 games.
- `injury-acl` *(onceOnly, low weight, higher with proneness)* — **major**: miss ~a season,
  `ovr -3`, `value ×0.6`, `injuryProneness +20`; small chance career-ending → `retire`.
- `injury-comeback` *(fires season after a major injury)* — Rush return vs Full rehab
  (fitness/form trade-off).
- `fitness-nutritionist` — hire a nutrition/fitness team: `fitness+`, `injuryProneness−`,
  costs value (wages).

### Health / substances
- `mystery-substance` *(the observed one)* — Consume: 75% `+5 OVR` / 25% `Suspensión`
  (miss games, `reputation−`, `discipline−`) vs Reject.
- `illness` — virus/mono: miss games, `fitness−`, `form−`.
- `supplement-legit` — sports-science program: small `ovr+` over 2y, safe.

### Discipline & scandal
- `red-card-storm` *(when discipline low)* — Anger management (`discipline+`) vs Ignore
  (ban risk, `minutesBias−`).
- `training-bust-up` — clash with a teammate: Apologize (`morale` split) vs Double down
  (`discipline−`, dressing-room `morale−`, but `reputation+` as a "leader").
- `nightclub-scandal` — tabloid story: Lay low vs PR spin (gamble on `reputation`).
- `social-media-controversy` — a post goes wrong: Delete & apologize vs Stand by it.
- `manager-fallout` *(when new manager arrives)* — Adapt to his system (`minutesBias+`) vs
  Rebel (`minutesBias−`, transfer interest `+`).

### Family & personal
- `birth-of-child` — `morale+`, brief `form−` (sleepless) → then `morale+` sustained.
- `family-illness` — take leave (miss games, `morale−` then recovery) vs stay focused.
- `homesickness` *(when abroad, morale low)* — request move home (spawns home-league offer
  next window) vs tough it out (`morale` gamble).
- `marriage` — `morale+`, stability (`consistency+`).
- `agent-change` — new super-agent: better future offers (`reputation+`, more suitors) vs
  loyalty to old agent (`morale+`).
- `mentor-youngster` *(veteran, age ≥ 30)* — `reputation+`, dressing-room `morale+`.

### National team & nationality  *(see §11)*
- `first-call-up` *(onceOnly, on reputation threshold)* — accept (start NT career, `morale+`)
  — flavor, mostly positive.
- `nationality-switch` *(when secondNationCode set, before first competitive cap)* — choose
  which nation to represent → `switchNation`; stronger nation ↑ title odds, weaker ↓ but
  "underdog story" flag.
- `naturalization-offer` *(when abroad long, age ≥ 27, no strong NT)* — a host country offers
  a passport & NT spot → `unlockNation` then optional switch (better title chances late).
- `nt-captaincy` — accept armband: `reputation+`, `morale+`, pressure (`form` variance +).
- `nt-retirement` *(age ≥ 32)* — retire from NT to preserve club fitness (`fitness+` in
  club seasons) vs keep going (chase NT titles/caps).

### Contract & money
- `contract-renewal` *(when contractYears ≤ 1)* — Renew (loyalty+, wage+) vs Run it down
  (Bosman path, more suitors later).
- `release-clause-triggered` — a giant pays your clause: forced glamour move offer (accept
  → big club, Rotation role) vs club convinces you to stay (`loyalty+`, `wage+`).
- `sponsorship-boot-deal` — brand mega-deal: `reputation+`, small `morale+`.
- `investment-opportunity` — off-field business: flavor + tiny gamble (no gameplay OVR
  effect, adds color / "off-field empire" summary flag).
- `testimonial` *(when loyalty high & long tenure)* — club legend event, unlocks a
  `club-legend` badge.

### Role & tactics
- `position-change` *(the observed one)* — Accept: starter next year, `ovrTemp −2` while
  adapting, then settles vs Reject: fewer minutes.
- `captaincy-club` — armband at club: `morale+`, `reputation+`.
- `new-wonderkid-rival` *(when at a big club)* — a prodigy arrives: Fight for your spot
  (`form` gamble) vs Ask to leave (transfer interest+).
- `system-masterclass` *(rare, positive)* — a tactical fit season: `ovr+`, `form+`.

### Off-field / fun
- `viral-goal` — a wonder-goal goes viral: `reputation+`, `value ×1.05`.
- `documentary` *(reputation high)* — Netflix doc: `reputation+`.
- `videogame-cover` *(reputation very high)* — cover star: `reputation+`, prestige badge.
- `superstition-ritual` — pure flavor with a tiny `form` coin-flip.
- `fan-conflict` *(when loyalty low)* — ultras turn on you: `morale−`, transfer pressure.
- `tax-trouble` *(reputation high)* — legal issue: Settle (`value−`) vs fight (`reputation`
  gamble).

Balancing: weight the **positive** and **neutral** events higher than catastrophes; keep
career-enders (`injury-acl` → retire, at very low probability) rare so they feel like a
gut-punch, not a coin flip. Use cooldowns so injuries/scandals don't chain every year.

---

## 11. Nationality-change mechanic (detail)

- At **creation** the player may (optionally) get a `secondNationCode` (e.g. via heritage) —
  or it's granted later by `naturalization-offer`.
- The **`nationality-switch` event** only fires **before the first competitive senior cap**
  (a hard window, like real FIFA rules): after that, `ntNationCode` locks.
- Trade-off surfaced in the card: switching to a **stronger** nation raises
  `tournamentWin`/award-field odds but forfeits an "underdog/loyalty" narrative flag;
  switching to a **weaker** origin nation lowers title odds but can unlock youth-tournament
  and "carried my country" storylines (bonus reputation for overperforming).
- `naturalization-offer` (late career, abroad) can grant a **new** eligibility and, if you
  never played for your origin NT competitively, a late switch — a route to chase an
  international title you'd otherwise never win.

---

## 12. Retirement & summary

### Retirement window
- Eligible from **age 34**; each year past 34 a `retireChance` rises with age, low `overall`,
  low `morale`, high `injuryProneness`. A **retirement event** offers "one more year" vs
  "hang up the boots". Hard cap at **40**. Career-ending injury can force it earlier.

### Summary (updated)
- **Header**: name, #, position, **peak** OVR & value, career totals (Apps/Gls/Ast, +
  clean sheets for GK, + NT caps/goals).
- **Trophy cabinet**, grouped: **Club** · **International** · **Individual** (sub-grouped by
  scope: League / Continental / World / Tournament). Counts per award (×3 Ballon d'Or, etc.).
- **Selección** panel: nation(s) represented, caps, NT titles.
- **Per-club grid**: aggregated Apps/Gls/Ast + titles per club (merge multiple stints).
- **Legacy badges**: `club-legend`, `one-club-man` (loyalty high, few clubs), `journeyman`
  (many clubs), `globetrotter` (≥4 leagues), `underdog-hero`, `off-field-empire`, etc.
- A computed **Career Score** (for the leaderboard) from titles (weighted: WC/CL/Ballon
  d'Or heavy), peak OVR, apps, goals — wire into your existing `app/api/leaderboard`.

---

## 13. Tuning constants (single source of truth)

`lib/career/config.ts` — all knobs in one place:
```ts
export const CAREER = {
  startAge: 16, retireFrom: 34, hardRetire: 40,
  startOverall: [46, 54], potentialRange: [66, 94],
  GROWTH_K: 1.6,
  developmentByAge: /* 17→1.0, 21→0.7, 25→0.35, 28→0.1, 29→0, else 0 */,
  declineByAge:     /* ≤29→0, 31→0.6, 33→1.2, 35→2.0, 37→3.0 */,
  seasonGamesByTier: { 1: 55, 2: 46, 3: 40, 4: 36, 5: 34 }, // continental adds games
  positionGoalRate: { ST:0.55, CF:0.5, W:0.35, CAM:0.3, CM:0.12, FB:0.05, CB:0.04, GK:0 },
  leagueEase: /* weak leagues > 1.0 inflate output; top-5 < 1.0 */,
  value: { baseK: 50_000, expBase: 1.14, agePeak: [23,26] },
  eventChanceBase: 0.55,
  transfer: { rerolls: 3, desperationPerReroll: 25, forceLoyaltyHit: [15,25] },
  awardBars: { 'ballon-dor': { base: 0.92, sd: 0.05 }, /* … per award … */ },
  trophyBaseChance: 0.15,
};
```

---

## 14. Architecture & build order

**Files** (mirrors your draft-mode split: pure engine in `lib/`, state in `store/`):
```
data/career/   types.ts  leagues.ts  clubs.ts  events.ts  awards.ts  nations.ts
lib/career/    rng.ts  engine.ts(season)  titles.ts  awards.ts  offers.ts  events.ts
               retirement.ts  score.ts  format.ts  config.ts
store/careerStore.ts
app/juegos/carrera/page.tsx
components/career/  CareerLanding  CreationWizard  JerseyPreview  PositionPitch
                    PlayerHud  EventZone  EventCard  TransferZone  OfferCard
                    ForceTransferBoard(reroll+lock)  CareerTimeline
                    RetirementScreen  CareerSummary  AwardShelf
```

**Milestones**
1. Types + `config.ts` + seeded `rng.ts`; 20–30 tiered clubs across ~8 leagues.
2. `engine.simulateSeason` (role/minutes → output → growth → value) + unit tests on the
   growth/minutes curves (assert bench youth stagnates, peak/decline shape).
3. `store/careerStore.ts` + year loop with timeline; club decisions only.
4. Creation wizard (Nationality → Identity + jersey → Position).
5. **Two-zone offseason**: TransferZone (organic offers + stay) then EventZone.
6. **Force-Transfer board** with reroll + lock + desperation.
7. `titles.ts` (club + international cycle) then `awards.ts` (full catalogue + bars).
8. Random-events deck (ship ~15, schema for the rest) incl. nationality-switch.
9. Retirement + summary + AwardShelf + `score.ts`; wire leaderboard/share/history + i18n.

**Reuse**: `lib/random.ts`, `data/nations` + `data/i18nNations` (picker/flags), `data/teams`
colors (jersey/crest tints; generate monogram crests to avoid trademark assets),
`framer-motion` (reel/reveal/count-up), `lib/i18n.ts` (add a `career` namespace, es/en).

---

### Appendix — v1 sampled career (kept for curve tuning)

Player MESSI, #10, ST, Argentina, right foot. Peak OVR 81 / value €22M; 690 apps, 233 gls,
81 ast, 2 club trophies (Europa League + one late), no NT/individual awards. Observed shape:
OVR rises fast to ~26, plateaus ~81, declines after 29; value peaks ~26 then collapses to
€320K; weak leagues massively inflate goals; trophies attach to specific seasons. Use these
as sanity checks for §4.3 (growth), §4.4 (value) and §5 (titles).
