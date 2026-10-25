# P2-14 Warm-up Set Helper — Plan

## Functions to add / modify (today)

**New pure helpers (in `<script>`):**
- `isBarbellEquipment(exInfo)` — returns true for `Barbell` equipment (uses bar + plates)
- `isDumbbellMachineCableEquipment(exInfo)` — returns true for `Dumbbell`, `Machine`, `Cable`, `Kettlebell`, `Band`, `Other` (step increments only)
- `roundDownToPlateLoad(weightKg, unit, ps)` — greedy plate math (reuses `computePlates` logic), returns nearest loadable ≤ weight
- `roundDownToStep(weightKg, unit, stepKg)` — rounds down to 2.5 kg / 5 lb steps
- `buildWarmupRamp(firstWorkingKg, exInfo, unit, ps)` — returns array of `{ weightKg, reps, type: 'W' }` for bar×10 / 40%×5 / 60%×3 / 80%×1, filtered per rules
- `getFirstWorkingWeight(exItem, exIdx)` — reads first N/F set weight, else `computeNextTarget(exIdx).weightKg`, else `getPreviousSet(...).weight`, else null

**New UI/action functions:**
- `addWarmupSets(exIdx)` — inserts warm-up sets at index 0 of `exItem.sets`, clears `setInputErrors` for shifted rows, sets `warmupBackup = { exIdx, count, expiresAt: Date.now()+5000 }`, starts 5s timer, `renderActiveWorkout()`, `saveActiveSession()`
- `undoWarmupSets()` — removes the first `count` W sets, clears backup, renders, saves
- `expireWarmupBackup(now)` — clears backup after 5s
- Modify `renderActiveWorkout()`: in ex-block header (after 🧮 plate button), show **Warm-up** button when `usesLoadMetrics(exInfo) && exInfo.type === 'weight_reps' && !exItem.sets.some(s => normSetType(s.type)==='W') && !warmupBackup`; show **Warm-ups added** + Undo (5s) when `warmupBackup` active; hide when W sets already exist without backup.

**State additions:**
- `let warmupBackup = null; let warmupTimer = null;`

## Design

1. **Eligibility**: only `weight_reps` exercises (barbell, dumbbell, machine, cable, kettlebell, band, other). Excludes `bodyweight_reps`, `assisted`, `duration`.
2. **First working weight resolution** (in order):
   - First set in `exItem.sets` with `type === 'N' || type === 'F'` and a finite `weight > 0`
   - `computeNextTarget(exIdx).weightKg` (P5-05 next target)
   - `getPreviousSet(exId, 0, 'N', instanceIdx, routineId).weight` (previous session lane 0)
   - If none → toast "Enter your working weight first", add nothing
3. **Ramp calculation** (barbell):
   - Steps: `[{ pct: 0, reps: 10, label: 'bar' }, { pct: 0.4, reps: 5 }, { pct: 0.6, reps: 3 }, { pct: 0.8, reps: 1 }]`
   - Bar weight from `ps.barKg` / `ps.barLb` per unit
   - Each target = `roundDownToPlateLoad(firstWorkingKg * pct)` (bar step uses bar weight directly)
   - Filter: keep only if `target > previousKeptWeight` AND `target < firstWorkingKg`
4. **Ramp calculation** (dumbbell/machine/cable):
   - No bar step; start at 40%
   - Steps: `[{ pct: 0.4, reps: 5 }, { pct: 0.6, reps: 3 }, { pct: 0.8, reps: 1 }]`
   - Each target = `roundDownToStep(firstWorkingKg * pct, unit, 2.5kg/5lb)`
   - Same filter rules
5. **Insertion**: prepend generated W sets to `exItem.sets` (index 0..n-1). Adjust `setInputErrors` keys (+n offset).
6. **Undo (5s)**: banner "Warm-ups added · ↩️ Undo (5s)" in ex-block (like deleted-set banner). Tap restores original sets. Expiry clears banner, keeps warm-ups.
7. **No duplicate**: button hidden if any `type === 'W'` set exists in `exItem.sets` and no active `warmupBackup`.
8. **Warm-up sets behave normally**: editable weight/reps, removable via set menu, never counted by `metricCountingSets` / `previousWorkingSets` / `exerciseRecords` (already true for type W).

## Test names (new file `tests/p2_warmup.test.mjs`)

- `warmup-ramp-barbell-100kg` — bar 20kg, plates default, 100kg working → bar×10, 40kg×5, 60kg×3, 80kg×1 (all loadable)
- `rounds-to-available-plates-kg-and-lbs` — 97.5kg working (KG) and 215lb working (LBS) verify plate-rounding down
- `dumbbell-starts-at-40pct-2-5-steps` — dumbbell 50kg working → 20kg×5, 30kg×3, 40kg×1 (2.5kg steps, no bar)
- `uses-typed-then-target-then-previous` — typed weight in first N set wins; cleared → P5-05 target wins; cleared → previous session lane 0 wins
- `no-working-weight-shows-note` — no typed, no target, no previous → alert "Enter your working weight first", zero sets added
- `never-added-twice-and-undo` — second tap does nothing; Undo within 5s removes only the warm-ups; expiry keeps them
- `excluded-for-bodyweight-assisted-duration` — button absent for `bodyweight_reps`, `assisted`, `duration` exercises
- `warmups-not-counted-in-records-volume-targets` — warm-up sets excluded from `metricCountingSets`, `previousWorkingSets`, `exerciseRecords`, `computeNextTarget` base
- `handlers-compile` — all new onclick/onchange handlers parse as valid JS
- `nothing-wider-than-412` — warm-up button + undo banner fit 412px, buttons ≥44px, P1 tokens used

## What I will NOT do

- No schema version bump (state shape unchanged; warm-ups are normal `type: 'W'` sets)
- No backend/cloud sync, no account, no multi-user
- No changes to history/save logic (warm-ups already excluded by `metricCountingSets`)
- No plate calculator UI changes (reuse existing `computePlates` / `getPlateSettings`)
- No modification of `addSetToActive`, `computeNextTarget`, `previousExerciseEntry` contracts
- No new dependencies, no build step, no lint command

---

PLAN-READY