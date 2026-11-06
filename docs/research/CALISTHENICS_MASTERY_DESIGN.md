# PLZ Train — Calisthenics Mastery (P2-18 design)

Coach-grade design for a calisthenics section that takes anyone from first push-up to
front lever, planche and handstand push-up. Own design and wording.

Knowledge base (all in this folder):
- [CALISTHENICS_PROGRESSIONS.md](CALISTHENICS_PROGRESSIONS.md) — 13 ladders, 8 Chris Heria tutorials.
- [CALISTHENICS_PROGRESSIONS_ADDENDUM.md](CALISTHENICS_PROGRESSIONS_ADDENDUM.md) — 11 more videos
  (Chris Heria, THENX, 2 other coaching channels): corrected targets, dips, rows, pistol,
  back lever, core, dragon flag, planche to full, handstand push-up, V-sit/manna.
- [HERIA_PRO_SCREEN_RECORDING.md](HERIA_PRO_SCREEN_RECORDING.md) + [HERIA_PRO_APP_NOTES.md](HERIA_PRO_APP_NOTES.md) — how Heria Pro is built.

---

## 1. What Heria Pro does, and where we go further

| Heria Pro (seen) | PLZ Train Calisthenics |
|---|---|
| Programs per skill, separate, same 4 × "60 min" days every week | One **skill tree**: every move is a ladder; your sessions are built from where you stand on each ladder |
| Difficulty switch swaps the exercise (knee → floor → archer push-up) | Same idea, but driven by **your own step** on each ladder, with "easier / harder" one tap away |
| Onboarding asks max pull-ups, push-ups, squats, dips — no visible use | **Level test** places you on every ladder and decides your first program |
| No visible level-up | **Earned level-ups**: hit the target in 2 sessions → next step unlocks |
| Most days behind a paywall | Everything open (personal app) |
| Training-spot filter (Home, Gym, Park…); one filter returns nothing | Gear filter that never empties: if a step needs gear you lack, it offers the closest no-gear version |
| Warm-up on/off, muscle body picture | Kept: warm-up matched to the day's skills, body map from our existing muscle map |

---

## 2. The coaching model

### 2.1 Five levels
Every ladder step is tagged with a level. Your overall level = the level most of your
"big 5" ladders (push-up, pull-up, dip, squat, core) sit at.

| Level | Typical you | Example standards |
|---|---|---|
| 0 Foundation | new, or returning, or heavy | knee push-up, incline push-up, dead hang, box squat, plank |
| 1 Beginner | 10 push-ups, 0–5 pull-ups | floor push-up 3×10, negative pull-up, bench dip, air squat 3×20 |
| 2 Intermediate | 10+ pull-ups, 10+ dips | archer push-up, L-sit, pistol on a box, tuck front lever, wall handstand |
| 3 Advanced | muscle-up, L-sit 15 s | muscle-up, advanced tuck levers, tuck planche 15–20 s, chest-to-wall HSPU |
| 4 Elite | the "big skills" | full front lever, straddle/full planche, freestanding HSPU, one-arm pull-up, manna |

### 2.2 The ladders (17)
Base strength: **push-up, pull-up, dip, row, squat → pistol, core, hanging core**.
Skills: **L-sit → V-sit → manna, handstand, handstand push-up, muscle-up, front lever,
back lever, planche, human flag, dragon flag**, plus **mobility** (pike, shoulder,
wrist prep) as a support ladder. Every step has: name, picture, type (reps / hold
seconds), target to unlock the next step, gear, 3–4 form tips, 2 common mistakes,
an easier fallback, and the muscles it trains.

### 2.3 Gates (safety locks)
Hard skills stay "not yet" until their entry test is met (owner can override):
- Muscle-up: 10 pull-ups + 10 straight-bar dips + 5 chest-to-bar pull-ups.
- Front lever: 10 pull-ups + 15 s hanging L-sit + 10 hanging leg raises.
- Back lever: 8 pull-ups + 10 dips + skin-the-cat ×5.
- Planche: 20 scapula push-ups + 10 s planche lean + 15 s tuck L-sit.
- Freestanding handstand work: 30 s chest-to-wall handstand + bail practiced.
- Human flag: 10 side-plank raises each side + 8 archer pull-ups.

### 2.4 How you move up (the progression rules)
1. **Double progression**: each step has a rep (or second) range, e.g. 3 × 6–10.
   Start at the bottom; add reps each session; when all sets hit the top, that session
   is a **pass**.
2. **Two passes on different days** → "Ready for the next step". One tap moves up.
3. **First week on a new step**: the app halves the volume and uses **EMOM**
   (1 good rep at the top of every minute, 8–12 minutes). When EMOM reaches 3 per
   minute, normal sets start.
4. **Drop-down finisher**: after your step, 1 set of the step below to failure with
   good form — more work without bad reps.
5. **Never moves you down by itself.** If 3 sessions in a row fall well short, it
   suggests "step back for 2 weeks"; you decide.
6. **Deload**: every 6th week the app plans lighter sessions (fewer sets, same steps).
7. **Holds**: target in seconds; a "clean second" only counts with the form kept
   (the app asks "clean?" after each hold; no = counts half).

### 2.5 A session (built by the app)
1. **Warm-up (8 min, on/off)**: wrists, shoulders, scapula push-ups/pulls, plus the
   prep for today's skill (e.g. German hang before back lever).
2. **Skill block (fresh, 15–20 min)**: 1–2 skills, holds or EMOM, long rest (2–3 min).
3. **Strength block (20–25 min)**: 3–4 base ladders, 3 sets each, 90 s rest,
   drop-down finisher on the last one.
4. **Core finisher (5–8 min)**.
5. **Cool-down / mobility (optional, 5 min)**.

### 2.6 Weekly templates
- **Foundation / Beginner — full body, 3 days** (Mon/Wed/Fri): every session push, pull,
  legs, core; one skill (handstand basics or L-sit) as a 5-minute block.
- **Intermediate — upper/lower or push/pull/legs, 4 days**: 2 skills rotate; straight-arm
  skills (levers, planche) max 3× a week with a day between.
- **Advanced / Elite — skill focus, 4–5 days**: you pick 1 main + 1 secondary skill;
  main skill 3× a week, secondary 2×, strength ladders keep the base.
- **Daily 10-minute handstand practice** can be switched on at any level from wall stage.
Each template is a program (our existing program cycles), so the calendar and Google
Calendar work automatically.

### 2.7 Challenges (like Heria's "Challenge week", but measured)
Every 6 weeks a **Test day** replaces one session: max reps / max hold on your current
steps. Results show as a before/after card and can trigger level-ups.

---

## 3. In the app

### Screens
1. **Calisthenics home** (Workout tab, switch "Gym | Calisthenics"):
   - Your level badge, this week's sessions, "Start today's session".
   - **Skill tree**: cards for every ladder with your step, a progress bar to the
     next step and the lock state.
2. **Ladder page**: all steps top to bottom, yours highlighted, locked ones greyed,
   each with picture, target, tips, mistakes, fallback; buttons: "Train this",
   "Step back", "I can already do this" (re-test).
3. **Level test** (first visit, ~10 min, also at Test days): 6 short questions with
   pictures ("Can you do 10 push-ups?" → yes/no/how many), then optional real tests
   logged as sets. Places you on every ladder and suggests the template.
4. **Gear and place**: Home, Park, Gym, Anywhere + gear ticks (bar, low bar, dip bars,
   parallettes, rings, wall, box, pole, bench). Steps needing missing gear show their
   no-gear alternative.
5. **Live workout** (existing screen, plus): big target ("8–10 reps" / "20 s"),
   "Next up" card, hold timer with countdown and beep, EMOM timer, "clean?" check,
   picture of the step.
6. **Finish summary**: % done, passes earned, "Ready for next step" banners.
7. **Progress**: skill tree over time, level history, Test-day before/after cards.

### Data (fits what exists)
- Each ladder step = a catalogue exercise (new ids `cx_*`, equipment Bodyweight,
  kind reps or timed hold) → works in any routine, history, records, PREVIOUS,
  charts, AI connector, also mixed with gym work.
- `CALI_LADDERS` (fixed in the app): ladder → steps with level, target range, type,
  gear, tips, mistakes, fallback, gate.
- `state.cali = { level, place, gear[], ladders: { id: { step, passes: [dates],
  history } }, template, testDue }` — synced with the account.
- Level-up check reads saved workouts; nothing extra to log.

---

## 4. Build steps (each tested on the phone, before/after pictures)

1. **Ladders + catalogue**: 17 ladders, ~150 steps as exercises, targets, tips,
   mistakes, fallbacks, gates. Tests for every ladder's order and data.
2. **Calisthenics home + ladder pages + gear/place**.
3. **Level test** → placement → suggested template.
4. **Progression engine**: passes, level-up, step back, EMOM week, drop-down, deload.
5. **Session builder + templates** as programs (calendar + Google Calendar follow).
6. **Live workout additions**: hold timer, EMOM timer, "clean?", next-up, summary banners.
7. **Pictures**: one per step in Google Flow, same character and style as the app's
   exercise pictures, checked for correct form one by one (credits confirmed first).
8. **Test day + progress view**.
9. **Owner phone check**, fixes, then mark done.

## 5. Owner decisions needed
- Gear he owns (decides the first program he sees).
- Pictures in Flow: OK to generate ~150 (image mode has shown 0 credits).
- Start with build step 1 now?
