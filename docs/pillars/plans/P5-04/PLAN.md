# P5-04 body weight and measurements (written by DeepSeek V4.1 Flash in plan mode, saved by the supervisor 2026-10-24)


**Today's state (verified in this worktree, branch `codex/p5-04-measures`)**
- Profile segmented control = 3 buttons (`#profileProgress` :804, `#profileRecordsSection` :852, `#profileSettings` :861; buttons :798–800); `getProfileSection` (:6974) / `setProfileSection` (:6984) whitelist `progress|records|settings`, persist to `PROFILE_SECTION_KEY`, toggle `hidden` + `aria-pressed`.
- `renderProfileStats` (:7053) is the single Profile refresh entry (tab switch, `toggleUnit` :2608, restore); chart style to reuse = `exerciseSeries` (:1680) + SVG block in `renderExerciseProgress` (:5247–5291, viewBox 360×160, dashed min/max, polyline, dots, `#3b82f6`); `emptyStateHtml` (:6963), `.empty-state*` CSS (:152), `esc` (:1814).
- Canonical units: `LB_PER_KG` (:1952), `toDisplayWeight` (:1956), `fromInputWeight` (:1965); `state.unit` = display only. `saveState` (:2579) writes localStorage + `queueMainStateMirror` (:2588) — a new state key rides along untouched.
- `state.profile.heightCm` from P1-05 (`normalizeProfile` :7228); `dayKeyLocal` (:6249), `startOfDayMs` (:6257); delete/undo pattern = `deletedHistBackup`/`expireDeletedHist(now)` (:2098, :6096, :6125).
- Baseline: `node --test "tests/*.test.mjs"` = **246 pass / 1 fail** (`p5_calendar.test.mjs:111 current-unfinished-week-does-not-break-streak`, clock-dependent: the card path uses real "now" while the fixture is pinned to 14 Oct 2026). See "Existing tests affected".

**1. Fourth section**
Add `#profileBody` panel + `profSecBtn-body` between Records and Settings; whitelists gain `'body'`; old stored values keep working, unknown → `progress`. CSS: `gap: var(--space-4)` and `.profile-section-btn { padding: var(--space-8) var(--space-4); font-size: var(--font-12); white-space: nowrap; }` → 4 × ~69 px at 320 px (288 px usable), no clipping, ≥44 px tall. Browser check at 320/360/412 documented.

**2. Quick entry (top card)** — static markup, never regenerated on typing: label "Today's weight", number `#bodyWeightInput` (`inputmode="decimal"`, 24 px text, 56 px tall), unit suffix `#bodyWeightUnit`, `date` `#bodyDateInput` (default today, `max=today`), Save (`btn-primary`, 100 %, 44 px), `#bodyEntryNote` ("Saved" / "Updated today's weight"), `#bodyError`. Save: convert to kg → validate → `upsertBodyWeight(date, kg)`; same date replaces the existing entry, keeps its id, sets the "Updated" note. Empty weight + no measurement → "Enter a weight or at least one measurement."

**3. More measurements** — `#bodyMoreToggle` (`aria-expanded`, in-memory `bodyMoreOpen`, collapsed by default) + `#bodyMoreFields` with 9 static numeric inputs (waist, chest, hips, arm L/R, thigh L/R, neck, body fat %); labels show cm or in from `state.unit`, body fat `%`. At least one may be empty. Saving merges into the same day's entry; clearing a field removes that measure (`state.body` stores only present values).

**4. Weight chart** — `bodyChartHtml()` reusing the P5-02 SVG block (equal spacing, no new lib): title = selected measure, `#bodyChart`. States: no entries at all → `emptyStateHtml('No weight yet', 'Save today’s weight to start a line.')`; 1 point → "Log another day to see a line" + single dot; entries exist but none in range → "No weight in this range · try a wider range"; selected measure empty → "No waist yet". Ranges `1M/3M/1Y/All` (`#bodyRangeChips`, `bodyRange` in memory, default 1M? **3M** — enough points to see a line).

**5. Trend + BMI** — `bodyTrend()`: latest entry *with* a weight ("Latest: 82.4 kg · 24 Oct"), delta vs the newest weight entry dated ≤ (latest date − 7 d) and ≤ (−30 d): "−1.2 kg in 30 days" / "Not enough history yet" for each. Plain facts only. If `profile.heightCm` parses to 50–250, show "BMI (from your height): 24.1" (weight ÷ m², 1 decimal) — number only, no category, no advice.

**6. History + edit/delete** — `#bodyHistoryList`, newest first: date, weight (or "no weight"), "+3 measurements", `aria` button per row. Tap → inline editor for that entry (`bodyEditId`, one at a time) with date, weight, the 9 fields, Save / Delete / Cancel; no new modal. Delete → `deletedBodyBackup = {entry,index,expiresAt:now+5000}`, banner "Entry deleted · ↩️ Undo (5s)", `undoDeleteBody()`, `expireDeletedBody(now)` testable like history.

**7. Measure switch** — `<select id="bodyMeasureSelect">` Weight, Waist, Chest, Hips, Arm L, Arm R, Thigh L, Thigh R, Neck, Body fat % → `setBodyMeasure(key)`; same chart/trend card, value axis in cm/in or %; `bodySeries(metric, range)` filters by date cutoff. `renderBodySection()` is called from `renderProfileStats` only (plus save/range/measure actions) and rewrites only chart/trend/history/note/labels — never the entry inputs.

**Data** — `state.body = [{ id, date:'YYYY-MM-DD', weightKg:number|null, measures:{waistCm,…} }]`, sorted by date, one entry per date. `normalizeBodyEntries(src)`: non-objects/invalid dates/future dates dropped; weight 20–400 kg else null; lengths 10–300 cm else dropped; fat 2–70 % else dropped; entries with nothing left dropped; duplicate dates merged (later wins); missing id ← `body-<date>`; idempotent, `missing = []`. No `SCHEMA_VERSION` bump (stays 2): normalize runs at init (:2148 block), in `validateBackupData` (:7745) and in `confirmRestore` (:7943). Old states/backups have no `body` → `[]`; exports already serialize the whole state, and the IndexedDB main-state mirror covers it via `saveState` with no changes.

**New tests** — `tests/p5_body.test.mjs`, harness exports added to `EXPORT_SNIPPET`: `normalizeBodyEntries, bodyEntries, upsertBodyWeight, upsertBodyMeasures, bodySeries, bodyTrend, bodyBmi, toDisplayLength, fromInputLength, saveBodyEntry, bodyDateChanged, toggleBodyMore, setBodyRange, setBodyMeasure, openBodyEdit, saveBodyEdit, askDeleteBody, confirmDeleteBody, undoDeleteBody, expireDeletedBody, renderBodySection, deletedBodyBackup, bodyRange, bodyMeasure, bodyEditId`.
Names: `body-section-in-segmented-control-and-remembered`, `save-weight-today-one-per-day-replaces`, `past-date-entry`, `lbs-and-inches-display-store-kg-cm`, `invalid-values-rejected-with-message`, `measurements-optional`, `chart-empty-one-point-and-line`, `trend-7-and-30-days`, `bmi-only-with-height-and-labelled`, `edit-and-delete-with-undo`, `restore-keeps-body-and-accepts-old-backup`, `typing-does-not-rebuild`, `handlers-compile`, `nothing-wider-than-412`, plus `normalize-body-idempotent-and-dedupes`, `range-filter-and-measurement-switch`.

**Existing tests affected** — `p1_tidy.test.mjs:23 profile-sections-switch-and-remember`, `:310 handlers-compile`, `:402 nothing-wider-than-412`, `:436 typing-in-settings-does-not-rebuild` must stay green (4 buttons: no count assertions exist). Pre-existing red `p5_calendar.test.mjs:111` must be fixed to reach 247 green: make the fixture clock-relative (workouts at −7 d and −14 d, expect "Streak 2"), app code untouched — labelled unrelated to P5-04.
**Q (1 real decision):** fix that fixture inside this branch (recommended) or leave it red and documented?

**Not doing** — progress photos, periodic/weekly reports, AI/coaching, BMI categories or any health/fat-loss inference, social sharing, schema bump, new libraries, backend, notification reminders.


## Supervisor decisions (2026-10-24)
- Q answered: fix the clock-dependent p5_calendar fixture in this branch (clock-relative), app code untouched.
- Default chart range 3M accepted.
- The owner tests on a 360 px wide Huawei (Android 9): the 4-button control must fit 320 px without clipping.
