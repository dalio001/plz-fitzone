# Calisthenics ladders - coach audit before ship (P2-18)

Audited 2026-11-06 against `ladders_dump.md` (17 ladders, 123 steps, 18 extras + the 13 existing `ex*` how-tos in
`EXERCISE_HOWTO`). Own wording. Video ids refer to Section C. "[P]" = public coaching standard, no video states it.
Pass rule reminder: a step is passed when every set reaches `hi`; holds are in seconds.

Result: hold/reps type is correct on every step and extra (no type swaps needed). 88 correction rows below
(16 High, 38 Medium, 34 Low): wrong shapes in 6 how-tos, 2 missing data fields (per side, tempo), 1 ladder gate
that locks beginners out, 10 missing step gates, 13 proposed new steps (bridges + mobility), plus target,
level and wording fixes.

---

## Section A - Corrections

Severity: **H** = wrong movement/shape or blocks progress, fix before ship; **M** = target/level/gate that
changes the plan; **L** = wording/precision.

### A0. Cross-ladder data fields

| id | field | current | correct | why + source |
|---|---|---|---|---|
| ALL one-sided steps: cx_archer_pushup, cx_archer_pullup, cx_one_arm_negative, cx_one_arm_pullup, cx_archer_row, cx_bulgarian_split, cx_cossack_squat, cx_box_pistol, cx_assisted_pistol, cx_pistol_squat, cx_shrimp_squat, ex66, cx_side_plank_raise, cx_one_leg_lsit, cx_one_leg_fl, cx_single_leg_bl_negative, cx_single_leg_dragon, cx_wall_shoulder_taps, cx_windshield_wipers, cx_around_world, cx_pole_side_plank, cx_tuck_flag, cx_straddle_flag, cx_flag_negative, cx_full_flag, cx_weighted_pistol | new field `perSide` | none (3x5-8 reads as total) | `perSide: true`; UI shows "each side", pass needs hi on BOTH sides | **H**. Every source states these per side/arm/leg: V1 (archer 8, OA neg 6/arm), T2 (pistol 10/leg), V7 (side plank raise 10/side), H4 (around-the-world 5 each way), T3 (single-leg BL neg 5/leg) |
| ALL negatives: cx_negative_pullup, cx_negative_dip, cx_one_arm_negative, cx_negative_muscleup, cx_fl_negative, cx_single_leg_bl_negative, cx_bl_negative, cx_df_tuck_negative, cx_df_negative, cx_flag_negative, cx_hs_press_negative, cx_free_hspu_negative | new field `tempo` | only in some move texts; 7 of 12 have no tempo at all | `tempo: "3-5 s down"` (OA negative and HSPU negative: "5 s down"); live screen shows it; a rep faster than 3 s is not "clean" | **H**. V1 (3-5 s lowering), T1, T3 09:41, ZBDxod579vA 02:22, zoOC1BIriAU 06:20, H2 05:30 (5 s bottom pause) |

### A1. push

| id | field | current | correct | why + source |
|---|---|---|---|---|
| ex24 | setup | "hands wider than the shoulders" | "hands under the shoulders, a thumb's width outside; straight line knees-hips-shoulders-head" | **L**. Wide hands = wide push-up, different pattern. T1 00:50 |
| ex24, ex98, ex17, ex99 | move | "elbows slightly out" | "elbows about 45 degrees from the body" | **L**. Precise angle; flared elbows are the listed mistake. V2, T1 06:35 |
| ex17 | setup | "hands wider than the shoulders" | "hands under the shoulders, slightly wider; brace belly and glutes" | **L**. T1 06:35 |
| cx_pseudo_planche_pushup | setup | "lean forward until the shoulders pass the hands" | add "shoulder blades pushed apart (upper back rounded), on the toes, arms lock fully at the top" | **L**. Protraction is the point of the drill. V2, Q_32Rv5-8Kc 04:11 |
| cx_tuck_planche_pushup | step gate | none | needs planche/cx_tuck_planche 10 s | **M**. You cannot press a shape you cannot hold. V6, H1 09:50, dtsrFeWjx3g 12:40 (10 s tuck hold) |
| cx_planche_pushup | step gate | none | needs planche/cx_straddle_planche 5 s (or the band version) | **M**. V2 (10 floor lifts before full planche push-up) |
| cx_planche_pushup | target | 3x1-5 | 3x1-5 OK; first weeks as EMOM singles | **L**. V2, design 2.4 rule 3 |
| (optional) | missing step | - | One-Arm Push-Up as an L3-L4 branch after archer | **L**. Standard strength goal; THENX has a tutorial (xp1tgjT_3k0, not watched) |

### A2. pull

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_dead_hang | target | 3x20-30 s | 3x20-45 s | **M**. First-pull-up path asks a 45 s active hang before shoulder shrugs. XeErfmGSwfE |
| cx_negative_pullup | step gate | none | needs row/ex33 15 reps | **H**. Gap: scapula pull-up -> negative skips the row base. "15-20 rows ~ 1 pull-up" 4Bn3ERXEK-k; order hang -> shrugs -> rows -> negatives XeErfmGSwfE |
| cx_negative_pullup | target | 3x3-6 | 3x4-8, each 3-5 s down | **M**. V1 asks 12 jumping negatives in a row; hi 6 under-prepares the 5-10 pull-up step |
| ex25 | move / avoid | "Pull until the chin is above the bar" | add "start every rep from straight arms, shoulder blades pulled down first"; avoid "half reps, kicking" | **L**. V1 form cues |
| cx_lsit_pullup | step gate | none | needs hang/cx_hanging_lsit 10 s | **M**. You must own the hanging L before pulling in it. V1, 5g8-sj-8snc prereqs |
| cx_archer_pullup | move | "the other arm slides straight along the bar" | "the helping hand stays where it is (or rests open-palmed on the bar) while that arm straightens" | **L**. On a bar the hand does not slide; picture must show it fixed. V1 |
| cx_one_arm_negative | target | 3x2-5 | 3x3-6 per arm, 5 s down | **M**. "6 in a row each arm" V1, zoOC1BIriAU 06:45 |
| cx_one_arm_negative | step gate | none | needs pull/ex25 15 + NEW one-arm hang 15 s | **M**. Entry 15 pull-ups zoOC1BIriAU 00:36; 15 s one-arm hang HZ67gjyQt0E 01:18 |
| cx_one_arm_pullup | move | "Pull until the chin is over the bar..." | add "free hand on the chest or behind the back, legs locked together, lower in 2-3 s" | **L**. HZ67gjyQt0E 00:46 |
| NEW cx_one_arm_hang | missing step (L3, hold) | - | One-Arm Hang + Shrug: 3x10-15 s per arm, then 3x5-12 one-arm scapula shrugs; before cx_archer_pullup or before cx_one_arm_negative | **M**. First step of both THENX OAP guides: 12 shrugs/arm zoOC1BIriAU 01:01; 15 s hang HZ67gjyQt0E |
| NEW cx_switch_oa_hold | missing step (L3, reps) | - | Switching One-Arm Top Hold: chin over bar with both hands, release one for 3-5 s, regrip, switch; 3x3-5 per side | **M**. zoOC1BIriAU 02:22 (5/side); HZ67gjyQt0E 02:03 (5 s hold) |
| NEW cx_assisted_oap | missing step (L4, reps) | - | Assisted One-Arm Pull-Up (towel or band in the free hand, grip lower over time); 3x3-5 per arm; between OA negative and OAP | **M**. zoOC1BIriAU 08:40; HZ67gjyQt0E 03:50 (5/arm) |

### A3. dip

| id | field | current | correct | why + source |
|---|---|---|---|---|
| ex54 | setup | "legs forward, heels down" | "knees bent about 90 degrees, feet flat on the floor hip-width" | **M**. Step 1 is the bent-knee version; straight legs is closer to step 2. T1 10:05 |
| ex54 | move | "lower the hips close to the bench" | "lower until the upper arms are level with the floor (elbows ~90 degrees), shoulders stay down and back" | **H**. Going deeper loads the front of the shoulder. RPkTy8emOgQ (about 90 degrees), T1 |
| ex55 | move | "torso upright" | "slight forward lean (about 20-30 degrees), elbows point back, lower until the shoulders are level with or just below the elbows, lock out at the top" | **M**. T1 13:00: slight lean, full depth, full lockout |
| ex55 | avoid | "Leaning far forward or shrugging" | "Half reps at the top, shrugged shoulders, elbows flaring out" | **L**. T1 13:00 mistakes |
| cx_straight_bar_dip | gear | bar (also lowbar) | lowbar first (chest-height bar), bar second | **L**. You start on top of the bar; on a high bar that needs a jump or muscle-up. 2NmjC1NMlwQ |
| NEW cx_ring_support | missing step (L2-3, hold) | - | Ring Support Hold, arms locked, rings turned out: 3x20-30 s, before cx_ring_dip | **M**. Main file 3.6 [P]; rings are far less stable than bars TRZhw7t7Qgo |
| cx_weighted_dip | avoid | "Adding weight before 15 clean bodyweight dips" | "...before 20 clean dips" | **M**. Weighted entry = 20 dips oZJImV3bi98; gear doc section 5 |
| cx_weighted_dip | level / order | L4, after ring dip | L3, branch after ex55 (not after ring dip) | **M**. A weighted dip is not an elite skill; ring dips are much harder than bar dips TRZhw7t7Qgo |

### A4. row

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_tuck_fl_row | move | "Pull the bar to the hips" | "row until the bar touches the lower chest / top of the belly, back stays level; return to straight arms in the tuck lever" | **H**. "Bar to the hips" is the straight-arm lever cue; in a row the bar meets the lower chest. Picture would be wrong. [P], SeIfKANM8rQ |
| cx_tuck_fl_row | step gate | none | needs frontlever/cx_tuck_fl 10 s | **M**. Row starts from a held tuck lever. V4 |
| cx_adv_tuck_fl_row | step gate | none | needs frontlever/cx_adv_tuck_fl 8 s | **M**. Same logic |
| cx_archer_row | target | 3x5-8 | 3x5-8 per side | **L**. Main file 4.5 (6 each side) |

### A5. legs

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_bulgarian_split | name | "Bodyweight Split Squat" | "Bulgarian Split Squat" | **L**. Setup is rear foot on a bench (rear-foot-elevated); name must match the picture |
| cx_assisted_pistol | level | L3 | L2 | **M**. It is the bridge to the pistol (T2 order box pistol -> assisted -> pistol); the pistol itself is L3 |
| cx_shrimp_squat | how-to | "hold the other foot behind you / lower until the back knee touches" | setup "stand on one leg, bend the free knee and hold that foot behind you with the same-side hand, other arm forward"; move "sit down with the torso leaning forward until the back knee touches a pad just behind the front heel, stand through the whole front foot"; avoid "dropping onto the knee, front heel lifting" | **M**. No Heria/THENX tutorial; [P] standard form |
| cx_shrimp_squat | target / missing step | 3x5-8, no lead-in | 3x3-6 per leg; add NEW Beginner Shrimp (rear foot free, arms forward, knee to a pad) L3 3x5-8 before it | **M**. Held-foot shrimp is usually harder than a pistol; jump from pistol 3x10 to it is too big [P] |

### A6. core

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_hollow_tuck | move | "Lift the shoulders off the floor and hold" | add "arms long, hands reaching toward the shins" | **L**. Defines the picture; [P] |
| cx_hollow_hold | setup | "arms overhead, legs straight" | add "arms by the ears, legs together, toes pointed, lower back pressed flat" | **L**. [P], H4 00:53 |

### A7. hang

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_windshield_wipers | setup / move | "Hang and lift the legs up to the bar / rotate like a wiper" | setup "hang, arms straight, lats on; raise straight legs together to toes-at-bar (legs vertical)"; move "lower the straight legs to one side to about 45 degrees, back over the top, to the other side; one left + right = 1 rep" | **M**. Rep definition missing; legs stay straight and together. H4 09:26 places it between toes-to-bar and around-the-world; [P] form |
| cx_around_world | setup | "Hang with toes at the bar" | "dead hang, shoulders active, legs straight and together" | **M**. The rep starts from the hang, not from toes-at-bar. Frames tzfu4euI2Jw 09:32-09:58 |
| cx_around_world | move | "Draw a slow full circle with the feet, then reverse" | "swing the straight legs up one side, over to toes-at-bar, and down the other side in one slow circle; alternate directions" | **L**. Frames tzfu4euI2Jw 09:32-09:58 |
| cx_around_world | target | 3x3-5 | 3x3-5 each direction | **M**. "5 in a row each side" H4 10:12 |
| (optional) | missing goal | - | One-Arm Toes-to-Bar (L4 goal) | **L**. H4 10:26 level 10 |

### A8. lsit

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_manna | move | "legs parallel to the floor" | "legs straight and well above horizontal, hips pushed up and forward past the hands, shoulders behind the hands in deep extension, chest open" | **H**. Legs parallel describes an L-sit, not a manna; picture would be wrong. Addendum I step 8-9 [P], O2 |
| cx_manna | step gate | none | needs lsit/cx_vsit 10 s + NEW shoulder extension stretch | **M**. Shoulder extension is the main limiter (addendum I note) |
| cx_tuck_vsit | move | "Pull the tucked knees up toward the face" | add "arms locked, hands just behind the hips, shins near vertical" | **L**. O1 08:29, O2 11:03 |
| cx_one_leg_lsit | target | 3x10-20 | 3x10-20 per leg | **L**. V3 (alternating) |
| (optional) | missing step | - | L-Sit Kicks (tuck -> push legs out -> back), 3x6-10, between tuck L-sit and one-leg L-sit | **L**. V3 (10 reps or 20 s) |

### A9. handstand

| id | field | current | correct | why + source |
|---|---|---|---|---|
| NEW cx_wall_balance | missing step (L3, hold) | - | Wall Balance Pulses: press off the wall with the fingertips, balance by pressing/releasing; 3x5-20 s; between cx_wall_toe_pulls and cx_free_handstand | **H**. Gap between toe pulls (reps) and a 10-30 s freestanding hold. V5 (20-30 s near the wall), _gntsmIZvbI 13:33-16:07 (20 s before freestanding) |
| cx_free_handstand | step gate | none | needs handstand/cx_hs_bail passed | **M**. Learn the bail before going free. V5, _gntsmIZvbI 16:07 |
| cx_hs_kickup | setup | "Lunge stance... arms overhead" | add "hands shoulder-width, fingers spread, shoulders over the fingertips before the kick" | **L**. _gntsmIZvbI 08:27 |

### A10. hspu

| id | field | current | correct | why + source |
|---|---|---|---|---|
| hspu ladder | gate | ladder gate = handstand/cx_chest_wall_hs + dip/ex55 | ladder gate = push/ex17 only; move cx_chest_wall_hs + ex55 to a step gate on cx_wall_hspu | **H**. Pike push-up is L1 but is locked behind an L2 wall hold; THENX trains pike push-ups first _gntsmIZvbI 04:27 |
| cx_hs_press_negative | step gate | none | needs handstand/cx_free_handstand 10 s | **H**. Starts from a freestanding handstand. H2 01:00 entry: 10 s freestanding |
| cx_free_hspu_negative | step gate | none | needs handstand/cx_free_handstand 10 s + hspu/cx_wall_hspu 10 | **H**. H2 01:00 entry (10 s free HS + 10 wall HSPU) |
| cx_free_hspu_negative | move | "Lower as slowly as you can and pause 5 seconds at the bottom" | "lower in 3-5 s until the head lightly touches, hold 5 s, then step/tuck down (no press)" | **M**. Says how to leave the bottom safely. H2 05:30, H3 09:40 |
| cx_wall_hspu | move | "Lower until the head nearly touches the floor" | add "head goes slightly in front of the hands (triangle), elbows about 45 degrees, full lockout" | **L**. H3 02:30 |
| cx_hs_press_negative | target | 3x3-6 | 3x3-8 | **L**. H2 03:55 asks 10 in a row |
| cx_wall_shoulder_taps | target | 3x6-10 | 3x6-10 per side | **L**. H2 02:00 (10 clean) |
| (optional) | missing step | - | Handstand Press from the floor (5-10) and L-sit to Handstand (4) as a press branch | **L**. H2 06:45, H3 04:25, H3 07:15 |

### A11. muscleup

| id | field | current | correct | why + source |
|---|---|---|---|---|
| NEW cx_swing_lsit | missing step (L2, reps) | - | Swing to L-Sit Pull-Back: at the back of the swing snap straight legs to an L and stop sharply; 3x5-10; after cx_swing | **H**. Heria's key MU drill; the "stop on a dime" is what lifts you. _iYvlSMgUGE 08:53-10:01 (V8: 5-10) |
| cx_swing | move | "Swing between hollow and arch shapes using the shoulders" | add "arms locked, legs together; arch = chest through in front of the bar, legs behind; hollow = legs in front, chest behind the bar" | **L**. V8; defines both picture shapes |
| cx_negative_muscleup | move | "Lower slowly through the turn" | add "3-5 s; elbows stay in, chest stays close to the bar through the turn, then slow to a hang" | **M**. ZBDxod579vA 01:44 |
| cx_muscleup | avoid | "Dropping the legs early" | add "pulling one arm over first (chicken wing), elbows flaring" | **M**. Injury risk. 0sjJHgSAMIA 01:24, 02:28 |
| cx_strict_muscleup | setup | "false grip if needed" | "slight over-grip (wrists over the bar), no swing" | **M**. False grip is the ring technique; on a bar Heria uses a slight over-grip. 0sjJHgSAMIA 05:26; gear doc (ring MU differs) |

### A12. frontlever

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_inverted_deadlift | setup / move | "body vertical... lower the straight body forward toward horizontal, then pull back up" | setup "hang upside down in a pike, toes at the bar, arms locked"; move "drive the hips up along the bar until the body is one straight vertical line, then fold back to the pike" | **H**. Current text describes a front-lever negative/raise and duplicates cx_fl_negative. Upside-down deadlift = hips extend to the straight inverted line: uA0jySD4R8k 02:11, V4 5g8-sj-8snc |
| cx_inverted_deadlift | target | 3x5-8 | 3x6-10 | **M**. V4 asks 10 clean in a row; THENX FL entry 10 uA0jySD4R8k 00:00 |
| cx_fl_negative | move | "Lower the straight body slowly through horizontal" | add "3-5 s, pause 1 s at horizontal; lead the drop with the hips, not the toes" | **M**. uA0jySD4R8k 02:50 (mistake: dropping at the hips) |
| cx_one_leg_fl | target | 3x6-10 | 3x6-10 per leg | **L**. uA0jySD4R8k 05:31 (5-10 s each leg) |
| (optional) | missing step | - | Front-Lever Raises (one leg, then two), 3x3-6, between negative and straddle; Half-Lay as alt to straddle | **L**. V4 (6-7 per leg), uA0jySD4R8k 02:50, SeIfKANM8rQ |

### A13. backlever

| id | field | current | correct | why + source |
|---|---|---|---|---|
| NEW cx_adv_tuck_bl | missing step (L3, hold) | - | Advanced Tuck Back Lever (back flat, hips open to ~90 degrees): 3x8-15 s; before cx_straddle_bl | **H**. Straddle currently starts "from the tuck" - too big a jump. Main file 10.4 [P] |
| cx_straddle_bl | setup | "From the tuck back lever" | "From the advanced tuck back lever" | **M**. Follows the new step |
| cx_tuck_bl | move | "Lower until the back is level with the floor, face down" | add "hands shoulder-width overhand, arms locked, knees to chest, back flat, hips level with the shoulders" | **L**. T3 03:51 |
| cx_full_bl | setup | "Inverted hang, legs together" | add "overhand grip shoulder-width, arms locked; lower to level with glutes squeezed and toes pointed" | **L**. T3 09:41 |
| cx_german_hang | move | "Relax into the shoulder stretch, feet down" | add "arms stay straight; first sessions 5-10 s, add a few seconds a week" | **L**. Biceps-tendon and shoulder load; main file 10 cues |

### A14. planche

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_tuck_planche | move | "knees tucked, back flat" | "knees pulled to the chest, upper back rounded (shoulder blades pushed apart), hips level with the shoulders" | **H**. "Back flat" is the advanced-tuck cue; tuck and advanced tuck currently read (and would be drawn) the same. V6, Q_32Rv5-8Kc 00:32, [P] |
| cx_adv_tuck_planche | move | "knees at 90 degrees" | "back flat and level, hips at shoulder height, hip angle about 90 degrees (thighs pointing down), knees bent" | **M**. "Knees at 90" is ambiguous for the image; the hip opens, not just the knee. [P] |
| cx_floor_tuck_planche (extra) | move | "hips high" | "hips level with the shoulders" | **L**. Same shape as the tuck planche |
| cx_tuck_planche | target | 3x8-20 | keep; H1 asks 15-20 s, THENX 10 s comfortable | none - confirmed. H1 09:50, dtsrFeWjx3g 13:18 |
| (optional) | missing steps | - | Straight-arm press on dip bars (10) before the lean; L-Sit to Straddle Planche (10) before straddle; Full Planche Lean hold (15 s) before full | **L**. dtsrFeWjx3g 06:27, 13:53, 20:35 |

### A15. flag

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_tuck_flag | setup | "Same grip as the vertical flag" | "Same grip as the pole side plank: top hand overhand at head height, bottom hand thumb-down about a shoulder-width lower, both arms locked" | **H**. The vertical flag step was removed; the text points to a step that does not exist. Gear doc 6.3, V7 |
| NEW cx_flag_kickup | missing step (L3, reps) | - | Flag Kick-Up / Straddle Flag Raise: hop up into a straddle flag, touch level, lower; 3x3-5 per side; between pole side plank and tuck flag | **H**. Both sources bridge here (V7: 5 each side; bG0h7bSfxQI flag bounce); pole side plank (feet down) to tuck flag hold is too big a jump |
| flag ladder | gate | pull/ex25 | add pull/cx_archer_pullup and flag/cx_side_plank_raise 10 per side | **M**. Design 2.3 gate (10 side-plank raises + 8 archer pull-ups) |

### A16. dragon

| id | field | current | correct | why + source |
|---|---|---|---|---|
| cx_df_hip_raise | setup | "Lie on a bench, hands gripping behind the head" | "Lie on the floor (or a bench), grip a fixed pole or the bench behind the head; weight on the upper back and shoulders, never the neck" | **M**. THENX does it on the floor gripping a pole (frames XQ28-rSbiP8); neck safety |
| cx_dragon_flag | avoid | "Piking the hips" | add "weight rolling onto the neck" | **M**. XQ28-rSbiP8 (only upper back touches) |
| dragon ladder | gate | lsit 10 s + pull 10 | keep; T5 also asks 5 upside-down deadlifts - satisfied by the hip-raise step, no extra gate | none |
| (optional) | missing step | - | Dragon Flag Flutter Kicks (10) before the full dragon flag | **L**. T5 02:12 |

### A17. mobility

| id | field | current | correct | why + source |
|---|---|---|---|---|
| NEW cx_shoulder_ext | missing step (L1, hold) | - | Shoulder Extension Stretch: sit, hands behind on a bench, fingers back, slide the hips forward; 2x30-60 s | **M**. Needed for manna, skin the cat, German hang, back lever. Addendum I note |
| NEW cx_pancake | missing step (L1, hold) | - | Straddle (Pancake) Stretch: 2x30-60 s | **M**. Straddle planche, straddle levers and straddle flag need wide straight legs [P] |

---

## Section B - Picture briefs (one per id)

Shorthand: **Cam** = camera. **S/E** = start/end of a rep. **In/Hold** = entry and held position.
Default person: same character as the app; plain floor; gear drawn as listed. "Line" = straight line from
head to heels unless stated.

### push
- **ex24 Knee Push-Up** - Cam exact side. S: knees on mat, shins lifted, arms straight, hands under the shoulders, line knees-hips-head. E: chest 3 cm off the floor, elbows ~45 degrees back, same line.
- **ex98 Incline Push-Up** - Cam exact side. S: hands on a knee-high box edge, arms straight, body straight at ~30 degrees, on toes. E: chest touching the box edge, elbows ~45 degrees.
- **cx_wall_pushup (extra)** - Cam exact side. S: standing a big step from the wall, arms straight, hands on the wall at chest height, body straight leaning in. E: nose near the wall, elbows bent back.
- **ex17 Push-Up** - Cam exact side. S: high plank, arms straight, hands under the shoulders, line heels-head. E: chest 3 cm off the floor, elbows ~45 degrees, line kept.
- **ex99 Decline Push-Up** - Cam exact side. S: feet on a knee-high box, hands on the floor under the shoulders, arms straight, body straight sloping down to the head. E: chest near the floor, elbows ~45 degrees.
- **cx_diamond_pushup** - Cam 3/4 front. S: plank, hands together under the chest, thumbs and index fingers forming a diamond, arms straight. E: chest touching the hands, elbows tight to the ribs pointing back.
- **cx_archer_pushup** - Cam 3/4 front. S: plank, hands very wide, fingers turned out, both arms straight. E: chest lowered over the right hand, right elbow bent ~90 degrees, left arm fully straight out to the side.
- **cx_clap_pushup** - Cam exact side. S: bottom of a push-up, chest near floor. E: body airborne in a straight plank, hands clapping under the chest 10-15 cm above the floor.
- **cx_pseudo_planche_pushup** - Cam exact side. S: plank on toes, hands at the waist, fingers turned out, arms straight, shoulders well in front of the hands, upper back rounded. E: chest low near the hands, elbows bent back, hands still at the waist.
- **cx_tuck_planche_pushup** - Cam exact side. S: tuck planche on parallettes, arms straight, knees to chest, hips at shoulder height, feet off the floor. E: same tuck lowered with elbows bent ~90 degrees, chest near hand level, feet still off the floor.
- **cx_planche_pushup** - Cam exact side. S: full planche on parallettes, arms locked, body straight and level, legs together. E: body lowered level, elbows bent ~90 degrees, chest near the handles.
- **cx_band_planche_pushup (extra)** - Cam exact side. Same as planche push-up S/E; a band hangs straight down from a high bar and loops around the waist.

### pull
- **cx_dead_hang Active Hang** - Cam 3/4 front. In: dead hang, arms straight, shoulder-width overhand. Hold: same, shoulder blades pulled down (neck long, shoulders away from the ears), legs together, feet off the floor.
- **cx_scap_pullup** - Cam exact side. S: dead hang, shoulders up by the ears, arms straight. E: arms still straight, shoulders pulled down and back, chest lifted 3-5 cm.
- **cx_negative_pullup** - Cam exact side. S: chin above the bar, elbows bent fully, feet off a box. E: arms straight in a hang; draw a small "3-5 s" arrow along the path.
- **ex25 Pull-Up** - Cam 3/4 front. S: dead hang, overhand grip slightly wider than the shoulders, legs together. E: chin above the bar, elbows down at the sides, chest toward the bar.
- **cx_band_pullup (extra)** - Cam 3/4 front. S: hang with a band looped on the bar, one knee in the loop, arms straight. E: chin over the bar, band stretched less.
- **cx_weighted_pullup (extra)** - Cam 3/4 front. S: dead hang wearing a weight vest (or backpack high on the back). E: chin over the bar, legs together.
- **cx_lsit_pullup** - Cam exact side. S: dead hang, straight legs held horizontal (L). E: chin over the bar, legs still horizontal.
- **cx_chest_to_bar** - Cam exact side. S: dead hang, slight hollow. E: body leaned back ~30 degrees, lower chest touching the bar, elbows behind the body.
- **cx_archer_pullup** - Cam exact front. S: wide grip hang, both arms straight. E: chin over the right hand, right elbow bent, left arm fully straight along the bar, left hand still gripping in place.
- **cx_one_arm_negative** - Cam 3/4 front. S: chin over the bar on the right arm only, left hand free at the chest. E: right arm straight in a one-arm hang; "5 s" arrow.
- **cx_one_arm_pullup** - Cam 3/4 front. S: one-arm dead hang, shoulder pulled down, free hand on the chest, legs together. E: chin over the bar beside the working hand, body slightly turned toward it.
- NEW **cx_one_arm_hang** - Cam 3/4 front. In: two-hand hang. Hold: one arm straight, shoulder pulled down (not at the ear), free hand at the side, legs together.
- NEW **cx_switch_oa_hold** - Cam 3/4 front. In: top of a pull-up, both hands close. Hold: chin over the bar on the right arm, left hand released at the chest.
- NEW **cx_assisted_oap** - Cam 3/4 front. S: right arm hanging straight on the bar, left hand gripping a towel hanging from the bar at face height. E: chin over the bar, left hand pulling lightly on the towel.

### dip
- **ex54 Bench Dip** - Cam exact side. S: hands on a bench behind the hips, fingers forward, arms straight, knees bent 90 degrees, feet flat. E: upper arms level with the floor, elbows pointing straight back, back close to the bench.
- **cx_bench_dip_feet_up** - Cam exact side. S: hands on one bench, straight legs with heels on a second box at bench height, arms straight. E: upper arms level, elbows back, hips just in front of the bench.
- **cx_support_hold** - Cam 3/4 front. In: jump to the top of parallel bars. Hold: arms locked, shoulders pressed down (long neck), body vertical, legs together or knees bent, feet off the floor.
- **cx_negative_dip** - Cam exact side. S: top support on dip bars, arms locked. E: shoulders level with the elbows, elbows back, slight forward lean; "3-5 s" arrow.
- **ex55 Triceps Dip** - Cam exact side. S: top support on dip bars, arms locked, knees bent, ankles crossed. E: shoulders level with or just below the elbows, torso leaned forward ~25 degrees, elbows pointing back.
- **cx_band_dip (extra)** - Cam exact side. As ex55; a band stretched across the bars with both knees resting on it.
- **cx_straight_bar_dip** - Cam exact side. S: on top of a chest-high straight bar, arms locked, bar at the hips, legs slightly in front. E: chest leaned well over the bar, bar near the belly, elbows bent and pointing back.
- **cx_band_straightbar_dip (extra)** - Cam exact side. As straight-bar dip; band looped on the bar, knees in the loop.
- NEW **cx_ring_support** - Cam exact front. In: jump up to rings. Hold: arms locked, rings pressed against the thighs, rings turned out (palms forward), shoulders down.
- **cx_ring_dip** - Cam exact side. S: ring support, arms locked, rings at the sides, turned out. E: shoulders below the elbows, rings close to the ribs, slight forward lean.
- **cx_weighted_dip** - Cam exact side. S: top support on dip bars with a belt and plate hanging between the legs. E: bottom of the dip as ex55, plate hanging below.

### row
- **cx_incline_row** - Cam exact side. S: holding a chest-high bar, arms straight, body straight leaning back ~45 degrees, heels on the floor. E: chest touching the bar, elbows behind the body.
- **cx_towel_door_row (extra)** - Cam exact side. S: towel ends in each hand, towel shut in a closed door, body leaning back ~45 degrees, arms straight, heels near the door. E: hands at the chest, elbows back.
- **cx_table_row (extra)** - Cam exact side. S: lying under a sturdy table, gripping the long edge, arms straight, body straight, heels on the floor. E: chest touching the table edge.
- **cx_table_row_feet_up (extra)** - Cam exact side. As table row, heels on a chair so the body is level with the table edge.
- **ex33 Inverted Row** - Cam exact side. S: under a hip-high bar, arms straight, body straight, heels on the floor. E: chest touching the bar, elbows back ~45 degrees.
- **cx_broom_row (extra)** - Cam exact side. As ex33 under a thick pole resting across two weighted chairs.
- **cx_wide_row** - Cam 3/4 front. S: under a waist-high bar, grip 1.5x shoulder width, arms straight, body straight. E: chest at the bar, elbows out ~70 degrees.
- **cx_feet_up_row** - Cam exact side. S: heels on a box so the body is level, arms straight to the bar. E: chest at the bar, body still level.
- **cx_weighted_row (extra)** - Cam exact side. As feet-up or regular row wearing a weight vest.
- **cx_archer_row** - Cam exact front (from the feet). S: wide grip under a low bar, body straight. E: chest pulled toward the right hand, right elbow bent, left arm straight.
- **cx_tuck_fl_row** - Cam exact side. S: tuck front lever under a bar, arms straight, back level, knees to chest. E: elbows bent, bar touching the lower chest, back still level.
- **cx_adv_tuck_fl_row** - Cam exact side. S: advanced tuck front lever (back flat, thighs pointing down at 90 degrees to the torso), arms straight. E: bar at the lower chest, back flat and level.

### legs
- **cx_box_squat** - Cam exact side. S: standing in front of a knee-high box, feet shoulder-width, arms forward. E: hips back, sitting lightly on the box, shins near vertical, chest up.
- **ex76 Bodyweight Squat** - Cam 3/4 front. S: standing tall, arms forward. E: thighs parallel to the floor or lower, heels flat, knees over the toes, chest up.
- **cx_jump_squat** - Cam exact side. S: squat bottom, arms swung back. E: airborne, legs straight, toes pointed, arms overhead.
- **cx_bulgarian_split** - Cam exact side. S: rear foot laces-down on a bench, front foot forward, standing tall. E: back knee near the floor, front shin near vertical, front heel down.
- **cx_cossack_squat** - Cam exact front. S: very wide stance, standing. E: sitting deep over the right leg, right heel flat, left leg straight with the toes pointing up.
- **cx_box_pistol** - Cam exact side. S: standing on the right leg before a knee-high box, left leg straight forward, arms forward. E: sitting on the box on one leg, left leg still straight and off the floor.
- **cx_assisted_pistol** - Cam exact side. S: standing on the right leg, right hand holding a door frame at hip height, left leg straight forward. E: full one-leg squat, hip below the knee, heel down, left leg straight off the floor.
- **cx_pistol_squat** - Cam exact side. S: standing on one leg, other leg straight forward, arms forward. E: hamstring on the calf at the bottom, heel flat, free leg straight and level, arms forward.
- **cx_weighted_pistol (extra)** - Cam exact side. As pistol, holding a dumbbell at the chest with both hands.
- NEW **cx_beginner_shrimp** - Cam exact side. S: standing on the right leg, left knee bent with the foot behind, arms forward. E: left knee touching a pad just behind the right heel, torso leaning forward, right heel flat.
- **cx_shrimp_squat** - Cam exact side. S: standing on the right leg, left hand holding the left foot behind the hip, right arm forward. E: left knee on a pad behind the right heel, torso leaning forward, right heel flat.

### core
- **ex60 Plank** - Cam exact side. In: forearms down, elbows under the shoulders, knees down. Hold: on toes, line heels-hips-head, forearms parallel.
- **cx_hollow_tuck** - Cam exact side. In: on the back, knees bent to the chest. Hold: shoulders lifted, lower back flat, knees over the hips at 90 degrees, arms long reaching to the shins.
- **cx_hollow_hold** - Cam exact side. In: lying flat, arms overhead. Hold: arms by the ears and legs straight together, both lifted ~15-20 cm, lower back pressed flat; body a shallow banana-down curve.
- **cx_lying_leg_raise** - Cam exact side. S: lying flat, hands under the hips, straight legs hovering 5 cm off the floor. E: straight legs vertical.
- **cx_v_up** - Cam exact side. S: lying flat, arms overhead, legs straight, both hovering. E: balanced on the seat, straight arms and legs meeting above the hips, fingers at the toes.
- **cx_hollow_rock** - Cam exact side. S: hollow hold rocked back onto the upper back, feet high. E: same rigid hollow rocked forward onto the low back, shoulders high.

### hang
- **ex68 Hanging Knee Raise** - Cam exact side. S: dead hang, legs straight down. E: knees raised above hip height, thighs past horizontal, torso still.
- **cx_support_knee_raise (extra)** - Cam exact side. S: straight-arm support on two chair seats (turned sideways), shoulders down, feet on the floor. E: knees pulled to the chest, feet off the floor.
- **ex15 Hanging Leg Raise** - Cam exact side. S: dead hang, legs straight together. E: straight legs horizontal (90 degrees at the hip), torso vertical.
- **cx_support_leg_raise (extra)** - Cam exact side. S: straight-arm support on two chairs or dip bars, legs straight down. E: straight legs horizontal.
- **cx_hanging_lsit** - Cam exact side. In: active hang. Hold: straight legs horizontal, toes pointed, arms straight, torso vertical.
- **cx_toes_to_bar** - Cam exact side. S: dead hang, slight lean back. E: straight legs folded up, toes touching the bar between the hands, arms straight.
- **cx_windshield_wipers** - Cam exact front. S: straight legs vertical, toes at the bar, arms straight. E: straight legs together lowered to the left at ~45 degrees, hips turned, shoulders square.
- **cx_around_world** - Cam 3/4 front. S: dead hang, legs straight together. E (mid): legs swung up the right side to toes-at-bar (body piked, inverted under the bar); show the circle path up the right, over the top, down the left.

### lsit
- **cx_tuck_lsit** - Cam exact side. In: arms locked on parallettes. Hold: knees pulled to the chest, feet off the floor, shoulders pushed down, hips between the hands.
- **cx_one_leg_lsit** - Cam exact side. In: tuck L-sit. Hold: right leg straight and horizontal, left knee tucked to the chest, arms locked.
- **cx_lsit** - Cam exact side. In: support on parallettes. Hold: both legs straight, together, horizontal at hip height, toes pointed, arms locked, shoulders down.
- **cx_floor_lsit** - Cam exact side. In: sitting, palms flat beside the hips. Hold: hips and heels off the floor, straight legs horizontal, arms locked.
- **cx_tuck_vsit** - Cam exact side. In: L-sit, hands just behind the hips. Hold: hips in front of the hands, shoulders leaned back behind the hands, knees pulled up toward the face, shins near vertical, arms locked.
- **cx_vsit** - Cam exact side. In: L-sit. Hold: straight legs together raised ~45 degrees above horizontal, hips in front of the hands, torso leaning back, arms locked.
- **cx_manna** - Cam exact side. In: high V-sit. Hold: hands behind the hips, arms locked, shoulders far behind the hands, hips pushed up and forward, straight legs well above horizontal, chest open.

### handstand
- **cx_pike_hold** - Cam exact side. In: push-up plank. Hold: hands walked back, hips high, legs straight on toes, arms in line with the torso; inverted V.
- **cx_box_pike_hold** - Cam exact side. In: feet on a knee-high box. Hold: hands walked in so the torso is vertical, hips over the shoulders, legs horizontal on the box, arms straight by the ears.
- **cx_wall_walk** - Cam exact side. S: plank, feet at the wall base. E: chest-to-wall handstand, hands ~20 cm from the wall, body straight, toes on the wall.
- **cx_chest_wall_hs** - Cam exact side. In: wall walk up. Hold: belly facing the wall, hands ~20 cm from it, line hands-shoulders-hips-feet vertical, toes touching the wall, arms locked by the ears.
- **cx_hs_kickup** - Cam exact side. S: lunge stance facing the wall, arms overhead. E: back-to-wall handstand, heels touching the wall, arms locked, hips stacked.
- **cx_wall_toe_pulls** - Cam exact side. S: back-to-wall handstand, toes touching the wall. E: feet 5 cm off the wall, body stacked, fingertips pressing (whitened).
- **cx_hs_bail** - Cam exact front. S: freestanding handstand. E: hips turned, one hand stepped forward, one foot landing to the side (cartwheel step-out).
- NEW **cx_wall_balance** - Cam exact side. In: back-to-wall handstand. Hold: feet a hand-width off the wall, body stacked, fingers spread.
- **cx_free_handstand** - Cam exact side. In: kick-up in open space. Hold: line hands-shoulders-hips-feet vertical, arms locked by the ears, toes pointed, fingers spread.

### hspu
- **cx_pike_pushup** - Cam exact side. S: inverted V, arms straight, hands shoulder-width. E: head lowered in front of the hands (triangle head-hands), elbows ~45 degrees, hips still high.
- **cx_box_pike_pushup** - Cam exact side. S: feet on a box, torso near vertical, arms straight. E: head touching the floor in front of the hands, elbows ~45 degrees.
- **cx_wall_hspu** - Cam exact side. S: chest-to-wall handstand, arms locked. E: head 2 cm off the floor, slightly in front of the hands, elbows ~45 degrees, body straight.
- **cx_wall_shoulder_taps** - Cam exact side. S: chest-to-wall handstand. E: left hand tapping the right shoulder, body still vertical on the right arm.
- **cx_hs_press_negative** - Cam exact side. S: freestanding handstand. E: shoulders leaned past the wrists, knees tucked to the chest, feet just above the floor, elbows slightly bent.
- **cx_free_hspu_negative** - Cam exact side. S: freestanding handstand, arms locked. E: head lightly touching the floor in front of the hands, body vertical, elbows ~45 degrees; "pause 5 s" label.
- **cx_free_hspu** - Cam exact side. S: freestanding handstand. E: head 2 cm off the floor, body straight and vertical, elbows ~45 degrees.

### muscleup
- **cx_swing** - Cam exact side. S (arch): arms straight, chest pushed through in front of the bar, legs behind. E (hollow): arms straight, body hollow, legs in front, chest behind the bar.
- NEW **cx_swing_lsit** - Cam exact side. S: arch position at the front of the swing. E: body behind the bar, straight legs snapped to an L at horizontal, arms straight.
- **cx_explosive_pullup** - Cam exact side. S: dead hang, slight hollow. E: bar at the belly, body leaned back, elbows behind the body.
- **cx_negative_muscleup** - Cam exact side. S: straight-arm support on top of the bar, bar at the hips. E: chest just under the bar, elbows in and bent, mid-turn; "3-5 s" arrow down to a hang.
- **cx_jumping_muscleup** - Cam exact side. S: standing on a box under a high bar, gripping. E: support on top of the bar, arms locked, bar at the hips.
- **cx_muscleup** - Cam exact side. S: hang, legs in an L at the back of the swing. E: support on top of the bar, arms locked; show the C-shaped path around the bar.
- **cx_strict_muscleup** - Cam exact side. S: still dead hang, slight over-grip, legs together. E: support on top of the bar, arms locked, legs straight down.

### frontlever
- **cx_tuck_fl** - Cam exact side. In: hang, pull knees to the chest. Hold: arms locked, back level with the floor, knees tucked to the chest, hips at shoulder height.
- **cx_adv_tuck_fl** - Cam exact side. In: tuck lever. Hold: back flat and level, thighs pointing down at 90 degrees to the torso, knees bent, arms locked.
- **cx_inverted_deadlift** - Cam exact side. S: inverted pike under the bar, toes at the bar, arms locked. E: body straight and vertical upside-down, toes pointed up, arms locked.
- **cx_fl_negative** - Cam exact side. S: straight vertical inverted hang, arms locked. E: straight body at horizontal (front lever); "3-5 s" arrow.
- **cx_one_leg_fl** - Cam exact side. In: advanced tuck lever. Hold: right leg straight in line with the level body, left knee tucked to the chest, arms locked.
- **cx_straddle_fl** - Cam 3/4 from below-front. In: one-leg lever. Hold: body level, legs straight and wide apart, toes pointed, arms locked.
- **cx_band_front_lever (extra)** - Cam exact side. Hold: full front lever with a band looped from the bar under the hips at the waist, band ends held between palms and bar.
- **cx_full_fl** - Cam exact side. In: hang, shoulders down. Hold: whole body straight and horizontal, legs together, arms locked, face up.

### backlever
- **cx_skin_cat** - Cam exact side. S: hang, knees tucked. E: rotated backward through the arms into a German hang, feet pointing at the floor behind, arms straight.
- **cx_german_hang** - Cam exact side. In: skin the cat. Hold: arms straight behind the body, shoulders stretched, body hanging feet-down, knees bent or legs straight.
- **cx_tuck_bl** - Cam exact side. In: inverted hang. Hold: face down, back level, knees to the chest, arms locked, overhand shoulder-width grip.
- **cx_inverted_hang** - Cam exact side. In: tuck and turn over. Hold: straight vertical body upside down, toes pointed up, arms straight, chin tucked.
- **cx_single_leg_bl_negative** - Cam exact side. S: inverted vertical hang, right leg straight, left knee bent. E: body lowered face down to horizontal, left knee still bent; "3-5 s".
- **cx_bl_negative** - Cam exact side. S: straight inverted vertical hang. E: straight body face down at horizontal; "3-5 s, pause".
- NEW **cx_adv_tuck_bl** - Cam exact side. In: tuck back lever. Hold: face down, back flat and level, hips opened so thighs point down at 90 degrees, knees bent.
- **cx_straddle_bl** - Cam 3/4 from below. In: advanced tuck back lever. Hold: body level face down, legs straight and wide, arms locked.
- **cx_full_bl** - Cam exact side. In: inverted hang. Hold: whole body straight and horizontal face down, legs together, glutes squeezed, arms locked.

### planche
- **cx_scap_pushup** - Cam exact side. S: high plank, arms locked, chest sunk between the shoulder blades. E: same plank, upper back rounded high, shoulder blades pushed apart.
- **cx_planche_lean** - Cam exact side. In: high plank, fingers turned out. Hold: on toes, body straight, shoulders far in front of the hands, hands at waist level, arms locked, upper back rounded.
- **cx_reverse_leg_raise** - Cam exact side. S: face down on a bench, navel at the edge, legs hanging down. E: straight legs lifted to horizontal in line with the body.
- **cx_lsit_to_tuck_planche** - Cam exact side. S: tuck L-sit on parallettes, arms locked. E: tuck planche, knees under the chest, hips at shoulder height, arms locked.
- **cx_tuck_planche** - Cam exact side. In: lean from a crouch on parallettes. Hold: arms locked, knees pulled to the chest, upper back rounded, hips level with the shoulders, feet off the floor.
- **cx_floor_tuck_planche (extra)** - Cam exact side. As tuck planche, hands flat on the floor, fingers turned out.
- **cx_adv_tuck_planche** - Cam exact side. In: tuck planche. Hold: back flat and level, hips at shoulder height, thighs pointing down at 90 degrees, knees bent, arms locked.
- **cx_straddle_planche** - Cam 3/4 front. In: advanced tuck. Hold: body level, legs straight and wide apart, arms locked, shoulders in front of the hands.
- **cx_band_straddle_planche (extra)** - Cam exact side. As straddle planche, a band hanging straight down from a high bar, looped around the waist.
- **cx_full_planche** - Cam exact side. In: deep lean. Hold: whole body straight and horizontal, legs together, arms locked, shoulders well in front of the hands.
- **cx_band_full_planche (extra)** - Cam exact side. As full planche with a thicker band from a high bar around the waist.

### flag
- **ex66 Side Plank** - Cam exact front. In: lying on the side. Hold: on one forearm, elbow under the shoulder, feet stacked, straight line feet-head.
- **cx_side_plank_raise** - Cam exact front. S: high side plank on a straight arm, hip lowered near the floor, top arm overhead. E: hip lifted high above the line.
- **cx_pole_side_plank** - Cam facing the person's chest, pole vertical at their head side. In: feet on the floor beside the pole. Hold: top hand overhand at head height, bottom hand thumb-down lower, both arms locked, body leaning out in a straight sideways line, feet on the floor.
- NEW **cx_flag_kickup** - Cam exact front. S: pole side plank grip, feet on the floor. E: straddle flag touched at level, legs wide and straight.
- **cx_tuck_flag** - Cam exact front. In: pole side plank grip. Hold: body sideways and level, knees tucked to the chest, both arms locked, body in line with the pole.
- **cx_straddle_flag** - Cam exact front. In: tuck flag. Hold: body level, legs straight and wide, arms locked.
- **cx_flag_negative** - Cam exact front. S: vertical flag, body straight above the hands, both arms locked. E: straight body lowered sideways to level; "3-5 s".
- **cx_full_flag** - Cam exact front. In: vertical flag. Hold: whole body straight and horizontal, legs together, top arm pulling, bottom arm pushing, both locked.

### dragon
- **cx_df_hip_raise** - Cam exact side. S: lying on the floor, gripping a pole behind the head, legs straight on the floor. E: hips and legs lifted into a straight line, only the upper back on the floor.
- **cx_df_tuck_negative** - Cam exact side. S: top position, knees tucked, only upper back down. E: tucked body lowered near the floor as one piece; "3-5 s".
- **cx_df_negative** - Cam exact side. S: straight body near vertical, only the upper back down. E: straight body hovering just above the floor.
- **cx_switch_leg_dragon** - Cam exact side. S: top position, right leg straight, left knee bent. E: left leg straight, right knee bent, hips still in line.
- **cx_single_leg_dragon** - Cam exact side. S: body hovering near the floor, right leg straight, left knee tucked. E: raised to near vertical, same leg shapes.
- **cx_dragon_flag** - Cam exact side. S: straight body near vertical on the upper back, gripping behind the head. E: straight body lowered to hover just above the floor.

### mobility
- **cx_wrist_prep** - Cam exact side. S: on hands and knees, fingers turned back. E: shoulders rocked behind the wrists, gentle stretch.
- **cx_shoulder_dislocate** - Cam exact side. S: standing, straight arms holding a stick wide in front of the hips. E: stick behind the back, arms still straight.
- **cx_pike_stretch** - Cam exact side. In: sitting, legs straight together. Hold: chest folded toward the thighs from the hips, flat back, hands at the ankles.
- **cx_active_pike** - Cam exact side. S: seated pike, hands on the floor beside the knees. E: straight legs lifted 5-10 cm off the floor.
- NEW **cx_shoulder_ext** - Cam exact side. In: sitting, hands behind on a bench, fingers back. Hold: hips slid forward, arms straight behind, chest open.
- NEW **cx_pancake** - Cam exact front. In: sitting, legs wide. Hold: legs straight and wide, chest folded forward toward the floor, flat back.

---

## Section C - Sources

Watched for this audit (captions; frames where noted):
- zoOC1BIriAU - THENX (Chris Heria): How To One Arm Pull Up, Step by Step
- HZ67gjyQt0E - THENX: How To ONE ARM Pull Up
- uA0jySD4R8k - THENX: How To Front Lever, 5 Easy Steps
- dtsrFeWjx3g - THENX (Chris Heria): How To Full Planche, step by step
- Q_32Rv5-8Kc - THENX: Top 5 Moves To Master The Planche
- _gntsmIZvbI - THENX (Chris Heria): How To Handstand, Anyone Can Do This
- 0sjJHgSAMIA - CHRIS HERIA: Stop Doing Muscle Ups Like This
- ZBDxod579vA - THENX: Top 5 Exercises To Master The Muscle Up
- 4BbN9x_GBzY - THENX: Hanging abs routine
- tzfu4euI2Jw - CHRIS HERIA: Abs LVL 1-10 (toes-to-bar, wipers, around-the-world 08:20-10:30; frames 09:32-09:58)
- _iYvlSMgUGE - CHRIS HERIA: How To Muscle Up, The Best Way (swing / L pull-back 08:30-10:05)

From the existing research files (already watched, re-used):
- V1 hByjG7mymdw, V2 EjzCljYS5Po, V3 Qv6j5gZyBQ8, V4 5g8-sj-8snc, V5 KNC5lkoE2Fs, V6 M5il8Jpltt8, V7 TF9XhvYh_m8,
  V8 _iYvlSMgUGE (CALISTHENICS_PROGRESSIONS.md)
- H1 OmKfROtB45Q, H2 FaRge9WFzWg, H3 fMTlYYHSy2A, H4 tzfu4euI2Jw, T1 GdISLQcG8BA, T2 flQVCWBuVgk, T3 FZZqbeZti84,
  T4 tB3X4TjTIes, T5 XQ28-rSbiP8, O1 XblDyJlfe3k, O2 7r5HgYtuwSs (CALISTHENICS_PROGRESSIONS_ADDENDUM.md)
- XeErfmGSwfE, 4Bn3ERXEK-k, 2NmjC1NMlwQ, oZJImV3bi98, RPkTy8emOgQ, TRZhw7t7Qgo, SeIfKANM8rQ, bG0h7bSfxQI, Qcde45O8lzo
  (CALISTHENICS_GEAR_ALTERNATIVES.md)
- Design gates: CALISTHENICS_MASTERY_DESIGN.md section 2.3

Not covered by any Heria/THENX video (public standards [P] only): shrimp squat form and targets, windshield-wiper
form, manna shape and targets, advanced tuck back lever, ring support hold, German hang dosage, mobility additions.
