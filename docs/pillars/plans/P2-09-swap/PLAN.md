# P2-09 Equipment swap (personal part) — Plan

Owner story: at the gym a machine or bar is busy. In the live workout he taps
**⇄ Replace** on an exercise and, at the top of the picker, sees
"Same muscle, other equipment" suggestions with one plain reason line each.
He picks one, sees what changes, confirms, and can undo back to the original
for the rest of the workout. The saved routine is never changed.

## Scope today
- Equipment only. Time-aware ("short on time") is NOT in this job; say so in the pillar row.
- Only the live workout (`activeWorkout`). Routines, history and the MCP stay untouched.

## Functions (index.html `<script>`)

Catalogue rows are `[id, name, equipment, primaryMuscle, [secondary], type]`
(see ~line 2100; objects in `state.exercises` have `id, name, equipment, muscle, secondary, type`
— check the real field names before coding).

1. `getSwapSuggestions(exId, avoidEquip)` — pure. Returns up to 5 exercises:
   - same primary muscle as `exId`, different id, equipment not in `avoidEquip`
     (default `[equipment of exId]`), and same "load family" (`weight_reps` vs
     `bodyweight_reps` vs duration) when possible; bodyweight-family options may follow
     after loaded ones.
   - ranked by: shared secondary muscles (more first), then same type, then catalogue order.
   - each item `{ exId, name, equipment, reason }`, reason like
     `"Same muscle: Quads · Barbell → Dumbbell"` (+ `" · also Glutes"` when a secondary is shared).
   - unknown exId or no matches → `[]`.
2. Picker in replace mode (`pickerTarget === 'replace'`): render a section
   `<h3>Same muscle, other equipment</h3>` above Recent with the suggestions
   (normal picker rows plus the small reason line). A row of chips
   "Can't use: Barbell · Dumbbell · Machine · Cable · …" (the current exercise's
   equipment pre-selected) changes `avoidEquip` and re-renders. Hidden outside replace mode.
3. Tapping a suggestion (or any exercise in replace mode) opens a small confirm sheet:
   "Swap Squat (Barbell) → Goblet Squat?" + what changes:
   "Keeps 4 sets and 150 s rest · weights start empty (different equipment)" + the reason line.
   Buttons **Swap** / **Cancel**. (Keep it simple: reuse an existing modal style.)
4. `swapActiveEx(exIdx, newExId)` — wraps `replaceActiveEx(exIdx, newExId, false)` but first
   stores the original exercise object (deep copy, including done sets and note) in
   `exItem.swappedFrom = { exId, sets, restSec, note }` on the NEW item.
   Done sets of the original: if any set was already ticked, the confirm sheet says
   "2 done sets stay with Squat in Undo only" — never silently lose them; Undo restores them.
5. In `renderActiveWorkout()` header of a swapped exercise: a small line
   "Swapped from Squat (Barbell) · **Undo**". `undoSwapActiveEx(exIdx)` puts the original
   object back exactly. Available until the workout ends (not a 5 s toast).
6. Finishing the workout saves only the current exercise (no `swappedFrom` in history:
   strip it in the finish/save path). The routine is not modified.
7. `saveActiveSession()` must keep `swappedFrom` so a reload still offers Undo.

## Tests (`tests/p2-09-swap.test.mjs`, harness like the other tests)
- suggestions: same muscle, other equipment, ranked, max 5, reason text, avoid list, unknown id → [].
- swap keeps set count and rest, empty weights, stores swappedFrom; undo restores exactly
  (including done sets and note).
- finished workout history has no swappedFrom; routine unchanged.
- picker section only in replace mode.
- All existing tests still pass: `node --test "tests/*.test.mjs"` (406 before this job).

## Docs
- docs/pillars/02_WORKOUT_ENGINE.md P2-09 row: "[ ] in progress — personal part (equipment swap) implemented <date>, awaiting owner phone check: …; not done: time-aware changes, routine-level swaps."
- docs/PROGRESS_LOG.md: prepend one entry. NEVER delete existing lines.

## Rules
- Branch `codex/p2-09-equipment-swap` in E:/My Apps/plz-fitzone. Commit there, do NOT push, do NOT merge.
- Do not touch api/, mcp/, sw.js, supabase files.
- Match the surrounding code style (plain functions, short comments).
