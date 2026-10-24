# P2-13 how-to text plan (DeepSeek V4.1 Flash, plan mode, saved by the supervisor 2026-10-24)


## 1. Where the data lives
- **One constant inside the existing `<script>`** in `index.html`, placed right after `EXERCISE_PICTURES` (line ~5069) and before `exercisePictureHtml`: `EXERCISE_HOWTO = { ex1: { setup, move, avoid }, … ex100 }`, one exercise per line-group, keys in catalogue order.
- **Why inline, not a separate JS/JSON asset:** the page HTML is already precached by `sw.js` v5, so the text is offline by definition with zero new code. A separate asset would need a `CORE_ASSETS` entry (static precache test), an async fetch + a no-data failure path, and a first-open delay — for text this small that is all downside.
- **Size:** ~38 words ≈ 230 chars of prose + ~40 chars of keys/quotes per entry → **~26 KB (~24–30 KB) added to a 445 KB page (~6%), ~5 KB gzipped.** No new file, no new request.
- Shape is plain strings only (`esc()` applied at render), no HTML in the data.

## 2. Render change
- `function exerciseHowtoHtml(ex)` next to `exercisePictureHtml`: returns `''` unless `ex.id` is an own key of `EXERCISE_HOWTO` with all three non-empty strings → no block for custom/unknown/legacy records (no empty shell).
- Markup (all through `esc()`): `.ex-howto` → title **How to do it** → three rows labelled **Setup / Move / Avoid** (`<span class="ex-howto-k">` + text span), no buttons, no inputs, no handlers.
- `renderExerciseDetail` (line 5913): `${picHtml}` → **`${howtoHtml}`** → `${chartHtml}` → Primary/Secondary. Text sits directly under the start/end picture, chart follows.
- CSS after `.ex-pic-cap`: block `width:100%; box-sizing:border-box; background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--radius-12); padding:var(--space-12); margin-bottom:var(--space-8); font-size:var(--font-14); line-height:1.45;`, title/labels `var(--font-12)` `var(--text-sub)` uppercase, label column `flex:0 0 52px`, text `flex:1; min-width:0; overflow-wrap:anywhere`. P1 tokens only, no px width anywhere.
- **Open by default, not collapsible:** the sheet is opened to learn the movement; 3 rows ≈ 6 phone lines, and a `<details>` would cost a tap on every visit and hide the *Avoid* line — the most useful one. No open/closed state, so nothing new to persist.
- Typing: the sheet has no inputs and the block is a pure string build, so no handler can rebuild while typing.

## 3. Tests — new `tests/p2_13_howto.test.mjs` (+ `EXERCISE_HOWTO, exerciseHowtoHtml` in `EXPORT_SNIPPET`)
1. `howto-shown-for-every-builtin` — for all 100 ids the detail sheet contains "How to do it" and that entry's exact setup text.
2. `howto-has-setup-move-avoid` — `Object.keys(EXERCISE_HOWTO)` is exactly ex1..ex100; each entry has the three fields, strings, trimmed, non-empty; no extra fields.
3. `howto-short-max-words` — word count of setup+move+avoid ≤ 45 for every exercise, setup ≤ 14, move ≤ 20, avoid ≤ 14; setup/avoid are one sentence, move one or two.
4. `howto-no-medical-or-rep-advice` — no `reps|sets|kg|lb|pounds|fail|pain|injur|doctor|medical|weight loss|guarantee` in any text.
5. `howto-texts-are-distinct` — no two exercises share the same setup+move+avoid triple.
6. `no-howto-for-custom` — a custom exercise, an unknown id and `null` return `''` and put no "How to do it" in the sheet.
7. `howto-escaped` — temporarily inject `<b>x</b> & "q" 'q'` into one entry (fresh app per test, restored after): HTML contains `&lt;b&gt;`, `&amp;`, `&quot;`, `&#39;` and never the raw tag.
8. `handlers-compile` — build the sheet for ex1, ex60, ex100, a custom and a hidden exercise; every `on*="…"` in `#exDetailBody` compiles via `new Function`.
9. `nothing-wider-than-412` — with the longest exercise name + longest howto rendered, no `width:(5xx|4+)px` in the sheet, block is `width:100%`, and no `<input` in the sheet.
- Nothing else changes; the **279 existing tests stay green** (no `sw.js`, `EXERCISE_PICTURES`, schema or data edits).

## 4. How the 100 texts get written (build run, by me)
- Catalogue order ex1→ex100. For each: read its row in `docs/research/exercise-prompts-90.tsv` (or its bullet in `docs/research/exercise-prompts.md` for ex1–ex13) so *Setup* = the LEFT/START panel and *Move* = the motion to the RIGHT/END panel exactly as pictured; form knowledge (ExRx/ACE-equivalent, **own wording, nothing copied**) supplies *Avoid*.
- Style: plain short words, gear and body position named, no jargon, no numbers, no "simply/just", no second exercise sneaked in.
- Then a self-review pass: run the new suite, reread all 100 against the prompt table once (wrong start/end descriptions fixed), and spot-check 3 sheets in the browser at 360 px.
- After green: update the P2-13 row + Next Immediate Action in `docs/pillars/02_WORKOUT_ENGINE.md`, prepend `docs/PROGRESS_LOG.md`, and overwrite `CHECKPOINT.md`.

## 5. I will NOT do
- No `SCHEMA_VERSION` bump, no state/backup/migration change, no new storage key; text is read-only.
- No new files, packages, build step, network call, or `sw.js`/`CACHE_VERSION` change (page is precached/network-first already).
- No howto for custom exercises, no editing UI, no collapse/animation, no translations, no thumbnails, no changes to lists/picker/history.
- No new pictures (all 100 webps already committed), no videos, no touch to the muscle chart or picture code.
- No commit/push/deploy.

PLAN-READY
