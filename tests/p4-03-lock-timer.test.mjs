// tests/p4-03-lock-timer.test.mjs — P4-03 (personal part): locked-screen
// rest timer alerts via Web Notifications + Service Worker, best-effort deadline
// alerts, and accurate recovery on return (toast with "Rest ended M:SS ago", no late beep).
// Zero npm dependencies, runs against the real <script> in index.html and real sw.js.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createApp, loadIndexHtml, STATE_KEY, SW_PATH } from './harness.mjs';

function makeFakeNotification(permission = 'granted') {
  let perm = permission;
  return {
    get permission() { return perm; },
    set permission(v) { perm = v; },
    requestPermission(cb) {
      if (typeof cb === 'function') {
        cb(perm);
        return;
      }
      return Promise.resolve(perm);
    },
  };
}

function makeFakeSwReg() {
  const notifications = [];
  return {
    notifications,
    showNotification(title, options) {
      const opts = options || {};
      const existing = notifications.find(
        (n) => !n.closed && n.options && opts.tag && n.options.tag === opts.tag
      );
      if (existing) existing.closed = true;
      const notif = {
        title: String(title),
        options: opts,
        closed: false,
        close() { this.closed = true; },
      };
      notifications.push(notif);
      return Promise.resolve(notif);
    },
    getNotifications(filter) {
      const tag = filter && filter.tag;
      return Promise.resolve(
        notifications.filter(
          (n) => !n.closed && (!tag || (n.options && n.options.tag === tag))
        )
      );
    },
  };
}

function makeLockApp(options = {}) {
  const fakeNotif = options.Notification !== undefined ? options.Notification : makeFakeNotification('granted');
  const fakeReg = options.swRegistration !== undefined ? options.swRegistration : makeFakeSwReg();
  const navigatorOpts = Object.assign(
    {
      serviceWorker: {
        ready: Promise.resolve(fakeReg),
        showNotification: fakeReg ? fakeReg.showNotification.bind(fakeReg) : undefined,
        getNotifications: fakeReg ? fakeReg.getNotifications.bind(fakeReg) : undefined,
      },
    },
    options.navigator || {}
  );
  if (options.noSw) delete navigatorOpts.serviceWorker;

  const app = createApp({
    store: options.store,
    Notification: fakeNotif,
    navigator: navigatorOpts,
    listeners: true,
  });

  if (fakeReg) app.api.swRegistration = fakeReg;
  return { app, fakeNotif, fakeReg };
}

describe('P4-03 locked-screen rest timer: setting & normalization', () => {
  it('setting default false and normalized on load/import; refusal turns it back off', async () => {
    // 1. Default state is false
    const { app: appFresh } = makeLockApp();
    assert.equal(appFresh.api.state.restAlerts, false, 'default is false');
    assert.equal(appFresh.el('restAlertsCheck').checked, false, 'checkbox unchecked by default');

    // 2. Normalization on load: non-boolean coerced to false
    const store = new Map();
    store.set(STATE_KEY, JSON.stringify({ restAlerts: 'invalid-string' }));
    const { app: appNorm } = makeLockApp({ store });
    assert.equal(appNorm.api.state.restAlerts, false, 'coerced to false on load');

    // 3. Backup validation & restore preserves boolean
    const validRaw = {
      exercises: [],
      routines: [],
      history: [],
      body: [],
      restAlerts: true,
    };
    const valResult = appFresh.api.validateBackupData(validRaw);
    assert.equal(valResult.ok, true, 'valid backup');
    assert.equal(valResult.data.restAlerts, true, 'preserves true boolean in backup');

    const invalidRaw = {
      exercises: [],
      routines: [],
      history: [],
      body: [],
      restAlerts: 'yes',
    };
    const valInvalid = appFresh.api.validateBackupData(invalidRaw);
    assert.equal(valInvalid.data.restAlerts, false, 'non-boolean sanitized to false');

    // 4. Turning ON asks Notification.requestPermission()
    // When permission is granted:
    const { app: appGranted } = makeLockApp();
    const resGranted = await appGranted.api.setRestAlerts(true);
    assert.equal(resGranted, true, 'setRestAlerts returns true when granted');
    assert.equal(appGranted.api.state.restAlerts, true, 'state set to true');
    assert.equal(appGranted.el('restAlertsCheck').checked, true, 'checkbox checked');
    assert.equal(appGranted.el('restAlertsNote').style.display, 'none', 'no error note when granted');

    // 5. When permission is refused/denied: checkbox turns back off and note is shown
    const deniedNotif = makeFakeNotification('denied');
    const { app: appDenied } = makeLockApp({ Notification: deniedNotif });
    const resDenied = await appDenied.api.setRestAlerts(true);
    assert.equal(resDenied, false, 'setRestAlerts returns false when denied');
    assert.equal(appDenied.api.state.restAlerts, false, 'state remains false');
    assert.equal(appDenied.el('restAlertsCheck').checked, false, 'checkbox turned back off');
    assert.equal(appDenied.el('restAlertsNote').style.display, 'block', 'note shown');
    assert.ok(
      appDenied.el('restAlertsNote').textContent.includes('Notifications are blocked for this app'),
      'says notifications are blocked'
    );

    // 6. When unsupported: checkbox turns back off and note says unsupported
    const { app: appUnsup } = makeLockApp({ Notification: null, noSw: true });
    const resUnsup = await appUnsup.api.setRestAlerts(true);
    assert.equal(resUnsup, false, 'returns false when unsupported');
    assert.equal(appUnsup.api.state.restAlerts, false, 'state remains false');
    assert.equal(appUnsup.el('restAlertsCheck').checked, false, 'checkbox off');
    assert.equal(appUnsup.el('restAlertsNote').style.display, 'block', 'note shown');
    assert.ok(
      appUnsup.el('restAlertsNote').textContent.includes('Not supported on this browser'),
      'says not supported'
    );
  });
});

describe('P4-03 restAlertsReady pure check', () => {
  it('restAlertsReady false when off / no Notification / permission denied / no SW', () => {
    const { app, fakeNotif } = makeLockApp();

    // Off by default
    assert.equal(app.api.state.restAlerts, false);
    assert.equal(app.api.restAlertsReady(), false, 'false when setting off');

    // Turned on with granted permission + sw
    app.api.state.restAlerts = true;
    assert.equal(app.api.restAlertsReady(), true, 'true when on + granted + sw');

    // Permission denied
    fakeNotif.permission = 'denied';
    assert.equal(app.api.restAlertsReady(), false, 'false when permission denied');
    fakeNotif.permission = 'granted';

    // No SW registration
    app.api.swRegistration = null;
    delete app.navigator.serviceWorker;
    assert.equal(app.api.restAlertsReady(), false, 'false when no service worker');
  });
});

describe('P4-03 hidden with running rest timer', () => {
  it('hidden with a running rest -> one running notification with right HH:MM', async () => {
    const { app, fakeReg } = makeLockApp();
    await app.api.setRestAlerts(true);
    assert.equal(app.api.restAlertsReady(), true);

    // Start routine workout and rest timer
    app.api.startRoutineWorkout('rt1');
    app.api.startRestTimer(90);
    const deadline = app.api.restDeadline;
    assert.ok(typeof deadline === 'number' && deadline > Date.now());

    const d = new Date(deadline);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const expectedTime = hh + ':' + mm;

    // Simulate pagehide / visibilitychange to hidden
    app.document.visibilityState = 'hidden';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));

    // Verify notification was shown
    const activeNotifs = fakeReg.notifications.filter((n) => !n.closed);
    assert.equal(activeNotifs.length, 1, 'exactly one notification created');
    const notif = activeNotifs[0];
    assert.ok(notif.title.includes('Resting'), 'title contains Resting');
    assert.ok(notif.title.includes(expectedTime), 'title contains local HH:MM ' + expectedTime);
    assert.equal(notif.options.tag, 'plz-rest', 'tag is plz-rest');
    assert.equal(notif.options.silent, true, 'silent is true');
    assert.equal(notif.options.renotify, false, 'renotify is false');
  });

  it('rest ends while hidden (page alive) -> note becomes Rest over and stays open', async () => {
    const { app, fakeReg } = makeLockApp();
    await app.api.setRestAlerts(true);
    app.api.startRoutineWorkout('rt1');
    app.api.startRestTimer(90);
    app.document.visibilityState = 'hidden';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));

    app.api.restDeadline = Date.now() - 10;
    app.api.tickRestTimer();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const open = fakeReg.notifications.filter((n) => !n.closed);
    assert.equal(open.length, 1, 'one note left on the lock screen');
    assert.ok(open[0].title.includes('Rest over'), 'it says Rest over');
    assert.equal(app.api.restDeadline, null, 'rest stopped');
  });

  it('not shown when setting is off or permission denied', async () => {
    const { app, fakeReg } = makeLockApp();
    app.api.state.restAlerts = false; // off

    app.api.startRoutineWorkout('rt1');
    app.api.startRestTimer(90);

    app.document.visibilityState = 'hidden';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(fakeReg.notifications.length, 0, 'no notification when setting is off');

    // Now test permission denied
    const deniedNotif = makeFakeNotification('denied');
    const { app: appDenied, fakeReg: deniedReg } = makeLockApp({ Notification: deniedNotif });
    appDenied.api.state.restAlerts = true; // setting true but permission denied
    appDenied.api.startRoutineWorkout('rt1');
    appDenied.api.startRestTimer(90);

    appDenied.document.visibilityState = 'hidden';
    appDenied.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(deniedReg.notifications.length, 0, 'no notification when permission denied');
  });
});

describe('P4-03 return to visible after deadline and before deadline', () => {
  it('back to visible after the deadline -> bar closed, notification closed, Rest ended shown, no beep', async () => {
    const { app, fakeReg } = makeLockApp();
    await app.api.setRestAlerts(true);

    app.api.startRoutineWorkout('rt1');
    app.api.startRestTimer(90);

    // Page hides -> running notification shown
    app.document.visibilityState = 'hidden';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(fakeReg.notifications.filter((n) => !n.closed).length, 1);

    // Time passes: rest expired 72 seconds ago (1:12 ago)
    app.api.restDeadline = Date.now() - 72000;

    // Page becomes visible
    app.document.visibilityState = 'visible';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));

    // Bar closed
    assert.equal(
      app.el('restTimerBar').classList.contains('active'),
      false,
      'restTimerBar closed'
    );
    assert.equal(app.api.restDeadline, null, 'restDeadline cleared');
    assert.equal(app.api.restRemaining, 0, 'restRemaining is 0');

    // Notification closed
    assert.equal(
      fakeReg.notifications.filter((n) => !n.closed).length,
      0,
      'notification closed'
    );

    // Toast shown with "Rest ended 1:12 ago"
    const toast = app.el('restToast');
    assert.ok(toast, 'restToast element exists');
    assert.equal(toast.style.display, 'block', 'toast is visible');
    assert.ok(
      toast.textContent.includes('Rest ended 1:12 ago'),
      'toast shows "Rest ended 1:12 ago", got: ' + toast.textContent
    );
  });

  it('back to visible before the deadline -> bar shows the right remaining seconds', async () => {
    const { app, fakeReg } = makeLockApp();
    await app.api.setRestAlerts(true);

    app.api.startRoutineWorkout('rt1');
    app.api.startRestTimer(90);

    // Page hides
    app.document.visibilityState = 'hidden';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));

    // 45 seconds still remaining
    app.api.restDeadline = Date.now() + 45000;

    // Page becomes visible
    app.document.visibilityState = 'visible';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));

    // Bar remains open
    assert.equal(
      app.el('restTimerBar').classList.contains('active'),
      true,
      'restTimerBar remains active'
    );
    assert.equal(app.api.restRemaining, 45, 'restRemaining shows 45');
    assert.equal(
      app.el('restCountdown').textContent,
      '00:45',
      'countdown shows 00:45'
    );

    // Notification closed upon return to foreground
    assert.equal(
      fakeReg.notifications.filter((n) => !n.closed).length,
      0,
      'notification closed on return'
    );
  });
});

describe('P4-03 stopRestTimer & workout cleanup', () => {
  it('stopRestTimer closes the notification', async () => {
    const { app, fakeReg } = makeLockApp();
    await app.api.setRestAlerts(true);

    app.api.startRoutineWorkout('rt1');
    app.api.startRestTimer(90);

    app.document.visibilityState = 'hidden';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(fakeReg.notifications.filter((n) => !n.closed).length, 1);

    // User skips / stops rest
    app.api.stopRestTimer();
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(
      fakeReg.notifications.filter((n) => !n.closed).length,
      0,
      'notification closed after stopRestTimer'
    );
    assert.equal(app.api.restAlertTimer, null, 'background timer cleared');
  });

  it('discarding workout closes the notification', async () => {
    const { app, fakeReg } = makeLockApp();
    await app.api.setRestAlerts(true);

    app.api.startRoutineWorkout('rt1');
    app.api.startRestTimer(90);

    app.document.visibilityState = 'hidden';
    app.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(fakeReg.notifications.filter((n) => !n.closed).length, 1);

    // Discard
    app.setConfirmResult(true);
    app.api.discardWorkout();
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(
      fakeReg.notifications.filter((n) => !n.closed).length,
      0,
      'notification closed after discardWorkout'
    );
  });
});

describe('P4-03 logging a set works with permission denied', () => {
  it('logging a set works with permission denied', () => {
    const deniedNotif = makeFakeNotification('denied');
    const { app } = makeLockApp({ Notification: deniedNotif });

    app.api.startRoutineWorkout('rt1');
    assert.ok(app.api.activeWorkout, 'workout started');

    app.api.updateSetVal(0, 0, 'weight', '100');
    app.api.updateSetVal(0, 0, 'reps', '5');
    const ticked = app.api.toggleSetDone(0, 0);
    assert.equal(ticked, true, 'set successfully toggled done');
    const setObj = app.api.activeWorkout.exercises[0].sets[0];
    assert.equal(setObj.done, true, 'set is marked done');
    assert.equal(
      app.el('restTimerBar').classList.contains('active'),
      true,
      'foreground rest timer starts normally'
    );
  });
});

describe('P4-03 service worker notificationclick handler', () => {
  it('sw.js notificationclick focuses open app window or opens ./', async () => {
    const swSource = readFileSync(SW_PATH, 'utf8');
    const listeners = {};
    let focused = false;
    let openedUrl = null;

    const mockClients = {
      matchAll: async () => [
        {
          url: 'https://app.test/',
          focus: async () => { focused = true; },
        },
      ],
      openWindow: async (url) => { openedUrl = url; },
    };

    const sandbox = {
      self: {
        addEventListener: (event, fn) => { listeners[event] = fn; },
        clients: mockClients,
        skipWaiting: () => {},
      },
      caches: { open: async () => ({ put: async () => {}, addAll: async () => {} }), match: async () => null, keys: async () => [], delete: async () => true },
      URL,
      Promise,
      setTimeout,
      clearTimeout,
      fetch: async () => ({ ok: true, status: 200, clone: () => ({ ok: true }) }),
    };

    vm.createContext(sandbox);
    vm.runInContext(swSource, sandbox, { filename: 'sw.js' });

    assert.equal(typeof listeners.notificationclick, 'function', 'notificationclick listener registered');

    let closed = false;
    let waitPromise = null;
    const fakeEvent = {
      notification: { close: () => { closed = true; } },
      waitUntil: (p) => { waitPromise = p; },
    };

    listeners.notificationclick(fakeEvent);
    assert.equal(closed, true, 'notification is closed on click');
    await waitPromise;
    assert.equal(focused, true, 'open window was focused');

    // Now test fallback to openWindow when no clients match
    mockClients.matchAll = async () => [];
    waitPromise = null;
    listeners.notificationclick(fakeEvent);
    await waitPromise;
    assert.equal(openedUrl, './', 'opened ./ when no existing window');
  });
});

describe('P4-03 markup and layout contract', () => {
  it('handlers-compile', () => {
    const html = loadIndexHtml();
    assert.ok(html.includes('id="restAlertsCheck"'), 'restAlertsCheck in HTML');
    assert.ok(html.includes('id="restAlertsNote"'), 'restAlertsNote in HTML');
    assert.ok(html.includes('id="restToast"'), 'restToast in HTML');
    assert.ok(html.includes('setRestAlerts(this.checked)'), 'setRestAlerts handler bound');
  });

  it('nothing-wider-than-412', () => {
    const html = loadIndexHtml();
    const toastMatch = html.match(/id="restToast"[^>]*style="([^"]*)"/);
    assert.ok(toastMatch, 'restToast style found');
    assert.ok(toastMatch[1].includes('max-width:412px'), 'restToast is capped at 412px');
  });
});
