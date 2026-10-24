# P5-05 next target plan (DeepSeek V4.1 Flash, plan mode, saved by the supervisor 2026-10-24)


### Today's code (all `index.html` unless noted)
- Rules/history: `metricCountingSets()` 1437 (drops `W`), `durationCountingSets()` 1516, `isDurationEx()`/`durationSetAllowsWeight()`/`usesLoadMetrics()`, `exerciseSessions()` 1720, `exerciseRecords()` 1558.
- Previous column / scope: `getPrevScope()` 3290, `findPreviousExercise()` 3461 (walks `state.history` newest-first, `same` filters `routineId`), `getPreviousSet()` 3481, `getExInstanceIdx()` 3441, `copyPreviousIntoSet()` 3493.
- Routine targets: `normalizeRoutineItem()` 2946 (`targetRepsMin/Max`, `targetDurationSec`), `parseRepsTarget()` 2924, `formatRepsTarget()` 2938; `doStartRoutineWorkout()` 3895 stamps `targetRepsLabel` + per-set `targetSec`, prefills weight.
- Live workout: `renderActiveWorkout()` 4026 (ex-block header, set rows, prev text, placeholders, then `saveActiveSession()`); `updateSetVal()` 4354 / `handleSetFieldChange()` 4337 / `paintSetRowError()` 4305 are the no-rebuild typing path.
- Units/step: `toDisplayWeight()`/`fromInputWeight()`/`formatDisplayWeight()` 2077, `state.unit`, `calcDropWeight()` 3421 + `setDropStepPct()` 3302 (house step already 2.5 kg / 5 lb).
- Undo pattern: `deletedSetBackup`/`deletedSetTimer`/`expireDeletedSet()` 4294 and its banner in `renderActiveWorkout()`.
- Settings: `state` defaults 2057, `init()` 2365, `hydrateSettingsControls()` 7782, keep-awake row = checkbox template; `saveActiveSession()`/`restoreDraftToActive()` carry the draft.
- Tests: `tests/harness.mjs` `EXPORT_SNIPPET` (new functions must be exported); 299/299 green today.

### Rule — one pure function, computed live, nothing stored
`computeNextTarget(exIdx) -> {kind, weightKg, reps, durationSec, lastSets, allHit, ageDays, reason} | null`; constants `TARGET_STALE_DAYS=21`, step 2.5 kg / 5 lb / 5 s.
- `entry = previousExerciseEntry(exId, getExInstanceIdx(...), activeWorkout.routineId||null)` — the exact `findPreviousExercise` loop, but returns `{w, item}` so the date is known; `findPreviousExercise()` delegates to it (behaviour unchanged).
- No entry, or no working sets in it → `kind:'none', reason:'first'`, text “First time: pick a comfortable weight” (same-scope miss: “No history for this routine yet: pick a comfortable weight”).
- `ageDays = floor((Date.now() - w.date)/86400000)`; `>21` or bad date → `kind:'none', reason:'stale'`, “No target: last session was N days ago”.
- Working sets = `metricCountingSets(item.sets)` / `durationCountingSets(item.sets)` filtered to type `N` or `F` — warm-ups `W` and drops `D` never count, failure counts, supersets/instances need nothing extra.
- `top` (the rep bar): duration → routine `targetSec` if present else max hold; reps → `parseRepsTarget(exItem.targetRepsLabel).max` if present else max reps of that session. `allHit = every working set >= top`.
- `weight_reps`: base `= max(weight)` over working sets (mixed weights → heaviest). `base>0` → `kind:'load'`, `reps=top`, `weightKg = allHit ? addStep(base, unit) : base` (round in the display unit: kg +2.5, lb +5 then `fromInputWeight`; 60 kg→62.5 kg, 137.3 lb→62.27 kg stored). `base<=0` → reps-only: `reps = allHit ? top+1 : top`.
- `bodyweight_reps` / `assisted`: `kind:'reps'`, `reps = allHit ? top+1 : top`, weight unchanged (never raises assistance load).
- `duration`: `kind:'duration'`, `durationSec = allHit ? top+5 : top`, optional carried load unchanged.

### UI
- One `div.target-line` under the exercise-name header (before the note), 12px `var(--text-sub)`, ≤412 px: `Target: 62.5 kg × 8 · +2.5 kg — last 60 kg × 8, 8, 8 (all hit)` / `Target: 60 kg × 8 · same weight, beat last — last 60 kg × 8, 8, 7 (missed 1)` / `Target: 9 reps …` / `Target: 1:10 …`; no-history and stale texts above. The reason is always on the line; never a bare number.
- Right side: `[Use]` `[Hide]`, `min-height:44px`, padding 6–12 px. `Use` only when a target exists.
- `useNextTarget(exIdx)` fills only rows whose weight **and** reps (or weight **and** durationSec) are both empty, type `N`/`F` only; ticks nothing; then render + save. Any typed value → row untouched.
- Undo: `targetFillBackup={exIdx, rows:[{sIdx,weight,reps,durationSec}], expiresAt}` + `targetFillTimer`, banner “Targets filled. [↩️ Undo (5s)]”, `undoTargetFill()` / `expireTargetFill(now)` exactly like `expireDeletedSet`.
- `hideTargetsForWorkout()` sets `activeWorkout.targetsHidden=true`; single banner “Targets hidden for this workout. [Show]” → `showTargetsForWorkout()`. All handlers top-level (no inline closures); render stays single-pass so typing never rebuilds.

### Persistence / settings (no schema bump)
- `state.showTargets` default `true`, normalised with the same `if (typeof … !== 'boolean')` line next to `keepAwake` in `init()`, `migrateParsedStateToV2()`, `validateBackupData()`, `confirmRestore()`, `undoLastRestore()`; export/backup carries it automatically.
- Profile › Settings row “Show next targets” + help “Suggests the next weight or reps from your last session.”, `id="showTargetsCheck"`, `onchange="setShowTargets(this.checked)"`, row `min-height:44px`; `setShowTargets` saves and re-renders an open workout; `hydrateSettingsControls()` paints it.
- `activeWorkout.targetsHidden` travels in `saveActiveSession()` / `restoreDraftToActive()` (draft only).

### Tests — `tests/p5_next_target.test.mjs` (+ `EXPORT_SNIPPET`)
`target-plus-step-when-all-hit-kg` (60×8,8,8→62.5 kg×8) · `target-plus-5-lb` (LBS: 137.3 lb / 62.27 kg) · `same-weight-when-missed` (60×8,8,7→60 kg, “missed”) · `mixed-weights-heaviest` · `no-target-without-history` · `no-target-if-older-than-21-days` (22 d → none; 21 d still targets) · `warmups-and-drops-ignored` (W 40×10, N 60×8, D 50×8 → base 60) · `bodyweight-plus-one-rep` (8,8,8→9) · `duration-plus-5s` (1:05→1:10; 1:05,1:00→1:05) · `use-fills-only-empty-sets` (typed 55×6 untouched, nothing ticked) · `use-has-undo` (+ expiry) · `hide-for-this-workout` (+ Show) · `setting-off-hides` · `rationale-shown` (“all hit”/“missed”/“last …” in html) · `typing-does-not-rebuild` (line html identical after `updateSetVal`) · `handlers-compile` · `nothing-wider-than-412` (44 px buttons) · `showTargets` survives reload and export→import.

### Existing tests possibly affected
`p2_previous` (find refactor — run first), `p1_tidy` / `p2_catalogue` / `p2_drop_superset` handlers-compile, `p2_logger_core` + drop no-rebuild, `static` / `p4_keepawake` markup checks for the new 44 px settings row. Suite stays 299 green plus the new file.

### Not doing
No AI/coaching text, no RPE/RIR, no deloads, no %1RM programs, no equipment-increment settings, no schema bump, no history writes, no auto-tick, no routine edits, no medical/readiness claims. Files touched: `index.html`, `tests/harness.mjs`, new test file, then P5-05/P2-07/P1-08/PROGRESS_LOG doc rows in the same branch.

