# P4-03 Rest timer on the locked screen (personal part) — Plan

Owner story: he ticks a set, the rest timer starts, he locks the phone and puts it
in his pocket. He wants (1) to see on the lock screen when the rest ends, (2) a buzz
when it ends if the phone allows it, and (3) when he opens the app again the timer is
right (never "still 1:30 left" after he was away 3 minutes).

A web app cannot promise a sound or buzz while the phone is locked: the browser may
pause the page. So: show the END TIME on the lock screen at once (always works when
notifications are allowed), try a "Rest over" buzz at the deadline (best effort), and
always fix the screen the moment he comes back.

## What exists already (check before coding)
- `restDeadline` (absolute time) in `startRestTimer` / `tickRestTimer` / `adjustRest` /
  `stopRestTimer` (~line 6100); saved in the draft (~3022, restored ~3109).
- Keep-awake setting (P4-10): checkbox `keepAwakeCheck` in settings (~1072),
  `state.keepAwake`, normalized in 3 places (2762, 12087/12316/12362). Copy that pattern.
- Service worker `sw.js` registered at ~12620. visibilitychange handlers at ~12611, ~12659.

## Functions (index.html `<script>`)
1. Setting **"Rest alerts on the lock screen"** under keep-awake, `state.restAlerts`
   (default false, normalized like `keepAwake` everywhere it is). Turning it ON asks
   `Notification.requestPermission()` (only on that tap). Refused or unsupported → the
   checkbox goes back off and a small grey line says "Notifications are blocked for this
   app" / "Not supported on this browser". Nothing else changes; logging never depends on it.
2. `restAlertsReady()` — pure check: setting on, `Notification` exists, permission
   `granted`, service worker registration available.
3. `showRestNotification(kind)` — via `navigator.serviceWorker.ready` →
   `reg.showNotification(...)`, tag `plz-rest` (one at a time, replaces itself):
   - `'running'`: title "Resting — next set at 14:32" (local HH:MM of `restDeadline`),
     body = next exercise name if known, `silent: true`, `renotify: false`.
   - `'done'`: title "Rest over — time for your next set", `vibrate: [200,100,200]`,
     `renotify: true`, `requireInteraction: false`.
   Wrapped in try/catch; never throws.
4. `closeRestNotification()` — `reg.getNotifications({tag:'plz-rest'})` → close each.
5. Wiring:
   - page becomes hidden while `restDeadline` is set and `restAlertsReady()` →
     `showRestNotification('running')` and set `restAlertTimer = setTimeout(...)` for
     the deadline that shows `'done'` (best effort; the browser may delay it).
   - `adjustRest` while hidden is not possible; on visible: clear `restAlertTimer`,
     `closeRestNotification()`, then run `tickRestTimer()` immediately so an expired
     rest closes the bar at once. If the rest ended while away, show the existing toast
     style with "Rest ended 1:12 ago" (no late beep).
   - `stopRestTimer` (skip / finish / discard workout): clear the timer and close the
     notification.
   - Restoring a draft whose `restDeadline` already passed: no bar, no beep (as today).
6. `sw.js`: add `notificationclick` → close it and focus an open app window, or open
   `./` if none. Bump `CACHE_VERSION` to `plz-fitzone-v6`. Change nothing else in sw.js.

## Capability matrix (the pillar's main deliverable)
Write `docs/pillars/plans/P4-03-lock-timer/MATRIX.md`: rows = foreground, app in
background, screen locked, app swiped away (killed), offline; columns = Android Chrome
installed app (his phone), desktop Chrome, iPhone Safari home-screen app. Each cell:
what the timer shows on return, whether the lock-screen notification shows, whether the
end buzz/sound fires — marked "tested" or "expected (not tested)". Be honest: killed =
no end alert; locked = end-time notification yes, end buzz best effort; sound only in
the foreground.

## Tests (`tests/p4-03-lock-timer.test.mjs`, harness like the other tests)
- setting default false and normalized on load/import; refusal turns it back off.
- `restAlertsReady` false when off / no Notification / permission denied.
- hidden with a running rest → one `'running'` notification with the right HH:MM; not
  when the setting is off or permission denied (fake `Notification` + fake SW reg).
- back to visible after the deadline → bar closed, notification closed, "Rest ended" shown,
  no beep; before the deadline → bar shows the right remaining seconds.
- stopRestTimer closes the notification.
- logging a set works with permission denied.
- All existing tests still pass: `node --test "tests/*.test.mjs"` (422 before this job).

## Docs
- docs/pillars/04_TRUST_INTEGRATIONS.md P4-03 row: "[ ] in progress — personal part
  implemented <date>, awaiting owner phone check: lock-screen end-time notification,
  best-effort end buzz, correct timer on return, matrix in plans/P4-03-lock-timer/MATRIX.md;
  not done: guaranteed alert when the app is killed (needs a push server)."
- docs/PROGRESS_LOG.md: prepend one entry. NEVER delete existing lines.

## Rules
- Branch `codex/p4-03-lock-timer` in E:/My Apps/plz-fitzone. Commit there, do NOT push, do NOT merge.
- Do not touch api/, mcp/, supabase files. In sw.js only the notificationclick handler and the version.
- Match the surrounding code style (plain functions, short comments).
