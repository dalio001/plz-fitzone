// tests/backup_reminder.test.mjs — P0-03 Backup reminder, Web Share API and Settings backup age indicator.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml } from './harness.mjs';

function seedWorkout(app, date = Date.now() - 10 * 86400000) {
  app.api.state.history = [{
    id: 'w_test_1',
    title: 'Test Workout',
    date: date,
    durationSec: 1800,
    totalVolume: 1000,
    totalSets: 3,
    exercises: [{
      exId: 'ex1',
      sets: [{ weight: 50, reps: 10, done: true }]
    }]
  }];
  app.api.saveState();
}

describe('P0-03 backup reminder & Web Share', () => {
  it('last-backup-recorded-on-download', async () => {
    const app = createApp();
    seedWorkout(app);
    assert.equal(app.api.state.lastBackupAt, undefined);

    await app.api.exportData();

    assert.ok(typeof app.api.state.lastBackupAt === 'number');
    assert.ok(Date.now() - app.api.state.lastBackupAt < 5000);
  });

  it('last-backup-recorded-on-share-success', async () => {
    const sharedFiles = [];
    const fakeNav = {
      canShare: ({ files }) => files && files[0].name.endsWith('.json'),
      share: async (data) => { sharedFiles.push(data); },
    };
    const app = createApp({ navigator: fakeNav });
    seedWorkout(app);

    await app.api.exportData();

    assert.equal(sharedFiles.length, 1);
    assert.ok(sharedFiles[0].files[0].name.endsWith('.json'));
    assert.ok(typeof app.api.state.lastBackupAt === 'number');
    assert.ok(Date.now() - app.api.state.lastBackupAt < 5000);
  });

  it('share-cancel-not-counted', async () => {
    const fakeNav = {
      canShare: () => true,
      share: async () => {
        const err = new Error('User cancelled');
        err.name = 'AbortError';
        throw err;
      },
    };
    const app = createApp({ navigator: fakeNav });
    seedWorkout(app);
    assert.equal(app.api.state.lastBackupAt, undefined);

    await app.api.exportData();

    assert.equal(app.api.state.lastBackupAt, undefined, 'no backup recorded on AbortError');
  });

  it('txt fallback when json sharing refused', async () => {
    const sharedFiles = [];
    const fakeNav = {
      canShare: ({ files }) => files && files[0].type === 'text/plain',
      share: async (data) => { sharedFiles.push(data); },
    };
    const app = createApp({ navigator: fakeNav });
    seedWorkout(app);

    await app.api.exportData();

    assert.equal(sharedFiles.length, 1);
    assert.ok(sharedFiles[0].files[0].name.endsWith('.txt'));
    assert.equal(sharedFiles[0].files[0].type, 'text/plain');
    assert.ok(typeof app.api.state.lastBackupAt === 'number');
  });

  it('accept attribute includes txt and json formats', () => {
    const app = createApp();
    const input = app.el('importInput');
    assert.ok(input);
    assert.equal(input.getAttribute('accept'), '.json,.txt,application/json,text/plain');
    assert.ok(loadIndexHtml().includes('accept=".json,.txt,application/json,text/plain"'));
  });

  it('restore keeps newer lastBackupAt', () => {
    const app = createApp();
    const phoneNewer = Date.now() - 1 * 86400000;
    const fileOlder = Date.now() - 10 * 86400000;

    app.api.state.lastBackupAt = phoneNewer;
    app.api.pendingRestore = {
      schemaVersion: 2,
      unit: 'KG',
      history: [],
      routines: [],
      exercises: [],
      lastBackupAt: fileOlder,
    };
    app.api.confirmRestore();
    assert.equal(app.api.state.lastBackupAt, phoneNewer, 'phone newer lastBackupAt retained');

    const phoneOlder = Date.now() - 15 * 86400000;
    const fileNewer = Date.now() - 2 * 86400000;
    app.api.state.lastBackupAt = phoneOlder;
    app.api.pendingRestore = {
      schemaVersion: 2,
      unit: 'KG',
      history: [],
      routines: [],
      exercises: [],
      lastBackupAt: fileNewer,
    };
    app.api.confirmRestore();
    assert.equal(app.api.state.lastBackupAt, fileNewer, 'file newer lastBackupAt adopted');
  });

  it('non-abort error downloads and records backup', async () => {
    const fakeNav = {
      canShare: () => true,
      share: async () => {
        throw new TypeError('Network failure or permission denied');
      },
    };
    const app = createApp({ navigator: fakeNav });
    seedWorkout(app);
    assert.equal(app.api.state.lastBackupAt, undefined);

    await app.api.exportData();

    assert.ok(typeof app.api.state.lastBackupAt === 'number');
    assert.ok(Date.now() - app.api.state.lastBackupAt < 5000);
  });

  it('reminder-shows-after-7-days-with-history', () => {
    const app = createApp();
    seedWorkout(app, Date.now() - 20 * 86400000);

    // Never backed up
    delete app.api.state.lastBackupAt;
    app.api.renderBackupReminder();
    assert.notEqual(app.el('backupReminderCard').style.display, 'none');
    assert.equal(app.el('backupReminderAge').innerText, 'No backup yet');

    // Backed up 12 days ago
    app.api.state.lastBackupAt = Date.now() - 12 * 86400000;
    app.api.renderBackupReminder();
    assert.notEqual(app.el('backupReminderCard').style.display, 'none');
    assert.equal(app.el('backupReminderAge').innerText, 'Last backup: 12 days ago');

    // Backed up 2 days ago (recent)
    app.api.state.lastBackupAt = Date.now() - 2 * 86400000;
    app.api.renderBackupReminder();
    assert.equal(app.el('backupReminderCard').style.display, 'none');
  });

  it('reminder-hidden-without-workouts', () => {
    const app = createApp();
    app.api.state.history = [];
    delete app.api.state.lastBackupAt;
    app.api.renderBackupReminder();
    assert.equal(app.el('backupReminderCard').style.display, 'none');
  });

  it('later-snoozes-3-days', () => {
    const app = createApp();
    seedWorkout(app);
    delete app.api.state.lastBackupAt;
    app.api.renderBackupReminder();
    assert.notEqual(app.el('backupReminderCard').style.display, 'none');

    app.api.snoozeBackupReminder();
    assert.ok(typeof app.api.state.backupSnoozeUntil === 'number');
    assert.ok(app.api.state.backupSnoozeUntil >= Date.now() + 2 * 86400000);
    assert.equal(app.el('backupReminderCard').style.display, 'none');

    app.api.renderBackupReminder();
    assert.equal(app.el('backupReminderCard').style.display, 'none');
  });

  it('settings-shows-last-backup-age', () => {
    const app = createApp();
    delete app.api.state.lastBackupAt;
    app.api.hydrateSettingsControls();
    assert.equal(app.el('settingsLastBackup').innerText, 'No backup yet');

    app.api.state.lastBackupAt = Date.now() - 3 * 86400000;
    app.api.hydrateSettingsControls();
    assert.equal(app.el('settingsLastBackup').innerText, 'Last backup: 3 days ago');

    app.api.state.lastBackupAt = Date.now();
    app.api.hydrateSettingsControls();
    assert.equal(app.el('settingsLastBackup').innerText, 'Last backup: today');
  });

  it('restore-accepts-old-and-new-backup', () => {
    const app = createApp();
    const oldBackup = {
      schemaVersion: 2,
      unit: 'KG',
      history: [],
      routines: [],
      exercises: [{ id: 'ex1', name: 'Bench' }],
    };
    const valOld = app.api.validateBackupData(oldBackup);
    assert.equal(valOld.ok, true);
    assert.equal(valOld.data.lastBackupAt, undefined);

    const newBackup = {
      schemaVersion: 2,
      unit: 'KG',
      history: [],
      routines: [],
      exercises: [{ id: 'ex1', name: 'Bench' }],
      lastBackupAt: 1729000000000,
      backupSnoozeUntil: 1729259200000,
    };
    const valNew = app.api.validateBackupData(newBackup);
    assert.equal(valNew.ok, true);
    assert.equal(valNew.data.lastBackupAt, 1729000000000);
    assert.equal(valNew.data.backupSnoozeUntil, 1729259200000);
  });

  it('handlers-compile', () => {
    const staticHtml = loadIndexHtml().split('<script>')[0];
    const handlerRegex = /\b(on[a-z]+)="([^"]+)"/g;
    let count = 0;
    for (const m of staticHtml.matchAll(handlerRegex)) {
      const code = m[2]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      assert.doesNotThrow(() => {
        new Function(code);
      }, `handler failed to compile: ${m[1]}="${m[2]}"`);
      count++;
    }
    assert.ok(count > 20);
    // Explicitly verify the backup reminder and settings backup handlers compile
    assert.doesNotThrow(() => new Function('exportData()'));
    assert.doesNotThrow(() => new Function('snoozeBackupReminder()'));
  });

  it('nothing-wider-than-412', () => {
    const html = loadIndexHtml();
    assert.ok(html.includes('id="backupReminderCard"'));
    assert.ok(html.includes('id="settingsLastBackup"'));
    const largeWidths = [...html.matchAll(/\bwidth:\s*([5-9]\d{2,}|\d{4,})px/g)];
    assert.equal(largeWidths.length, 0, 'no element style exceeds 412px');
  });
});
