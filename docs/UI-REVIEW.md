# Career mode — UI review

Method: played a full 21-season career end to end (Rivas, MCO, Argentina, 2024–2044)
plus a partial second career, capturing every screen at **1440×900 desktop** and
**375×812 mobile**. Screens covered: landing, creation wizard, archetype picker,
career/offseason, preseason cards, event, transfer market, forced-transfer board,
decisive-moment modal (prompt + result), all four minigames, achievement toasts,
retirement summary.

Findings are ordered by how much they hurt, not by how hard they are to fix.
Severity is about the player's experience, not the size of the diff.

---

## 1. Achievement toasts never go away — CRITICAL

**What happens.** `AchievementToasts` renders `achievementQueue.slice(0, 4)` in a
`fixed bottom-4 right-4` stack. Nothing ever removes an item except
`dismissAchievement`, which only fires on click. There is no timer and no cap on
the queue.

A full career unlocks ~24 achievements. Because only four are visible at a time
and each needs its own click, clearing the backlog at the end of my career took
**46 clicks**. Until then the stack sits permanently over the bottom-right of
every screen.

**Why it is critical, not cosmetic.**
- On desktop it covers the trajectory panel during play and the club stats and
  individual-awards grid on the summary.
- On mobile it is far worse: the toast is `w-72` (288px) on a 375px viewport, and
  four stacked cover essentially the entire lower half of the screen. The
  retirement summary — the payoff of the whole mode — is unreadable underneath them.

**Fix.** Auto-dismiss on a timer, cap the queue so a burst cannot bury the screen,
and make the toast width responsive.

---

## 2. On mobile you cannot see who you are — CRITICAL

**What happens.** The career screen is a three-rail grid. The rails carry
`order-1 lg:order-2` (offseason) and `order-2 lg:order-1` (player card), which is
correct for desktop but means that on mobile the **offseason column comes first**
and the player card comes second.

Measured on a real career: the player HUD's top edge sits at **y = 1845px**. The
trajectory panel starts at y = 2854px.

So on a phone the game opens on preseason cards and transfer offers with no
indication of your name, overall, age, club or form — the entire context for the
decision you are being asked to make is roughly two full screens below the choice
itself.

**Fix.** Put identity first on mobile. A compact always-visible summary strip
(face, overall, club, age) above the decisions, with the full card still in the
rail below.

---

## 3. Summary attribute labels truncate on mobile — HIGH

The hero card lays the five attributes out in five columns. At 375px this gives
each about 60px, and the labels clip to `TÉCN… 83`, `VELO… 59`, `LIDER… 81`.

Three of the five attribute names are unreadable on the single most important
screen in the mode.

**Fix.** Two or three columns on small screens.

---

## 4. Sections render blank while their entrance animation runs — HIGH

The summary is a long scroll and every block animates in with `rise()`. Scrolling
down quickly I repeatedly caught sections showing **their heading with an empty
body** — most visibly "Títulos nacionales" and "Títulos internacionales" rendering
as two labels over a large void, on a career with 20+ trophies.

Verified it is the animation and not missing data: at rest the same node reports
`opacity: 1` and `height: 270px` with the full trophy list inside.

It is still a real defect. Content that exists should not read as "you won
nothing" for the time it takes an animation to catch up, and this is exactly the
screen where a player scrolls fast looking for their trophies.

**Fix.** Animate transform only, not opacity, for content blocks below the fold —
or drop the entrance animation on the summary's data sections.

---

## 5. Header wraps and crowds on mobile — HIGH

`MODO CARRERA` breaks onto two lines at 375px and the brand block collides with
the `EN` / `Logros 24/64` / `Salir` buttons, which themselves are large. The
header eats ~150px of vertical space before any content.

**Fix.** Hide the wordmark below `sm`, keep the crest; tighten the button row.

---

## 6. Desktop wastes a lot of vertical space — MEDIUM

- **Landing**: the hero is centred in the top third; the lower half of a 900px
  viewport is empty.
- **Archetype picker**: three cards ~110px tall, then ~600px of nothing.
- **Career**: the middle column is sparse while the left rail overflows past the
  fold. The rail is `lg:sticky lg:top-4` but has no `max-height` or internal
  scroll, so once it is taller than the viewport the stickiness stops helping and
  the bottom of it (shop, national team panel) is unreachable without scrolling
  the whole page.

**Fix.** Give the left rail the same `max-h` + `overflow-y-auto` treatment the
trajectory rail already has.

---

## 7. Archetype cards are unequal heights — MEDIUM

The three cards size to content, so "Todoterreno" (4 stat chips) is visibly taller
than "Enganche" (1 chip). The grid does not stretch them.

**Fix.** `items-stretch` and push the chip row to the bottom.

---

## 8. The dual-nationality flag is unexplained — MEDIUM

30% of players get a `secondNationCode`, rendered in the HUD as a bare second flag
at `opacity-50` immediately before the club name. With no label it reads as a
league or club flag — I misread it as a Serie A badge showing a Greek flag before
checking the source.

**Fix.** A `title` tooltip, and visually separate it from the club line.

---

## 9. Country names truncate in the wizard on desktop — LOW

At 1440px the nationality grid still clips `Arabia Saud…`, `Costa de Ma…`,
`Estados Uni…`. The column is fixed-width regardless of available space.

---

## 10. Empty trajectory table on the first screen — LOW

Before the first season is played the trajectory panel renders its column headers
(`Edad · Club · OVR · PJ · GLS · AST`) over an empty body. A header for nothing.

**Fix.** Show an empty state instead of headers.

---

## 11. Summary club rows wrap awkwardly on mobile — LOW

Each row puts the club, league, years, spell length and stats in one flex line,
which on mobile breaks into three ragged lines with the stats floating right,
mid-wrap.

---

## Not defects

Recorded so they are not re-investigated:

- **Técnica reading "92" at age 16** in a low-res screenshot — actually 52. No
  attribute inflation.
- **A gap between ages 22 and 24 in the trajectory** — the 23 row is present; the
  screenshot cropped it.
- **`1 error` badge, bottom-left** — the Next.js dev overlay reporting the
  known pre-existing hydration warning from the language toggle (server renders
  the default language, client reads `localStorage`). Dev-only, not shipped.
