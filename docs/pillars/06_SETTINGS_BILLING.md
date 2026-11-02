# Pillar 6 — Preferences, account controls and premium value

> **Role:** Let users control their experience and fund the product through tested optional value. Own settings, commercial packaging, subscription state and entitlement behavior.
>
> **Depends on:** Pillar 2 unit/timer contracts, Pillar 1 controls and Pillar 4 input/privacy boundaries for personal preferences. Identity/sync, payments and Pillar 7 price evidence apply to future commercial scope only.
> **Used by:** Pillars 3 coach access, 5 optional premium guidance, 7 business measures.
> **Cross-pillar impacts:** Display units, account switching, consent, deletion/export, paid feature access and platform purchase policies.

**Current mode — preferences only:** P6-01 unit/rest/display preferences is relevant. Personal backups are owned by Pillar 0. Accounts, subscriptions, entitlements, paywalls and coach packages are deferred; public phase letters below are future reference.

## Trigger keywords

`Pillar 6`, settings, units, account, subscription, billing, premium, entitlements, restore purchase.

## Scope

- Display units, theme, timer/audio/haptic preferences, timezone/week start and accessibility choices.
- Identity/profile controls, exports/deletion and integration/notification preferences with Pillar 4.
- Freemium packaging, subscription lifecycle and server-side entitlements.
- Later coach package where pilot evidence warrants it; enterprise multi-tenancy is not initial scope.

## UI components used from Pillar 1

Settings row, preference selector, account linking/recovery, consent/audience controls, export/delete confirmation, premium offer, purchase/restore status and accessible error feedback.

## What is built and verified `[x]`

- [x] **Runtime/source checked:** KG/LBS button, one default-rest setting and JSON backup/restore buttons.
- [x] **Runtime checked:** Unit preference changes labels while retaining the same numeric load; correction belongs to Pillars 0/2 before polished settings.
- [x] **Absence verified:** No account, subscription, paywall, purchase provider or paid entitlement system.

## What is left to do `[ ]`

| ID | Priority / phase | Task and dependencies | Acceptance criteria | Feature references |
| --- | --- | --- | --- | --- |
| P6-01 | P1 / B–C | Versioned preferences; P2 unit/timer policy | Unit changes only presentation/input interpretation, never historical meaning; timer Off supported; validated bounds; locale decimals/week start; audio/haptics/theme/large-text compatibility; preference sync conflict rule explicit | [Clips / evidence](#p6-01-reference) |
| P6-02 | P1 / C | Account/data controls; P0-04/P4-04 | Export and deletion discoverable; guest/account switching safe; permissions/integrations revocable; account recovery verified; deletion retention exceptions disclosed after launch-market review | [Clips / evidence](#p6-02-reference) |
| P6-03 | P2 / E | Package and price research; P7-05 | Proposed free reliable logging/history/basic progress/export versus paid guidance/planning tested with retained users; exact prices/limits backed by evidence; recurring service cost model; no retroactive lock of owned data | [Clips / evidence](#p6-03-reference) |
| P6-04 | P0 / before paid release | Billing/entitlement architecture; P0 identity/P4 review | Provider/store decisions appropriate to distribution; server validates entitlement; idempotent purchase/callback handling; renewal/expiry/grace/refund/restore cases specified; offline access policy bounded and honest | [Clips / evidence](#p6-04-reference) |
| P6-05 | P1 / E | Purchase, restoration and downgrade experience | Duplicate callbacks cannot double grant/charge; device switch restores eligible access; expiry leaves core logger/history/export usable; active workout unaffected; clear retry/status/support paths | [Clips / evidence](#p6-05-reference) |
| P6-06 | P2 / E–F | Revenue/cost reporting and offer experiments | Gross-to-net reconciliation; cost by storage/media/AI/support; package cohort analysis; cancellation/refund and purchase failure reported; lifetime offers gated on sustainable economics | [Clips / evidence](#p6-06-reference) |
| P6-07 | P3 / F | Coach package and client permission boundaries; P3 pilot | Coach/client relationship permission separated from payment; access revocation works; no pooled user data by default; scope grounded in pilot needs | [Clips / evidence](#p6-07-reference) |
| P6-08 | P1 / personal optional after reliable timers | Timer sound, completion sound and live-PR feedback controls; P2-03/P5-01, shared UI P1-02 | Choose supported timer sound; separate timer/check-set/PR volume or Off; silent-mode/autoplay limitations explicit; meaningful PR policy controls alerts; no duplicate audio; haptics are optional platform work not demonstrated by the videos | [Clips / evidence](#p6-08-reference) |

### P6-01 unit-part status (2026-10-14)

- [ ] in progress, awaiting owner phone check — canonical-kg unit fix implemented in `index.html` on branch `codex/units-preserve-load`: all weights stored in kilograms (`state.schemaVersion = 2`, 1 kg = 2.20462 lb); the KG/LBS button only changes presentation via `toDisplayWeight` and input interpretation via `fromInputWeight` (kg display ≤2 decimals, lb display ≤1 decimal); active inputs, PREVIOUS column, history volume/best set, exercise est. 1RM, profile stats, PR detection and plate calculator (bar 20 kg / 45 lb) all route through the same helpers; legacy weights migrated once from the saved `state.unit` (default KG) with the untouched copy kept at `hevy_clone_state_backup_v1` (never overwritten); export includes `schemaVersion`, old imports run the same migration. Owner to verify on phone: log 100 kg, switch to LBS (shows 220.5 lb), switch back (shows 100 kg, stored values identical).

### P6-01 rest-default status (2026-11-02)

- [ ] in progress, awaiting owner phone check: Profile › Settings › Default Rest Timer accepts whole seconds 0–600, and **0 = Off** (no rest timer after a ticked set; before, 0 silently became 90). Blank, negative, decimal or too-long entries are refused and the box shows the kept value; a broken saved value is fixed on load (`normalizeStateShape`). One helper `profileRestSec()` replaces 23 copies of `state.defaultRest || 90`. Tests: `tests/p6_01_rest_default.test.mjs`. Still open in P6-01: theme, large text.

### Proposed packaging, still unvalidated

| Layer | Proposed value | Evidence needed |
| --- | --- | --- |
| Free core | Reliable sessions, usable history/basic progress, recovery and export | Activation/retention and sustainable baseline cost |
| Premium | Deeper programming/reporting and useful explainable adaptation | Retained users pay for a real offer; measurable helpfulness |
| Coach pilot | Versioned client programs and session-linked feedback | Coaches/clients use it repeatedly and accept an appropriate price |

Do not choose a price because the reference video shows one. It was uploaded in 2024 and reflects a historical regional offer. Avoid lifetime commitments before recurring costs and support expectations are understood.

### Ownership boundaries

Pillar 0 stores identity and entitlement records; Pillar 4 reviews access/security; this pillar owns the purchase/expiry semantics. UI toggles never grant paid access. Settings do not own workout unit conversion or metric calculations; they invoke the domain contracts.

## Feature reference map

Source/evidence definitions: [video index](../research/VIDEO_REFERENCE_INDEX.md). Personal preferences are active; subscription flows remain deferred. Recorded prices are not our pricing decision.

### P6-01 reference

- **Weight/distance/measurement units — Shown:** [V2 3:34–3:42](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=214s).
- **Light/dark/device theme — Shown:** [V2 3:40–3:49](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=220s).
- **Week start/default rest — Settings:** [V2 4:51–5:06](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=291s); week selection shown, rest selector not fully exercised.
- **Previous-values scope — Setting shown:** [V2 5:04–5:15](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=304s); engine owner P2-11.
- **Keep-awake — Setting enabled:** [V2 5:15–5:21](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=315s); adapter owner P4-10.
- **RPE toggle — Setting only:** [V2 5:20–6:15](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=320s); no set-entry demo.
- **Smart scrolling/inline timer/live-PR toggle — Settings only:** [V2 5:35–6:12](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=335s); runtime P2-12/P5-02.
- **Sound settings:** exact scenes in P6-08 below. Numeric conversion, locale parsing, haptics, preference migrations and sync conflicts are not demonstrated.
- **First-run weight-unit KG/LBS step setting this preference — adopted in P1-05:** see [P1-05](./01_UI_DESIGN.md#p1-05-reference).

### P6-02 reference

- **Profile editing/private fields — Shown:** [V2 6:18–6:35](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=378s).
- **Export/import/Apple Health/notifications — Entry points:** [V2 3:51–3:56](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=231s).
- **Integration Connect rows — Entry points:** [V2 3:54–4:08](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=234s).
- **Deletion, account recovery/switching, permission revocation and export workflow — Not demonstrated.** Use P0/P4 contracts; avoid accounts as a prerequisite for personal use.

### P6-03 reference

- **Premium offer/history gating — Shown:** [V1 3:10–3:25](https://www.youtube.com/watch?v=8ESngufwx6g&t=190s) and [V2 10:46–11:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=646s).
- **AI/unlimited feature pitch — Narrated:** [V2 11:45–12:00](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=705s).
- **Our price research, package economics and data-ownership rules — Not demonstrated.** Use P6-03/P7-05 if a public product is requested; no paywall needed now.
- **First-run paywall — Shown in V3 00:23–00:25 (not adopted; billing deferred for personal use):** see [P1-05](./01_UI_DESIGN.md#p1-05-reference).

### P6-04 reference

- **Commercial entry UI — Related screen only:** [V2 10:46–11:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=646s).
- **Server entitlements, provider/store decision, verification, callback idempotency and offline grace — Not demonstrated in V1/V2.** Our future billing contract; never infer internals from an offer screen.

### P6-05 reference

- **Subscribe/plan choices — Entry point only:** [V2 10:46–11:44](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=646s).
- **Completed purchase, restore, cancellation, expiry, refund and downgrade — Not demonstrated.** Specify/test separately if paid scope becomes active.

### P6-06 reference

- **Revenue/cost reconciliation, lifetime economics and offer experiments — Not demonstrated in V1/V2.** Use P6-06's business specification. Recorded offer prices do not reveal developer revenue or costs.

### P6-07 reference

- **Coach package/payment/permission boundaries — Not demonstrated in V1/V2.** Use P3-07/P6-07 only if requested; references to clients in narration are not a billing workflow.

### P6-08 reference

- **Timer sounds/volume — Settings shown:** [V2 4:15–4:25](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=255s); sound choices include Alarm and Boxing Bell.
- **Completed-set volume/Off — Settings shown:** [V2 4:24–4:40](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=264s).
- **Live-PR volume/Off and silent-mode note — Settings shown:** [V2 4:40–4:48](https://www.youtube.com/watch?v=CkYBAlBrAAw&t=280s).
- **A real completion/PR sound event, duplicate-alert handling, browser autoplay and haptics — Not demonstrated.** Verify on the owner's device; do not promise behavior solely from the settings screen.

## Video references & Assets

- [V1 review](https://www.youtube.com/watch?v=8ESngufwx6g); use the task-specific timestamp links above. Broad initial-review ranges are superseded by the verified feature index.
- [../MASTER_PLAN.md](../MASTER_PLAN.md): business gates and proposed packaging.
- [../research/HEVY_AUDIT.md](../research/HEVY_AUDIT.md): current preferences and dated pricing boundary.
- [V2 review](https://www.youtube.com/watch?v=CkYBAlBrAAw) and [video index](../research/VIDEO_REFERENCE_INDEX.md); settings and pricing scenes are linked per task above.

## Next Immediate Action

**Planning only:** specify P6-01 preferences against the corrected domain unit/timer contract. Keep billing deferred until a retained beta cohort establishes paid value.
