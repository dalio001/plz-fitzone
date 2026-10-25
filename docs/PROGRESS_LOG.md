# Progress log

Newest first. Product direction: [MASTER_PLAN.md](MASTER_PLAN.md). Governance: [../AGENTS.md](../AGENTS.md).

## 2026-10-25 — Remote MCP server & Supabase cloud sync for personal AI control (P4-11)

- Built and verified full remote AI control on branch `codex/p4-11-sync` (never pushed, zero npm dependencies).
- **Vercel Serverless Functions (`/api`):**
  - `api/pair.js`: One-time pairing endpoint. Generates a random cryptographic token in the browser and registers `sha256(token)` in Supabase PostgREST. Once registered, pairing is closed to external requests; resets require the existing token.
  - `api/sync.js`: Authenticated state pull (GET) and push (POST) with revision checking (`rev`) and automatic conflict detection. Supports versioned undo via `/api/sync?undo=1`.
  - `api/mcp/[token].js`: Streamable HTTP MCP JSON-RPC 2.0 server for Claude and ChatGPT connectors. Handles CORS OPTIONS, returns 405 on GET, and serves 13 tools:
    `get_overview`, `list_workouts`, `get_workout`, `get_records`, `get_body`, `list_routines`, `list_exercises`, `create_routine`, `update_routine`, `delete_routine`, `plan_week`, `add_body_entry`, `log_workout`.
  - Writes validate using shared `mcp/routine-format.mjs` rules, bump `rev`, log history, and set `updated_by='ai'`.
  - Token authentication compares by `sha256` only; per-token sliding window rate-limiting (60 req/min).
- **Database Schema (`docs/supabase-schema.sql`):**
  - Idempotent SQL defining `plz_state` (`owner_hash` PK, `state` jsonb, `rev` bigint, `updated_at`, `updated_by`, `summary`) and `plz_state_history` (last 20 versions).
  - RLS enabled on both tables with no public policies. Public anon access blocked; only serverless functions with `SUPABASE_SERVICE_ROLE_KEY` can read/write. Automated prune trigger keeps the latest 20 versions per owner.
- **Client Web App (`index.html`):**
  - In Profile > Settings: "Connect your AI" UI with 1-tap `crypto.getRandomValues` token creation, connector URL copy, instructions for Claude & ChatGPT, and Disconnect/Reset.
  - Background sync engine: debounced push on `saveState`, offline retry queue (`plz_sync_pending`), pull on app start and tab visibility change.
  - AI update banner (`Updated by your AI: <what>`) with `↩️ Undo` button.
  - Conflict resolution: preserves local workouts by id and adopts server routines/plans.
  - Privacy: progress photos remain strictly in local IndexedDB (`idbPhotoStore`) and are never synced or returned to the AI.
  - UI cleanup: hides the visible "Paste routine JSON" textarea (`style="display:none;"`) while preserving link import.
- **Service Worker (`sw.js`):**
  - Never caches `/api` requests (network only, no fallback).
- **Verification:**
  - Automated tests: `tests/api_sync_mcp.test.mjs` adds 12 tests against a mock Supabase PostgREST client: pair-once, wrong-token-401, mcp-initialize-tools-list, all 13 tools happy path & validation errors, write-bumps-rev-and-history, app-pulls-ai-change-banner-undo, offline-queue-retries, conflict-keeps-local-history, photos-never-synced, service-key-never-in-index-html, handlers-compile, nothing-wider-than-412.
  - All **406 tests pass** (394 existing + 12 new, 0 fails).

## 2026-10-25 — Import an AI routine by link, paste or file + local MCP server (P4-11 phase 1), awaiting owner phone check

- Implemented `docs/pillars/plans/P4-11-mcp/PLAN.md` parts A and B on branch `codex/p4-11-mcp` (never pushed). No npm dependency, no network call, no schema bump, no build step.
- **In-app import (A):** one **⬇ Import routine** button (44 px) directly under the My Routines header opens `#routineImportModal` (sheet, `max-width:412px`): paste JSON into `#routineImportText`, choose a `.json`/`.txt` file via `#routineImportFile`, see the `#routineImportPreview` card (`Name — 3 × 8-12 · rest 90s` per exercise, all through `esc()`) and `#routineImportErrors` (`role="alert"`), then **Add routine** / **Cancel** (both 44 px). Nothing touches state or storage before Add routine; Cancel discards. Name collisions become ` (2)`, ` (3)`; a double tap adds once.
- **Rules (both copies identical):** `plzTrainRoutine === 1`; name trimmed 1–60; 1–20 exercises; built-in `exId` only (`ex1`–`ex100`); `sets` whole 1–10; `reps` a string `"8"`/`"8-12"` with 1–100 and min ≤ max; optional `restSec` whole 0–600; optional `note` ≤140. Every error is `exercises[2].sets must be a whole number 1–10 (got 25)`-shaped; the app shows 8 then `and N more`. `validateRoutineImport` is pure; the preview maps `reps` → `targetReps` through `normalizeRoutineItem` only on confirm.
- **Link path:** `#import-routine=<base64url>` is decoded with `atob` + percent-decoding (UTF-8), the hash is dropped with `history.replaceState` **before** validation, then a valid payload opens the preview and an invalid one alerts `❌ <list>` with the hash already gone. A link that arrives during first-run onboarding is held in `pendingRoutineImport` and flushed at the end of `closeOnboarding`/`finishOnboarding`.
- **Local MCP server (B, `mcp/`):** `routine-format.mjs` owns constants, `validateRoutinePayload`, `encodeRoutineLink`/`decodeRoutineLink`, `buildRoutinePayload` and `formatRoutineErrors`; `plz-train-mcp.mjs` is a dependency-free newline JSON-RPC 2.0 stdio server (`initialize`, `ping`, `tools/list`, `tools/call`, `-32601` otherwise) exposing `list_exercises` (`ex7 | Squat (Barbell) | Barbell | Quads + Glutes | weight_reps`, optional muscle/equipment filters), `get_routine_format` (rules + example), and `create_routine` (validated import link + pretty JSON, `isError:true` + error list when invalid). `build-catalogue.mjs` extracts `EXERCISE_ROWS`/`MUSCLES`/`EQUIPMENT`/`EXERCISE_TYPES` from `index.html` in `node:vm` and writes the sorted, timestamp-free `mcp/catalogue.json` (100 exercises, committed). `mcp/README.md` covers Claude Desktop, `claude mcp add` and any stdio client; no keys and nothing leaves the computer.
- **Unchanged on purpose:** no history/records reading, no writes into the app from outside, no sync/accounts/scopes/rate limits, no remote/HTTP MCP transport, no custom/private ids in phase 1 (documented in the README), no medical or progression advice, no `sw.js`/`CACHE_VERSION` change, no schema version bump or migration.
- Checks: new `tests/mcp_routine.test.mjs` (9 tests: link preview + hash cleared, invalid link alerts after clearing, nothing saved without confirm, 20 errors shown as 8 + `and 12 more`, unknown/custom id rejected, duplicate names `(2)`/`(3)`, paste and file both save only on Add, a held import flushes when onboarding closes, the 12-case app/MCP validator parity table, every new handler compiles, nothing wider than 412 px with 44 px buttons), `tests/mcp_server.test.mjs` (2 tests over real stdio: handshake/protocol echo, silent notifications, tools list, filtered `list_exercises`, format text, unknown tool/method, and `create_routine` returning a link that decodes and re-validates, plus the rejected case) and `tests/mcp_catalogue.test.mjs` (committed catalogue deep-equals a fresh in-memory build). `tests/harness.mjs` gained a faithful `atob` and a minimal `FileReader.readAsText`. `node --test "tests/*.test.mjs"` → **384 pass / 0 fail** (370 before). Owner to confirm on the phone: the link preview at 412 px, Add saves one routine, Cancel saves nothing, and pasting the file's JSON works.
