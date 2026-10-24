# Flow avatar log (P2-13 exercise pictures)

- 2026-10-24, Google Flow project https://flow.google.com/project/e02a51f2-da70-455f-906d-cc85f8ac45d8 (own tab, separate from content-engine work). Image mode, Nano Banana 2.1, 3:4, 0 credits.
- Round 1 (x3, ref: mascot jpg): generic fit man, lime tee with mascot, navy ankle pants, white shoes. Owner liked C (3D animated style).
- Round 2 (x2, refs: owner's face photo + avatar C): same avatar with owner's face/beard, mascot icon tee.
- Round 3 (x2, ref: round-2 avatar): same, tee shows only the word "PLZ" in navy.
- Waiting: owner picks icon tee vs PLZ-only tee; that image becomes the reference for every exercise picture.

## Round 4 (2026-10-24): "PLZ Train" T-shirt
- Owner chose version 2 (PLZ only) and renamed the app to PLZ Train. Reused round-3 picture as reference, image mode, Nano Banana 2.1, 3:4, x2, 0 credits.
- Prompt: same character, change only the chest print to the wordmark "PLZ Train" in dark navy, nothing else.
- Result: both takes spelled correctly. Take 1 (edit id 6d623977-db50-4214-9175-f3d852a52dfa) sent to owner. Lettering is plainer/smaller than the round-3 rounded "PLZ".

## Round 5 (2026-10-24): exercise picture test, 16:9 start|end panels
- Reference: round-4 "PLZ Train" avatar. Image mode, Nano Banana 2.1, 16:9, x2, 0 credits.
- Bicep curl clean: good (start palms face body, minor). Bicep curl see-through muscle: take 2 good (biceps only), take 1 also showed forearm/deltoid fibres.
- Squat clean: take 1 OK (bottom slightly above parallel). Squat see-through: FAILED both takes, Flow message "unusual activity... browser extensions that modify the page". Pinterest "Save" button overlay is visible on pictures in this Chrome profile, likely the extension Flow complains about. Stopped generating (robot-check rule); owner told.
- Option 2 body chart drawn from react-body-highlighter polygons (MIT, (c) 2020 GV79), no Flow needed.

## Round 6 (2026-10-24 afternoon): the other 90 exercises
- Same settings (image mode, Nano Banana 2.1, 16:9, x2, round-4 avatar as reference via "reuse prompt"), 0 credits. Prompts: docs/research/exercise-prompts-90.tsv (style prefix + exercise + START/END + scene suffix).
- All 90 generated without a failed tile. Downloaded 180 takes at 1K, mapped in generation order, and picked the clearer take per exercise after checking form (ExRx as reference).
- Weak but kept: ex34 shrug (lift small), ex91 single-leg calf raise (modest rise). Candidates for a redo if the owner wants.
- App: all 100 built-in exercises now have a picture (WebP 960 wide, ~18 KB each, 1.8 MB total, lazy + runtime cached).

## Round 7 (2026-10-24 evening): redo ex34 and ex91
- Project: https://flow.google.com/project/e02a51f2-da70-455f-906d-cc85f8ac45d8 (image mode, Nano Banana 2.1, 16:9, x2, 0 credits).
- ex34 shrug: prompt asked for shoulders almost touching the ears; take 2 kept (clear lift). ex91 calf raise: one foot on the step, heel low then high; take 1 kept (take 2 had feet floating off the step).
- Files: assets/exercises/ex34.webp, ex91.webp and their thumbs (commit 92295a0). Flow tab closed. Nothing left to redo.
