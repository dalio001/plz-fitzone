# P2-13 part B plan (DeepSeek V4.1 Flash, plan mode, saved by the supervisor 2026-10-24)

Supervisor decision: list all 10 batch-1 ids.

**Today (verified on this branch, `node --test` 265/265 green)**
- `index.html` 9132 lines, one `<script>`. Catalogue: `EXERCISE_ROWS` (1784, 100 rows, `['ex1', name, equip, primary, [secondary], type]`), `expandExerciseRow`, `DEFAULT_EXERCISES` (1890). `esc` 1896, `exPrimary` 1906, `mapLegacyMuscle` 1919, `MUSCLES` 1393 (12 names). `exerciseBadgesHtml` 4957, `renderExercisesList` 5117 (text only, no images), `openExerciseDetail` 5621, `renderExerciseDetail` 5627 (`#exDetailBody`), modal markup 1130. CSS tokens + `.card` at 241. No `EXERCISE_PICTURES`, no SVG body chart today (only progress sparklines, `viewBox 0 0 360 160`).
- `sw.js`: `CACHE_VERSION = 'plz-fitzone-v4'` (2), `CORE_ASSETS` (9) precache-only, page branch network-first 3 s, **all other GETs already cache-first-and-put** in one generic branch.
- `tests/harness.mjs` exports app globals via `EXPORT_SNIPPET` (258–426) — new functions must be added there to be callable.

**1. Picture (`EXERCISE_PICTURES`)**
- New const next to `exerciseBadgesHtml`: `const EXERCISE_PICTURES = ['ex1','ex2','ex4','ex5','ex7','ex8','ex9','ex11','ex12','ex13'];` (the 10 batch-1 files committed in `assets/exercises/`, all valid WebP) — one id per line, comment "add a line only after the webp is committed".
- `function exercisePictureHtml(ex)` → `''` unless `ex && EXERCISE_PICTURES.indexOf(ex.id) >= 0`; else `var src = './assets/exercises/' + ex.id + '.webp';` then `.ex-pic` box → `<img src="' + esc(src) + '" alt="' + esc(ex.name) + ' start and end position" loading="lazy" decoding="async" onerror="this.parentNode.style.display='none'">` + caption `Start → End`.
- `renderExerciseDetail`: `const picHtml = exercisePictureHtml(ex);` inserted right after the badges line, before the chart. No `innerHTML` elsewhere; no request for unlisted ids (no 404), failure hides the box only.
- CSS after `.card` (241): `.ex-pic { width:100%; aspect-ratio:16/9; border-radius:var(--radius-12); overflow:hidden; background:var(--bg-elevated); border:1px solid var(--border); position:relative; margin-bottom:var(--space-8); }` + `.ex-pic img { width:100%; height:100%; object-fit:cover; display:block; }` + `.ex-pic-cap { font-size:var(--font-12); color:var(--text-sub); margin-top:var(--space-4); }`.
- **Trap:** never write `src="./assets/…` literally in `index.html` — `static.test.mjs` scans `src="./…"` and demands each ref exist *and* be precached. Build the URL in a variable, as above.

**2. Muscle chart (every exercise with muscle data, incl. custom)**
- Inline consts above `exercisePictureHtml`: `BODY_MAP_POLYGONS = {front:[…], back:[…]}` pasted from `docs/research/body-map-polygons.json` (+ comment "react-body-highlighter 2.0.5 src/assets/index.ts, MIT, Copyright (c) 2020 GV79, viewBox 0 0 100 220"). Region names available: front `chest, obliques, abs, biceps, triceps, neck, front-deltoids, head, abductors, quadriceps, knees, calves, forearm`; back `head, trapezius, back-deltoids, upper-back, triceps, lower-back, forearm, gluteal, abductor, hamstring, knees, calves, left-soleus, right-soleus`.
- `MUSCLE_CHART_REGIONS` (all 12 catalogue/modal names, verified against `MUSCLES`): Chest→`chest`; Back→`upper-back,trapezius,lower-back`; Shoulders→`front-deltoids,back-deltoids`; Biceps→`biceps`; Triceps→`triceps`; Forearms→`forearm`; Core→`abs,obliques`; Quads→`quadriceps`; Hamstrings→`hamstring`; Glutes→`gluteal`; Calves→`calves,left-soleus,right-soleus`; Full body→special (`chest,upper-back,quadriceps,gluteal,front-deltoids` as **secondary**, no primary).
- `function muscleChartLevels(ex)` → `{primary:[], secondary:[]}`; uses the **raw** `ex.primary || ex.muscle` (not `exPrimary`, whose legacy fallback would paint chest for unknowns); legacy `Arms`/`Legs` resolved through `mapLegacyMuscle`; unknown name → both empty; secondary never overrides a primary region.
- `function muscleChartHtml(ex)` → `''` when `!ex`; else one `<svg viewBox="0 0 210 220" role="img" aria-label="…">` with `<g data-view="front">` and `<g data-view="back" transform="translate(110,0)">`; each polygon `fill` = primary `#ef4444` / secondary `#fca5a5` / idle `#475569`, with `data-region` + `data-level`; sizing `style="width:100%; max-width:240px; height:auto; display:block; margin:0 auto;"` (fits 320–412 px, ~250 px tall). Legend below: `Main: <b>X</b> · Also: Y` (`esc()` on both, "Also" omitted when empty). Everything in `esc()`, no new buttons.
- `renderExerciseDetail`: `const chartHtml = muscleChartHtml(ex);` between picture and the existing `Primary:`/`Secondary:` lines. No inputs in this sheet, so typing still rebuilds nothing; chart is a pure string build (~26 polygons).

**3. `sw.js` runtime caching (not precache)**
- `CACHE_VERSION = 'plz-fitzone-v5'` (comment: v5 adds exercise pictures cache). `CORE_ASSETS` unchanged — pictures stay out.
- New `isExercisePicture(request)` (`url.pathname.indexOf('/assets/exercises/') >= 0`) checked **before** the generic branch: cache-first via `caches.match`, else `fetch`, then `if (!response || !response.ok) return response;` store `response.clone()` (a 404/HTML error is never cached, so a missing file can't stick); offline miss → fetch rejects → `<img onerror>` hides. Generic branch untouched, so icons/manifest/page behaviour is unchanged. Note: activation purges the v4 cache, so already-viewed pictures re-download once after the update.

**4. No list thumbnails** — `renderExercisesList` / `renderPickerList` untouched (text only).

**Tests — `tests/p2_13_pictures.test.mjs`**, plus new names added to `EXPORT_SNIPPET` (`EXERCISE_PICTURES, exercisePictureHtml, muscleChartHtml, muscleChartLevels, MUSCLE_CHART_REGIONS, BODY_MAP_POLYGONS`):
`picture-shown-only-for-listed-ids`, `no-img-for-unlisted`, `img-lazy-async-and-16x9-box`, `picture-files-exist-for-every-listed-id`, `body-chart-front-and-back`, `primary-and-secondary-colours`, `every-catalogue-muscle-maps-or-is-safe` (all 100 rows + 12 names), `custom-exercise-gets-chart`, `unknown-muscle-no-crash`, `pictures-not-precached-but-runtime-cached` (vm-loads real `sw.js`, fake `caches`/`self`, drives the captured `fetch` listener: hit → no network, miss → put, 404 → not put, `CORE_ASSETS` has no `assets/exercises`), `handlers-compile`, `nothing-wider-than-412`. Extras: `picture-hides-itself-on-error`, `list-has-no-thumbnails`.

**Existing tests possibly affected**
- `tests/static.test.mjs:62` asserts the literal `plz-fitzone-v4` → rename to v5 (only test edit needed; no schema/data change).
- `static.test.mjs` precache scan — safe only if no `src="./assets/…` literal lands in HTML (see trap).
- `p1_tidy.test.mjs` `handlers-compile` (new `onerror` must compile) and `nothing-wider-than-412` (no `width:>412px`), `p2_catalogue.test.mjs` injection test (detail must keep no `<img` for unlisted ids), `p5_*` untouched.

**I will NOT:** bump `SCHEMA_VERSION`, touch state/backups/data, add precache entries, add thumbnails, add picture/video for custom exercises, add "how to do it" text, add packages/build steps, or commit/push.

**One real decision:** the brief says start with `ex7`,`ex13`, but the branch now has all 10 batch-1 files committed (`e6b934`). Default: list all 10 (supervisor's own batch-1 list); say "two only" and I drop 8 lines — `picture-files-exist-for-every-listed-id` keeps it honest either way.

PLAN-READY
