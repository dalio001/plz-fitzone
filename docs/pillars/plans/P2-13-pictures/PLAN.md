# P2-13 (personal part): exercise pictures + muscle body chart (plan, supervisor, 2026-10-24)

Owner decisions 2026-10-24: avatar = round-4 "PLZ Train" picture (docs/research/FLOW_AVATAR_LOG.md);
form reference = ExRx.net (ACE Exercise Library as second check), our own pictures and words, nothing copied;
picture = ONE wide 16:9 image, START position left, END position right; working muscles shown in a separate
anatomical body chart (front + back), NOT drawn on the avatar ("The second is better with the schema").

## A. Pictures (supervisor, Google Flow, 0 credits)
- Image mode, Nano Banana 2.1, 16:9, x2, avatar added as reference, fixed style block + exercise block (prompts logged).
- Every take checked for form against ExRx, same face/clothes, five fingers, no text. Redo at most 2 times, else skip and list.
- Download chosen take (1K), convert to WebP 960x536 (~50 KB) -> assets/exercises/<exId>.webp.
- Batch 1 (10): ex1 bench, ex2 incline DB press, ex4 lat pulldown, ex5 bent-over row, ex7 squat, ex8 RDL, ex9 leg press,
  ex11 overhead press, ex12 lateral raise, ex13 DB curl. Owner OK -> batches of ~15 by muscle group to ex100.

## B. App (builder agent)
1. Exercise detail sheet (renderExerciseDetail): under the name/badges, a 16:9 picture box (width 100%, aspect-ratio 16/9,
   rounded, dark background) with `<img loading="lazy" decoding="async">` from `./assets/exercises/<id>.webp`,
   ONLY for ids listed in a constant `EXERCISE_PICTURES` (no 404 requests for others). Small caption "Start → End".
   onerror hides the box. No picture -> nothing shown (no empty box).
2. Muscle body chart for EVERY exercise with muscle data (built-in and custom): inline SVG, front + back figures side by side
   (polygons from docs/research/body-map-polygons.json, MIT, keep the copyright line in a comment), primary muscle in strong red
   (#ef4444), secondary in light red (#fca5a5), others slate (#475569); legend "Main: X · Also: Y". Fits 320-412 px.
   Mapping app muscle -> chart regions: Chest->chest; Back->upper-back,trapezius,lower-back; Shoulders->front-deltoids,back-deltoids;
   Biceps->biceps; Triceps->triceps; Forearms->forearm; Core->abs,obliques; Quads->quadriceps; Hamstrings->hamstring;
   Glutes->gluteal; Calves->calves,left-soleus,right-soleus; Full body->primary-less: highlight chest,upper-back,quadriceps,gluteal,front-deltoids as secondary.
   Unknown muscle names -> no highlight, no crash.
3. Speed: pictures are NOT in the service-worker precache list; sw.js caches them at runtime on first view (cache-first for
   ./assets/exercises/), so they appear instantly afterwards and offline. Bump CACHE_VERSION to v5.
4. Exercise list stays text only (no thumbnails) to keep scrolling smooth.
5. Tests (new tests/p2_13_pictures.test.mjs): picture-shown-only-for-listed-ids, no-img-for-unlisted, img-lazy-async-and-16x9-box,
   picture-files-exist-for-every-listed-id, body-chart-front-and-back, primary-and-secondary-colours, every-catalogue-muscle-maps-or-is-safe,
   custom-exercise-gets-chart, unknown-muscle-no-crash, pictures-not-precached-but-runtime-cached, handlers-compile, nothing-wider-than-412.
   The 265 existing tests stay green.

## Not doing now
"How to do it" text (next job), videos, thumbnails in lists, pictures for custom exercises.
