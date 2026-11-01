# Shared files for the AI connector

The AI connector is the remote MCP server in `api/mcp/[token].js` (P4-11 in
`docs/pillars/04_TRUST_INTEGRATIONS.md`), added in Claude chat with the owner's
private link. It reads and changes the app's routines, plans and workouts.

This folder holds the files it shares with the app and the tests:

- `catalogue.json`: the built-in exercise list, generated from `index.html`.
- `build-catalogue.mjs`: regenerates `catalogue.json`.
- `routine-format.mjs`: the routine rules and import-link format. The same rules
  are mirrored inside `index.html`; `tests/mcp_routine.test.mjs` proves both
  copies agree.

The old local stdio server (`plz-train-mcp.mjs`) was removed on 2026-11-01: the
remote connector does everything it did. It is still in git history.

A routine payload looks like this:

```json
{
  "plzTrainRoutine": 1,
  "name": "Push Day",
  "exercises": [
    { "exId": "ex1", "sets": 3, "reps": "8-12", "restSec": 90 },
    { "exId": "ex11", "sets": 3, "reps": "8" },
    { "exId": "ex14", "sets": 3, "reps": "10-15", "note": "Slow on the way down" }
  ]
}
```

Rules: name 1–60 characters; 1–20 exercises; `sets` a whole number 1–10;
`reps` a string like `"8"` or `"8-12"` (1–100, min ≤ max); `restSec` optional
whole seconds 0–600; `note` optional up to 140 characters.

## Regenerating the exercise catalogue

After you add, rename or remove an exercise in the app, run:

```bash
node mcp/build-catalogue.mjs
```

Then commit the updated `mcp/catalogue.json`. The test
`tests/mcp_catalogue.test.mjs` fails if the file is stale.
