# PLZ Train MCP server (local, phase 1)

This folder lets your own AI assistant build a workout routine for PLZ Train and
hand it back as an **import link**. The app opens, shows a preview, and only adds
the routine when you tap **Add routine**.

- No keys, no accounts, no network service: it runs on your computer over stdio.
- Nothing leaves your computer. The assistant reads the exercise list and the
  routine rules from files in this folder, and writes nothing anywhere else.
- Nothing is written into the app from outside. The link carries the routine;
  you still review and confirm it in PLZ Train.

## Run it

```bash
node <path-to-this-folder>/mcp/plz-train-mcp.mjs
```

Example on Windows:

```bash
node "E:/My Apps/workout-worktrees/mcp/mcp/plz-train-mcp.mjs"
```

It speaks newline-delimited JSON-RPC 2.0 on stdin/stdout. Any MCP client that
supports the stdio transport works.

## Claude Desktop

Add this to `claude_desktop_config.json` (Settings → Developer → Edit Config),
then restart Claude Desktop:

```json
{
  "mcpServers": {
    "plz-train": {
      "command": "node",
      "args": ["E:/My Apps/workout-worktrees/mcp/mcp/plz-train-mcp.mjs"]
    }
  }
}
```

## Claude Code

```bash
claude mcp add plz-train -- node "E:/My Apps/workout-worktrees/mcp/mcp/plz-train-mcp.mjs"
```

## Any other stdio client

Start `node <path>/mcp/plz-train-mcp.mjs` and send one JSON-RPC message per
line. The server answers with one JSON line per request (notifications get no
answer). Standard methods: `initialize`, `tools/list`, `tools/call`, `ping`.

## Tools

| Tool | What it does |
| --- | --- |
| `list_exercises` | Lists the built-in exercises as `ex7 \| Squat (Barbell) \| Barbell \| Quads + Glutes \| weight_reps`. Optional exact filters `muscle` and `equipment`. |
| `get_routine_format` | Shows the routine rules and an example payload. |
| `create_routine` | Validates a routine and returns the import link plus the routine JSON. Invalid input comes back with the full error list and creates nothing. |

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
whole seconds 0–600; `note` optional up to 140 characters. Only built-in ids
(`ex1`–`ex100`) are accepted in phase 1 — custom and private exercises are not in
the catalogue yet.

## Regenerating the exercise catalogue

`catalogue.json` is generated from the app's own exercise list in `index.html`.
After you add, rename or remove an exercise in the app, run:

```bash
node mcp/build-catalogue.mjs
```

Then commit the updated `mcp/catalogue.json`. The test
`tests/mcp_catalogue.test.mjs` fails if the file is stale.

## What this server cannot do (by design)

- It does not read your workout history, records or body data.
- It does not write into the app, `localStorage` or the backup.
- It has no sync, accounts, authorisation, remote/HTTP transport or rate limits.
- It gives no medical or progressive-overload advice; it only builds a routine
  you review.

Those are later phases (see `docs/pillars/04_TRUST_INTEGRATIONS.md`, P4-11).
