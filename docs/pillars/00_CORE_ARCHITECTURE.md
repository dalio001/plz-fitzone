# Pillar 0 — Core architecture and durable data

> **Role:** Keep every workout accurate, recoverable and available on the user's chosen devices. Own architecture contracts, persistence, migration, identity, sync and engineering delivery.
>
> **Depends on:** Pillar 4 input/privacy policy; your device/workflow needs. Pillar 7 research applies only to future public expansion.
> **Used by:** Pillars 1–6; Pillar 7 measurement and release operations.
> **Cross-pillar impacts:** Unit schema, session lifecycle, exercise snapshots, account permissions, media access, metrics and entitlements.

Phase order and gates: [../MASTER_PLAN.md](../MASTER_PLAN.md). Current evidence: [../research/HEVY_AUDIT.md](../research/HEVY_AUDIT.md).

**Current mode — personal use:** prioritize P0-01/02/03 and focused checks from P0-06. Keep the existing web app as the default route. Accounts, backend, cloud sync, media infrastructure and public release operations are deferred unless your own needs justify them. Public phase letters below are future reference.

## Trigger keywords

`Pillar 0`, architecture, storage, database, migration, offline, auth, sync, API, CI.

## Scope

- Separate domain rules, persistence, synchronization, presentation and platform adapters when implementation is authorized.
- Own versioned exercise/routine/session/set contracts, local drafts and portable backups.
- Own identity, guest-to-account migration, conflict detection and relational access boundaries.
- Own observability, release delivery, incident recovery and executable quality gates.
- Keep personal workout data separate from public workout publications; pillar 3 owns social behavior.

## UI components used from Pillar 1

Recovery/resume prompt, save/sync indicator, import preview, conflict-resolution sheet, account sign-in and storage-error states. UI must tell the truth about local durability separately from cloud sync.

## What is built and verified `[x]`

- [x] **Source inspected:** `init()`/`saveState()` serialize global state under `hevy_clone_state` in browser localStorage (`index.html:635`, `:653`). There is no schema version or backend.
- [x] **Runtime checked:** Completed history survives reload in an isolated context; unfinished session does not.
- [x] **Source inspected:** JSON export/import exists; import replaces state before validation and has no preview or transactional rollback.
- [x] **Environment audited:** `main`; no package manifest, linter, test runner, build step or CI. This does not establish production readiness.
- [x] **Documentation updated:** Personal-first priorities and publication checks prepared for the user-authorized GitHub integration; app source preserved.
- [x] **Agent preferences recorded:** AGENTS.md explicitly sets the default pillar order to 0 → 2 → 1 → 5, supporting basics from 4/6, and allows the user's later direction to activate public-product scope.

## What is left to do `[ ]`

| ID | Priority / phase | Task and dependencies | Acceptance criteria | Feature references |
| --- | --- | --- | --- | --- |
| P0-01 | P0 / personal first; public A later | [ ] in progress — implemented 2026-10-17, awaiting owner phone check: Personal architecture decision record; retain/harden the web app by default, compare native only if device needs justify it; consult P1/P4. Corrections from the emulator run: main state mirrored to IndexedDB as well, start-up reads the newer mirror before rendering, offline strip moved under the header | Target phone/browser, durable local storage, domain contracts, migration/rollback and offline strategy documented; backend/native/public options explicitly optional; no vendor provisioned merely to decide | [Clips / evidence](#p0-01-reference) |
| P0-02 | P0 / B | [ ] in progress — implemented 2026-10-14, awaiting owner device check: Durable session journal and recovery; depends on P0-01/P2-02 | Every acknowledged set edit is recoverable after reload/process termination; storage failure is visible; no misleading saved state; original session and rest deadline restored without duplicate sets | [Clips / evidence](#p0-02-reference) |
| P0-03 | P0 / B | [ ] in progress — implemented 2026-10-14, awaiting owner phone check: Versioned legacy migration and validated backup/import; depends on P2-02/P5-01/P4-01 | Preserve original backup; preview counts, mappings, units and errors; invalid file changes nothing; intentional empty arrays remain empty; rollback available; unresolved legacy units explicitly reviewed | [Clips / evidence](#p0-03-reference) |
| P0-04 | P1 / C | [ ] in progress (personal scale implemented 2026-10-25 for P4-11) — One-tap pairing via sha256(token) with Supabase PostgREST | Guest can train offline; pairing never discards local data; one-time token pairing closed to unauthenticated resets; no public accounts needed for personal AI | [Clips / evidence](#p0-04-reference) |
| P0-05 | P1 / C | [ ] in progress (personal scale implemented 2026-10-25 for P4-11) — Debounced sync push, offline retry queue, revision conflict merge | Revisions, debounced sync, offline retry queue; conflict retains local workout history by id and merges server routines/plans; failures never block local workout logging | [Clips / evidence](#p0-05-reference) |
| P0-06 | P0 / B–C | [ ] in progress (personal scale: tests + CI done; staging/error monitoring not needed for personal use) — 2026-10-14: zero-dependency suite `node --test "tests/*.test.mjs"` runs the real `index.html` script via `tests/harness.mjs` (session reload/finish-discard, units, migration, restore+undo, seeding, sw.js/manifest checks); `.github/workflows/checks.yml` runs it on push/PR to main (Node 22); old `tools/*-check.mjs` copies removed, assertions converted to `tests/*.test.mjs`. Lint/build stay not applicable; no package.json. | Actual lint/typecheck/test/build commands recorded in AGENTS.md; CI checks domain fixtures, migration, offline recovery, units, finalization and authorization; staging/rollback and error monitoring defined | [Clips / evidence](#p0-06-reference) |
| P0-07 | P1 / C | Historical snapshots and derived-data rebuild | Routine/exercise renames preserve historical meaning; history edits/deletes deterministically rebuild records and charts; policy versions traceable through P5 | [Clips / evidence](#p0-07-reference) |
| P0-08 | P2 / D–F | Media/storage operations and scale budget; consult P3/P4/P6 | Private object access, bounded uploads, deletion lifecycle, backup restore drill and operational cost thresholds; realistic load scenario and measured capacity before scale claims | [Clips / evidence](#p0-08-reference) |
| P0-09 | P2 / C–F | Web planning client and public integration contracts | Uses the same entity and unit contracts; no independent source of truth; API scopes/rate limits/export rules explicit; web capability gaps documented | [Clips / evidence](#p0-09-reference) |

### Canonical-kg decision (2026-10-14, implemented awaiting owner phone check)

- All workout weights are stored in one canonical unit: kilograms (`state.schemaVersion = 2`; 1 kg = 2.20462 lb). Display preference (`state.unit`) never rewrites stored values; `toDisplayWeight`/`fromInputWeight` in `index.html` are the single conversion pair used by logging, history, records, stats, PR detection and the plate calculator.
- One-time versioned migration: the untouched pre-migration `hevy_clone_state` string is copied to `hevy_clone_state_backup_v1` (kept; never overwritten), legacy set weights are interpreted in the saved `state.unit` (default KG, LBS values divided by 2.20462 and rounded to 2 decimals), history `totalVolume` is recomputed from migrated sets, and a saved live draft (`hevy_clone_active_session`) is migrated the same way. Storage keys are unchanged. Export includes `schemaVersion`; imports without it run the same migration.

### Safe restore (2026-10-14, implemented awaiting owner phone check)

- `validateBackupData()` in `index.html` checks a parsed file BEFORE anything changes: plain object with at least one of `history`/`routines`/`exercises` (else "This file is not a PLZ FitZone backup"); every array present must be an array; every workout needs an id, a timestamp date and exercises with sets of numeric weight/reps; negative/NaN/weight > 1000 kg/reps > 1000 rejected; every `exId` referenced by history/routines must exist in the backup's exercise list (unknown ids listed in the error); supported `schemaVersion` 1 (migrated)/2 and unit KG/LBS. The v1→v2 migration runs on a deep copy; the caller's object is never modified. Any failure shows the exact problem and changes nothing.
- Valid files open a `#restoreModal` preview in the app's `.modal` style: title "Restore this backup?" once in the header; body starts with the counts — "N workouts (from `<first date>` to `<last date>`), N routines, N exercises, unit KG/LBS. This replaces what is on this phone now." (text-only, no HTML injection). Restore/Cancel buttons. If a live draft exists (`hevy_clone_active_session`), the same preview asks to keep or discard it, so no stale "Unfinished workout found" prompt survives a restore.
- On confirm, the current state is snapshotted to `hevy_clone_state_before_restore` (overwrites the previous one); a session-only "✅ Restored / Undo" banner plus a persistent Profile "↩️ Undo last restore" button (visible while the key exists) put the exact snapshot bytes back. Storage keys otherwise unchanged.
- `applySeedDefaults(state, hadSavedState)`: defaults seed ONLY on a true first run (no saved state at all); a saved state with intentionally empty `exercises`/`routines` keeps them empty. Verified by `tools/restore-check.mjs` (35 assertions). Owner to verify on phone: wrong-file restore changes nothing; valid restore shows preview, replaces data, undo restores; deleting all routines survives reload.

### PLZ FitZone installability/delivery (2026-10-14, offline layers hardened 2026-10-17)

- [ ] in progress, awaiting owner phone check — installable delivery (supports P0-01 offline strategy): `manifest.webmanifest`, `icons/`, `sw.js` (NETWORK-FIRST page with cache fallback, versioned cache `plz-fitzone-v3` and old caches deleted on activate; registration fails silently on `file://`). Owner to verify on phone: install from Android Chrome, new Vercel version shows on next online open, app opens offline.

### Offline hardening, draft + main-state mirror and decision record (2026-10-17, awaiting owner phone check)

- **Decision record:** [P0-01_DECISION_RECORD.md](../architecture/P0-01_DECISION_RECORD.md) — Pixel 8 / Android Chrome installed PWA at 412 px, the single-file web app kept (no backend, no native build), the stable keys and save-once semantics above, best-effort `navigator.storage.persist()`, and the explicit triggers (multi-device sync, accounts/public, server backups, iOS eviction, health/watch adapters, media storage) that would reopen the backend/native decision.
- **Draft mirror (fixes the lost tick found on the emulator 2026-10-17):** every `saveActiveSession()` also writes the draft into IndexedDB (`plz_fitzone_draft` → `drafts` → `active_session`) with the same `savedAt` stamp and `durability: 'strict'` when supported; `loadActiveSessionDraft()` resumes whichever of localStorage/IndexedDB is newer and offers resume at startup when only the mirror survived; `clearActiveSessionStorage()` (finish, discard, restore-discard) clears both; `pagehide` and `visibilitychange` (hidden) flush both. Missing/blocked IndexedDB fails silently (`typeof indexedDB`, try/catch) and localStorage keeps working alone. No schema bump, no key rename, no change to save/restore/units semantics.
- **Main-state mirror (fixes the same flush gap found on the emulator 2026-10-17, second run: after 12 seeded workouts, a start + tick + kill 1–2 s later came back with `history` empty and onboarding showing, so a workout finished seconds before a kill could vanish from history):** `saveState()` also writes `{ savedAt, json }` (json = the exact localStorage bytes) into the same IndexedDB database under key `main_state`, `durability: 'strict'` when supported; `pagehide`/hidden-`visibilitychange` now flush the state too (not only the draft).
- **Start-up rule:** when IndexedDB works, both mirror keys are read **before `init()` renders or saves** (capped at 500 ms, so a hung database can never keep the app closed); a mirror newer than localStorage — or any missing/empty/corrupt localStorage copy — is adopted and written back to localStorage, so a fresh default state can never overwrite a newer mirror. Without IndexedDB (file://, private mode, tests) start-up stays synchronous and byte-for-byte as before. Restore/import and "Undo last restore" write both copies (the undo keeps its exact snapshot bytes in localStorage and mirrors those bytes with a fresh stamp).
- **Owner-visible offline signal:** a `pointer-events:none` strip ("Offline — your workouts are saved on this phone", ≤ 36 px high) sits **in normal flow under the header** — not an overlay — so it can never cover the Continue or bottom-nav buttons; it shows only while `navigator.onLine === false`, toggled by the `online`/`offline` events. Nothing else is surfaced, and no feature becomes unavailable offline.
- **Page delivery:** `sw.js` v3 precaches the onboarding mascot `./assets/brand/plz-fitzone-mascot.jpg` (the only page asset that was missing) and gives the page request a 3 s `AbortController` timeout before the cache fallback, so a weak signal cannot hang the app on a white screen.
- **Checks:** `tests/offline.test.mjs` now has 17 tests (10 from the first pass, plus the main-state mirror and the pill position: main state mirrored on save under `main_state`; start prefers the newer mirror when local is older; start uses the mirror when local is missing; fresh defaults never overwrite a newer mirror; a pre-boot `pagehide` never writes a default state over the saved one; a restore *and* its undo write both copies; the offline strip sits under the header at ≤ 36 px with no `position:fixed`/`bottom`/`z-index`) and 4 `tests/static.test.mjs` checks (cache v3, every page asset precached, timeout before cache fallback, pill markup). `tests/harness.mjs` gained optional `navigator`/`location`/`fetch`/`indexedDB`/`listeners`+`fire()` options, a `document.body`, listener recording and a fake IndexedDB; `getElementById` returns `null` for ids that are neither in the markup nor rendered (as a browser does), and the app exposes `bootReady` so a test can wait for the mirror read. `node --test "tests/*.test.mjs"` → 192 pass / 0 fail (171 before this job). No browser run and no screenshots; the tick-before-kill case still needs one owner check on the phone.

### Proposed core contract

- Stable session/exercise/set IDs and schema versions.
- Canonical load plus original unit/value; duration/distance typed separately.
- Routine prescription versus performed data, ordered exercise instances, set/group identity and historical snapshots.
- Session status (`draft`, `finished`, `discarded`), revision and finalization identity.
- Timestamps stored consistently with timezone context for calendars.
- Sync mutation status and tombstones; no “last write wins” policy that silently loses a live workout.

Legacy data has only a global unit preference. Past mixed-unit entries cannot be restored exactly by assuming that preference applied to every old set. Preserve the raw value, disclose ambiguity, and resolve it through reviewed migration rather than guessing.

### Verification scenarios to specify before implementation

Reload after an edit; terminate/reopen; storage quota/error; multiple tabs; finish double-tap; repeated network delivery; offline sign-in/linking; account switching; device conflict; migrated empty library; malformed file; restore rollback; history correction across timezones. These are planned tests, not tests already passed.

## Feature reference map

V1/V2 and evidence labels are defined in the [video index](../research/VIDEO_REFERENCE_INDEX.md). Only the named visible behaviors are evidenced; storage and backend guarantees require our acceptance tests.

### P0-01 reference

- **Storage/platform choice — Not demonstrated in V1/V2.** Use the [repository audit](../research/HEVY_AUDIT.md) and [personal architecture direction](../MASTER_PLAN.md). These are design decisions; neither video reveals Hevy's internal architecture.

### P0-02 reference

- **Resume/discard affordance — Shown:** [V1 0:15–0:43](https://www.youtube.com/watch?v=8ESngufwx6g&t=15s).
- **Existing-session choice — Shown:** [V1 2:12–2:18](https://www.youtube.com/watch?v=8ESngufwx6g&t=132s); inspect resume/start-new/cancel at 2:15.
- **Persistence after interruption — Not demonstrated.** Our durability requirement comes from the [confirmed draft-loss audit](../research/HEVY_AUDIT.md), not the reference UI.

### P0-03 reference

- **Units screen — Shown:** [V2 3:34–3:42](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=214s); weight/distance/body-measurement units.
- **Export/import menu — Entry point only:** [V2 3:51–3:56](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=231s).
- **Import preview, transactional validation, rollback, empty-array migration and legacy-unit recovery — Not demonstrated.** Use the [import/unit audit](../research/HEVY_AUDIT.md) and P0-03 criteria.

### P0-04 reference

- **Profile fields — Shown:** [V2 6:18–6:35](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=378s).
- **Sign-in, guest linking, account switching/recovery/deletion — Not demonstrated in V1/V2.** Use P0-04/P4-02 contracts; optional for personal use.

### P0-05 reference

- **Queued sync, retries, idempotency, tombstones and conflict resolution — Not demonstrated in V1/V2.** Use the [master data contract](../MASTER_PLAN.md) and P0-05 scenarios. Cross-device product context: [official overview](https://www.hevyapp.com/); no implementation behavior is established by either video.

### P0-06 reference

- **Tooling, CI and recovery tests — Not demonstrated in V1/V2.** Engineering work derived from the [missing-tooling audit](../research/HEVY_AUDIT.md) and [AGENTS.md](../../AGENTS.md); not a competitor UI feature.

### P0-07 reference

- **Historical chart/records presentation — Shown:** [V2 2:52–3:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=172s).
- **Snapshot/versioning and deterministic rebuild after correction — Not demonstrated.** Use P0-07/P5-01 specifications; the video does not reveal recalculation internals.

### P0-08 reference

- **Workout media entry — Entry point only:** [V1 2:40–2:49](https://www.youtube.com/watch?v=8ESngufwx6g&t=160s).
- **Existing personal custom demo — Shown:** [V2 9:58–10:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=598s).
- **Object storage, access, deletion, backups and load/cost limits — Not demonstrated.** Specify through P0-08/P4-05; media mechanism is not established by a playback screen.

### P0-09 reference

- **Desktop planner and public API contracts — Not demonstrated in V1/V2.** Product context: [official desktop overview](https://www.hevyapp.com/). Use P0-09's shared-data contract rather than inventing a video reference.

## Video references & Assets

- [V1 review](https://www.youtube.com/watch?v=8ESngufwx6g); use the task-specific timestamp links above. Broad initial-review ranges are superseded by the verified feature index.
- [Hevy desktop/watch overview](https://www.hevyapp.com/): reference for cross-device continuity, not an API specification.
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/): candidate durable native storage; sync and notification behavior require separate decisions.
- Audit: [../research/HEVY_AUDIT.md](../research/HEVY_AUDIT.md).
- [V2 review](https://www.youtube.com/watch?v=CkYBAlBrAAw); per-feature links and limitations above. Complete scene ledger: [video index](../research/VIDEO_REFERENCE_INDEX.md).

## Next Immediate Action

**P0-01 implemented 2026-10-17 in `index.html` + `sw.js` on branch `codex/p0-01-offline`, awaiting owner phone check:** the decision record exists (`../architecture/P0-01_DECISION_RECORD.md`), the live draft AND the main state are mirrored into IndexedDB (keys `active_session` and `main_state`), start-up reads the mirror before rendering so the newer copy always wins while a fresh default never overwrites it, finish/discard clear both draft copies, restore and its undo write both, the page request falls back to cache after a 3 s timeout, the offline strip sits under the header (never over a button) and persistent storage is requested once. `node --test "tests/*.test.mjs"` → 192 pass / 0 fail. Do not mark `[x]` until the owner confirms on the phone: with airplane mode on, (a) tick a set and force-close the app within a few seconds, reopen and resume — the last tick must be there (draft mirror); (b) with 12 workouts in history, start a routine, tick, kill the app 1–2 s later and reopen — history must still be 12 and onboarding must NOT reappear (main-state mirror). (P0-02 on branch `codex/p0-02-session-recovery` and P0-03 on `codex/p0-03-safe-restore` still await their own device checks.)
