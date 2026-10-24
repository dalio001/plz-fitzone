# AGENTS.md — PLZ Train (formerly PLZ FitZone) agent contract

This is the shared source of project rules for Codex, Claude, Gemini, Cursor, and Windsurf. Read [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) for product direction and [docs/WORKFLOW.md](docs/WORKFLOW.md) for the workflow.

## Current authorization

The 2026-10-14 request authorizes inspection, competitor research, a roadmap, pillar documents, and agent governance. **Do not implement features, restructure application code, install project dependencies, provision services, or deploy as part of this planning task.** A later request to implement a defined item can authorize that work.

The user subsequently authorized committing, pushing and merging these documents into the GitHub repository. This authorizes documentation publication, not feature implementation. The user also clarified that **personal use is the current scope**. Follow the personal-use sequence in the master plan; public beta, community, coaching, billing and growth are optional future scope, not current requirements.

## User preferences and default pillar priorities

**The owner wants to use this app personally first.** Treat it as a useful tracker for their own workouts, routines and progress. The larger public-product roadmap is an option for later, not the default scope.

When the user asks what to work on next, or requests app improvements without naming a pillar, use this order and choose the next ready task:

1. **Pillar 0 — Reliable data:** prevent lost sessions, preserve weight/unit meaning, provide safe backups/imports and recovery.
2. **Pillar 2 — Personal workout workflow:** improve the owner's routines, set logging, previous performance and rest timers; curate the exercises they actually use.
3. **Pillar 1 — Everyday usability:** make those workflows comfortable and accessible on the owner's phone.
4. **Pillar 5 — Personal progress:** add accurate history, records, simple trends and a training calendar after the underlying data is reliable.

Apply **Pillar 4's relevant security/import/timer protections** and **Pillar 6's basic unit/rest/display preferences** as supporting work. Respect task dependencies: metric and unit definitions may need to be resolved early even though progress features come later.

Defer **Pillar 3 community/coaching**, **Pillar 7 public growth/marketing**, and **Pillar 6 billing/subscriptions**. Do not make accounts, a backend, cloud sync, a native rewrite, public-user research or large catalogues prerequisites for personal use. Introduce them only when a requested personal capability actually needs them or the user changes scope.

**These are defaults, not permanent restrictions.** The user's latest explicit direction takes precedence. If they decide to invite other users or make the app public, adapt the scope, reactivate the relevant deferred pillars, and update this preference section and the master plan to match the new direction. Preserve the personal-use workflows and existing data as the product expands. Do not repeatedly ask the user to reconfirm a direction they have already authorized.

Before starting a task, read this section, the current master-plan scope and the owning pillar. A request to update documentation does not authorize implementing features; a later request to implement a defined improvement can authorize that work.

## graphify

- Use the installed graphify skill when the user types `/graphify`.
- Read its installed `SKILL.md` before doing anything else for that command. The user's referenced location is `~/.Codex/skills/graphify/SKILL.md`; the available installation may be under `~/.agents/skills/graphify/SKILL.md`.

## Pillar Documentation Update Protocol

Every agent working on this project must follow this protocol:

1. Update the pillar owning each completed task, bug fix, or feature. The active pillars are:

   | Pillar | File | Owns |
   | --- | --- | --- |
   | 0 | [00_CORE_ARCHITECTURE.md](docs/pillars/00_CORE_ARCHITECTURE.md) | Architecture, persistence, migration, identity, sync, delivery infrastructure |
   | 1 | [01_UI_DESIGN.md](docs/pillars/01_UI_DESIGN.md) | Navigation, screens, design system, accessibility, interaction quality |
   | 2 | [02_WORKOUT_ENGINE.md](docs/pillars/02_WORKOUT_ENGINE.md) | Sessions, routines, exercise catalogue, logging, timers, training rules |
   | 3 | [03_COMMUNITY_COACHING.md](docs/pillars/03_COMMUNITY_COACHING.md) | Sharing, social graph, accountability groups, coach relationships |
   | 4 | [04_TRUST_INTEGRATIONS.md](docs/pillars/04_TRUST_INTEGRATIONS.md) | Security, privacy, moderation, media permissions, health and watch adapters |
   | 5 | [05_PROGRESS_INTELLIGENCE.md](docs/pillars/05_PROGRESS_INTELLIGENCE.md) | Metric definitions, records, charts, progress reports, adaptive suggestions |
   | 6 | [06_SETTINGS_BILLING.md](docs/pillars/06_SETTINGS_BILLING.md) | Preferences, subscriptions, entitlements, account controls |
   | 7 | [07_DISTRIBUTION_GROWTH.md](docs/pillars/07_DISTRIBUTION_GROWTH.md) | Customer research, acquisition, activation, retention, business experiments |

2. Mark `[x]` only after the stated acceptance criteria have been met. Distinguish source inspection, runtime checks, and production verification. Planned work stays `[ ]`.
3. Add new work as `[ ]` with a stable pillar task ID, priority, dependencies, and a concrete outcome. Record changed assumptions explicitly.
4. **Feature-level reference handoff:** Every roadmap task must link to its own reference section in the owning pillar. For each demonstrated feature or sub-feature, record the video ID, a direct timestamp URL, start/end `MM:SS` range, what to inspect, and whether it is shown, a setting/entry point only, narrated only, or not demonstrated. Consult [docs/research/VIDEO_REFERENCE_INDEX.md](docs/research/VIDEO_REFERENCE_INDEX.md). Never substitute a whole-video link or pillar-wide range for a specific feature reference.
   - Before working on a feature, read its task references and inspect only the relevant clips initially. Read linked official material/specifications for anything the clips do not establish; do not assume the video is a complete implementation specification.
   - When neither supplied video demonstrates a feature, say **Not demonstrated in V1/V2**, identify the relevant audit/specification/official source, and explain the remaining design decision. Do not invent a timestamp, imply a listed setting was exercised, or claim a reviewer opinion is the owner's preference.
   - **Owner-supplied local videos** (screen recordings, files he sends) are copied to `assets/videos/<V#>-<topic>-<date>.mp4` in this folder (git-ignored: never published) and their full path is written in the owning pillar's Video references & Assets section and in the video index. Never cite a temporary path (Downloads, Snipping Tool TempState).
   - Keep both supplied video references, evidence limits and relevant assets in the pillar's Video references & Assets section. Update task references when new videos or requirements arrive; keep personal-first priorities unless the user changes them.
5. Keep a concrete **Next Immediate Action** at the bottom of the pillar. Respect the current planning-only authorization.
6. Keep pillar ownership isolated. Update another pillar only when the task changes its dependencies, shared contracts, or UI components, and cross-reference both.
7. Update [docs/PROGRESS_LOG.md](docs/PROGRESS_LOG.md), newest first, with the date and a short account of the completed work and evidence.
8. Update the master plan when sequencing, release scope, success criteria, or decisions change. It is the source for phase order; pillar files own task details.

## Engineering rules and detected environment

- **Audited branch:** `main`, with a clean working tree before the documentation session. Publish the documentation through a `codex/<topic>` branch and pull request into `main`. Future implementation should also use a `codex/<topic>` branch unless the user specifies another branch; keep stable branches clean.
- **Current runtime:** one self-contained `index.html`, vanilla HTML/CSS/JavaScript, browser `localStorage`. Open the file in a browser; there is no package manager or build step.
- **Lint:** not applicable (no dependencies, no build step). Do not claim `npm run lint` exists.
- **Automated tests:** `node --test "tests/*.test.mjs"` — zero-dependency suite (Node built-in runner, `node:assert`, `node:vm` only) that runs the REAL `<script>` from `index.html` via `tests/harness.mjs`, plus `sw.js` syntax and manifest checks. No `package.json`, no install, no framework. Every code change must keep `node --test "tests/*.test.mjs"` green and add a test for new logic. Do not claim `npm test` exists.
- **Build:** not applicable to the current static file (served as-is; do not add a build step). Do not claim a build passed.
- Before future code work, record any additional real lint/typecheck commands through P0-06 here. Once established, all applicable commands must pass for a code-changing session.
- Until then, future code changes require targeted browser checks of affected workflows and meaningful regression checks for persistence, units, timers, imports, or metrics when affected. Document exactly what was checked.
- Schema changes require a versioned migration, fixtures for old data, preservation of the original backup, and a rollback/recovery strategy.
- Preserve the meaning of historical loads. The legacy backup has no per-set units; mixed-unit history cannot be silently reconstructed with certainty.
- Workout saves must be durable and idempotent. Analytics and social publishing must not block local workout completion.
- Use conventional commit messages when a commit is requested: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Do not commit, push, deploy, or contact users as an automatic consequence of creating roadmap documents.

## Product invariants

- Match the usability of the Hevy reference workflows while developing an original product name, visual identity, and owned or licensed assets.
- Prioritize accurate, recoverable workout data and fast logging before social features or AI.
- Sharing is an explicit action with a visible audience. Body measurements and progress photos are private by default in the proposed product.
- Show the difference between observed performance and estimated or suggested values. Never present estimated 1RM as a verified maximum.
- Training recommendations are explainable, optional, and reversible; no silent routine changes.
- Client preferences do not enforce account authorization or paid entitlements; those need server-side controls when introduced.
