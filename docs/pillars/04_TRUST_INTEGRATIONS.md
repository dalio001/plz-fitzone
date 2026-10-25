# Pillar 4 — Trust, privacy and platform integrations

> **Role:** Protect private training data and make external/device capabilities predictable. Own security policy, consent, moderation boundaries and adapter verification.
>
> **Depends on:** Pillar 0 data contracts and Pillar 2 session/modality contracts; your device requirements. Identity and Pillar 7 launch-market decisions apply to public expansion only.
> **Used by:** Every pillar; especially 3 social/coach access, 5 private insights and 6 account/payment controls.
> **Cross-pillar impacts:** Data visibility, rendering, deletion, media permissions, notifications, account linking, external scopes and reconciliation.

**Current mode — personal basics:** prioritize P4-01 safe imports/rendering and P4-03 timer behavior, plus your export/retention choices. Social moderation, public access controls, launch compliance work and integrations are deferred. Health/watch adapters are optional if useful to you; public phase letters below are future reference.

## Trigger keywords

`Pillar 4`, security, privacy, consent, permissions, moderation, import validation, health, watch, integration.

## Scope

- Safe rendering of local/imported/shared content, strict validation and accountable access control.
- Data inventory, private defaults, exports/deletion and market-specific release review.
- Social/coach permissions, abuse controls and media rights/access lifecycle.
- Mobile background timers/notifications, health adapters, watch clients and later external APIs.
- Define safeguards as product behavior and acceptance criteria, without assuming a particular jurisdiction or claiming legal compliance has been certified.

## UI components used from Pillar 1

Import error/preview; audience selector; permission rationale; consent settings; account deletion; report/block; notification controls; integration status and conflict recovery.

## What is built and verified `[x]`

- [x] **Source inspected:** User and imported names enter string-built `innerHTML`; import trusts parsed JSON before validation. No exploit was run.
- [x] **Absence verified:** No server authorization, consent model, moderation system, OAuth integration, native health or watch project.
- [x] **Source/runtime inspected:** Foreground browser audio beep and interval timer exist; background/native delivery is not established.
- [x] **Reference checked:** Hevy advertises Apple Watch/WearOS and desktop access. This is a product reference, not proof of easy adapter implementation. [Official overview](https://www.hevyapp.com/).

## What is left to do `[ ]`

| ID | Priority / phase | Task and dependencies | Acceptance criteria | Feature references |
| --- | --- | --- | --- | --- |
| P4-01 | P0 / B | [ ] in progress — personal part implemented 2026-10-14, awaiting owner phone check: Safe rendering and validation; P0 migration/P2 types | Names/notes rendered as data; strict import schemas, bounds and ID/reference checks before mutation; rejected input leaves original intact; URI/content boundaries documented; meaningful regression fixtures | [Clips / evidence](#p4-01-reference) |
| P4-02 | P0 / C–D | Privacy/access model, account and social threat review | Account isolation and private/public/followers/group/coach audiences tested at server/object boundaries; revocation/deletion propagated; default-private measurements/photos; block/report policies enforced beyond UI | [Clips / evidence](#p4-02-reference) |
| P4-03 | P1 / B–C | Timer/notification capability matrix | Document foreground, background, locked-screen, killed-process and offline behavior for supported platforms; deadlines remain correct; notification permission refusal does not break logging; no promise of guaranteed background web audio | [Clips / evidence](#p4-03-reference) |
| P4-04 | P1 / C | Data governance and launch review; P6 account controls | Data/processor inventory, minimal permissions, retention/export/deletion procedures, launch-market privacy review and incident owner; analytics excludes raw notes/photos/measurements; no compliance claim without review | [Clips / evidence](#p4-04-reference) |
| P4-05 | P2 / D | Media permissions and moderation operations; P3 | Owned/licensed exercise assets; private upload/download authorization; size/type checks; sharing strips unintended metadata; deletion/revocation verified; operational report response owner | [Clips / evidence](#p4-05-reference) |
| P4-06 | P3 / F | Apple Health / Health Connect pilot | Explicit scopes/consent, availability matrix, disconnect/delete semantics and correct unit mapping; deduplicate source sessions; no inferred medical conclusions; denied permissions handled gracefully | [Clips / evidence](#p4-06-reference) |
| P4-07 | P3 / F | Apple Watch then WearOS, ordered by user demand | Versioned offline session/routine payloads; phone/watch concurrent edits and finalization reconcile to one logical workout; locks/permissions/background timing tested on real devices; staged release and rollback | [Clips / evidence](#p4-07-reference) |
| P4-08 | P3 / F | Widgets/live activities and optional external adapters | Capability-specific platform review; minimum OAuth scopes, token handling, revocation, rate limits, retries and deduplication; integrations do not become prerequisites to logging | [Clips / evidence](#p4-08-reference) |
| P4-09 | P1 / C–F | Release trust review and recovery drills | Access/export/deletion/restore regressions pass; secret/dependency review appropriate to implemented stack; incident triage and user communication procedure; monitor failures without logging sensitive content | [Clips / evidence](#p4-09-reference) |
| P4-10 | P1 / personal optional | [ ] in progress — personal part implemented 2026-10-24, awaiting owner phone check: Keep screen awake during an active workout; preference in P6-01, UI in P1-02 | Explicit opt-in; use supported platform capability; release when workout ends or app loses eligibility; refusal/unsupported state degrades gracefully; no claim that wake lock guarantees background timers | [Clips / evidence](#p4-10-reference) |
| P4-11 | P2 / personal (owner idea 2026-10-25) | Personal MCP server so the owner's own AI assistant (Claude, GPT or any MCP client) can plan workouts for this app; depends on P0-03 validated import, P2-04 routine model, P5-06 (conversational analysis), P0-09 (integration contracts); full two-way access later needs P0-04/P0-05 sync | Phase 1 (no backend, data stays on the phone): a small local MCP server exposes read-only tools for the exercise catalogue (ids, names, muscles, equipment, types) and a `create_routine` tool that returns a validated routine file/link the owner imports in the app with a preview and explicit confirm (never a silent write); invalid exercise ids, units or set counts are rejected with a clear message. Phase 2 (optional): the owner can attach a backup file so the assistant reads history/records to suggest the next plan; history access is explicit, read-only and per session. Phase 3 (only with sync): authenticated access with scopes, revocation and rate limits. No secrets in prompts or files; every AI-made routine is a proposal the owner reviews; no medical claims | [Notes](#p4-11-reference) |

### Threat and failure scenarios to cover

Malformed/oversized backup; stored markup in an exercise name; unauthorized object download; account switch retaining a previous user's data; public summary exposing private notes/photos; repeated publish/payment callback; coach access after revocation; notification revealing a private workout; duplicate phone/watch session; deleted data reappearing through sync.

These are design and verification requirements. No penetration test, jurisdiction-specific compliance assessment or native device trial has already been completed.

### Platform expansion policy

Begin with reliable core data and physical-phone acceptance. Health integration is its own adapter, watch logging is a separate client, and widgets/live activities are separate surfaces. Prioritize by measured device demand and team capacity. A static HTML file with mobile meta tags does not establish native background support.

## Feature reference map

Source/evidence definitions: [video index](../research/VIDEO_REFERENCE_INDEX.md). Visible privacy/integration controls do not prove server enforcement, secure storage or background behavior.

### P4-01 reference

- **Names/notes as input surfaces — Related UI shown:** [V2 8:00–8:17](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=480s).
- **Safe rendering, import schemas, bounds and rollback — Not demonstrated in V1/V2.** Use the [prototype security/import audit](../research/HEVY_AUDIT.md); do not treat a text-entry demo as a security test.

### P4-02 reference

- **Private profile, suggestion hiding and default visibility — Settings shown:** [V2 3:14–3:34](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=194s).
- **Public/private profile fields — Screen shown:** [V2 6:18–6:35](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=378s).
- **Account isolation, object permissions, coach/group audiences, deletion/block/revoke — Not demonstrated.** Use our access model and acceptance scenarios; sharing scopes remain future work.

### P4-03 reference

- **Foreground rest/adjust/skip — Shown:** [V1 2:24–2:39](https://www.youtube.com/watch?v=8ESngufwx6g&t=144s).
- **Sound/silent-mode options — Settings shown:** [V2 4:15–4:48](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=255s).
- **Keep-awake switch — Setting shown:** [V2 5:15–5:21](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=315s).
- **Locked-screen, suspended/killed app, denied notifications and deadline recovery — Not demonstrated.** Create the supported-platform matrix and test actual devices.

### P4-04 reference

- **Export & Import Data — Entry point only:** [V2 3:51–3:56](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=231s).
- **Retention, processors, consent, account deletion, analytics rules and legal review — Not demonstrated in V1/V2.** These are our governance requirements, scoped to personal needs now and launch market only later.

### P4-05 reference

- **Attach photo/video — Entry point only:** [V1 2:40–2:49](https://www.youtube.com/watch?v=8ESngufwx6g&t=160s).
- **Posted workout media — Shown:** [V2 9:06–9:20](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=546s).
- **Personal custom demo — Shown result:** [V2 9:58–10:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=598s).
- **Upload/link storage mechanism, private authorization, metadata stripping, licensing and revocation — Not demonstrated.** Define with P2-13/P0-08; private custom media can remain local for personal use.

### P4-06 reference

- **Average heart rate in a saved workout — Shown:** [V2 9:06–9:20](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=546s); reviewer attributes it to Apple Health/watch connection around 9:13.
- **Apple Health option — Entry point:** [V2 3:51–3:56](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=231s).
- **Consent setup, permission refusal, source deduplication and Health Connect — Not demonstrated.** Use platform documentation and our adapter contract when requested; the recording does not prove mapping/reconciliation.
- **First-run Health Connect prompt — Shown in V3 00:09–00:11 with OS grants at V3 00:00–00:09 (not adopted; optional later, only after a privacy review):** see [P1-05](./01_UI_DESIGN.md#p1-05-reference).

### P4-07 reference

- **Connected watch — Narrated only:** [V2 9:13–9:20](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=553s).
- **Watch-app logging, WearOS, offline device sync and concurrent finalization — Not demonstrated in V1/V2.** [Official watch overview](https://www.hevyapp.com/) supplies product context, not the adapter contract. Keep optional for personal use.

### P4-08 reference

- **Strava/ChatGPT connection rows — Entry points shown:** [V2 3:54–4:08](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=234s).
- **OAuth/token/revoke/rate-limit behavior, widgets and live activities — Not demonstrated.** [Official feature index](https://www.hevyapp.com/features/) is product context; adapter behavior needs separate specifications and platform sources.

### P4-09 reference

- **Trust reviews, recovery drills, secret checks and incident response — Not demonstrated in V1/V2.** Engineering/operational work defined by [AGENTS.md](../../AGENTS.md), the [audit](../research/HEVY_AUDIT.md) and P4-09 criteria.

### P4-10 reference

- **Keep Awake During Workout — Switch enabled:** [V2 5:15–5:21](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=315s).
- **Actual screen-sleep prevention and release/refusal behavior — Not demonstrated.** Evaluate the owner's browser/native capability and lifecycle; P6-01 owns the preference, P1-02 its presentation.
- **Personal part implemented 2026-10-24 (`index.html`, branch `codex/p4-10-awake`), awaiting owner phone check.** Opt-in only: `state.keepAwake` (default `false`, no schema bump; old saves and old backups normalise to `false` on load, restore and undo) with a Settings row at least 44 px tall, the plain help line "Uses more battery. Only while a workout is open." and a "Not supported on this browser" note when `navigator.wakeLock.request` is absent. Uses the Screen Wake Lock API only, requested when a workout is open and the preference is on; the lock is in-memory, never persisted. Released on finish, discard, silent draft cleanup and when the preference is turned off; re-requested when the page becomes visible again or a saved workout is resumed, and a platform-initiated `release` clears the in-memory sentinel and the indicator. Refusal (`NotAllowedError`, unsupported context) is silent — no alert, no throw, workout logging unaffected. A passive `role="status"` "☀ Awake" pill inside the workout drawer shows only while a lock is actually held (hidden while minimized). No background timers, audio, vibration, retry loop or per-exercise behaviour: this does not claim that the screen staying on keeps rest/interval timers running in the background.

### P4-11 reference

- **Owner request 2026-10-25:** "I want to add an MCP server. I can control it with my LLM, Claude, GPT, or whatever, to make me my workouts." Recorded as a planned task; not started.
- **Why phased:** all training data lives only on the phone (localStorage + IndexedDB, P0-01). Without a backend an external assistant cannot write into the app, so Phase 1 hands over a routine the owner imports and confirms; direct read/write waits for P0-04/P0-05.
- **Related:** P5-06 owns how AI-generated plans are validated and previewed; P0-09 owns the shared entity/unit contract the MCP tools must follow; P4-02/P4-04 apply before any remote access.

## Video references & Assets

- [V1 review](https://www.youtube.com/watch?v=8ESngufwx6g); use the task-specific timestamp links above. Broad initial-review ranges are superseded by the verified feature index.
- [Hevy platform overview](https://www.hevyapp.com/), [feature index](https://www.hevyapp.com/features/).
- [../research/HEVY_AUDIT.md](../research/HEVY_AUDIT.md): inspected source risks and runtime limits.
- [V2 review](https://www.youtube.com/watch?v=CkYBAlBrAAw); specific clips and limits above. [Video index](../research/VIDEO_REFERENCE_INDEX.md).

## Next Immediate Action

**P4-10 personal part implemented 2026-10-24 in `index.html` on branch `codex/p4-10-awake`, awaiting owner phone check:** opt-in keep-screen-awake during an active workout (Settings toggle, passive "☀ Awake" pill), released on finish/discard/toggle-off, re-armed on visibility and resume, silent when unsupported or refused. Owner to confirm on the phone that the screen stays on with the toggle enabled, that the pill appears only during a workout, and that the note appears where wake lock is unsupported.

**P4-01 personal part implemented 2026-10-14 in `index.html` on branch `codex/p0-03-safe-restore`, awaiting owner device check:** strict restore schema/bounds/reference checks before mutation, rejected input leaves storage intact, preview text rendered as data (textContent). Broader P4-01 work (shared-content rendering, URI boundaries) and P4-02 audiences remain planned with Pillar 0. Defer health/watch implementation until the core acceptance gates pass.
