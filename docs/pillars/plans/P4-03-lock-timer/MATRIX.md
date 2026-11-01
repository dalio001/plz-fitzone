# P4-03 Rest Timer & Lock-Screen Capability Matrix

Owner story: he ticks a set, the rest timer starts, he locks the phone and puts it in his pocket. He wants:
1. To see on the lock screen when the rest ends.
2. A buzz when it ends if the platform allows it.
3. When he opens the app again, the timer is accurate (never "still 1:30 left" after being away for 3 minutes).

### Honest technical constraints
- **Web app sandbox:** A browser page running as a PWA cannot promise background audio playback or CPU execution indefinitely once the device is locked. Browsers suspend timers (`setInterval` / `setTimeout`) when in background or locked to conserve battery.
- **Lock-screen notification:** Showing the absolute completion time ("Resting — next set at 14:32") on the lock screen works immediately upon transition to background when notifications are allowed.
- **Deadline alerts:** The "Rest over" alert with vibration `[200, 100, 200]` is scheduled for the deadline (`setTimeout`), which is **best effort**; the OS may deliver it on time, delay it until wake, or suppress it in battery saver mode.
- **Process kill:** If the browser or OS kills the page/service worker process, no JavaScript runs locally. Guaranteed delivery in killed state requires a remote push server (Web Push API).
- **Return to foreground:** The app always checks the absolute deadline (`restDeadline`) on visibility restore. If expired, it closes the bar immediately, shows a toast (`"Rest ended M:SS ago"`), and suppresses any late beeps.

---

## Rest Timer Capability Matrix

| Lifecycle State | Android Chrome Installed PWA (Owner phone) | Desktop Chrome / Edge | iPhone Safari Home-Screen App (iOS PWA) |
| :--- | :--- | :--- | :--- |
| **1. Foreground**<br>*(Active screen, workout open)* | • **Timer on return:** N/A (stays visible)<br>• **Lock notification:** None (in foreground)<br>• **End alert:** Audio beep plays; countdown hits 00:00 and bar closes.<br>• *Status:* **Tested** | • **Timer on return:** N/A (stays visible)<br>• **Lock notification:** None<br>• **End alert:** Web Audio beep plays; bar closes.<br>• *Status:* **Tested** | • **Timer on return:** N/A (stays visible)<br>• **Lock notification:** None<br>• **End alert:** Web Audio beep plays; bar closes.<br>• *Status:* **Expected (not tested)** |
| **2. App in Background**<br>*(Switched apps, screen on)* | • **Timer on return:** Repaints to exact remaining seconds, or if passed closes bar with toast `"Rest ended M:SS ago"`.<br>• **Lock notification:** Shows `"Resting — next set at HH:MM"` with exercise name.<br>• **End alert:** Best effort; timer fires `"Rest over — time for your next set"` with vibration.<br>• *Status:* **Tested** (automated suite) / **Awaiting owner phone check** | • **Timer on return:** Correct remaining seconds or expired toast.<br>• **Lock notification:** Desktop system notification shows end time.<br>• **End alert:** Best effort background notification at deadline.<br>• *Status:* **Tested** (automated suite) | • **Timer on return:** Exact remaining seconds or expired toast.<br>• **Lock notification:** Notification banner if Web Push/Notifications permitted in iOS 16.4+.<br>• **End alert:** Best effort; iOS limits background execution.<br>• *Status:* **Expected (not tested)** |
| **3. Screen Locked**<br>*(Power button pressed, phone in pocket)* | • **Timer on return:** The moment the phone unlocks and app is visible, `visibilitychange` clears notification, closes timer bar if expired, and shows `"Rest ended M:SS ago"`. No late audio beep.<br>• **Lock notification:** **Yes**, persistent `"Resting — next set at HH:MM"` notification visible on lock screen/Always-On Display.<br>• **End alert:** Best effort. Replaces running notification with `"Rest over"` + buzz if browser process is not frozen by OS battery management.<br>• *Status:* **Tested** (mock harness) / **Awaiting owner phone check** | • **Timer on return:** Correct elapsed time and status.<br>• **Lock notification:** System notification visible on lock screen (OS dependent).<br>• **End alert:** Fires if system is awake; no sound if OS asleep.<br>• *Status:* **Tested** (automated suite) | • **Timer on return:** Recalculates from `restDeadline` immediately on return; displays toast if expired, no late beep.<br>• **Lock notification:** Shows if notification permissions were granted in standalone mode.<br>• **End alert:** Best effort notification; no background audio.<br>• *Status:* **Expected (not tested)** |
| **4. App Swiped Away (Killed)**<br>*(Removed from recent apps / OS OOM)* | • **Timer on return:** On re-opening app, active draft is resumed from IndexedDB/localStorage. If rest ended while app was closed, rest timer bar is closed with no late sound.<br>• **Lock notification:** Notification may remain until tapped or closed; no further client JavaScript runs.<br>• **End alert:** **None** (process terminated; local web app cannot fire timers without a backend push server).<br>• *Status:* **Tested** | • **Timer on return:** Restores draft from storage; expired rest is dismissed cleanly.<br>• **Lock notification:** None.<br>• **End alert:** None.<br>• *Status:* **Tested** | • **Timer on return:** Restores draft on launch; expired rest dismissed.<br>• **Lock notification:** None.<br>• **End alert:** None.<br>• *Status:* **Expected (not tested)** |
| **5. Offline**<br>*(No cellular or Wi-Fi, gym basement)* | • **Timer on return:** Identical to online behavior; service worker and notifications run 100% locally on the device.<br>• **Lock notification:** **Yes**, local notification via Service Worker `reg.showNotification()` functions entirely offline without network.<br>• **End alert:** Best effort deadline notification + vibration.<br>• *Status:* **Tested** | • **Timer on return:** Identical offline behavior.<br>• **Lock notification:** Local desktop notification works offline.<br>• **End alert:** Best effort local alert.<br>• *Status:* **Tested** | • **Timer on return:** Local state recovery identical offline.<br>• **Lock notification:** Works offline if installed as PWA.<br>• **End alert:** Best effort local alert.<br>• *Status:* **Expected (not tested)** |

---

## Key Behaviors & Verification Summary

1. **Permission Isolation:**
   - Setting "Rest alerts on the lock screen" is opt-in (default off).
   - Refusal, denial, or missing API cleanly unchecks the preference and informs the user (`"Notifications are blocked for this app"` / `"Not supported on this browser"`).
   - Set logging, workouts, and history never depend on notification permissions.

2. **No Stale Clocks:**
   - On waking or switching back to the app (`visibilitychange` -> `visible`), `Date.now()` is compared against `restDeadline`.
   - If `Date.now() >= restDeadline`: `restTimerBar` is closed, the lock-screen notification is dismissed, `"Rest ended M:SS ago"` toast is shown, and audio beep is suppressed (preventing annoying late beeps).
   - If `Date.now() < restDeadline`: `restRemaining` is updated to the exact remaining seconds.

3. **Notification Lifecycle:**
   - Uses single tag `plz-rest` so updates replace in-place rather than spamming the notification tray.
   - Dismissed automatically on: workout finish, workout discard, manual skip (`stopRestTimer`), preference toggle off, or return to foreground.
   - Tap on notification (`notificationclick` in `sw.js`): closes the notification and focuses the existing app window (or opens `./` if closed).
