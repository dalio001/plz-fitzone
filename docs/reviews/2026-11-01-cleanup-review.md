# Code cleanup review — 2026-11-01

This review only read the code; nothing was changed. "Safe" means no behaviour change and nothing depends on it. "Needs care" means saved data, the AI connector or tests depend on it, or the numbers shown in the app would change.

Overall: the app is in fair shape. None of the 589 functions in `index.html` is unused. All 23 pop-ups can be opened, and all 200 exercise pictures are used. The real debt is **copied logic that has drifted apart**: the same number is worked out two different ways in different screens.

## Real bugs found while reviewing (fix first)

| # | Where | Problem | Fix | Risk |
|---|---|---|---|---|
| B1 | `sw.js` ~116-139 | The offline copy of the page is overwritten even by a server error (404/500). One bad deploy or outage could leave the phone with an error page offline. The picture branch already checks `response.ok`. | Cache only when `response.ok`. | Very low; add a test. |
| B2 | `index.html` `epley1RMKg` L1781 vs `getBest1RM` L6932, `scoreHistExercises` L8430, `rebuildHistoryDerived` L8473 | Two different "estimated 1RM" rules. Records/Progress/live PR badge use 1-12 reps and skip warm-ups; the saved 🏆 flags, the exercise list and the exercise detail use the raw formula with no rep cap and count warm-ups. A 20-rep set or a heavy warm-up can earn a saved 🏆 that Records disagrees with. (P0-07 copied the raw rule on purpose so saved numbers did not change.) | One shared 1RM helper used everywhere. | Changes some saved 🏆 counts; `tests/p2_history_ops.test.mjs:100,104` asserts the old rule. **Owner decision.** |
| B3 | Stored `totalVolume` (L2593, L8429, L8472) vs week summary (L10026) and Records (L1890…) | Workout volume on a history card counts warm-ups; the week summary and Records do not. The same workout shows two volumes. | One volume helper (skip warm-ups, as the P2-14 pillar row says). | Changes stored volume numbers; same decision as B2. |
| B4 | `undoLastRestore` L12698, `applyPulledState` L13266 | Settings clean-up is copied 5 times and has drifted. Undo-restore skips several settings and the history rebuild; sync does not normalise plans and routine items. | One `normalizeStateShape(target)` called from all 5 places (~50 lines saved). | Low with tests; behaviour should only get more consistent. |
| B5 | `api/_supabase.js` 128-143 | A failed history-insert reply (non-200) is silently ignored, so undo history can quietly go missing. | Check `res.ok`. | Very low. |

## Safe to remove now (no behaviour change)

| What | Why it is unnecessary | Saving |
|---|---|---|
| `tools/make_icons.py` | Draws the retired "FZ" icon; running it would overwrite the real mascot icons. | One risky file gone |
| `tools/capture.mjs` | One-off screenshot script hard-wired to the old `workout-worktrees/p0-02` folder. | 265 lines |
| `assets/brand/plz-fitzone-logo-wide.jpg` | Not used by the app, the manifest or the service worker. Move it out of the deployed folder if you want to keep it. | 88 KB |
| `scoreHistExercises` (L8416) | Does the same job as `rebuildHistoryDerived`; only finishing a workout still uses it. Finish → add the workout → rebuild. `getBest1RM`'s `excludeId` argument then goes too. | ~40 lines, one less copy of the PR rule |
| Volume recount in the v1→v2 migration (L2590-2596) | The rebuild already recalculates it after load and restore. | 7 lines |
| `dropPickerTarget`, `supersetPickerTarget` | Written, never read. | 4 lines |
| CSS `.header-actions`, `.empty-state-sub`, `.ob-slide-nav` | Not used anywhere. | ~15 lines |
| Test helpers `finishWithDrop` (7 copies), `decodeHtmlEntities` (7), `plain` (5) | Copy-pasted; move into `tests/harness.mjs`. | ~100 lines |
| `api/pair.js:59` `hasAnyOwner()` before the disconnect branch | The result is never used on disconnect, so it wastes one database call. | 1 query per disconnect |
| Out-of-date docs | `AGENTS.md` says there is no `package.json` and no backend; `docs/WORKFLOW.md` says the project is planning-only; `mcp/README.md` says sync is future work. | Fewer wrong instructions for agents |

## Needs care (do one at a time, with tests)

| What | Gain | Risk before deleting |
|---|---|---|
| **Database calls per save** (`api/_supabase.js:124`) | An app sync or AI edit costs 4 database calls (read, read again, history insert, update); undo costs 5. Passing the row already read → 3. A database trigger that copies the old row into history → 1. | The trigger needs `docs/supabase-schema.sql` re-run in Supabase (your step) and the undo tests checked. |
| **Copied API plumbing** (CORS, body parsing, token reading, ~40 JSON-reply blocks, routine mapping written twice, "bump rev and save" written 7 times in `api/mcp/[token].js`) | ~150 lines; one place to fix auth bugs. New `api/_http.js` (files starting with `_` are not endpoints). | Needs the API tests kept green; touches the live AI connector. |
| **Token ways the app never uses** (`api/sync.js` 19-30: `x-plz-token` header, `?token=` in the URL, URL fallback; `api/pair.js` `resetOwner` 102-118) | Smaller attack surface; tokens stop appearing in request logs. | Two tests use them; check the AI connector setup only uses the URL token on `/api/mcp/…`, not these. |
| **Local MCP server** `mcp/plz-train-mcp.mjs` + `tests/mcp_server.test.mjs` | The remote connector does everything it does and more; the two copies of the exercise list have already drifted. ~450 lines. | **Ask Mohamed:** is it still set up in Claude Desktop? Its README points to old folders, which suggests not. Keep `routine-format.mjs`, `catalogue.json` and `build-catalogue.mjs` (the live connector and a test use them). |
| `muscle` field next to `primary` on exercises | Removes a duplicate field. | The local MCP server filters on `muscle`, a test asserts it, and old backups only have `muscle`. Stop writing it only after the MCP reads `primary`; keep the read fallbacks for ever. |
| `cycleSetType`, plus the 7 functions only tests call (`isLoadSet`, `loadPhotos`, `obWelcomeGo`, `playBeep`, `runningSetTimer`, `selectExercise`, `showCalendarMonth`) | Small. | Tests use them; port the tests first. Low value. |
| Pop-up open/close (~35 direct `classList.add('open')`, 17 bypassing `closeModal`) | Consistency. | Cosmetic; low value. |
| ~40 unused element ids | Tidiness only. | Harmless; not worth the time. |
| `sw.js` small leftovers (`CACHE_NAME` alias, repeated GET checks, stale comment); `static.test.mjs` hard-codes the cache version | Small. | None. |
| `vercel.json` packs all of `mcp/**` into every function | Smaller functions. | Only `catalogue.json` and `routine-format.mjs` are needed; test a deploy. |

## Keep (looks old, still needed)

- `hevy_clone_*` storage keys: renaming them would lose your saved workouts.
- The v1→v2 kg migration: old backups are still accepted.
- `.cursorrules`, `.windsurfrules`, `GEMINI.md`, `CLAUDE.md`: intentional pointers to `AGENTS.md`.
- `docs/pillars/plans/*`: every task is still "awaiting phone check". Archive each plan to `plans/_archive/` once its task is ticked; never delete PROGRESS_LOG lines.
- `docs/pillars/plans/P5-weekly/PLAN.md` has no pillar row: add one (the rule is "jobs only from pillars").

## Big functions worth splitting later

`renderActiveWorkout` (226 lines), `renderExerciseProgress` (218) and `validateBackupData` (184; shrinks with B4). The rest are fine as they are.

## Recommended order

1. **Bug fixes, no decision needed:** B1, B4, B5, plus the "safe to remove" list. One branch, one commit each, full test run, then merge.
2. **Owner decision:** B2 + B3, one rule for 1RM and volume (recommend: skip warm-ups, 1RM from 1-12 reps, as in Records). Some saved 🏆 counts and volumes will change once.
3. **API clean-up:** `_http.js`, unused token ways, pass the loaded row (4 calls → 3).
4. **Ask first:** retire the local MCP server; database trigger (needs the schema re-run).
