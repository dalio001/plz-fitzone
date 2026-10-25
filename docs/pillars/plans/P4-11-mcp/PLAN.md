## Plan — P4-11 Phase 1 (routine import + local MCP), branch `codex/p4-11-mcp`

**Today (verified: `node --test "tests/*.test.mjs"` → 370 pass / 77 suites, node v24, clean tree)**
- Routine model: `state.routines[] = {id:'rt_'+Date.now(), name, exercises[]}`; each item built by `normalizeRoutineItem` (index.html:3138) → `exId, sets 1..50, targetRepsMin/Max, restSec, note≤140, supersetId, dropsAfterLast, setTypes`. No schema bump needed.
- Routine UI/save: `renderRoutines` (3068), `openRoutineBuilder` (3249), `editRoutine` (3258), `saveRoutine` (3418), `duplicateRoutine` (3222) — reuse its name-collision loop shape. Home header "My Routines" + "+ New Routine" at 827–832.
- Catalogue: `EXERCISE_ROWS` (1975, ex1..ex100), `expandExerciseRow` (2077), `DEFAULT_EXERCISES`/`BUILTIN_EXERCISE_IDS` (2080–2083), `MUSCLES/EQUIPMENT/EXERCISE_TYPES` (1582), `esc` (2086).
- Validate-then-preview pattern to copy: `importData` (11604) → `validateBackupData` (11153, pure, mutates nothing) → `showRestorePreview` (11351) → `confirmRestore` (11367); modals end with `closeModal` (11512).
- Startup: `startApp` (11642) → `init` (2538); call site 11674; onboarding gate `shouldShowOnboarding()`/`closeOnboarding` (10641)/`finishOnboarding` (10974). `location` only exists in tests if injected.
- Harness: `createApp({location})`, `app.api.<fn>`, `app.alerts`, `app.store`.

**A. In-app import (index.html only, no network)**
1. Markup: one new modal `#routineImportModal` (`.modal-content sheet`, `max-width:412px`) after `#restoreModal`: textarea `#routineImportText`, hidden `#routineImportFile` (`accept=".json,.txt,application/json,text/plain"`), file-picker button, `#routineImportPreview` card, `#routineImportErrors` (`role="alert"`), buttons "Add routine" / "Cancel" (both `min-height:44px`). Button "⬇ Import routine" (`min-height:44px`) directly under the My Routines header.
2. New app functions (own copy of the shared rules): `ROUTINE_IMPORT` constants, `validateRoutineImport(payload)` → `{ok, routine}` | `{ok:false, errors[]}`, `decodeRoutineImportHash(hash)`, `openRoutineImport`, `previewRoutineImportText(text)`, `routineFileChosen(e)`, `renderRoutineImportPreview`, `confirmRoutineImport`, `cancelRoutineImport`, `readHashRoutineImport`, `flushPendingRoutineImport`.
3. Link path: at end of `init()` call `readHashRoutineImport()` — parse `#import-routine=<base64url>` (atob + percent-decode for UTF-8), `history.replaceState` to drop the hash *before* validating (never stored, never sent), validate; valid → preview modal, invalid → `alert('❌ ' + list)` with hash already cleared. If the onboarding overlay is open, keep `pendingRoutineImport` and flush at the end of `closeOnboarding`/`finishOnboarding`.
4. Rules (identical strings both sides): `plzTrainRoutine === 1`; `name` trimmed 1–60; `exercises` array 1–20; each `exId` must be in the built-ins (ex1..ex100), `sets` int 1–10, `reps` string `"8"`/`"8-12"` with 1–100 and min≤max, `restSec` optional int 0–600, `note` optional ≤140. Every error is `exercises[2].sets must be a whole number 1–10 (got 25)`-shaped; show up to 8 + "and N more"; nothing written unless `ok`.
5. Preview card: routine name + per exercise "Name — 3 × 8-12 · rest 90s", all through `esc()`; `confirmRoutineImport` maps `reps`→`targetReps`, `normalizeRoutineItem`, name collision → `" (2)"`, `" (3)"`…, `unshift`, `saveState()`, `renderRoutines()`, close modal, clear pending (double-tap safe). `cancel` saves nothing.

**B. Local MCP server (no npm deps, no network)**
1. `mcp/routine-format.mjs`: constants (`ROUTINE_FORMAT_VERSION`, `APP_URL='https://workout-engine-beta.vercel.app'`, caps), `validateRoutinePayload(payload, ids)`, `encodeRoutineLink(routine)` (base64url, Buffer), `buildRoutinePayload()`; error text lives here so the app's copy can match it exactly.
2. `mcp/build-catalogue.mjs`: reads `../index.html`, extracts `EXERCISE_ROWS` + `MUSCLES/EQUIPMENT/EXERCISE_TYPES` inside `node:vm`, expands rows, writes `mcp/catalogue.json` (sorted, 2-space, no timestamps so the freshness test is stable).
3. `mcp/plz-train-mcp.mjs` (Node 18+, `readline` over stdin, newline JSON-RPC 2.0, stdout only): `initialize` (echo client protocolVersion, `{tools:{}}`), `notifications/*` ignored, `ping`, `tools/list`, `tools/call`, `-32601` otherwise. Tools: `list_exercises({muscle?, equipment?})` → `ex7 | Squat (Barbell) | Barbell | Quads + Glutes | weight_reps`; `get_routine_format()` → rules + example payload; `create_routine(payload)` → validates via `routine-format.mjs`, returns the import link + pretty JSON, `isError:true` + the error list when invalid.
4. `mcp/README.md`, plain words: what it is, `node <path>/mcp/plz-train-mcp.mjs`, Claude Desktop `mcpServers` snippet, `claude mcp add` for Claude Code, any stdio client, "regenerate the catalogue with `node mcp/build-catalogue.mjs` after editing exercises", "no keys, nothing leaves the computer".

**Tests (new files, exact names)**
- `tests/mcp_routine.test.mjs`: `link-import-shows-preview-and-clears-hash`, `nothing-saved-without-confirm`, `invalid-payload-lists-errors`, `unknown-exercise-rejected`, `duplicate-name-gets-suffix`, `paste-and-file-import`, `mcp-and-app-validate-same-cases` (12-case table: both validators agree on ok *and* message text), `handlers-compile` (new static + rendered handlers), `nothing-wider-than-412` (new modal/markup + ≥44 px buttons).
- `tests/mcp_server.test.mjs`: `mcp-initialize-and-tools-list`, `mcp-create-routine-returns-valid-link` (spawns the server with `node:child_process`, round-trips JSON-RPC, decodes the link back and re-validates).
- `tests/mcp_catalogue.test.mjs`: `catalogue-json-up-to-date` (regenerate in memory, deep-equal the committed file).
- `tests/harness.mjs`: add faithful `atob` and a minimal `FileReader.readAsText` (browsers have both; nothing else changes). Catalogue.json is built-ins only, so the app never validates against custom/private ids in Phase 1 (documented in README).

**Verify:** `node --test "tests/*.test.mjs"` stays green (370 + ~13 new); browser check of both paths at 412 px; docs: P4-11 row/notes + `docs/PROGRESS_LOG.md` + P5-06 cross-reference.

**Not doing (Phase 2/3):** no backup/history reading, no `get_history`/records tools, no writing into the app or storage from outside, no sync, no auth/scopes/revocation/rate limits, no remote/HTTP MCP transport, no server-side accounts, no medical or progressive-overload advice, no schema bump, no new dependencies or build step, no Phase-2 conversational analysis.

PLAN-READY
