// tests/p2_history_ops.test.mjs — P2-08 on the REAL app code.
// History detail, edit (P2-02 validation, no rebuild while typing),
// app-modal delete + 10s undo, repeat, save-as-routine (set types kept),
// month groups, id backfill, restore compatibility.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, DRAFT_KEY, finishWithDrop } from './harness.mjs';
import { loadIndexHtml } from './harness.mjs';

// One finished workout: single exercise, given [type, weight, reps] rows.
function finishWorkoutWith(app, opts) {
  const o = opts || {};
  const title = o.title || 'Workout';
  const note = o.note || '';
  const exId = o.exId || 'ex1';
  const rows = o.rows || [['N', 80, 8]];
  app.api.startEmptyWorkout();
  app.api.addExerciseToWorkout(exId);
  for (let i = 1; i < rows.length; i++) app.api.addSetToActive(0);
  const order = ['N', 'W', 'D', 'F'];
  rows.forEach(([type, w, r], i) => {
    for (let k = 0; k < order.indexOf(type); k++) app.api.cycleSetType(0, i);
    app.api.updateSetVal(0, i, 'weight', String(w));
    app.api.updateSetVal(0, i, 'reps', String(r));
    assert.equal(app.api.toggleSetDone(0, i), true, 'set ticked');
  });
  app.el('activeWorkoutTitle').value = title;
  if (note) app.api.updateActiveNote(0, note);
  finishWithDrop(app);
  return app.api.state.history[0];
}

function histJson(app) {
  return JSON.stringify(app.api.state.history);
}

describe('P2-08 history detail', () => {
  it('detail-renders-all-sets-in-current-unit', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { title: 'Leg day', rows: [['W', 40, 10], ['N', 80, 8]] });
    assert.equal(app.api.openHistDetail(w.id), true, 'detail opens');
    assert.ok(app.el('histDetailModal').classList.contains('open'), 'detail modal open');
    const html = app.el('histDetailBody').innerHTML;
    assert.ok(html.includes('Leg day'), 'title shown');
    assert.ok(html.includes('40') && html.includes('80'), 'every set weight shown');
    assert.ok(html.includes('10') && html.includes('8'), 'every set reps shown');
    assert.ok(html.includes('W') && html.includes('N'), 'set types shown');
    app.api.toggleUnit();
    app.api.renderHistDetail();
    const lbs = app.el('histDetailBody').innerHTML;
    assert.ok(lbs.includes('LBS'), 'detail follows the display unit');
    assert.equal(app.api.openHistDetail('no-such-id'), false, 'unknown id refuses');
    app.api.closeHistDetail();
    assert.ok(!app.el('histDetailModal').classList.contains('open'), 'detail closes');
  });
});

describe('P2-08 history edit', () => {
  it('edit-set-recomputes-volume-and-profile', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { rows: [['N', 80, 8], ['N', 80, 8]] });
    assert.equal(w.totalVolume, 1280, 'starts at 80x8 + 80x8');
    assert.equal(app.api.openHistEdit(w.id), true, 'edit opens');
    assert.equal(app.api.updateHistSetVal(0, 0, 'weight', '100'), true, 'valid edit accepted');
    assert.equal(app.api.saveHistEdit(), true, 'save works');
    const after = app.api.state.history[0];
    assert.equal(after.totalVolume, 1440, 'volume recomputed: 100x8 + 80x8');
    assert.equal(after.totalSets, 2, 'set count kept');
    assert.equal(app.el('statSets').innerText, 2, 'profile sets follow');
    assert.equal(app.el('statWorkouts').innerText, 1, 'profile workouts follow');
  });

  it('edit-invalid-set-blocked-p202', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { rows: [['N', 80, 8]] });
    const before = histJson(app);
    app.api.openHistEdit(w.id);
    assert.equal(app.api.updateHistSetVal(0, 0, 'weight', '5000'), false, 'over-max weight rejected');
    assert.equal(app.api.editingHistDraft.exercises[0].sets[0].weight, 80, 'invalid never reaches the model');
    assert.equal(app.api.updateHistSetVal(0, 0, 'reps', '2.5'), false, 'fractional reps rejected');
    assert.equal(app.api.updateHistSetVal(0, 0, 'weight', ''), true, 'clearing allowed');
    assert.equal(app.api.saveHistEdit(), false, 'save blocked while a set is empty');
    assert.equal(histJson(app), before, 'history byte-identical after blocked save');
    assert.equal(app.api.updateHistSetVal(0, 0, 'weight', '80'), true, 'valid weight accepted');
    assert.equal(app.api.updateHistSetVal(0, 0, 'reps', '8'), true, 'valid reps accepted');
    assert.equal(app.api.saveHistEdit(), true, 'save works once fixed');
  });

  it('edit-previous-and-records-follow', () => {
    const app = createApp();
    finishWorkoutWith(app, { title: 'first', rows: [['N', 100, 5]] });
    const w2 = finishWorkoutWith(app, { title: 'second', rows: [['N', 90, 5]] });
    const prev = app.api.getPreviousSet('ex1', 0, 'N', 0, null);
    assert.equal(prev.weight, 90, 'previous reads the latest entry');
    assert.ok(Math.abs(app.api.getBest1RM('ex1') - 100 * (1 + 5 / 30)) < 1e-9, 'best from first');
    app.api.openHistEdit(w2.id);
    app.api.updateHistSetVal(0, 0, 'weight', '120');
    assert.equal(app.api.saveHistEdit(), true);
    assert.ok(Math.abs(app.api.getBest1RM('ex1') - 140) < 1e-9, 'est 1RM follows the edit');
    const prev2 = app.api.getPreviousSet('ex1', 0, 'N', 0, null);
    assert.equal(prev2.weight, 120, 'previous follows the edit');
    app.api.askDeleteHist(w2.id);
    app.api.confirmDeleteHist();
    assert.ok(Math.abs(app.api.getBest1RM('ex1') - 100 * (1 + 5 / 30)) < 1e-9, 'best falls back after delete');
    const prev3 = app.api.getPreviousSet('ex1', 0, 'N', 0, null);
    assert.equal(prev3.weight, 100, 'previous falls back after delete');
  });

  it('edit-typing-never-rebuilds', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { rows: [['N', 80, 8], ['N', 80, 8]] });
    app.api.openHistEdit(w.id);
    const before = app.el('histEditBody').innerHTML;
    // One digit at a time, then blur: the list must survive every keystroke.
    app.api.updateHistSetVal(0, 0, 'weight', '1');
    app.api.updateHistSetVal(0, 0, 'weight', '10');
    app.api.histSetFieldChange(0, 0);
    app.api.updateHistSetVal(0, 1, 'reps', '1');
    app.api.updateHistSetVal(0, 1, 'reps', '12');
    app.api.histSetFieldChange(0, 1);
    app.api.updateHistTitle('Evening lift');
    app.api.updateHistNote(0, 'felt good');
    app.api.updateHistDuration('45');
    assert.equal(app.el('histEditBody').innerHTML, before, 'no rebuild on input or blur');
    const d = app.api.editingHistDraft;
    assert.equal(d.exercises[0].sets[0].weight, 10, 'model updated while typing');
    assert.equal(d.exercises[0].sets[1].reps, 12, 'reps model updated');
    assert.equal(d.title, 'Evening lift', 'title model updated');
    assert.equal(d.exercises[0].note, 'felt good', 'note model updated');
    assert.equal(d.durationSec, 2700, 'duration model updated');
    assert.equal(app.api.saveHistEdit(), true, 'typed values save');
    assert.equal(app.api.state.history[0].totalVolume, 10 * 8 + 80 * 12, 'saved from typed model');
  });

  it('edit-while-live-keeps-draft', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { title: 'Done one', rows: [['N', 80, 8]] });
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex2');
    app.api.updateSetVal(0, 0, 'weight', '50');
    app.api.updateSetVal(0, 0, 'reps', '5');
    app.api.toggleSetDone(0, 0);
    const draftBefore = app.store.get(DRAFT_KEY);
    assert.ok(draftBefore, 'live draft stored');
    const liveBefore = JSON.stringify(app.api.activeWorkout.exercises);
    app.api.openHistEdit(w.id);
    app.api.updateHistSetVal(0, 0, 'weight', '90');
    app.api.updateHistTitle('Renamed');
    assert.equal(app.api.saveHistEdit(), true, 'edit saves while live');
    assert.equal(app.store.get(DRAFT_KEY), draftBefore, 'live draft key untouched');
    assert.equal(JSON.stringify(app.api.activeWorkout.exercises), liveBefore, 'live sets untouched');
    assert.equal(app.api.state.history[0].title, 'Renamed', 'history edit applied');
  });
});

describe('P2-08 history delete', () => {
  it('delete-confirm-undo-10s', () => {
    const app = createApp();
    const a = finishWorkoutWith(app, { title: 'A', rows: [['N', 80, 8]] });
    finishWorkoutWith(app, { title: 'B', rows: [['N', 60, 10]] });
    assert.equal(app.api.state.history.length, 2);
    assert.equal(app.api.askDeleteHist(a.id), true, 'app-modal confirm opens');
    assert.equal(app.api.pendingDeleteHistId, a.id, 'pending target set');
    assert.ok(app.el('deleteHistModal').classList.contains('open'), 'delete modal open');
    assert.equal(app.api.confirmDeleteHist(), true, 'confirmed');
    assert.equal(app.api.state.history.length, 1, 'one entry removed');
    assert.equal(app.api.state.history[0].title, 'B', 'the other entry kept');
    assert.ok(app.el('historyList').innerHTML.includes('Undo'), 'undo banner shown');
    assert.equal(app.api.undoDeleteHist(), true, 'undo restores');
    assert.equal(app.api.state.history.length, 2, 'both entries back');
    assert.equal(app.api.state.history[0].title, 'B', 'undo keeps newest-first order');
    assert.equal(app.api.state.history[1].title, 'A', 'removed entry back at its index');
    // Cancel path leaves everything alone.
    const snap = histJson(app);
    app.api.askDeleteHist(app.api.state.history[0].id);
    assert.equal(app.api.cancelDeleteHist(), false, 'cancel returns false');
    assert.equal(histJson(app), snap, 'cancel changes nothing');
    assert.ok(!app.el('deleteHistModal').classList.contains('open'), 'delete modal closed');
  });

  it('delete-expiry-keeps-deletion', () => {
    const app = createApp();
    const a = finishWorkoutWith(app, { title: 'A', rows: [['N', 80, 8]] });
    app.api.askDeleteHist(a.id);
    app.api.confirmDeleteHist();
    assert.equal(app.api.expireDeletedHist(Date.now() + 5000), false, 'not yet expired');
    assert.ok(app.api.deletedHistBackup, 'backup still held');
    assert.equal(app.api.expireDeletedHist(Date.now() + 11000), true, 'expired after 10s');
    assert.equal(app.api.deletedHistBackup, null, 'backup purged');
    assert.equal(app.api.state.history.length, 0, 'deletion stands');
    assert.equal(app.api.undoDeleteHist(), false, 'no undo after expiry');
    assert.equal(app.api.expireDeletedHist(), false, 'expiry without backup is a no-op');
  });
});

describe('P2-08 repeat and save-as-routine', () => {
  it('repeat-prefills-like-routine-start', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { title: 'Push', note: 'tough', rows: [['W', 40, 10], ['N', 80, 8]] });
    assert.equal(app.api.startHistWorkout(w.id), true, 'repeat starts');
    const live = app.api.activeWorkout;
    assert.equal(live.title, 'Push', 'title carried');
    assert.equal(live.routineId, null, 'no routine link');
    assert.equal(live.exercises.length, 1, 'same exercises');
    assert.equal(live.exercises[0].sets.length, 2, 'same set count');
    assert.equal(live.exercises[0].sets.every((s) => s.done === false), true, 'nothing ticked');
    assert.equal(live.exercises[0].note, 'tough', 'note carried');
  });

  it('repeat-blocked-by-active-draft-p002', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { title: 'Old', rows: [['N', 80, 8]] });
    app.api.startEmptyWorkout();
    assert.equal(app.api.startHistWorkout(w.id), 'confirm', 'blocked while live');
    assert.equal(app.api.activeWorkout.title, 'Workout', 'live workout untouched');
    assert.equal(app.api.activeWorkout.exercises.length, 0, 'no repeat sets leaked in');
  });

  it('save-as-routine-default-name', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { title: 'Pull day', rows: [['N', 80, 8], ['N', 80, 8]] });
    assert.equal(app.api.saveHistAsRoutine(w.id), true, 'saved as routine');
    const rt = app.api.state.routines[0];
    assert.equal(rt.name, 'Pull day (from history)', 'name defaults to title + suffix');
    assert.equal(rt.exercises.length, 1, 'same exercises');
    assert.equal(rt.exercises[0].sets, 2, 'same set count');
    assert.equal(app.api.saveHistAsRoutine('no-such-id'), false, 'unknown id refuses');
  });

  it('save-as-routine-leaves-history-untouched', () => {
    const app = createApp();
    finishWorkoutWith(app, { title: 'Pull day', rows: [['N', 80, 8]] });
    const before = histJson(app);
    app.api.saveHistAsRoutine(app.api.state.history[0].id);
    assert.equal(histJson(app), before, 'history byte-identical');
  });

  it('set-types-kept-on-repeat-and-save-as-routine', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, {
      title: 'Mixed', rows: [['W', 40, 10], ['N', 80, 8], ['D', 70, 9], ['F', 60, 12]],
    });
    assert.equal(app.api.saveHistAsRoutine(w.id), true);
    const rt = app.api.state.routines[0];
    assert.equal(JSON.stringify(rt.exercises[0].setTypes), JSON.stringify(['W', 'N', 'D', 'F']), 'routine keeps set types');
    app.api.startRoutineWorkout(rt.id);
    assert.equal(JSON.stringify(app.api.activeWorkout.exercises[0].sets.map((s) => s.type)), JSON.stringify(['W', 'N', 'D', 'F']), 'routine start keeps types');
    assert.equal(JSON.stringify(app.api.activeWorkout.exercises[0].sets.map((s) => s.weight)), JSON.stringify([40, 80, 70, 60]), 'routine start prefills lanes');
    app.api.discardWorkout();
    assert.equal(app.api.startHistWorkout(w.id), true);
    assert.equal(JSON.stringify(app.api.activeWorkout.exercises[0].sets.map((s) => s.type)), JSON.stringify(['W', 'N', 'D', 'F']), 'repeat keeps set types');
    assert.equal(JSON.stringify(app.api.activeWorkout.exercises[0].sets.map((s) => s.weight)), JSON.stringify([40, 80, 70, 60]), 'repeat prefills values');
  });
});

describe('P2-08 history list and ids', () => {
  it('list-newest-first-month-groups', () => {
    const app = createApp();
    finishWorkoutWith(app, { title: 'Jan one', rows: [['N', 80, 8]] });
    finishWorkoutWith(app, { title: 'Feb one', rows: [['N', 80, 8]] });
    finishWorkoutWith(app, { title: 'Feb two', rows: [['N', 80, 8]] });
    const h = app.api.state.history;
    h[0].date = new Date(2026, 1, 20, 18, 0).getTime();
    h[1].date = new Date(2026, 1, 10, 18, 0).getTime();
    h[2].date = new Date(2026, 0, 15, 18, 0).getTime();
    app.api.renderHistory();
    const html = app.el('historyList').innerHTML;
    // Locale-independent: build the expected labels the same way the app does.
    const feb = new Date(2026, 1, 20, 18, 0).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const jan = new Date(2026, 0, 15, 18, 0).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    assert.ok(html.includes(feb + ' (2 workouts)'), 'month header with count, got: ' + feb);
    assert.ok(html.includes(jan + ' (1 workout)'), 'singular count');
    assert.ok(html.indexOf('Feb two') < html.indexOf('Feb one'), 'newest first within month');
    assert.ok(html.indexOf('Feb one') < html.indexOf('Jan one'), 'newer month first');
  });

  it('ids-backfilled-idempotently', () => {
    const app = createApp();
    const w = finishWorkoutWith(app, { rows: [['N', 80, 8]] });
    app.api.state.history.push({
      title: 'Legacy, no id', date: 1700000000000, durationSec: 60, totalVolume: 640, totalSets: 1, prCount: 0,
      exercises: [{ exId: 'ex1', note: '', sets: [{ type: 'N', weight: 80, reps: 8, done: true }] }],
    });
    app.api.state.history.push({
      id: w.id, title: 'Clash', date: 1700000001000, durationSec: 60, totalVolume: 640, totalSets: 1, prCount: 0,
      exercises: [{ exId: 'ex1', note: '', sets: [{ type: 'N', weight: 80, reps: 8, done: true }] }],
    });
    assert.equal(app.api.ensureHistoryIds(app.api.state.history), true, 'backfill changed something');
    const ids = app.api.state.history.map((x) => String(x.id));
    assert.equal(new Set(ids).size, ids.length, 'all ids unique');
    assert.ok(ids.every((id) => id !== ''), 'no blank ids');
    const snap = histJson(app);
    assert.equal(app.api.ensureHistoryIds(app.api.state.history), false, 'second run is a no-op');
    assert.equal(histJson(app), snap, 'stable after backfill');
  });

  it('restore-backfills-missing-ids', () => {
    const app = createApp();
    const r = app.api.validateBackupData({
      schemaVersion: 2, unit: 'KG', defaultRest: 90,
      exercises: [{ id: 'ex1', name: 'Bench Press (Barbell)', muscle: 'Chest' }],
      routines: [],
      history: [{
        title: 'Legacy, no id', date: 1700000000000, durationSec: 600,
        exercises: [{ exId: 'ex1', note: '', sets: [{ weight: 80, reps: 8 }] }],
      }],
    });
    assert.equal(r.ok, true, 'id-less backup accepted');
    assert.ok(typeof r.data.history[0].id === 'string' && r.data.history[0].id !== '', 'id backfilled on the copy');
  });
});

describe('P2-08 generated markup safety', () => {
  it('history-handlers-compile-with-hostile-text', () => {
    const app = createApp();
    const title = 'Bob\'s "heavy" <b>day</b>';
    const note = 'say "hi" <b>loud</b>';
    const w = finishWorkoutWith(app, { title, note, rows: [['W', 40, 10], ['N', 80, 8]] });
    app.api.openHistDetail(w.id);
    const detailHtml = app.el('histDetailBody').innerHTML;
    app.api.openHistEdit(w.id);
    const html = [app.el('historyList'), app.el('histDetailBody'), app.el('histEditBody')]
      .map((el) => el.innerHTML).join('')
      // Static P2-08 modal shells (detail footer, edit footer, delete confirm).
      + ['histDetailModal', 'histEditModal', 'deleteHistModal'].map((id) => {
        const full = loadIndexHtml();
        const i = full.indexOf('id="' + id + '"');
        return i < 0 ? '' : full.slice(i, i + 4000);
      }).join('');
    assert.ok(!html.includes('<b>day</b>') && !html.includes('<b>loud</b>'), 'no raw markup leaks');
    assert.ok(html.includes('&lt;b&gt;'), 'markup escaped');
    const attrs = [...html.matchAll(/on(?:click|change|input)="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(attrs.length > 5, 'generated handlers exist to check, found ' + attrs.length);
    attrs.forEach((a) => { new Function(a); }); // throws on any syntax error
    assert.ok(attrs.some((a) => a.indexOf('openHistDetail') === 0), 'card opens detail');
    assert.ok(attrs.includes('saveHistEdit()'), 'edit saves');
    assert.ok(attrs.some((a) => a.indexOf('updateHistSetVal') === 0), 'set typing wired');
    assert.ok(detailHtml.includes('40') && detailHtml.includes('80'), 'detail shows both sets');
  });

  it('edit-footer-save-cancel-always-visible', () => {
    // Static structure: the footer is a flex sibling AFTER the scrolling
    // body (same pattern as the picker footer), so Save/Cancel never scroll
    // away under a long set list.
    const html = loadIndexHtml();
    const bodyIdx = html.indexOf('id="histEditBody"');
    const footIdx = html.indexOf('id="histEditFooter"');
    assert.ok(bodyIdx > 0 && footIdx > bodyIdx, 'footer follows the scrolling body');
    const foot = html.slice(footIdx, footIdx + 600);
    assert.ok(foot.includes('onclick="cancelHistEdit()"'), 'Cancel pinned in footer');
    assert.ok(foot.includes('onclick="saveHistEdit()"'), 'Save pinned in footer');
    assert.ok(!html.slice(bodyIdx, footIdx).includes('histEditFooter'), 'footer is not nested in the body');
  });
});
