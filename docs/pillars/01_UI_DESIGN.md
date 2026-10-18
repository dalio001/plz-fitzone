# Pillar 1 — Product journeys and UI foundations

> **Role:** Deliver the clarity and logging speed of the Hevy reference with an original design system. Own screen structure, reusable controls, accessibility and interaction acceptance.
>
> **Depends on:** Your personal phone/workflow needs; Pillars 0/2 state and modality contracts; Pillar 4 privacy boundaries. Pillar 7 customer evidence is deferred.
> **Used by:** Pillars 2, 3, 5 and 6; Pillar 4 device experiences.
> **Cross-pillar impacts:** Navigation, focus, validation, save feedback, sharing confirmation, charts and account controls.

**Current mode — personal use:** prioritize P1-01/02/03/04, personal first-run setup P1-05, and personal history layouts from P1-06. Keep Workout/History/Exercises/Profile useful; social Home, premium flows and broad localization are deferred. Public phase letters below are future reference.

## Trigger keywords

`Pillar 1`, UI, UX, navigation, screens, design system, accessibility, onboarding, logger.

## Scope

- Hevy-familiar journeys: quick start → routine/picker → logging → rest → finish → progress.
- Proposed destination navigation: Home / Workout / Profile; Workout is the useful initial entry before community.
- Original brand, tokens, typography, icons, themes and responsive web planning layouts.
- Complete loading, empty, offline, error, unsaved, conflict, recovery and success states.
- Accessibility and physical-device usability; restrained motion and optional feedback.

## Shared UI components owned here

Workout/routine card; exercise row and multi-select picker; equipment/muscle filter; modality-aware set row; set-type menu; numeric entry; rest control; active-session bar; bottom sheet/dialog; import preview; chart with text alternative; privacy/audience selector; summary card; account/settings rows; premium offer.

Keep the logger free of social/premium interruptions. Advanced fields appear when useful, without hiding basic values or making completion unclear.

## What is built and verified `[x]`

- [x] **Source inspected:** CSS variables, dark card layout, four tabs, active drawer, minimized bar and four modal containers.
- [x] **Runtime checked:** Routine cards and active set-table controls render in Chromium; logging and finish/history flow exercised.
- [x] **Read-only inspection:** Viewport disables user zoom; modal containers lack dialog semantics. Phone keyboard/focus and screen-reader behavior remain untested.
- [x] **Reference reviewed:** Supplied video shows three-tab navigation and connected exercise/routine/logging/progress workflows. No redesign implemented.

## What is left to do `[ ]`

| ID | Priority / phase | Task and dependencies | Acceptance criteria | Feature references |
| --- | --- | --- | --- | --- |
| P1-01 | P1 / A | Journey maps and screen specification; P7-01/P0-01 | Map first workout, returning routine, interrupted session, import, history correction and optional sharing; each screen has explicit states and primary action | [Clips / evidence](#p1-01-reference) |
| P1-02 | P0 / B | Logging interaction specification; P2-01/02/03 | Previous/target/actual values distinguishable; numeric input and focus survive adding/completing sets; no horizontal overflow at chosen phone widths; proposed ≤5s median prefilled-set task and ≥90% unaided completion | [Clips / evidence](#p1-02-reference) |
| P1-03 | P1 / B | [ ] in progress, awaiting owner phone check, 2026-10-18 — design tokens (--space-*, --radius-*, --font-*, --control-min-height: 44px, --brand-lime: #a3e635), :focus-visible brand outline, @media (prefers-reduced-motion: reduce), shared section headers (.section-header, .section-title) and empty states (.empty-state) across tabs; 44px minimum touch targets (calendar cells 40px allowed, live workout rows kept as-is). Reusable design tokens and accessible primitives | Original identity, light/dark support, focus styles, dialog labeling/trap/return, usable zoom, adequate contrast, large touch targets and reduced-motion behavior documented and verified | [Clips / evidence](#p1-03-reference) |
| P1-04 | P1 / B–C | [ ] in progress, awaiting owner phone check, 2026-10-18 — Exercises tab and exercise detail layout: search input typing isolates result list without resetting input or chip scroll; exercise detail modal reordered with clear 20px title, 14px badges/metadata, full-width Progress button, best set / est 1RM and recent sessions, then management actions; 44px minimum buttons; ≤412px sheet. Picker and exercise-detail journeys; P2-06 | Search + equipment/muscle filters + multi-select; no-result reset; summary/history/how-to detail; returning preserves session input and scroll/focus | [Clips / evidence](#p1-04-reference) |
| P1-05 | P1 / B–C, ACTIVE personal plan | Personal first-run setup; depends on P6-01 (units/preferences), P5-04 (private body data), P0-02/P0-03 (data safety) | Shown once on first launch and re-openable from Profile; every step skippable with back button and progress dots; Continue disabled until a required choice is made; existing users with saved data are never forced through it. Adopted PLZ FitZone steps: short welcome (2–3 slides, original PLZ FitZone wording/visuals), weight unit KG/LBS (sets the P6-01 unit preference), height with cm / ft-in, birthday or age (optional), top goal, training experience, build-own vs start-from-template routine choice, final "You're ready" landing on the Workout tab with a "How to get started" card. All answers stored locally and private (no account), editable later in Profile/settings. Explicitly NOT adopted now: paywall (P6 billing, deferred — no paid scope for personal use), email opt-in and "how did you hear" (P7 growth, deferred — no acquisition analytics now), contact/friend sync (P3 community, deferred — personal use first), Health Connect permission (P4 integrations, deferred — optional later, only after a privacy review). Original identity: copy the flow structure only, never Hevy's text, icons or images | [Clips / evidence](#p1-05-reference) |
| P1-06 | P1 / C | [ ] in progress, awaiting owner phone check, 2026-10-18 — Profile sections with sticky segmented control (Progress, Records, Settings), UI-only localStorage memory (plz_fitzone_profile_section), links switch section first (History Calendar -> Progress, Profile record row -> Records); Settings panel contains profile summary, read-only unit status (KG button in header), preferences, plate settings and backup/restore/undo; no typing rebuilds screen; content capped at 412px. Profile/history/progress layouts; P5-02/03 | Detailed session drilldown, calendar, date range, units, record definition, empty data and accessible chart alternatives; measurements clearly private | [Clips / evidence](#p1-06-reference) |
| P1-07 | P2 / D | Community/share/coach interactions; P3/P4-02 | Preview audience and content before publishing; private data excluded; no-friends Home has a useful state; errors and blocked/reported-user states specified | [Clips / evidence](#p1-07-reference) |
| P1-08 | P2 / E | Guidance and premium experience; P5-05/P6-03 | Suggested versus observed values clear; rationale/accept/undo available; paywall never interrupts active set completion; cancellation/restore affordances accessible | [Clips / evidence](#p1-08-reference) |
| P1-09 | P3 / F | Desktop, localization and device adaptation | Wide-screen planner and keyboard flow; locale decimals/text expansion/units; platform-specific watch/widget designs owned with P4; verified against chosen devices | [Clips / evidence](#p1-09-reference) |

### PLZ FitZone rename + installability (2026-10-14)

- [ ] in progress, awaiting owner phone check — PLZ FitZone identity (supports P1-03 original identity): header logo is two-tone `PLZ` (accent blue) + `FitZone` (white), `<title>`/README/backup prefix renamed, original navy/FZ/blue-accent icons in `icons/`. No workout logic changed. Owner to verify on Android Chrome: header renders two-tone, install prompt/icon look right.

### Logging acceptance journey

Open a routine → inspect/choose movement → enter a set → complete it → adjust rest → change an exercise → hide/resume → interrupt/recover → finish → confirm locally saved summary → inspect history. Every transition preserves acknowledged data. This is a future acceptance journey, not an implemented redesign.

Usability testing must use physical target phones, their numeric keyboards, large text, weak connections and tired-hand scenarios. The audit's resized desktop browser is insufficient evidence for mobile readiness.

## Feature reference map

See the [video index](../research/VIDEO_REFERENCE_INDEX.md) for source IDs and evidence labels. A visual example does not verify accessibility, performance or recovery criteria.

### P1-01 reference

- **Workout entry/routine cards — Shown:** [V1 0:15–0:43](https://www.youtube.com/watch?v=8ESngufwx6g&t=15s).
- **New routine — Shown:** [V1 0:44–0:52](https://www.youtube.com/watch?v=8ESngufwx6g&t=44s).
- **Resume conflict — Shown:** [V1 2:12–2:18](https://www.youtube.com/watch?v=8ESngufwx6g&t=132s).
- **Finish review — Shown:** [V1 2:40–2:49](https://www.youtube.com/watch?v=8ESngufwx6g&t=160s). First-run onboarding, recovery after process loss and import journeys are not demonstrated; specify from the audit.

### P1-02 reference

- **Numeric entry/checkmarks — Shown:** [V1 2:18–2:39](https://www.youtube.com/watch?v=8ESngufwx6g&t=138s).
- **Foreground rest/adjust/skip — Shown:** [V1 2:24–2:39](https://www.youtube.com/watch?v=8ESngufwx6g&t=144s).
- **Check-set feedback — Setting only:** [V2 4:24–4:40](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=264s).
- **Keep-awake — Setting only:** [V2 5:15–5:21](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=315s); P4-10 owns capability behavior.
- **Smart superset scrolling/inline timer — Settings only:** [V2 5:35–6:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=335s); runtime belongs to P2-12. Focus retention, target-device usability and timing goals are our requirements, not measured video results.

### P1-03 reference

- **Theme selection — Shown:** [V2 3:40–3:49](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=220s).
- **Set-type help sheet — Shown:** [V2 7:22–7:49](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=442s).
- **Original tokens/branding, screen-reader semantics, zoom/focus/reduced motion — Not demonstrated.** Use the [accessibility/source audit](../research/HEVY_AUDIT.md) and P1-03 acceptance criteria.

### P1-04 reference

- **Equipment/muscle filtering — Shown:** [V1 0:50–1:13](https://www.youtube.com/watch?v=8ESngufwx6g&t=50s).
- **Summary/history/how-to/demo detail — Shown:** [V1 1:14–1:34](https://www.youtube.com/watch?v=8ESngufwx6g&t=74s).
- **Multi-add — Shown:** [V1 1:30–1:42](https://www.youtube.com/watch?v=8ESngufwx6g&t=90s).
- **Recent exercises — Shown:** [V2 6:50–7:14](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=410s). No-result recovery and returning focus/data retention need our specification.

### P1-05 reference

- **First-run onboarding/import/recovery — Not demonstrated in V1/V2; now demonstrated in V3 (owner's local Hevy Android first-run recording, 2026-10-14, 1:23, file `E:/My Apps/plz-fitzone/assets/videos/V3-hevy-first-run-2026-10-14.mp4`; cite as "V3 MM:SS").** Both public recordings use existing accounts. Use the [personal milestones](../MASTER_PLAN.md) and P0-03/04 criteria for import/recovery.
- **Health Connect permission prompt — Shown (not adopted):** V3 00:09–00:11 ("Enable permissions so Hevy can report data about your workouts and measurements", Enable Health Connect / Not Now); OS-level Health Connect read/write grants at V3 00:00–00:09 are a setting/permission screen only. Deferred to P4; see [P4-06](./04_TRUST_INTEGRATIONS.md#p4-06-reference).
- **Birthday picker — Shown:** V3 00:11–00:13 (day/month/year picker, private-and-secure note, Continue). Adopt as birthday or age (optional), stored locally per P5-04.
- **Height with cm / ft-in toggle — Shown:** V3 00:13–00:15 (Centimeters / Feet and Inches toggle with scroll picker). Adopt with the same unit choice; stored locally per P5-04.
- **Top goal single choice — Shown:** V3 00:15–00:19 (Build Muscle / Gain Strength / Fat Loss). Adopt the step with original PLZ FitZone wording.
- **Training experience single choice — Shown:** V3 00:19–00:21 (Beginner 0-1 year / Intermediate 1-3 / Advanced 3+; Continue disabled until chosen). Adopt, including the disabled-Continue-until-chosen rule.
- **Build-own vs guided routine choice — Shown:** V3 00:21–00:23 ("Would you like to build your own workouts or be guided?", Skip available). Adopt as build-own vs start-from-template.
- **Paywall — Shown (not adopted):** V3 00:23–00:25 ("Get Full Access", monthly/yearly/lifetime prices, Not now). Deferred to P6 billing; see [P6-03](./06_SETTINGS_BILLING.md#p6-03-reference).
- **Email opt-in — Shown (not adopted):** V3 00:25–00:29 (Sure / No thanks). Deferred to P7 growth; see the P7 video-index entry.
- **Find-your-friends contact sync — Shown (not adopted):** V3 00:29–00:31 (contact sync / No thanks). Deferred to P3 community.
- **Attribution survey ("How did you hear") — Shown (not adopted):** V3 00:31–00:35 (source list, Skip). Deferred to P7 growth.
- **Welcome carousel — Shown:** V3 00:35–01:19 (4-slide carousel with dots, Continue, Skip, "Get Started", ending "You're ready! Now start training"). Adopt as a short 2–3-slide PLZ FitZone welcome with original wording/visuals, dots, Continue, Skip and a final "You're ready" step.
- **Landing on Workout tab — Shown:** V3 01:19–01:23 (Start Empty Workout, New Routine, Explore Routines, "How to get started" card). Adopt the Workout-tab landing with the "How to get started" card.
- **Weight-unit step (KG/LBS, sets the P6-01 unit preference) — adopted PLZ FitZone step; unit selection UI shown in V2:** [V2 3:34–3:42](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=214s). No V3 range is claimed for this step beyond the supervisor timeline above.
- **Related workout start affordance only:** [V1 0:15–0:43](https://www.youtube.com/watch?v=8ESngufwx6g&t=15s); this is not evidence of an onboarding flow.
- Weight-unit choice in setup sets the P6-01 preference; birthday/height answers follow P5-04 private body-data rules; saving follows P0-02/P0-03. Copy the flow structure only, never Hevy's text, icons or images.

### P1-06 reference

- **Routine progress chart — Shown:** [V1 2:51–3:10](https://www.youtube.com/watch?v=8ESngufwx6g&t=171s).
- **Workout detail — Shown:** [V2 2:35–2:56](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=155s).
- **Exercise records — Shown:** [V2 2:52–3:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=172s).
- **Profile chart + Measures/Calendar buttons — Mixed:** [V1 3:38–3:53](https://www.youtube.com/watch?v=8ESngufwx6g&t=218s); charts shown, measurement/calendar interiors not opened. Accessible alternatives and correction flows need our design.

### P1-07 reference

- **Private-profile/default-audience controls — Shown settings:** [V2 3:14–3:34](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=194s).
- **Feed/likes/comments — Shown:** [V2 8:42–9:10](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=522s).
- **Coach UI, report/block and error states — Not demonstrated.** Specify through P3/P4; all remain deferred for personal use.

### P1-08 reference

- **Premium offer UI — Shown:** [V2 10:46–11:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=646s); recorded offer only.
- **AI connection — Entry point only:** [V2 3:54–4:08](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=234s).
- **Suggested-target rationale/accept/undo, purchase restoration and cancellation flows — Not demonstrated.** Use P5-05/P6 contracts; no paywall needed for personal use.

### P1-09 reference

- **Desktop planner/localization/watch/widget layouts — Not demonstrated in V1/V2.** Product context: [official platform overview](https://www.hevyapp.com/). Design only when the owner requests the corresponding platform.

## Video references & Assets

- [V1 review](https://www.youtube.com/watch?v=8ESngufwx6g); use the task-specific timestamp links above. Broad initial-review ranges are superseded by the verified feature index.
- [Hevy tutorial](https://www.hevyapp.com/hevy-tutorial/): current illustrated workflow reference.
- [../research/HEVY_AUDIT.md](../research/HEVY_AUDIT.md): original UI audit and reference boundaries.
- Create original icons/demonstrations or obtain licenses; no competitor asset pack is part of this repository.
- [V2 review](https://www.youtube.com/watch?v=CkYBAlBrAAw); use the task-specific scene links above and [video index](../research/VIDEO_REFERENCE_INDEX.md).
- V3: owner's local screen recording of the Hevy Android first-run, 2026-10-14, 1:23. **File: `E:/My Apps/plz-fitzone/assets/videos/V3-hevy-first-run-2026-10-14.mp4`** (on the owner's PC; `assets/videos/` is git-ignored, so the video is never published). Cite as "V3 MM:SS". Full timeline in the [video index](../research/VIDEO_REFERENCE_INDEX.md).

### P1-05 implementation status (2026-10-14)

- [ ] in progress, awaiting owner phone check — first-run onboarding implemented in `index.html` on branch `codex/p1-05-onboarding` per `docs/pillars/plans/P1-05/PLAN.md` plus review changes. True first run seeds `state.profile = {onboardingDone:false, …}` and shows the full-screen flow (`#onboardingOverlay`, 8 steps, dots, Back/Skip every step, sticky footer); reloads mid-flow show it again. Saved states without a profile never see it; Profile gained a "My profile" section with "Set up my profile" re-run (never deletes routines/workouts/exercises — re-run offers keep vs add-missing-samples). Unit step sets the P6-01 preference without converting stored values; height (100–250 cm / 3'3"–8'2") and age/birthday (13–100) optional with in-place errors; experience gates Continue. Welcome uses `assets/brand/plz-fitzone-mascot.jpg` (125 KB, under the 150 KB limit) with `icons/mascot-96.png` fallback; all copy is original PLZ FitZone wording. Typing updates the draft only (no rebuild on input/change/blur); handler-compile coverage extended. Restore/import accept backups with or without a profile. Owner to verify on phone at 412 px: welcome slides, unit/height/age/goal/experience/routine steps, "You're ready!" → Workout tab with dismissible "How to get started" card, Profile answers + re-run.

### P1-03 / P1-04 / P1-06 implementation status (2026-10-18)

- [ ] in progress, awaiting owner phone check — implemented in `index.html` on branch `codex/p1-tidy` per `docs/pillars/plans/P1-tidy/PLAN.md` and supervisor audit. Three Profile sections (Progress, Records, Settings) with sticky segmented control and localStorage section memory (`plz_fitzone_profile_section`); links switch section first (History Calendar -> Progress, Profile record row -> Records); Settings panel contains profile summary, read-only unit status (KG/LBS button kept in header), preferences, plate settings and backup/restore/undo; no typing rebuilds screen; content capped at 412px; design tokens (`--space-*`, `--radius-*`, `--font-*`, `--control-min-height: 44px`, `--brand-lime: #a3e635`); `:focus-visible` brand lime outline; `@media (prefers-reduced-motion: reduce)`; shared section headers and empty states across tabs; Exercises tab and exercise detail spacing/hierarchy; all interactive buttons ≥ 44px (calendar cells stay 40px, live workout logger rows kept as-is); 10 named tests in `tests/p1_tidy.test.mjs` (all 247 tests green). Owner to verify on phone at 412 px.

## Next Immediate Action

**Implemented, awaiting owner phone check (2026-10-18):** P1-03/04/06 tidy-up above; owner verifies Profile sections, design tokens, headers and exercise screens on their phone at 412 px, then produce P1-01's connected logger journey and state map.
