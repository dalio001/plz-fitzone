# Calisthenics mode — plan (P2-18)

Owner request 2026-11-06: a calisthenics section where every move has a ladder of
progressions and you know how to train for the next step, inside the same routines.
Knowledge base: [CALISTHENICS_PROGRESSIONS.md](CALISTHENICS_PROGRESSIONS.md) (8 Chris
Heria tutorials watched + public standards). Everything below is our own design and
wording; no app or creator content is copied.

Heria Pro check: installed on the test phone, but it asks for an account before
showing anything. The agent may not create accounts, so the app itself is not studied
yet. Store pictures show: programs, a daily workout, a follow-along screen (reps, timer,
"next up", Complete) and a calendar. PLZ Train already has programs, calendar and
Google Calendar.

## 1. What the owner gets

- **Skills screen** (Workout tab, a "Calisthenics" switch next to My routines): 13
  skill cards — push-up, pull-up, dip, row, squat to pistol, L-sit, handstand,
  muscle-up, front lever, back lever, planche, human flag, core.
- Each card shows the ladder (6–9 steps), **your step**, the target to beat
  (e.g. "3 × 10" or "3 × 20 s"), the equipment, 3–4 form tips and a picture per step.
- **Level test** the first time: for each skill pick the hardest step you can do
  cleanly (or "not yet"). Skills that need gear you don't have are hidden
  (gear list: floor, wall, box, bar, low bar, dip bars, parallettes, rings, pole).
- **Level up**: when your logged sets hit the target in **2 different sessions**, the
  card says "Ready for the next step" and one tap moves you up. Never moves you down by
  itself; "step back" is always one tap.
- **Today's session** button builds a workout from your steps, in the right order:
  warm-up → skill work (fresh) → strength → core finisher. It is a normal routine, so
  live workout, rest timer, PREVIOUS, history, records, programs, the calendar and
  Google Calendar all work as today.
- **EMOM** for a new hard step: "1 rep every minute for 10 minutes", the app beeps
  each minute. **Drop down the ladder** finisher: after your step, the easier steps
  below follow automatically.
- **Ready-made programs** (use the existing program cycles): Beginner full body 3×/week,
  Push/Pull/Legs + skills, Skill focus (pick 1–2 skills).

## 2. How it fits the app (no new engine)

- Every ladder step is a normal catalogue exercise (new ids, equipment "Bodyweight",
  type reps or timed hold). So it works in any routine, also mixed with gym work.
- New data: `SKILL_LADDERS` (fixed list in the app) and `state.skills =
  { skillId: { step, passes: [dates] } }` (synced like the rest of the account).
- The level-up check reads the history the app already saves; nothing extra to log.
- The AI connector learns the steps too (create a calisthenics routine by name).

## 3. Build steps (each one tested on the phone before the next)

1. **Ladders + Skills screen** — 13 ladders, steps as catalogue exercises, gear list,
   level test, step cards with targets and tips.
2. **Progress** — level-up rule from logged sets, "step back", progress shown on the
   card and in Records.
3. **Sessions** — "Today's session" builder, EMOM timer, drop-down-the-ladder finisher,
   3 ready-made programs in a "Calisthenics" folder.
4. **Pictures** — one picture per step (~100) made in Google Flow, same character and
   look as the app's exercise pictures; checked one by one for correct form.
5. **Owner phone check**, then fixes.

## 4. Open questions for the owner

- Heria Pro: create the account yourself on the test phone if you want me to study it.
- Pictures: Flow image mode has shown 0 credits; still confirm before generating.
- Gear you have (bar? dip bars? rings? parallettes? pole?) — decides which skills show.

## 5. Safety rules in the app

- Straight-arm skills (planche, levers, back lever) show a "go slow, warm wrists and
  elbows" note and suggest 2–3 sessions a week, not daily.
- Hard skills show their gate first (e.g. muscle-up needs 10 pull-ups + 10 straight-bar
  dips) and stay locked as "not yet" until the gate is met or the owner overrides.
