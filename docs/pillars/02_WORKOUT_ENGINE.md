# Pillar 2 — Workout engine, routines and exercise catalogue

> **Role:** Own the actual training workflow: reusable prescriptions, correct performed sets, accurate timers and useful movement selection. Keep domain behavior independent of a particular UI or cloud vendor.
>
> **Depends on:** Pillar 0 durable entities/migration; Pillar 1 shared controls; Pillar 4 input and platform boundaries.
> **Used by:** Pillars 3 coaching/sharing, 5 records/recommendations, 7 product measures.
> **Cross-pillar impacts:** Units, modality, record eligibility, routine versions, exercise snapshots and session finalization.

**Current mode — personal use:** this is a core pillar. Prioritize P2-01/02/03/04, needed set actions from P2-05, and previous performance from P2-07. Add only the movements/program details you actually need; a large public catalogue, coach assignments and adaptive programs are optional later scope. Public phase letters below are future reference.

## Trigger keywords

`Pillar 2`, workout, routine, exercise, sets, reps, superset, rest timer, program, plate calculator.

## Scope

- Session lifecycle, ordered exercise instances, performed sets and explicit completion.
- Routine prescriptions, folders, duplication, editing, program scheduling and optional template updates.
- Typed exercises, equipment and muscle metadata, search and owned/licensed instruction media.
- Timer deadlines, previous-performance selection and utilities.
- Execute accepted progression prescriptions; pillar 5 owns recommendation/analytics policy.

## UI components used from Pillar 1

Set row, type menu, numeric input, rest controls, exercise picker/detail, reorder controls, routine editor, active-session recovery bar, finish review and template-update choice.

## What is built and verified `[x]`

- [x] **Runtime/source checked:** Three seed PPL routines and 15 seed movements; create/start/delete routines; start empty workout.
- [x] **Runtime/source checked:** Weight/reps, previous values, normal/warm-up/drop/failure types, complete/uncomplete, add set and remove exercise.
- [x] **Runtime checked:** Rest bar and adjustments exist; finish retains completed positive-rep sets and moves to history.
- [x] **Source inspected:** Fixed barbell/plate calculator and global rest/unit preferences. No edit-routine flow, typed duration/distance or persistent draft.

## What is left to do `[ ]`

| ID | Priority / phase | Task and dependencies | Acceptance criteria | Feature references |
| --- | --- | --- | --- | --- |
| P2-01 | P0 / B | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: finish review modal (N unticked → Tick them as done / Drop them / Go back), zero-done keeps existing message, idempotent save; P0-02/03 | Explicit resume/replace choice when a session exists; stable draft/session IDs; finish atomic/idempotent; uncompleted sets reviewed; discard confirmation/recovery policy; no silent overwrite | [Clips / evidence](#p2-01-reference) |
| P2-02 | P0 / A–B | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: set validation (weight finite 0–1000 kg, reps whole 1–1000, 0 kg bodyweight ok; red outline + row message, untickable, invalid never saved, volume clamped ≥ 0); P0-01/P5-01 | Canonical load and input provenance; unit toggle preserves physical load; integer positive reps when required; finite bounded values; bodyweight/assisted/weighted/time/distance semantics explicit; unsupported types cannot produce fake 1RM | [Clips / evidence](#p2-02-reference) |
| P2-03 | P0 / B | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: per-exercise rest chip (Off, 0:30–5:00), tick starts that exercise's timer (Off = none), routines remember rest, legacy routines use Profile default, deadline reload recovery kept; P4-03 | Per-exercise rest including Off; completion starts intended timer; skip/±time/undo behavior defined; reload/suspension recomputes from deadline; platform notification limitations explicit | [Clips / evidence](#p2-03-reference) |
| P2-04 | P1 / B–C | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: edit (rename, sets, target reps/range, target weight, rest via P2-03 chip, note ≤140ch, thumb-sized up/down), duplicate ("Name (copy)"), delete with confirm + 10s Undo, routine reorder on Workout tab, optional "Update routine from this workout?" (No default; history never rewritten); P0 versions/P1 controls | Edit/duplicate/reorder/delete, sets/types, load/reps or ranges, notes and rest; folders by C; update-from-session is optional and preserves prior versions and past performance | [Clips / evidence](#p2-04-reference) |
| P2-05 | P1 / B–C | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: multi-digit input fix (no re-render while typing, draft saved every keystroke), set menu (Warm-up/Normal/Failure/Drop/Remove with 5s Undo), exercise reorder/replace, per-exercise workout note in history, plate calculator with bar/plate settings and remainder (V4 one-digit-input recording: `E:/My Apps/plz-fitzone/assets/videos/V4-one-digit-input-bug-2026-10-14.mp4`); P0-02/P2-02/P2-07 | Add/remove/edit sets, reorder/swap exercise, supersets/circuits, RPE/RIR fields and notes; configurable equipment increments/bar/plates; show achievable plate load and remainder rather than pretending an impossible target is loaded | [Clips / evidence](#p2-05-reference) |
| P2-06 | P1 / B–C | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: 100-entry own-written catalogue (ex1..ex15 ids+names stable), muscle/equipment chips + search in tab and picker, favourites, recent-10 from finished workouts, multi-add in listed order (Replace stays single), custom create/edit with full fields + hide-when-used (usage named), detail sheet with best set/est. 1RM/last 5 sessions (numbers only), esc() on all exercise names, idempotent normalisation on every load + after restore (no schema bump); P1-04/P4 content rights | Stable IDs, movement type, equipment, primary/secondary muscles, substitutions, custom movement editing, recent/favorite search and multi-select; launch with a proposed 80–120 high-coverage reviewed entries, not an unreviewed bulk scrape | [Clips / evidence](#p2-06-reference) |
| P2-07 | P1 / C | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: same-type lanes in order, instance-by-instance match, dash + no prefill on missing history, tap PREVIOUS copies (never ticks); P5-01 | Latest eligible previous session identified by timestamp/instance; warm-ups and repeated exercises handled explicitly; missing history and substituted exercises do not misalign positional sets; displays correct units | [Clips / evidence](#p2-07-reference) |
| P2-08 | P1 / C | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: history detail sheet, edit (P2-02 validation, no rebuild while typing, sticky Save/Cancel), app-modal delete + 10s Undo, repeat and save-as-routine (set types kept), month groups, idempotent history ids; program library still later | Repeat/edit/delete session with P5 recalculation; convert completed session to routine; program filters by goal/experience/equipment/days; initial 8–12 expert-reviewed programs proposed, each with versioned prescriptions | [Clips / evidence](#p2-08-reference) |
| P2-09 | P2 / E | Equipment/time-aware training adaptations; P5-05 | User selects constraint, previews alternatives and changed prescription, understands rationale and confirms; replacement preserves training intent as a reviewed rule, not a medical claim; original plan recoverable | [Clips / evidence](#p2-09-reference) |
| P2-10 | P2 / E–F | [ ] in progress — personal week planner implemented 2026-10-17, awaiting owner phone check: one optional plan per local day (`state.plans = { 'YYYY-MM-DD': { routineId, kind:'routine'|'rest', createdAt } }`, no schema bump), tap any in-month calendar cell to plan that day (routine `<select>` + Rest day) or act on its plan (Edit / Delete, and Move for a past plan; today and future only), derived done/missed (a plan never fills a day by itself; a routine plan is done only when a finished workout that day carries the same `routineId`; a rest day is never missed and never done), "Copy week → next week" (today's local week, never overwrites an existing plan), consistency line gained "Planned this week N, done M", and a Today card on the Workout tab with one-tap Start; program assignment runtime, coach assignments, deload and adaptive guidance still later, P3 coaching/P5 guidance | Planned versus actual work separate; missed-day/reorder and deload behavior specified; recommendation acceptance creates a new version; coach assignments cannot rewrite a live session silently | [Clips / evidence](#p2-10-reference) |
| P2-11 | P1 / personal after core logger | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: Profile "Previous values from" any/same (default any), scope change never rewrites history; refines P2-07, settings in P6-01 | Select latest eligible performance from any workout or the same routine; explain missing history; preference changes do not modify stored sessions; repeated exercise/set-type policy preserved | [Clips / evidence](#p2-11-reference) |
| P2-12 | P2 / personal optional | [ ] in progress — timed sets (part 1) and one-tap drop sets + supersets with smart advance (part 2) implemented 2026-10-17; drop sets and supersets tested by the owner on his phone 2026-10-17 (timed sets still to confirm). Inline duration stopwatch, one-tap Drop button on ticked weight sets (−20% default, rounds to 2.5 kg / 5 lb), ↳ numbering, cascading delete/undo, routine builder dropsAfterLast; superset grouping (A1/A2, colored left bar), smart advance scrolls to partner without rest until round's final partner; all 237 tests green | Duration sets have explicit start/stop and persisted elapsed data; optional group advancement preserves keyboard/focus and can be disabled; rest-versus-exercise timers distinct; test actual behavior because video shows settings only | [Clips / evidence](#p2-12-reference) |
| P2-13 | P1 / personal when needed | [ ] in progress — personal pictures + body chart implemented 2026-10-24, awaiting owner phone check: `EXERCISE_PICTURES` (batch 1 = 10 committed 960×536 WebP in `assets/exercises/`) draws one 16:9 start-left/end-right picture at the top of the exercise detail sheet, lazy + async, URL built in a variable so no unlisted id can 404, `onerror` hides the block, caption "Start → End"; a front+back inline SVG body chart (own geometry from `docs/research/body-map-polygons.json`, MIT) shows every exercise with muscle data (built-ins and custom): primary `#ef4444`, secondary `#fca5a5`, idle `#475569`, legend "Main: X · Also: Y", unknown/legacy-safe mapping, 240 px cap; `sw.js` v5 runtime-caches `assets/exercises/` cache-first (not precached, 404s never stored); exercise lists stay text only. Media upload/link, "how to do it" text and the remaining ~90 pictures still later, P4-05/P2-06 | Own demonstration link/media, primary/secondary muscles and equipment attached to stable custom exercise ID; private by default; old sessions preserved; broken/offline media never blocks logging | [Clips / evidence](#p2-13-reference) |

### Domain policies to decide early

- Is dumbbell weight per hand or total? Store that convention per exercise and expose it in instructions.
- How do added bodyweight and assistance loads affect volume and records? Keep raw performance separate from computed estimates.
- Are warm-ups excluded from “working sets” and record checks? Which drop/failure sets qualify? Pillar 5 owns the dictionary; this engine applies it.
- How do repetitions to failure, timed holds, distance and zero external load complete a valid set?
- Does undo completion cancel only the timer it started? What happens when a different exercise starts another timer?
- Does finish review remove incomplete sets, retain them as planned-only data, or request confirmation? No hidden data transformation.

### Concrete future regression examples

100 KG ↔ equivalent LBS retains the same canonical load; a timed plank finishes without reps; assisted pull-up metrics remain distinct from positive external load; duplicate finish creates one session; warm-up insertion does not misalign previous working sets; editing a routine does not mutate old sessions; app suspension does not extend rest by callback drift. Define fixtures before implementing.

## Feature reference map

Use the [video index](../research/VIDEO_REFERENCE_INDEX.md) for source/evidence definitions. The exact sub-feature links below are the starting points; unspecified acceptance criteria remain our planned behavior.

### P2-01 reference

- **Empty/routine start and resume bar — Shown:** [V1 0:15–0:43](https://www.youtube.com/watch?v=8ESngufwx6g&t=15s).
- **Resume versus replacing an existing session — Shown:** [V1 2:12–2:18](https://www.youtube.com/watch?v=8ESngufwx6g&t=132s).
- **Finish/save review — Shown:** [V1 2:40–2:49](https://www.youtube.com/watch?v=8ESngufwx6g&t=160s).
- **Durable recovery, atomic save, repeated finish and undo-discard recovery — Not demonstrated.** Use the [session-loss audit](../research/HEVY_AUDIT.md) and our lifecycle criteria.

### P2-02 reference

- **Weight/reps logging — Shown:** [V1 2:18–2:39](https://www.youtube.com/watch?v=8ESngufwx6g&t=138s).
- **Unit choices — Shown:** [V2 3:34–3:42](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=214s); no conversion-correctness trial.
- **Rep count/range — Shown:** [V2 7:13–7:27](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=433s).
- **Bodyweight pull-up prescription — Shown:** [V2 8:17–8:38](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=497s).
- **Timed sets — Setting only:** [V2 5:35–6:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=335s), via Inline Timer. Assisted/distance logging, validation bounds and canonical conversion are not demonstrated; use the modality contract.

### P2-03 reference

- **Per-exercise rest configuration — Shown:** [V1 1:56–2:06](https://www.youtube.com/watch?v=8ESngufwx6g&t=116s) and [V2 7:48–8:00](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=468s).
- **Live countdown/±15s/Skip — Shown:** [V1 2:24–2:39](https://www.youtube.com/watch?v=8ESngufwx6g&t=144s).
- **Sound controls — Settings only:** [V2 4:15–4:48](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=255s); implementation owner P6-08.
- **Deadlines, suspension/reload, undo and grouped timer semantics — Not demonstrated.** Specify and test these separately.

### P2-04 reference

- **New routine/title — Shown:** [V1 0:44–0:52](https://www.youtube.com/watch?v=8ESngufwx6g&t=44s).
- **Existing editor/Update — Screen shown:** [V2 1:00–1:04](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=60s).
- **Sets and save — Shown:** [V1 1:42–2:06](https://www.youtube.com/watch?v=8ESngufwx6g&t=102s).
- **Rep-range prescription — Shown:** [V2 7:13–7:27](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=433s).
- **Exercise notes — Shown:** [V2 8:00–8:17](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=480s).
- **Folders, duplicate flow and optional template update/versioning — Not demonstrated.** Reference [official routine behavior](https://www.hevyapp.com/features/gym-routines/) and our versioning contract.

### P2-05 reference

- **Add set — Shown:** [V1 1:42–1:58](https://www.youtube.com/watch?v=8ESngufwx6g&t=102s).
- **Warm-up/normal/failure/drop and removal/help — Shown menu:** [V2 7:22–7:49](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=442s); inspect labels/help, not just a set-number cycle.
- **Exercise notes — Shown:** [V2 8:00–8:17](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=480s).
- **Reorder/replace menu and superset pairing — Shown:** [V2 8:17–8:38](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=497s); drag completion and live grouped rest are not proven.
- **RPE — Setting/explanation only:** [V2 5:20–6:15](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=320s); no actual RPE logging, no RIR field demonstrated. Keep RIR an explicitly proposed option.
- **Plate/warm-up calculators — Settings only:** [V2 5:18–5:35](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=318s); no result/inventory/remainder behavior. Use the [prototype plate audit](../research/HEVY_AUDIT.md) for our improvements.
- **One-digit input bug (owner recording V4) — Shown:** local file `E:/My Apps/plz-fitzone/assets/videos/V4-one-digit-input-bug-2026-10-14.mp4` (git-ignored, not opened here): KG/REPS boxes accept one digit per tap because every keystroke rebuilt the list. Fixed by P2-05 (no re-render while typing).

### P2-06 reference

- **Equipment/muscle filters — Shown:** [V1 0:50–1:13](https://www.youtube.com/watch?v=8ESngufwx6g&t=50s).
- **Exercise demo/detail tabs — Shown:** [V1 1:14–1:34](https://www.youtube.com/watch?v=8ESngufwx6g&t=74s).
- **Multi-add — Shown:** [V1 1:30–1:42](https://www.youtube.com/watch?v=8ESngufwx6g&t=90s).
- **Recent exercises — Shown:** [V2 6:50–7:14](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=410s).
- **Custom media/muscle metadata — Shown result:** [V2 9:58–10:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=598s), expanded in P2-13. Favourites, stable-ID policy, catalogue review and media rights are not demonstrated.

### P2-07 reference

- **Previous-values scope — Shown setting:** [V2 5:04–5:15](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=304s); see P2-11.
- **Prior weights/sets recalled next week — Narrated only:** [V2 9:20–9:31](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=560s).
- **Previous column — UI shown:** [V1 2:18–2:39](https://www.youtube.com/watch?v=8ESngufwx6g&t=138s); it is empty for that first exercise session. Warm-up/repeated-instance matching requires our policy, not positional assumptions.

### P2-08 reference

- **Saved workout detail — Shown:** [V2 2:35–2:56](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=155s).
- **Duration correction — Narrated only:** [V2 9:20–9:31](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=560s).
- **Curated programs/filters/previews — Shown:** [V1 4:13–4:29](https://www.youtube.com/watch?v=8ESngufwx6g&t=253s).
- **History repeat/edit/delete and workout-to-routine conversion — Not demonstrated.** Use [official routine reference](https://www.hevyapp.com/features/gym-routines/) and our correction/rebuild specifications.

### P2-09 reference

- **Manual replacement entry — Menu shown:** [V2 8:17–8:38](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=497s).
- **Equipment/time-aware recommendations, preview/undo and training-intent preservation — Not demonstrated.** Use [official Trainer description](https://www.hevyapp.com/features/workout-plan-generator/) as product context and our P2-09/P5-05 contracts; do not infer smart adaptation from a replace menu.

### P2-10 reference

- **Program exploration — Shown:** [V1 4:13–4:29](https://www.youtube.com/watch?v=8ESngufwx6g&t=253s).
- **AI-generated programs — Narrated only:** [V2 11:45–12:00](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=705s).
- **Coach assignments, schedule execution, missed-day changes and adaptive versioning — Not demonstrated.** Keep deferred; use the P2-10/P3/P5 specifications if requested.

#### P2-10 personal week planner (implemented 2026-10-17, awaiting owner phone check)

- **Built (personal slice only):** the training calendar from P5-03 now also carries plans. Same folder/branch plan: `docs/pillars/plans/P2-10/PLAN.md` (supervisor decisions 1–4, 2026-10-17).
- **What is in:** `state.plans` (`'YYYY-MM-DD'` → `{ routineId, kind:'routine'|'rest', createdAt }`, one plan per local day, optional field, no `SCHEMA_VERSION` bump — stays 2; `normalizePlans` is pure + idempotent and runs on load, on the migrated restore copy and after restore/undo, so old data and backups keep working and a backup without `plans` restores fine). Every in-month cell is tappable: trained → `openCalendarDay` (day sheet with the plan line above the workouts), otherwise → `openPlanDay` ("Plan this day" editor with a routine `<select>` + "Rest day", or the plan line with Edit / Delete, plus Move with a `<input type="date">` for a day that cannot be edited). Planning is allowed for today and future days only. "Copy week → next week" copies **today's** local week (chosen `weekStart`) +7 days and never overwrites a day that already has a plan. The P5-03 consistency line gained `· Planned this week N, done M`. The Workout tab shows a Today card (`#todayPlanCard`) with one-tap Start through `startRoutineWorkout`.
- **Done/missed is always derived, never stored:** a plan alone never fills a day; a routine plan is done only when a finished workout that day carries the same `routineId` (so "did another workout" and an empty workout both count the day as trained while leaving the plan not done); a rest day is never 'missed' and never 'done' and reads "Rest day (trained anyway)" once a workout exists; a past plan pointing at a deleted routine reads "Deleted routine" and can still be deleted. History, the finish/save path and units are untouched.
- **Checks:** new `tests/p2_week_plan.test.mjs` (23 tests: 8 data/pure-helper/backup-restore, 12 calendar/day-sheet/copy-week, 3 Today card). `node --test "tests/*.test.mjs"` all green (171 pass, 0 fail, incl. the previous 148). No browser run and no screenshots here (the supervisor/owner checks on the phone); P2-10 personal part stays `[ ] in progress, awaiting owner phone check`. Program library, coach assignments, deload, notifications, adaptive suggestions and any backend stay deferred.

### P2-11 reference

- **Any workout / Same Routine — Shown setting:** [V2 5:04–5:15](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=304s); both choices and their explanation are visible around 5:12.
- **Actual result after changing scope — Not demonstrated.** Specify lookup eligibility/missing history and verify fixtures; P6-01 presents the preference.

### P2-12 reference

- **Inline Timer — Setting only:** [V2 5:35–6:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=335s); visible text describes a duration-set stopwatch.
- **Smart Superset Scrolling — Setting only:** same [V2 5:35–6:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=335s); automatic advancement is not exercised.
- **Superset group — Shown:** [V2 8:17–8:38](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=497s). Group-rest expectation is narrated, not proven. Define timed-set persistence and advancement with P1-02/P2-03.

### P2-13 reference

- **Existing custom exercise/demo — Shown:** [V2 9:58–10:29](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=598s).
- **Primary/secondary muscles + chart/records — Shown:** [V2 10:29–10:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=629s).
- **Creation form, upload versus external-link mechanism, editing and privacy enforcement — Not demonstrated.** Choose and document our mechanism; do not assume other people can access the demo. P4-05 owns media protections.
- **Planned, later (owner idea 2026-10-14): pictures + "how to do it" text for the built-in exercises.** Feasibility proven 2026-10-14 by the supervisor in the owner's Google Flow account (project "oct. 14 - 20:55", https://flow.google.com/project/1a35b4eb-f636-4373-a016-3c9b3e542f1e): Image mode, Nano Banana 2.1, 1:1, 2 outputs, 0 credits per prompt. Method: one avatar sheet added to every prompt as reference ("Ajouter au prompt" — it is cleared after each send), plus a detailed form description per exercise (view angle, joint angles, grip, "correct safe technique, five fingers, no text/logos"). 10 test exercises came out with a consistent character and mostly correct form; Bent Over Row showed the bar at the knees (wrong position) and needs a redo. Owner decisions: the avatar must be **male**; the owner will make the avatar himself and send it; do it when there is enough credit. Rules: no photos copied from other apps; each picture checked for form before use; pictures stored in the repo (no hot-linking), lazy-loaded, never blocking logging offline. Also: our own written description per exercise (setup, movement, common mistakes).
- **Pictures batch 1 implemented 2026-10-24 (personal part):** ten 16:9 start/end WebP files (960×536, ~50 KB each) for `ex1, ex2, ex4, ex5, ex7, ex8, ex9, ex11, ex12, ex13` live in `assets/exercises/` (git-tracked, owner-owned images from the Google Flow method above; never published outside the repo). `index.html` lists them in `EXERCISE_PICTURES` and renders the picture only for those ids in the exercise detail sheet; the service worker (`plz-fitzone-v5`) caches them at runtime cache-first, never precache. "How to do it" text, the remaining ~90 pictures, upload/link media and P4-05 media protections stay later work.
- **Muscle chart implemented 2026-10-24 (personal part):** the detail sheet now draws the primary/secondary muscles of every exercise (built-in or custom) as a front + back inline SVG, using geometry copied from `docs/research/body-map-polygons.json` (react-body-highlighter 2.0.5, MIT, Copyright (c) 2020 GV79; copyright line kept in the `index.html` comment). No network request, no new dependency, no external CDN.

## Video references & Assets

- [V1 review](https://www.youtube.com/watch?v=8ESngufwx6g); use the task-specific timestamp links above. Broad initial-review ranges are superseded by the verified feature index.
- [Routine behaviors](https://www.hevyapp.com/features/gym-routines/), [superset reference](https://www.hevyapp.com/features/what-are-supersets/), [catalogue reference](https://www.hevyapp.com/features/exercise-library/).
- Catalogue instruction/demo production and expert review are planned work; no new assets created.
- [V2 review](https://www.youtube.com/watch?v=CkYBAlBrAAw); exact task/sub-feature scenes above. [Video index](../research/VIDEO_REFERENCE_INDEX.md) records the complete source ledger.

## Next Immediate Action

**P2-13 pictures + muscle body chart (personal part) implemented 2026-10-24:** the exercise detail sheet shows one 16:9 start/end picture for the 10 batch-1 ids and a front + back muscle chart for every exercise with muscle data; the service worker (v5) caches pictures at runtime so they stay instant and offline, and exercise lists stay text only. All 279 automated tests passing. Awaiting owner phone check (picture legibility at 320–412 px and chart colours), then "how to do it" text and picture batches of ~15 by muscle group.

**P2-12 timed sets (part 1) and one-tap drop sets + supersets with smart advance (part 2) implemented 2026-10-17:** stopwatch duration sets, one-tap Drop button on ticked weight sets (−20% default, rounds down to 2.5 kg / 5 lb), ↳ numbering, cascading delete/undo, routine builder dropsAfterLast (0/1/2); superset grouping (A1/A2 badges, colored left bar), smart advance scrolls to partner without rest until round's final partner. All 237 automated tests passing. Awaiting owner phone check.

**P2-10 personal week planner implemented 2026-10-17:** plan a day on the training calendar (today/future only), derived done/missed, Move/Delete for past plans, copy week to next week, and the Today card with one-tap Start. Owner phone check pending; program library/coach assignments/deload stay deferred.

**P2-08 history operations (personal part) implemented 2026-10-14:** owner phone check pending for detail/edit/delete+Undo/repeat/save-as-routine and month groups (program library deferred). Next: owner check, then P5-01/02 metric dictionary + records rebuild rules on top of corrected history.
