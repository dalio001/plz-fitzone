// tests/p4_keepawake.test.mjs — P4-10 optional keep-screen-awake during a
// workout, on the REAL app code. A local fake navigator.wakeLock stands in for
// the platform: request log, sentinels with release(), dropAll() (the browser
// dropping the lock when the page hides) and a reject mode.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml, STATE_KEY } from './harness.mjs';

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// Minimal Screen Wake Lock stand-in.
function makeFakeWakeLock() {
  const fake = {
    log: [],
    sentinels: [],
    reject: false,
    request(kind) {
      fake.log.push(String(kind));
      if (fake.reject) return Promise.reject(new Error('NotAllowedError'));
      const listeners = [];
      const sentinel = {
        type: 'screen',
        released: false,
        addEventListener(type, fn) {
          if (type === 'release' && typeof fn === 'function') listeners.push(fn);
        },
        release() {
          if (sentinel.released) return Promise.resolve();
          sentinel.released = true;
          listeners.forEach((fn) => fn({ type: 'release', target: sentinel }));
          return Promise.resolve();
        },
      };
      fake.sentinels.push(sentinel);
      return Promise.resolve(sentinel);
    },
    // Simulates the platform dropping every lock it handed out.
    dropAll() {
      fake.sentinels.slice().forEach((s) => s.release());
    },
    held() {
      return fake.sentinels.filter((s) => !s.released);
    },
  };
  return fake;
}

function wakeApp(extra = {}) {
  const fake = makeFakeWakeLock();
  const app = createApp(Object.assign({ navigator: { wakeLock: fake } }, extra));
  return { app, fake };
}

function tickAndFinish(app) {
  app.api.updateSetVal(0, 0, 'weight', '100');
  app.api.updateSetVal(0, 0, 'reps', '5');
  app.api.toggleSetDone(0, 0);
  app.api.finishWorkout();
  if (app.api.finishReviewPending) app.api.finishReviewDrop();
}

describe('P4-10 keep awake: preference', () => {
  it('keep-awake-default-off', () => {
    const { app } = wakeApp();
    assert.equal(app.api.state.keepAwake, false, 'default is off (explicit opt-in)');
    assert.equal(app.api.keepAwakeEnabled(), false);
    assert.equal(app.el('keepAwakeCheck').checked, false);
    assert.equal(app.el('keepAwakePill').style.display, 'none', 'no indicator without a lock');
  });

  it('toggle-saved-and-restored', async () => {
    const store = new Map();
    const fake = makeFakeWakeLock();
    const app = createApp({ store, navigator: { wakeLock: fake } });
    await app.api.setKeepAwake(true);
    assert.equal(app.api.state.keepAwake, true);
    assert.equal(JSON.parse(store.get(STATE_KEY)).keepAwake, true, 'preference persisted');

    const app2 = createApp({ store, navigator: { wakeLock: fake } });
    assert.equal(app2.api.keepAwakeEnabled(), true, 'preference survives reload');
    assert.equal(app2.el('keepAwakeCheck').checked, true, 'checkbox reflects it');

    // Old backups/saves without the key land on false; a true stays true.
    const old = app.api.validateBackupData({ schemaVersion: 2, unit: 'KG', exercises: [], routines: [], history: [] });
    assert.equal(old.ok, true);
    assert.equal(old.data.keepAwake, false, 'backup without the key restores false');
    const kept = app.api.validateBackupData({ schemaVersion: 2, unit: 'KG', exercises: [], routines: [], history: [], keepAwake: true });
    assert.equal(kept.data.keepAwake, true, 'backup with true keeps true');
    const junk = app.api.validateBackupData({ history: [], keepAwake: 'yes' });
    assert.equal(junk.data.keepAwake, false, 'non-boolean is normalised, never trusted');

    // Restore normalises the incoming state; undo brings the snapshot back.
    app.api.pendingRestore = { history: [], routines: [], exercises: [], keepAwake: 'yes' };
    app.api.confirmRestore();
    assert.equal(app.api.state.keepAwake, false, 'confirmRestore normalises to false');
    app.api.undoLastRestore();
    assert.equal(app.api.state.keepAwake, true, 'undo restores the previous preference');
  });

  it('lock-requested-only-when-workout-active-and-on', async () => {
    const { app, fake } = wakeApp();
    await app.api.setKeepAwake(true);
    assert.equal(fake.log.length, 0, 'preference alone never takes a lock');

    app.api.startEmptyWorkout();
    await app.api.wakeLockOp;
    assert.equal(fake.log.length, 1, 'starting a workout with the preference on requests a lock');
    assert.equal(fake.log[0], 'screen', 'asks for the screen lock');
    assert.equal(fake.held().length, 1);
    assert.equal(app.api.wakeLockSentinel !== null, true);

    await app.api.syncWakeLock();
    assert.equal(fake.log.length, 1, 'no duplicate request while the lock is held');
  });

  it('released-on-finish-discard-and-toggle-off', async () => {
    const { app, fake } = wakeApp();
    app.api.startRoutineWorkout('rt1');
    await app.api.setKeepAwake(true);
    assert.equal(fake.held().length, 1, 'lock held during the workout');

    tickAndFinish(app);
    assert.equal(app.api.activeWorkout, null, 'workout saved');
    assert.equal(fake.held().length, 0, 'finishing releases the lock');
    assert.equal(app.el('keepAwakePill').style.display, 'none', 'indicator gone');
    assert.equal(app.api.state.keepAwake, true, 'the preference stays on for next time');

    // Next workout arms it again; discarding releases it.
    app.api.startEmptyWorkout();
    await app.api.wakeLockOp;
    assert.equal(fake.held().length, 1, 're-armed on the next workout');
    app.api.discardWorkout(); // confirmResult defaults to true
    assert.equal(fake.held().length, 0, 'discarding releases the lock');

    // Toggle off while a workout is live.
    app.api.startEmptyWorkout();
    await app.api.wakeLockOp;
    assert.equal(fake.held().length, 1);
    await app.api.setKeepAwake(false);
    assert.equal(fake.held().length, 0, 'turning the preference off releases it');
    assert.equal(app.api.wakeLockSentinel, null);
  });
});

describe('P4-10 keep awake: lifecycle', () => {
  it('reacquired-on-visible', async () => {
    const { app, fake } = wakeApp({ listeners: true });
    app.api.startEmptyWorkout();
    await app.api.setKeepAwake(true);
    assert.equal(fake.log.length, 1);

    // The browser drops the lock when the page hides.
    app.document.visibilityState = 'hidden';
    fake.dropAll();
    await app.api.wakeLockOp;
    assert.equal(app.api.wakeLockSentinel, null, 'platform release clears the sentinel');
    assert.equal(app.el('keepAwakePill').style.display, 'none', 'indicator hides with the lock');

    app.document.visibilityState = 'visible';
    app.fire('visibilitychange');
    await app.api.wakeLockOp;
    assert.equal(fake.log.length, 2, 'coming back to the screen re-requests the lock');
    assert.equal(fake.held().length, 1);
    assert.equal(app.el('keepAwakePill').style.display, 'inline-flex');
  });

  it('reacquired-on-resume-after-reload', async () => {
    const store = new Map();
    const fake = makeFakeWakeLock();
    const app = createApp({ store, navigator: { wakeLock: fake } });
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex1');
    await app.api.setKeepAwake(true);
    assert.equal(fake.log.length, 1);

    // Reload: the page dies (the platform drops its lock), a fresh context
    // reads the same storage.
    fake.dropAll();
    const app2 = createApp({ store, navigator: { wakeLock: fake } });
    assert.ok(app2.api.loadActiveSessionDraft(), 'draft survived the reload');
    app2.api.resumeSavedWorkout();
    await app2.api.wakeLockOp;
    assert.ok(app2.api.activeWorkout, 'workout resumed');
    assert.equal(fake.log.length, 2, 'resuming a saved workout re-arms the lock');
    assert.equal(fake.held().length, 1);
    assert.equal(app2.el('keepAwakePill').style.display, 'inline-flex');
  });

  it('unsupported-no-crash-shows-note', async () => {
    const app = createApp(); // navigator without wakeLock
    assert.equal(app.api.wakeLockSupported(), false);
    assert.equal(app.el('keepAwakeNote').style.display, 'block', 'unsupported note shown');
    assert.equal(app.el('keepAwakePill').style.display, 'none');

    app.api.startEmptyWorkout();
    await app.api.setKeepAwake(true);
    assert.equal(app.api.state.keepAwake, true, 'the preference still saves');
    assert.equal(app.api.wakeLockSentinel, null);
    assert.deepEqual(app.alerts, [], 'no alert, ever');
    assert.equal(app.el('keepAwakePill').style.display, 'none', 'never claims to hold a lock');
  });

  it('rejected-request-no-crash', async () => {
    const { app, fake } = wakeApp();
    fake.reject = true;
    app.api.startEmptyWorkout();
    await app.api.setKeepAwake(true);
    assert.equal(fake.log.length, 1, 'the request was attempted');
    assert.equal(app.api.wakeLockSentinel, null, 'nothing held after a refusal');
    assert.equal(app.el('keepAwakePill').style.display, 'none');
    assert.deepEqual(app.alerts, [], 'refusal is silent');
    assert.equal(app.api.state.keepAwake, true, 'preference unaffected by a refusal');
    assert.equal(JSON.parse(app.store.get(STATE_KEY)).keepAwake, true);

    // And a later attempt after the refusal is allowed again.
    fake.reject = false;
    await app.api.syncWakeLock();
    assert.equal(fake.held().length, 1, 'recovers when the platform says yes');
  });

  it('indicator-only-while-held', async () => {
    const { app, fake } = wakeApp();
    assert.equal(app.el('keepAwakePill').style.display, 'none', 'hidden with no workout');

    await app.api.setKeepAwake(true);
    assert.equal(app.el('keepAwakePill').style.display, 'none', 'on but no workout = hidden');

    app.api.startEmptyWorkout();
    await app.api.wakeLockOp;
    assert.equal(app.el('keepAwakePill').style.display, 'inline-flex', 'shown while held');

    fake.dropAll();
    assert.equal(app.el('keepAwakePill').style.display, 'none', 'hidden the moment it drops');

    // Markup contract: a passive status span, never a button.
    const html = loadIndexHtml();
    const pillTag = html.slice(html.indexOf('id="keepAwakePill"') - 60, html.indexOf('id="keepAwakePill"') + 120);
    assert.ok(pillTag.includes('<span'), 'pill is a span');
    assert.ok(pillTag.includes('role="status"'), 'pill announces itself as status');
    assert.ok(!/onclick=/.test(pillTag), 'pill is non-interactive');
  });
});

describe('P4-10 keep awake: markup contract', () => {
  it('settings-row-is-44px-and-handlers-compile', () => {
    const html = loadIndexHtml();
    const idx = html.indexOf('id="keepAwakeCheck"');
    assert.ok(idx > 0, 'keepAwakeCheck exists');
    const rowStart = html.lastIndexOf('<div style="display:flex; align-items:center;', idx);
    const row = html.slice(rowStart, idx + 80);
    assert.ok(row.includes('min-height:44px'), 'toggle row is at least 44 px tall');

    const block = html.slice(idx - 1500, idx + 400);
    let checked = 0;
    for (const m of block.matchAll(/\bon[a-z]+="([^"]+)"/g)) {
      const code = decodeHtmlEntities(m[1]);
      assert.doesNotThrow(() => new Function(code), `handler failed to compile: ${m[1]}="${m[1]}"`);
      checked++;
    }
    assert.ok(checked >= 1, 'at least the onchange handler was checked');
    assert.ok(block.includes('setKeepAwake(this.checked)'), 'checkbox calls setKeepAwake');
    assert.ok(block.includes('Keep screen awake during workouts'), 'plain label');
    assert.ok(block.includes('Uses more battery. Only while a workout is open.'), 'battery help line');
    assert.ok(block.includes('Not supported on this browser'), 'unsupported note text');

    // Exactly once, like every other setting control.
    for (const id of ['keepAwakeCheck', 'keepAwakeHelp', 'keepAwakeNote', 'keepAwakePill']) {
      const n = [...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length;
      assert.equal(n, 1, `${id} must appear exactly once`);
    }
  });

  it('nothing-wider-than-412', () => {
    const html = loadIndexHtml();
    const idx = html.indexOf('id="keepAwakeCheck"');
    const block = html.slice(idx - 1500, idx + 400);
    const widths = [...block.matchAll(/\bwidth:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of widths) assert.ok(w <= 412, `width ${w}px exceeds the 412px phone frame`);
    const pill = html.slice(html.indexOf('.awake-pill'), html.indexOf('.awake-pill') + 400);
    assert.ok(pill.includes('var(--brand-lime)') && pill.includes('var(--radius-8)') && pill.includes('var(--font-12)'), 'pill uses P1 tokens');
    assert.ok(!/\bwidth:\s*\d+px/.test(pill), 'pill has no fixed width');
  });
});
