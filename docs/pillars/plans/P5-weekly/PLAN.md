# Plan: "This Week" Summary Card at Top of Profile > Progress

## Today's Functions with Names

**New pure computation (testable, no side effects):**
- `computeWeekSummary(weekStartMs)` → returns plain object:
  ```js
  {
    weekStartMs, weekEndMs, dateRangeLabel,     // "20 – 26 Oct"
    workouts: { thisWeek, prevWeek, diffLabel }, // "+2 vs last week" / "same" / "−1"
    totalTimeSec: { thisWeek, prevWeek, diffLabel },
    totalSets: { thisWeek, prevWeek, diffLabel },     // warm-ups excluded (metricCountingSets)
    totalVolume: { thisWeek, prevWeek, diffLabel },   // display unit via toDisplayVolume
    records: [{ exId, exName, kind, value, display }], // up to 3, from exerciseRecords()
    bodyLine: { label, thisWeekDisplay, prevWeekDisplay, diffLabel } | null,
    muscles: [{ muscle, sets }],                       // top 3 primary muscles by counting sets
    hasWorkouts: boolean
  }
  ```

**New rendering & handlers (in-memory only, no persistence):**
- `renderWeekSummaryCard()` — builds the card HTML, injects at top of `#profileProgress`
- `weekSummaryViewWeekStartMs` — module-level `let` (init: current week per `getWeekStartDayNum()`)
- `showWeekSummaryPrev()` / `showWeekSummaryNext()` — navigation (no future weeks)
- `renderProfileStats()` — calls `renderWeekSummaryCard()` first, then existing logic

**Reused existing functions (no duplication):**
- `startOfWeekMs(ms, weekStart)` — week boundaries
- `getWeekStartDayNum()` — setting-aware (0=Sun, 1=Mon)
- `metricCountingSets(sets)` — warm-ups excluded, weight>0, reps≥1
- `epley1RMKg(weight, reps)` — Epley 1..12 reps
- `exerciseRecords(exId)` — bestE1RM, heaviestWeight, etc. (earliest tie wins)
- `toDisplayVolume(kgVol, unit)` / `toDisplayWeight(kgVal, unit)` — display units
- `bodyEntries()` — sorted body log (weightKg, date)
- `emptyStateHtml(title, help)` — shared empty state
- `esc(s)` — all text output
- `dayKeyLocal(ms)` — local day key

## Design

**Card placement:** First child of `#profileProgress` (above the 3-stat grid).  
**Card style:** `.card` with internal sections, max-width 412px (inherited from `main`).  
**Title row:** `‹  20 – 26 Oct  ›` — left/right arrows are `<button class="btn" min-height:44px min-width:44px>`; right arrow disabled when viewing current week.  
**Stats grid:** 2×2 (workouts, time, sets, volume) — each shows big number + small diff line (`+2 vs last week`, `same`, `−1`).  
**Records:** Up to 3 lines: `Bench Press — best e1RM 92.5 kg` (kind from `exerciseRecords`: `bestE1RM` preferred, then `heaviestWeight`, then `bestSetVolume`, then `mostRepsInSet`). `+N more` if more.  
**Body:** One line `Weight 81.2 kg (−0.6 vs last week)` using latest entry of each week (from `bodyEntries()`); shown only when both weeks have ≥1 weight entry.  
**Muscles:** Top 3 primary muscles by counting sets (reuse `muscleWorkloadCounts` logic filtered to the week), rendered as plain text chips (`.chip` style, non-interactive).  
**Empty week:** `emptyStateHtml("No workouts this week", "Start a workout to see your summary")` — body line still renders if data exists.  
**No:** notifications, sharing, AI text, goals, advice, health claims.

## Exact Test Names (new file: `tests/p5_weekly_summary.test.mjs`)

1. `week-bounds-follow-week-start-setting` — Monday vs Sunday start shifts which workouts fall in the week.
2. `counts-exclude-warmups` — warm-up (W) sets not counted in sets/volume; drop (D) and failure (F) counted.
3. `compare-with-previous-week` — diff labels correct for +N, 0, −N across all four stats.
4. `volume-in-display-unit` — `toDisplayVolume` used; KG and LBS modes verified.
5. `records-reuse-existing-logic-max-3-plus-more` — `exerciseRecords()` reused; bestE1RM preferred; earliest tie wins; `+2 more` when >3.
6. `body-line-only-with-enough-data` — shown only when both current and prior week have ≥1 weight entry; uses latest entry per week.
7. `top-3-muscles-by-sets` — primary muscle only, counting sets only, sorted desc, max 3.
8. `empty-week-state` — `emptyStateHtml` used; body line still renders when data exists.
9. `prev-arrow-and-no-future-week` — `‹` goes to prior week; `›` disabled/hidden when viewed week is current week.
10. `handlers-compile` — every `onclick` in the card parses as valid JS (`new Function(handler)`).
11. `nothing-wider-than-412` — card HTML contains no fixed width >412px; uses fluid layout.

## Existing Tests Possibly Affected

- `tests/p5_progress.test.mjs` — `renderProfileStats` now calls `renderWeekSummaryCard`; ensure stat grid still renders.
- `tests/p5_calendar.test.mjs` — week-start logic shared; no behavior change.
- All 323 existing tests must stay green. Run `node --test "tests/*.test.mjs"` after implementation.

## What Will NOT Be Done

- No schema change, no stored data, no new `state` fields.
- No second calculation of records/PRs — `exerciseRecords()` is the single source.
- No typing rebuilds (card is static after render; no inputs inside).
- No notifications, sharing, AI-generated text, goals, or health advice.
- No future-week navigation (right arrow disabled at current week).
- No changes to `P5-01` metric dictionary, `P5-03` calendar, or `P5-04` body logic.

## Implementation Order

1. Add `computeWeekSummary(weekStartMs)` pure function (before `renderProfileStats`).
2. Add `weekSummaryViewWeekStartMs` let + `showWeekSummaryPrev/Next` handlers.
3. Add `renderWeekSummaryCard()` — builds HTML, uses `esc()`, `emptyStateHtml`, `.card`, `.btn` (≥44px), `.chip`.
4. Modify `renderProfileStats()` to call `renderWeekSummaryCard()` first.
5. Write `tests/p5_weekly_summary.test.mjs` with the 11 tests above.
6. Run full test suite; fix any regressions.

**End state:** `PLAN-READY`