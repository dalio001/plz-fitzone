# Pillar 5 — Progress, records and explainable intelligence

> **Role:** Turn trustworthy performance data into understandable progress and useful optional next actions. Own metric definitions, charts, record policies, recommendation rules and their evaluation.
>
> **Depends on:** Pillar 0 canonical historical data; Pillar 2 modality/set contracts; Pillar 1 visualization controls; Pillar 4 consent/privacy.
> **Used by:** Pillar 2 accepted prescriptions, Pillar 3 summaries/coach feedback, Pillar 6 premium value, Pillar 7 retention measures.
> **Cross-pillar impacts:** Working-set definition, estimated records, normalization, history edits, program versions, private inputs and costs.

**Current mode — personal progress:** prioritize P5-01/02/03: correct records, detailed history, simple trends and calendar. Private measurements are optional. AI, paid guidance, cohort evaluation and hosted inference are deferred; public phase letters below are future reference.

## Trigger keywords

`Pillar 5`, progress, PR, 1RM, charts, analytics, calendar, measurements, insights, progression, AI.

## Scope

- Movement-specific records, session/exercise trends and consistency.
- Private body metrics/photos and periodic reports.
- Transparent rule-based progression before conversational assistance.
- Equipment/time adaptation recommendations with Pillar 2.
- Offline deterministic summaries; optional hosted inference cannot block logging.

## UI components used from Pillar 1

Date-range selector, accessible charts/tables, record detail, calendar, measurement entry, private photo view, weekly insight card, recommendation comparison/rationale/accept/undo.

## What is built and verified `[x]`

- [x] **Source inspected:** Epley estimate `weight × (1 + reps/30)` used for stored-session record comparison and best exercise estimate (`index.html:975`, `:1022`). No explicit modality/eligibility policy.
- [x] **Runtime checked:** All-time session/volume/set totals and six muscle-group bars render after a synthetic saved set.
- [x] **Absence verified:** No time-range charts, detailed exercise timeline, calendar, body measurements, photos, periodic report or adaptive recommendation engine.
- [x] **Implemented 2026-10-17 (P5-03 personal part), `node --test "tests/*.test.mjs"` 148/148 green:** calendar/consistency/month-workload models are pure and recomputed from `state.history`; no schema bump and no stored derived data; only `state.weekStart` is persisted. Owner phone check still pending (no runtime/phone verification claimed here).
- [x] **Implemented 2026-10-24 (P5-04 personal part, body weight & measurements), `node --test "tests/*.test.mjs"` 265/265 green:** `state.body` is a private, device-local day log (weight + 9 optional measurements, canonical kg/cm/%, one entry per date). Chart/trend/BMI are recomputed from stored entries; BMI is a number with its source label only (no category or advice). No schema bump; old states and backups without `body` load as `[]`. Progress photos, periodic reports and AI stay out. Owner phone check still pending (no runtime/phone verification claimed here).
- [x] **Implemented 2026-10-24 (P5-05 personal part, transparent next-session target), `node --test "tests/*.test.mjs"` 317/317 green:** one deterministic rule, `computeNextTarget(exIdx)`, recomputed on render and never stored — the last session's top set plus one house step (2.5 kg / 5 lb / 5 s) when every working set (N/F only; W and D excluded) reached it, otherwise the same bar with "same weight/reps/time, beat last"; a missing source session or one older than `TARGET_STALE_DAYS = 21` returns no target and the line always states why. Bodyweight/assisted never raise load; duration exercises get the routine hold target or the longest hold. The line is a suggestion, visibly separate from the observed PREVIOUS column and the typed values: `Use` fills only untouched Normal/Failure rows (never a typed value, never a ticked set, ticks nothing), with a 5 s in-memory Undo; `Hide` hides targets for that workout only; `state.showTargets` (default on) is the only persisted preference besides the workout's `targetsHidden` draft flag. No history writes, no schema bump. Equipment increments, user constraints, program versions and expert-reviewed cases remain open. Owner phone check still pending (no runtime/phone verification claimed here).

## What is left to do `[ ]`

| ID | Priority / phase | Task and dependencies | Acceptance criteria | Feature references |
| --- | --- | --- | --- | --- |
| P5-01 | P0 / A–B | [ ] in progress — personal part implemented 2026-10-17, awaiting owner phone check: `METRICS_VERSION = 1` dictionary (warm-ups excluded, Epley 1..12 reps, earliest tie keeps, bodyweight reps-only, recomputed from history); Metric dictionary and versioned fixtures; P2-02 | Define valid/working sets, warm-up/drop/failure treatment, canonical volume, per-hand conventions, PR baselines/ties and estimated 1RM eligibility; duration/distance/bodyweight handled separately; high-rep estimates labeled/limited | [Clips / evidence](#p5-01-reference) |
| P5-02 | P1 / C | [ ] in progress — personal part implemented 2026-10-17, awaiting owner phone check: exercise progress sheet (chart, records, timeline) linked from catalogue, history, live workout and Profile "My records"; Personal/exercise history and records; P0-07 | Heaviest load, rep-based records, estimated 1RM and set/session volume differentiated; complete timeline and date ranges; corrections/deletes rebuild deterministically; input/display units remain meaningful | [Clips / evidence](#p5-02-reference) |
| P5-03 | P1 / C | [ ] in progress — personal part implemented 2026-10-17, awaiting owner phone check: training calendar on Profile (Mon-first by default, `Week starts on` Monday/Sunday select in Settings, today outlined, trained days filled, ‹ › month arrows + Today) plus a `Calendar` button in the History header; tap a trained day opens that workout's detail sheet (2+ workouts → small time/title picker); consistency line "This week / This month / Streak (weeks)"; muscle workload card with `This month` (follows the calendar month) / `All time` chips replacing the old all-time chart, both from Primary muscle only and only P5-01 counting sets (warm-ups excluded), labelled "Primary muscle, warm-ups not counted", no readiness claim; only `state.weekStart` is saved (safe `mon` default, no schema bump, old states/backups unaffected). Calendar, consistency and muscle workload; P5-01 | User timezone/week boundaries explicit; prescribed versus completed work separate; primary/secondary muscle attribution documented; no double-counted totals or claims that set distribution proves recovery | [Clips / evidence](#p5-03-reference) |
| P5-04 | P2 / C–D | [ ] in progress — body weight and measurements implemented 2026-10-24, awaiting owner phone check; photos/reports later: a fourth `Body` Profile section with a quick entry (`Today's weight` + date, one entry per day, same date replaces and keeps its id), 9 optional measurements (waist, chest, hips, arm L/R, thigh L/R, neck, body fat %) in cm/in and kg/lbs, weight/measure chart with `1M`/`3M`/`1Y`/`All` ranges and a measurement switch, latest weight with 7- and 30-day change and a labelled height-based BMI number, newest-first history with inline edit and delete plus a 5 s undo; `state.body` canonical kg/cm/% with `normalizeBodyEntries` at init, in backup validation and after restore (no schema bump, old states/backups unaffected); private measurements/photos and weekly/monthly reports; P4 privacy | Optional entries with unit/time context; private media access; missing-data states; report values trace to source sets; no fat-loss/health-outcome inference beyond entered data | [Clips / evidence](#p5-04-reference) |
| P5-05 | P2 / E | [ ] in progress — personal part implemented 2026-10-24, awaiting owner phone check: one transparent next-session target line under each exercise header in the live workout ("Target: 62.5 kg × 8 · +2.5 kg — last 60 kg × 8, 8, 8 (all hit)"), computed live by `computeNextTarget()` from the same previous-session lookup as the PREVIOUS column — house step 2.5 kg / 5 lb / 5 s only when every working set reached the bar, otherwise the same weight/reps/time with "beat last"; warm-ups and drops never count, failure sets do; a missing source session or one older than 21 days gives no target and states the reason ("First time…", "No history for this routine yet…", "last session was N days ago"); `Use` fills only untouched Normal/Failure rows and ticks nothing, with a 5 s Undo, `Hide` hides targets for that workout only with a `Show` banner, and Profile › Settings "Show next targets" (default on, no schema bump) turns the whole thing off. Not done: equipment-increment settings, user constraints, program versions, %1RM/deloads, auto-tick and any history write; P2-07/P2-09/P6-01 | Next target cites relevant history/program rule; respect equipment increments and user constraints; no history → ask/offer conservative manual baseline; accept/override/undo; original program recoverable; expert-reviewed cases | [Clips / evidence](#p5-05-reference) |
| P5-06 | P2 / E | Conversational analysis as optional interface | Reads authorized structured history; retrieves only permitted records; shows evidence dates/units; generated plan schema validated; proposal preview before application; no invented workout facts or silent writes | [Clips / evidence](#p5-06-reference) |
| P5-07 | P0 / before guidance release | Evaluation, rollout and operating costs | Golden cases for missing/conflicting data, unit changes, plateaus, fatigue signals, substitutions and adversarial notes; unsafe/out-of-scope advice rejected; no unauthorized writes; user control, latency/cost limits and rollback flag | [Clips / evidence](#p5-07-reference) |
| P5-08 | P2 / E–F | Guidance-value experiment with P7 | Compare transparent rules against manual baseline; helpfulness/acceptance/override and retention measured; report sample size and confounding; don't attribute training outcomes causally without suitable study | [Clips / evidence](#p5-08-reference) |
| P5-09 | P3 / optional, deferred for personal use | Strength-level comparison discovery; not a personal-use requirement | Only if owner requests it; obtain a defensible comparison dataset and methodology, disclose grouping/uncertainty, protect private inputs, support opt-out; do not fabricate population ranks from one user's history | [Clips / evidence](#p5-09-reference) |

### Recommendation contract

Inputs: selected goals, routine version, eligible recent performance, available equipment/increments, time constraint and voluntarily entered effort/context. Output: suggested target or substitution, evidence, rule/version, uncertainty and an explicit proposed program change.

The engine must not assume that every plateau needs more weight, every missed session needs compensation, or a muscle heat map certifies readiness. Reports distinguish recorded facts from estimates. Pain/injury/medical questions stay outside automated training adjustment and route to appropriate human guidance without diagnosis.

Start with reviewed deterministic progression rules and explain their conditions. An LLM can explain/search/format suggestions after structured validation; it must not own canonical workout calculations or silently modify prescriptions.

### Differentiation boundary

Hevy already describes adaptive programming and conversational training analysis. Our hypothesis is a better combined flow for migrating history, understanding a target and adapting it at the gym. Validate that preference before expanding hosted AI spend. [Hevy Trainer](https://www.hevyapp.com/features/workout-plan-generator/), [Hevy on ChatGPT](https://www.hevyapp.com/features/hevy-chatgpt/).

## Feature reference map

Source/evidence definitions: [video index](../research/VIDEO_REFERENCE_INDEX.md). A visible metric label or chart does not establish its formula, eligibility or causal training meaning.

### P5-01 reference

- **Metric/record categories — Shown:** [V2 1:04–1:28](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=64s) and [V2 2:52–3:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=172s); inspect heaviest load, 1RM, set/session volume and rep records.
- **Formula, warm-up/assistance/dumbbell policy, ties and correction recalculation — Not demonstrated.** Use the [prototype formula audit](../research/HEVY_AUDIT.md) and our versioned dictionary, not a guessed calculation from UI labels.

### P5-02 reference

- **Routine volume/reps/duration chart — Shown:** [V1 2:51–3:10](https://www.youtube.com/watch?v=8ESngufwx6g&t=171s).
- **Exercise chart/records — Shown:** [V2 2:52–3:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=172s).
- **Custom-exercise chart/records — Shown:** [V2 10:29–10:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=629s).
- **Live-PR notification/audio — Setting only:** [V2 4:40–4:48](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=280s) and [V2 5:35–6:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=335s); no actual record alert. Complete history/correction rules require our tests.

### P5-03 reference

- **Muscle split and saved-session workload — Shown:** [V2 2:35–2:56](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=155s).
- **Profile duration/volume/reps chart — Shown; Calendar button only:** [V1 3:38–3:53](https://www.youtube.com/watch?v=8ESngufwx6g&t=218s).
- **Week-start choice — Shown setting:** [V2 4:51–5:06](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=291s).
- **Calendar interior, streak rules, timezone boundaries and muscle attribution formulas — Not demonstrated.** [Official progress description](https://www.hevyapp.com/features/gym-progress/) supplies feature context; define our semantics separately.

### P5-04 reference

- **Measures entry — Button only:** [V1 3:38–3:53](https://www.youtube.com/watch?v=8ESngufwx6g&t=218s).
- **Body-measurement units — Shown settings:** [V2 3:34–3:42](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=214s).
- **Workout photo — Shown:** [V2 9:06–9:20](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=546s); this is a published workout image, not proof of a private progress-photo journal.
- **Measurement editor, private progress-photo history and periodic report generation — Not demonstrated.** Use [official progress context](https://www.hevyapp.com/features/gym-progress/) and our private-data/report contract. Premium slides are marketing, not a demonstrated measurement workflow.

### P5-05 reference

- **Adaptive AI programs — Narrated only:** [V2 11:45–12:00](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=705s).
- **Next-target rationale, constraint adaptation, acceptance/undo and actual progression — Not demonstrated.** Use [official Trainer description](https://www.hevyapp.com/features/workout-plan-generator/) and our reviewed rule/evaluation specifications; optional later personal guidance.

### P5-06 reference

- **ChatGPT connection — Entry point/narration:** [V2 3:54–4:08](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=234s).
- **Conversation, history retrieval, chart generation and plan import — Not demonstrated.** Use [official ChatGPT product context](https://www.hevyapp.com/features/hevy-chatgpt/) and our authorized-read/proposal contract.

### P5-07 reference

- **Evaluation cases, safeguards, operating-cost limits and rollout — Not demonstrated in V1/V2.** Our engineering requirements; see P5-07 and [master plan](../MASTER_PLAN.md). A reviewer describing AI is not an evaluation result.

### P5-08 reference

- **Controlled guidance-value/retention study — Not demonstrated in V1/V2.** Proposed research in P5-08/P7. Neither subjective review validates our recommendation outcomes.

### P5-09 reference

- **Strength Level and explanation — Shown:** [V2 1:04–1:28](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=64s); compare-category labels and grouping explanation.
- **Comparison dataset/representativeness/methodology — Not demonstrated.** The reviewer's dislike is an opinion, not the owner's preference. Keep this feature deferred unless requested; personal history alone cannot yield a defensible population rank.

## Video references & Assets

- [V1 review](https://www.youtube.com/watch?v=8ESngufwx6g); use the task-specific timestamp links above. Broad initial-review ranges are superseded by the verified feature index.
- [Exercise-performance reference](https://www.hevyapp.com/features/exercise-performance/), [progress reference](https://www.hevyapp.com/features/gym-progress/).
- [../research/HEVY_AUDIT.md](../research/HEVY_AUDIT.md).
- [V2 review](https://www.youtube.com/watch?v=CkYBAlBrAAw) and [video index](../research/VIDEO_REFERENCE_INDEX.md); per-task links and evidence limits above.

## Next Immediate Action

**Owner phone check:** run the P5-01/02/03/04/05 personal parts on the phone (records, progress page, calendar, streak, month workload, Body section quick entry, chart ranges, trend and BMI, edit/delete with undo, and the new next-target line: does "Target: … — last … (all hit/missed)" read clearly at 320–412 px, does `Use` fill only the empty rows, does the 5 s Undo appear, and does `Hide` stay off for that workout only) and report anything off — the four-button Profile control must fit a 320 px screen without clipping. Photos, periodic reports and the constrained/equipment-aware progression of P5-05 stay for a later, separately approved task.
