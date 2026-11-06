# Heria Pro app: structure (from 3 YouTube videos)

Sources:
- **V1** = rKhAvHrULZ0, "Best Heria Program Workout App for Android" (55 s, Jul 2025-era build, dark/white UI, red accent). Screen recording, no voice over the app (narration is generic marketing text, not useful). **Newest app version.**
- **V2** = _uFKt4UzQgo, "Heria Pro bodybuilding App..." (5:14, screen recording, music only). **Old version, ~April 2020** (Play Store page says last updated Mar 11 2020). Shows onboarding, old tabs, workout generator, library.
- **V3** = uWMhJUeMyyk, "Back and Bicep. New Heria Pro App!" (2:27, Malay). Only ~10 s of app (0:22-0:33), rest is the creator training outdoors. **Oldest version** (2018-19 look).

Important: the three videos show three different generations of the app. Treat V1 as the current structure; V2/V3 as history.
No video showed: a rest screen, an in-session demo video, a level-up / progression unlock, skill trees, stats charts. Those are **unknown**, not absent.
An extra search found one longer review (end-S5ASkPE, 10:42) but it was over the 10-minute limit, so not watched.

---

## 1. Bottom navigation (tabs)

**Current (V1 0:00, 0:47):** 4 tabs: **Explore** (compass icon), **My Library**, **Calendar**, **My Profile**.
Explore has two top text tabs: **Programs** | **Workouts**, plus a search icon top right.

**2020 (V2 2:16-5:06):** 5 tabs: **Library** (grid icon), **Dashboard** (dumbbell), **Calendar**, **Profile** (bar-chart icon), **PRO** (upgrade badge).

**Oldest (V3 0:22):** 5 icons: calendar, activity/pulse, big centre dumbbell button (red circle), book (library), person. Labels not visible.

---

## 2. Explore > Programs (V1 0:00, 0:14, 0:22, 0:46-0:53)

- Top hero carousel, swipeable (3 dots): big image card with red **RECOMMENDED FOR YOU** tag, duration chip (e.g. "7 DAYS"), program name, category (e.g. Calisthenics). (V1 0:00)
- Then horizontal rows grouped by **training type**, each with **See All**: **Calisthenics**, **Weighted**, **Weighted calisthenics**. Cards show duration chip ("1 WEEK", "4 WEEKS"), title, category, and a bookmark icon. (V1 0:00, 0:22, 0:46)
- **Training Spot** section: grid of buttons **Home**, **Gym**, **Park**, **Home Gym**, **Anywhere**. Tapping one opens a filtered list. This is the equipment/location filter. (V1 0:47, 0:53)
- Footer: "Couldn't find a program?" + **CREATE YOUR OWN** button. (V1 0:47)

## 3. Filtered program list "HERIA PROGRAMS" (V1 0:50, 0:54)

- Back arrow, title, filter icon (top right), search field.
- Active filter shown as a red removable chip ("Home x", "Gym x").
- Full-width image cards: duration chip (4 WEEKS / 25 DAYS / 10 DAYS / 14 DAYS), title, category, bookmark.
- Programs differ per spot (Home list vs Gym list share some items, e.g. the weight vest challenge appears in both).

## 4. Program detail (V1 0:01, 0:18-0:20, 0:35)

- Hero image, duration chip, title, category, heart (favourite), bookmark, overflow menu.
- Summary strip with two cells: calendar icon + length (**1 Week / 7 Days / 4 Weeks**) and workout icon + count (**7 Workouts / 20 Workouts**).
- **Schedule** list:
  - Short programs: numbered days directly (1 Full Body 45 mins, 2 Legs, 3 Pull Day, 4 Push Day...). (V1 0:01)
  - Longer programs: grouped by **WEEK 1, WEEK 2...** (with a checkbox-like circle per week), each week has numbered days "Day 1 - Weighted Chest & Tricep, 60 mins", "Day 2 - Weighted Back & Bicep", "Day 3 - Weighted Leg Workout". A dashed line joins the days like a timeline. (V1 0:35)
  - 4 weeks x 5 workouts = 20 workouts, so programs have rest days built in (inferred, not shown).
- Sticky red **START PROGRAM** button.
- No visible level selector on the program page; level is set per workout (see 5). **Unsure** whether programs also have a level.

## 5. Workout detail (V1 0:04, 0:15, 0:30, 0:44; V2 4:22-4:54)

- Tags row: duration ("45 MINS", "60 MINS") and **where it can be done** (HOME GYM, PARK, GYM). (V1 0:30)
- Title (e.g. "Day 1 - Weighted Chest & Tricep"), category, heart.
- Card with two settings:
  - **Difficulty** dropdown (shows "Advanced"; options presumably Beginner / Intermediate / Advanced). Changing it likely swaps reps or exercise variations. **Unsure** what exactly changes.
  - **Warmup** on/off toggle. When on, a warm-up block is added (see 6).
- Body grouped in **ROUND 1 · 3 sets**, ROUND 2 ... Each row: thumbnail video still, exercise name, "15 reps · Rest 40 seconds" or "7 reps each" or "40 seconds" or "max hold". After the round: "Rest 2 minutes" line with clock icon. (V2 4:30)
- Bottom bar: **SCHEDULE** (dark) + **START WORKOUT** (red).
- 2020 version also had: meta line "45 MINS · CALISTHENICS · NO STYLE · INTERMEDIATE", muscle-group chips (WHOLE BODY / BICEPS / TRICEPS / SHOULDERS), a **WATCH YOUTUBE VIDEO** button that opens Chris Heria's YouTube video of the same workout, star to save, and a PRO lock overlay ("PRO MEMBERS ONLY" + UPGRADE TO PRO) on paid workouts. (V2 4:06, 4:22, 4:46)

## 6. Live workout / follow-along screen (V1 0:07-0:12, 0:32-0:42) - current

- First-run popup "New workout session flow": you no longer have to type how many reps you did after each exercise; toggle **Add reps automatically** (on by default, changeable in Settings). (V1 0:06)
- Top bar: close X, big **elapsed timer** (00:06, 00:09) counting up, sound icon, bookmark.
- Thin segmented progress bar under the timer (one segment per exercise/set, it looks like).
- If warm-up is on: a pull-down sheet "COMPLETE WARM-UP" listing warm-up moves (Jumping Jacks 40 seconds · rest 40s; Burpees 15 reps; Low Plank to High Plank 10 reps each; Hanging Scapula Shrugs 15 reps) then "Rest 1 minute". (V1 0:08, 0:36)
- Main area (black): very large **target** text, e.g. "**15 reps**" with exercise name "Dips - Weighted" under it. No exercise video visible in the main area in these frames (**unsure**: video may be in the thumbnail/tap-to-open). (V1 0:42)
- Bottom: **NEXT UP** section (collapsible caret) with thumbnail, next exercise name, "10 reps · rest 30s". Then big red **Complete** button. (V1 0:42)
- Rest timer screen: **not seen**.
- Exiting (X) opens **Finish Workout** dialog: circle with **% of exercises completed** (0%), workout time (00:07), buttons **Exit and Discard** (dark), **Finish Workout** (red), **DISMISS**. (V1 0:12, 0:43)

Oldest version (V3 0:22-0:33): workout screen with the **exercise video player at top** (labelled "JUMP NEGATIVE PULL UPS", 0:17 length, play, settings, fullscreen), list below by "Round 1 - 3 Sets", each row "Reps 8" with a **red number box (0)** on the right to log reps done, and a floating **Complete Workout** button. This is the manual rep-logging the current version made optional.

## 7. My Library (V1 tab, not opened) / Dashboard (V2 2:16, 2:55)

- 2020 Dashboard: red header "Welcome, <name>" with avatar initials; sections **My Workouts** and **My Programs** with See all; empty states ("Workouts that you save or create will appear here"); floating red **+** button.
- **My Workouts** page: empty state, start by creating a **collection** and saving favourite exercises; **ADD COLLECTION** button. (V2 2:32)
- Current **My Library** tab likely holds saved/bookmarked programs and workouts (inferred from bookmark icons). **Unsure.**

## 8. Create workout (V2 3:03-3:42; V1 "Create your own" button)

Two modes at top: **WORKOUT GENERATOR** (selected) and **BUILD YOUR OWN**. Generator form:
- Workout type: Calisthenics / Weighted / Weighted calisthenics
- Workout style: Fat burning / Strength building / Rep building / Tabata
- Muscle groups (multi, "Select all"): Back, Biceps, Chest, Legs, Shoulders, Triceps, Abs
- Workout time: 30 / 45 / 60 / 90 min
- Level: Beginner / Intermediate / Advanced
- Warm-up: With / Without
- Big **CREATE WORKOUT** button; **Reset** top right.
V3 transcript (0:23-0:29): creator picked level **beginner** and body part **back and biceps** and the app gave him the routine - same generator idea.

## 9. Library / Explore (2020) (V2 5:02, 5:06)

- **Featured Programs** carousel: "By Chris Heria", name, **DIFFICULTY** shown as 3 dots (2 of 3 red), **DURATION** (4 WEEKS), **TYPE** (CALISTHENICS).
- **Exercises Library** list: thumbnail + exercise name + muscle group (e.g. Legs, Triceps). Play Store notes say exercises can be filtered by level. (V2 0:00)
- **Chris Heria Workouts** row (cards with duration, level, PRO badge) and **Youtube Workouts** row (YouTube icon, 45 MINS, BEGINNER).

## 10. Calendar (V2 2:48; V1 tab)

- 2020: "TRAINING HISTORY" month grid (arrows to change month); below it the sessions for the chosen day, empty = "NO WORKOUT SESSIONS". It is a history log, plus planned workouts via the **SCHEDULE** button on each workout (V1, V2). How scheduled items show on the calendar: **not seen**.

## 11. Profile (V2 2:40)

- Header photo, avatar, name, level badge (**BEGINNER**, from onboarding), settings gear.
- "Complete your profile" ring (76%) with **DO IT** button.
- Workout history list; empty state "NO WORKOUT HISTORY" + START WORKOUT.
- No charts or personal records seen.

## 12. Onboarding (V2 0:08-2:01)

Splash with 3 slides + LOGIN / REGISTER. Then a progress bar across the top and one question per screen:
1. **Height** (metric / imperial wheel) (V2 0:16)
2. **Weight** (kg / lbs wheel) (V2 0:50)
3. **Fitness level**: Newbie (never trained) / Beginner (some experience) / Intermediate (consistent training) / probably Advanced below (cut off) (V2 0:58)
4. **Goals** (multi-select): Build strength / Build muscle / Lose fat / (more below, cut off) (V2 1:06)
5. **Performance**: max pull-ups, max push-ups, max squats, max dips (numbers) (V2 1:21)
6. **Create your profile**: first name, username, email, password, CREATE ACCOUNT. (V2 1:37)
Then lands on Dashboard. Whether the max-rep answers change the plan: **unknown** (profile only shows the level badge).

---

## Program / workout / progression model

- **Exercise**: one movement with a short demo video and thumbnail, tagged with muscle group (and level, per 2020 notes). Variations are separate exercises (e.g. "Pull Ups (Wide+Shoulder+Close Grip) - Weighted Vest", "Diamond To Regular Push Up - Weighted Vest"). (V1 0:04, 0:30; V2 5:02)
- **Workout**: ordered **Rounds**, each "N sets" (circuit style: do all exercises in the round, repeat N times), each item has a target (reps / reps each / seconds / max hold) plus its own rest; rest between rounds ("Rest 1-2 minutes"). Tagged with duration, type, style, level, muscle groups, and training spots. Optional warm-up block. Per-workout **Difficulty** switch.
- **Program**: a fixed list of workouts laid out as Week > Day (or just Day 1..N for 1-week programs). Has a length (7 days to 4 weeks), workout count, type (Calisthenics / Weighted / Weighted calisthenics), and spot tags. Started with START PROGRAM.
- **Levels**: Newbie / Beginner / Intermediate / Advanced at onboarding; Beginner / Intermediate / Advanced on workouts and generator; 3-dot difficulty on program cards (2020).
- **Progression mechanics**: none seen. No level-up, no unlocks, no auto-increase of reps, no skill tree in any of these videos. Progression seems to come from (a) programs that get harder day by day (e.g. "100 Push Ups for 7 Days Challenge") and (b) the user picking a higher difficulty. **Treat as unknown, not as missing.**
- **Tracking**: session time, % of exercises completed, optional reps per exercise (auto-filled now), calendar history, profile history list. No charts seen.

## What a user does in a typical session (current version, from V1)

1. Opens app on **Explore > Programs**; sees a recommended program at top. (0:00)
2. Optionally taps a **Training Spot** (e.g. Home) to see programs for where they train. (0:47-0:50)
3. Opens a program, reads the week/day schedule, taps **START PROGRAM**. (0:18, 0:35)
4. Opens today's day (e.g. Day 1), sets **Difficulty** and **Warmup** toggle, reads rounds. (0:30)
5. Taps **START WORKOUT** (or SCHEDULE to put it on a date). (0:30)
6. Does the warm-up list, then each exercise: screen shows big "15 reps" + name, NEXT UP preview below; taps **Complete** to move on; elapsed timer runs at the top. (0:36-0:42)
7. Taps X or reaches the end, sees **Finish Workout**: % done + time; chooses Finish (saved) or Exit and Discard. (0:43)
8. Session appears in Calendar / Profile history (2020 behaviour, V2 2:40-2:48).

## Strong ideas worth adapting

- **Training Spot filter** (Home / Gym / Park / Home Gym / Anywhere) as a first-class browse entry, and spot tags on each workout. Simple equipment filter in words people use.
- **Per-workout Difficulty switch + Warmup toggle** right on the workout page, instead of separate workouts per level.
- **Round x sets circuit format** with per-exercise rest and a rest line between rounds: compact, readable list.
- **Follow-along screen is minimal**: one huge target ("15 reps"), the name, NEXT UP preview, one big Complete button, elapsed timer.
- **Reps auto-filled by default** (no typing after every set), with an option to log real reps.
- **Finish dialog with % completed** and an honest "Exit and Discard" vs "Finish".
- **Program summary strip** (length + number of workouts) and week/day timeline.
- **Workout generator** (type, style, muscles, time, level, warm-up) for when no program fits.
- Onboarding asking **max pull-ups / push-ups / squats / dips** is a good calisthenics baseline test (even if Heria does not visibly use it).

## Weak points

- No visible **progression**: no level-up, no "you are ready for the next variation", no auto-increase. Big gap for a calisthenics app.
- Max-rep baseline from onboarding is collected but not seen being used or re-tested.
- Live screen in these frames shows **no demo video** for the current exercise (only text); rest screen not seen. (Unsure; may exist.)
- Several bodyweight items are really **weighted-vest** variations, so "Home" programs can still need equipment.
- Navigation changed a lot between versions (Dashboard/Library/PRO to Explore/My Library); 2020 version locked much content behind PRO overlays.
- Tracking is thin: time and % done, no charts, PRs or per-exercise history seen.
- Recording-quality caveat: V1 is only 55 s, so many screens (My Library, Calendar, Profile in the current build) were never opened.
