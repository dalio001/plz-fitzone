// tests/p5_next_target.test.mjs — P5-05 transparent next-session target
// (personal part) on the REAL app code.
//
// One pure rule computed live from the previous-performance lookup: the last
// session's bar plus one house step (2.5 kg / 5 lb / 5 s) only when every
// working set reached it, otherwise "same as last, beat it". Warm-ups and
// drops never count, failures do, a missing or stale (>21 days) source means
// no target. Use fills only untouched N/F rows, ticks nothing, and can be
// undone for 5 s. Nothing is stored except the two preferences.
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

function finishWithDrop(app) {
  app.api.finishWorkout();
  if (app.api.finishReviewPending) app.api.finishReviewDrop();
}

// One session of rt1's first exercise (ex1, weight_reps), rows [type, w, r].
function saveRoutineSession(app, rows) {
  app.api.startRoutineWorkout('rt1');
  const sets = () => app.api.activeWorkout.exercises[0].sets;
  while (sets().length < rows.length) app.api.addSetToActive(0);
  rows.forEach(([type, w, r], i) => {
    app.api.setSetType(0, i, type);
    if (w !== undefined && w !== null) app.api.updateSetVal(0, i, 'weight', String(w));
    app.api.updateSetVal(0, i, 'reps', String(r));
    if (!app.api.isSetTickable(sets()[i], app.api.state.exercises.find((e) => e.id === 'ex1').type)) {
      throw new Error('test row is not tickable: ' + JSON.stringify(rows[i]));
    }
    app.api.toggleSetDone(0, i);
  });
  assert.equal(app.api.countDoneValidSets(), rows.length, 'every test row ticked');
  finishWithDrop(app);
  assert.equal(app.api.activeWorkout, null, 'session saved');
  return app.api.state.history[0];
}

// One session of any exercise in an empty workout (bodyweight / duration).
// rows: { type, weight, reps, durationSec }
function saveEmptySession(app, exId, rows) {
  app.api.startEmptyWorkout();
  app.api.addExerciseToWorkout(exId);
  const sets = () => app.api.activeWorkout.exercises[0].sets;
  while (sets().length < rows.length) app.api.addSetToActive(0);
  rows.forEach((r, i) => {
    app.api.setSetType(0, i, r.type || 'N');
    if (r.weight !== undefined) app.api.updateSetVal(0, i, 'weight', String(r.weight));
    if (r.durationSec !== undefined) app.api.updateSetDuration(0, i, String(r.durationSec));
    else app.api.updateSetVal(0, i, 'reps', String(r.reps));
    app.api.toggleSetDone(0, i);
  });
  finishWithDrop(app);
  assert.equal(app.api.activeWorkout, null, 'session saved');
  return app.api.state.history[0];
}

// A fresh workout with the same exercise, ready for computeNextTarget().
function startRoutineAgain(app) {
  app.api.startRoutineWorkout('rt1');
  assert.ok(app.api.activeWorkout, 'routine workout started');
  return app.api.computeNextTarget(0);
}

function startEmptyAgain(app, exId) {
  app.api.startEmptyWorkout();
  app.api.addExerciseToWorkout(exId);
  assert.ok(app.api.activeWorkout, 'empty workout started');
  return app.api.computeNextTarget(0);
}

function rendered(app) {
  return app.el('activeExercisesContainer').innerHTML;
}

describe('P5-05 target rule', () => {
  it('target-plus-step-when-all-hit-kg', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    const t = startRoutineAgain(app);

    assert.equal(t.kind, 'load', 'a loaded exercise gets a load target');
    assert.equal(t.reps, 8, 'rep bar is the last session max');
    assert.equal(t.weightKg, 62.5, '60 kg + one 2.5 kg step');
    assert.equal(t.allHit, true, 'every working set reached the bar');
    assert.equal(t.reason, 'progress', 'the reason is recorded, not just the number');
    assert.equal(t.ageDays, 0, 'today is 0 days old');
    assert.equal(t.lastSets.length, 3, 'all three working sets cited');
    assert.equal(app.api.nextTargetText(t), 'Target: 62.5 kg × 8 · +2.5 kg — last 60 kg × 8, 8, 8 (all hit)');
  });

  it('target-plus-5-lb', () => {
    const app = createApp();
    app.api.toggleUnit(); // LBS
    assert.equal(app.api.state.unit, 'LBS');
    saveRoutineSession(app, [['N', 137.3, 8], ['N', 137.3, 8], ['N', 137.3, 8]]);

    const stored = app.api.state.history[0].exercises[0].sets[0].weight;
    assert.equal(stored, 62.28, '137.3 lb is stored as 62.28 canonical kg');
    assert.equal(app.api.toDisplayWeight(stored, 'LBS'), 137.3, 'and reads back as 137.3 lb');

    const t = startRoutineAgain(app);
    assert.equal(t.kind, 'load');
    assert.equal(app.api.toDisplayWeight(t.weightKg, 'LBS'), 142.3, 'display step is +5 lb, not +2.5 kg');
    assert.equal(t.weightKg, 64.55, '142.3 lb stored as 64.55 canonical kg');
    assert.ok(app.api.nextTargetText(t).startsWith('Target: 142.3 lbs × 8 · +5 lbs'), app.api.nextTargetText(t));
  });

  it('same-weight-when-missed', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 7]]);
    const t = startRoutineAgain(app);

    assert.equal(t.kind, 'load');
    assert.equal(t.weightKg, 60, 'no step when a set missed the bar');
    assert.equal(t.reps, 8, 'the bar stays the last top');
    assert.equal(t.allHit, false);
    assert.equal(t.reason, 'same');
    assert.equal(app.api.targetMissCount(t), 1, 'one working set below the bar');
    const text = app.api.nextTargetText(t);
    assert.equal(text, 'Target: 60 kg × 8 · same weight, beat last — last 60 kg × 8, 8, 7 (missed 1)');
  });

  it('mixed-weights-heaviest', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 65, 8], ['N', 62.5, 8]]);
    const t = startRoutineAgain(app);

    assert.equal(t.kind, 'load');
    assert.equal(t.weightKg, 67.5, 'the heaviest working set is the base (65 + 2.5)');
    assert.equal(t.allHit, true);
    assert.ok(app.api.nextTargetText(t).includes('last 65 kg × 8, 8, 8'), app.api.nextTargetText(t));
  });

  it('no-target-without-history', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    const t = app.api.computeNextTarget(0);

    assert.equal(t.kind, 'none');
    assert.equal(t.reason, 'first');
    assert.equal(t.weightKg, null);
    assert.equal(t.reps, null);
    assert.equal(app.api.nextTargetText(t), 'First time: pick a comfortable weight');

    // Same-routine scope explains the miss differently.
    app.api.setPrevScope('same');
    assert.equal(app.api.nextTargetText(app.api.computeNextTarget(0)), 'No history for this routine yet: pick a comfortable weight');
    app.api.setPrevScope('any');

    assert.equal(app.api.useNextTarget(0), false, 'nothing to use');
    assert.equal(app.api.nextTargetCanFill(0), false);
    const html = rendered(app);
    assert.ok(html.includes('First time: pick a comfortable weight'), 'reason shown');
    assert.ok(!html.includes('>Use</button>'), 'Use is not offered without a target');
    assert.ok(html.includes('>Hide</button>'), 'Hide is always available');
  });

  it('no-target-if-older-than-21-days', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);

    app.api.state.history[0].date = Date.now() - 22 * 86400000;
    const stale = startRoutineAgain(app);
    assert.equal(stale.kind, 'none');
    assert.equal(stale.reason, 'stale');
    assert.equal(stale.ageDays, 22);
    assert.equal(app.api.nextTargetText(stale), 'No target: last session was 22 days ago');
    assert.equal(app.api.useNextTarget(0), false, 'a stale session never fills a row');

    // 21 days is still fresh enough.
    app.api.state.history[0].date = Date.now() - 21 * 86400000;
    const fresh = startRoutineAgain(app);
    assert.equal(fresh.kind, 'load');
    assert.equal(fresh.ageDays, 21, 'exactly 21 days still targets');
    assert.equal(fresh.weightKg, 62.5);

    // A broken date is stale too, and the text never invents a number.
    app.api.state.history[0].date = 'yesterday';
    const broken = startRoutineAgain(app);
    assert.equal(broken.kind, 'none');
    assert.equal(broken.reason, 'stale');
    assert.equal(app.api.nextTargetText(broken), 'No target: last session date unknown');
  });

  it('warmups-and-drops-ignored', () => {
    const app = createApp();
    saveRoutineSession(app, [['W', 40, 10], ['N', 60, 8], ['D', 50, 8]]);
    const t = startRoutineAgain(app);

    assert.equal(t.kind, 'load');
    assert.equal(t.lastSets.length, 1, 'only the working set counts');
    assert.equal(t.weightKg, 62.5, 'the warm-up 40 and the drop 50 never set the base');
    assert.equal(t.reps, 8);
    assert.ok(!app.api.nextTargetText(t).includes('40 kg'), 'warm-up weight never appears in the rationale');
    assert.ok(!app.api.nextTargetText(t).includes('50 kg'), 'drop weight never appears in the rationale');

    // A failure set DOES count.
    const app2 = createApp();
    saveRoutineSession(app2, [['N', 60, 8], ['F', 60, 8], ['N', 60, 8]]);
    const t2 = startRoutineAgain(app2);
    assert.equal(t2.lastSets.length, 3, 'failure sets count');
    assert.equal(t2.allHit, true);
    assert.equal(t2.weightKg, 62.5);
  });

  it('bodyweight-plus-one-rep', () => {
    const app = createApp();
    saveEmptySession(app, 'ex54', [
      { weight: 0, reps: 8 }, { weight: 0, reps: 8 }, { weight: 0, reps: 8 },
    ]);
    const t = startEmptyAgain(app, 'ex54');

    assert.equal(t.kind, 'reps', 'bodyweight gets reps, never a load');
    assert.equal(t.reps, 9, '8, 8, 8 -> 9');
    assert.equal(t.weightKg, null, 'no weight is suggested');
    assert.equal(app.api.nextTargetText(t), 'Target: 9 reps · +1 rep — last 8, 8, 8 (all hit)');

    // Missing the bar holds the reps instead.
    const app2 = createApp();
    saveEmptySession(app2, 'ex54', [
      { weight: 0, reps: 8 }, { weight: 0, reps: 8 }, { weight: 0, reps: 7 },
    ]);
    const t2 = startEmptyAgain(app2, 'ex54');
    assert.equal(t2.reps, 8);
    assert.equal(app2.api.nextTargetText(t2), 'Target: 8 reps · same reps, beat last — last 8, 8, 7 (missed 1)');

    // Assisted dips never raise the assistance load.
    const app3 = createApp();
    saveEmptySession(app3, 'ex57', [
      { weight: 30, reps: 8 }, { weight: 30, reps: 8 }, { weight: 30, reps: 8 },
    ]);
    const t3 = startEmptyAgain(app3, 'ex57');
    assert.equal(t3.kind, 'reps', 'assisted is a reps target');
    assert.equal(t3.weightKg, null, 'assistance is never increased');
    assert.equal(t3.reps, 9);
  });

  it('duration-plus-5s', () => {
    const app = createApp();
    saveEmptySession(app, 'ex60', [{ durationSec: '1:05' }]);
    const t = startEmptyAgain(app, 'ex60');

    assert.equal(t.kind, 'duration');
    assert.equal(t.durationSec, 70, '1:05 all hit -> 1:10');
    assert.equal(t.reps, null);
    assert.equal(t.weightKg, null, 'a bodyweight plank carries no load');
    assert.equal(app.api.nextTargetText(t), 'Target: 1:10 · +5 s — last 1:05 (all hit)');

    const app2 = createApp();
    saveEmptySession(app2, 'ex60', [{ durationSec: '1:05' }, { durationSec: '1:00' }]);
    const t2 = startEmptyAgain(app2, 'ex60');
    assert.equal(t2.kind, 'duration');
    assert.equal(t2.durationSec, 65, 'a missed hold keeps the same time');
    assert.equal(app2.api.nextTargetText(t2), 'Target: 1:05 · same time, beat last — last 1:05, 1:00 (missed 1)');
  });
});

describe('P5-05 apply, undo and hide', () => {
  it('use-fills-only-empty-sets', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app.api.startRoutineWorkout('rt1');

    // Row 0 is typed by the owner; row 1 is cleared; row 2 keeps the prefill.
    app.api.updateSetVal(0, 0, 'weight', '55');
    app.api.updateSetVal(0, 0, 'reps', '6');
    app.api.updateSetVal(0, 1, 'weight', '');
    app.api.updateSetVal(0, 1, 'reps', '');

    assert.equal(app.api.useNextTarget(0), true, 'there is something to fill');
    const sets = app.api.activeWorkout.exercises[0].sets;
    assert.equal(sets[0].weight, 55, 'typed weight untouched');
    assert.equal(sets[0].reps, 6, 'typed reps untouched');
    assert.equal(sets[1].weight, 62.5, 'empty row filled with the target weight');
    assert.equal(sets[1].reps, 8, 'empty row filled with the target reps');
    assert.equal(sets[2].weight, 62.5, 'untouched prefill row follows the target');
    assert.equal(JSON.stringify(sets.map((s) => !!s.done)), JSON.stringify([false, false, false]), 'nothing ticked');

    // Ticked rows are never rewritten, even when untouched.
    app.api.toggleSetDone(0, 2);
    app.api.updateSetVal(0, 2, 'weight', '60');
    app.api.useNextTarget(0);
    assert.equal(app.api.activeWorkout.exercises[0].sets[2].weight, 60, 'a ticked set is left alone');

    // Warm-up and drop rows never receive a target.
    const app2 = createApp();
    saveRoutineSession(app2, [['W', 40, 10], ['N', 60, 8], ['D', 50, 8]]);
    app2.api.startRoutineWorkout('rt1');
    app2.api.setSetType(0, 0, 'W');
    app2.api.updateSetVal(0, 0, 'weight', '40');
    app2.api.setSetType(0, 2, 'D');
    app2.api.updateSetVal(0, 2, 'weight', '50');
    app2.api.useNextTarget(0);
    const sets2 = app2.api.activeWorkout.exercises[0].sets;
    assert.equal(sets2[0].type, 'W');
    assert.equal(sets2[0].weight, 40, 'warm-up untouched');
    assert.equal(sets2[2].type, 'D');
    assert.equal(sets2[2].weight, 50, 'drop untouched');
    assert.equal(sets2[1].weight, 62.5, 'the working set got the target');
  });

  it('use-has-undo', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app.api.startRoutineWorkout('rt1');

    assert.equal(app.api.useNextTarget(0), true);
    assert.ok(app.api.targetFillBackup, 'a fill backup exists');
    assert.equal(app.api.targetFillBackup.rows.length, 3);
    assert.ok(rendered(app).includes('Targets filled.'), 'undo banner shown');
    assert.ok(rendered(app).includes('↩️ Undo (5s)'));

    // The real undo restores the prefill exactly.
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 62.5);
    assert.equal(app.api.undoTargetFill(), true);
    const sets = app.api.activeWorkout.exercises[0].sets;
    assert.equal(JSON.stringify(sets.map((s) => Number(s.weight))), JSON.stringify([60, 60, 60]), 'weights restored');
    assert.equal(JSON.stringify(sets.map((s) => Number(s.reps))), JSON.stringify([8, 8, 8]), 'reps restored');
    assert.equal(app.api.targetFillBackup, null, 'backup cleared');
    assert.equal(app.api.undoTargetFill(), false, 'nothing left to undo');
    assert.ok(!rendered(app).includes('Targets filled.'), 'banner gone after undo');

    // Expiry: not yet due keeps it, past due drops it.
    assert.equal(app.api.useNextTarget(0), true, 'fillable again after the undo');
    app.api.expireTargetFill(Date.now() + 1000);
    assert.ok(app.api.targetFillBackup, 'still inside the 5 s window');
    app.api.expireTargetFill(Date.now() + 6000);
    assert.equal(app.api.targetFillBackup, null, 'expired after the window');
    assert.ok(!rendered(app).includes('Targets filled.'), 'banner gone after expiry');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 62.5, 'expiry keeps the filled values');

    // Finishing or discarding drops the in-memory fill state, so no stale
    // banner can ever appear in the next workout.
    const app2 = createApp();
    saveRoutineSession(app2, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app2.api.startRoutineWorkout('rt1');
    app2.api.useNextTarget(0);
    assert.ok(app2.api.targetFillBackup);
    app2.api.toggleSetDone(0, 0);
    finishWithDrop(app2);
    assert.equal(app2.api.targetFillBackup, null, 'finishing clears the fill undo');

    const app3 = createApp();
    saveRoutineSession(app3, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app3.api.startRoutineWorkout('rt1');
    app3.api.useNextTarget(0);
    app3.api.discardWorkout(); // confirmResult defaults to true
    assert.equal(app3.api.targetFillBackup, null, 'discarding clears the fill undo');
  });

  it('hide-for-this-workout', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app.api.startRoutineWorkout('rt1');
    assert.ok(rendered(app).includes('target-line-0'), 'target line shown');

    assert.equal(app.api.hideTargetsForWorkout(), true);
    assert.equal(app.api.activeWorkout.targetsHidden, true);
    assert.ok(!rendered(app).includes('target-line-0'), 'lines hidden');
    assert.ok(rendered(app).includes('Targets hidden for this workout.'), 'one banner explains it');
    assert.ok(rendered(app).includes('>Show</button>'), 'Show offered');
    assert.equal(JSON.parse(app.store.get('hevy_clone_active_session')).targetsHidden, true, 'draft carries it');

    assert.equal(app.api.showTargetsForWorkout(), true);
    assert.ok(rendered(app).includes('target-line-0'), 'lines back');
    assert.ok(!rendered(app).includes('Targets hidden for this workout.'), 'banner gone');

    // The flag is per workout: finishing and starting again shows targets.
    app.api.toggleSetDone(0, 0);
    app.api.hideTargetsForWorkout();
    finishWithDrop(app);
    app.api.startRoutineWorkout('rt1');
    assert.equal(app.api.activeWorkout.targetsHidden, false, 'a new workout shows targets again');
    assert.ok(rendered(app).includes('target-line-0'));
  });

  it('setting-off-hides', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app.api.startRoutineWorkout('rt1');
    assert.equal(app.api.showTargetsEnabled(), true, 'default on');
    assert.equal(app.el('showTargetsCheck').checked, true, 'settings checkbox reflects it');

    app.api.setShowTargets(false);
    assert.equal(app.api.state.showTargets, false);
    assert.equal(app.el('showTargetsCheck').checked, false);
    assert.ok(!rendered(app).includes('target-line-0'), 'no target line when the preference is off');
    assert.ok(!rendered(app).includes('>Hide</button>'), 'no Hide button either');
    assert.equal(app.api.targetLineHtml(0), '', 'the line builder returns nothing');
    assert.equal(app.api.computeNextTarget(0).kind, 'load', 'the rule itself still works');

    app.api.setShowTargets(true);
    assert.ok(rendered(app).includes('target-line-0'), 'back on');
  });

  it('rationale-shown', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app.api.startRoutineWorkout('rt1');
    const html = rendered(app);
    assert.ok(html.includes('Target: 62.5 kg × 8'), 'suggestion on the line');
    assert.ok(html.includes('all hit'), 'the verdict is stated');
    assert.ok(html.includes('last 60 kg × 8, 8, 8'), 'the source session is quoted');
    assert.ok(html.includes('+2.5 kg'), 'the step is stated');
    assert.ok(!/\bTarget:\s*62\.5 kg × 8\b(?! ·)/.test(html), 'never a bare number');

    const app2 = createApp();
    saveRoutineSession(app2, [['N', 60, 8], ['N', 60, 8], ['N', 60, 7]]);
    app2.api.startRoutineWorkout('rt1');
    const html2 = rendered(app2);
    assert.ok(html2.includes('missed 1'), 'a missed session says so');
    assert.ok(html2.includes('same weight, beat last'), 'and explains the held weight');
  });

  it('typing-does-not-rebuild', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app.api.startRoutineWorkout('rt1');
    const before = app.api.nextTargetText(app.api.computeNextTarget(0));

    app.api.renderActiveWorkout();
    const box = app.el('activeExercisesContainer');
    box.innerHTML = 'SENTINEL';
    for (const v of ['5', '55']) app.api.updateSetVal(0, 0, 'weight', v);
    app.api.updateSetVal(0, 0, 'reps', '6');
    app.api.handleSetFieldChange(0, 0);
    assert.equal(box.innerHTML, 'SENTINEL', 'typing never rewrites the list (focused box survives)');
    assert.equal(app.api.nextTargetText(app.api.computeNextTarget(0)), before, 'the target line does not drift while typing');

    const draft = JSON.parse(app.store.get('hevy_clone_active_session'));
    assert.equal(draft.exercises[0].sets[0].weight, 55, 'the typed value is still saved');
  });
});

describe('P5-05 markup contract', () => {
  it('handlers-compile', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 60, 8], ['N', 60, 8], ['N', 60, 8]]);
    app.api.startRoutineWorkout('rt1');
    const html = rendered(app);
    let checked = 0;
    for (const m of html.matchAll(/\bon[a-z]+="([^"]+)"/g)) {
      const code = decodeHtmlEntities(m[1]);
      assert.doesNotThrow(() => new Function(code), `handler failed to compile: ${m[1]}`);
      checked++;
    }
    assert.ok(checked >= 2, 'the target line handlers were checked');
    assert.ok(html.includes('onclick="useNextTarget(0)"'), 'Use calls useNextTarget with the row index');
    assert.ok(html.includes('onclick="hideTargetsForWorkout()"'), 'Hide calls hideTargetsForWorkout');

    // Settings row: one handler, one unique id, on the real page.
    const page = loadIndexHtml();
    const idx = page.indexOf('id="showTargetsCheck"');
    assert.ok(idx > 0, 'showTargetsCheck exists');
    const rowStart = page.lastIndexOf('<div style="display:flex; align-items:center;', idx);
    const row = page.slice(rowStart, idx + 120);
    assert.ok(row.includes('min-height:44px'), 'toggle row is at least 44 px tall');
    assert.ok(row.includes('onchange="setShowTargets(this.checked)"'), 'checkbox calls setShowTargets');
    assert.ok(row.includes('Show next targets'), 'plain label');
    assert.ok(row.includes('Suggests the next weight or reps from your last session.'), 'help line');
    for (const id of ['showTargetsCheck', 'showTargetsHelp']) {
      const n = [...page.matchAll(new RegExp(`id="${id}"`, 'g'))].length;
      assert.equal(n, 1, `${id} must appear exactly once`);
    }
    assert.doesNotThrow(() => new Function('setShowTargets(this.checked)'));
  });

  it('nothing-wider-than-412', () => {
    const app = createApp();
    saveRoutineSession(app, [['N', 137.3, 12], ['N', 137.3, 12], ['N', 137.3, 12]]);
    app.api.toggleUnit(); // LBS: the longest realistic line
    app.api.startRoutineWorkout('rt1');
    const line = app.api.targetLineHtml(0);
    assert.ok(line.includes('target-line'), 'line built');
    for (const m of line.matchAll(/\bwidth:\s*(\d+)px/g)) {
      assert.ok(Number(m[1]) <= 412, `width ${m[1]}px exceeds the 412px phone frame`);
    }
    const buttons = [...line.matchAll(/<button[^>]*>/g)].map((m) => m[0]);
    assert.ok(buttons.length >= 2, 'Use and Hide are buttons');
    for (const b of buttons) {
      assert.ok(b.includes('min-height:44px'), 'every target button is at least 44 px tall');
    }
    assert.ok(line.includes('overflow-wrap:anywhere'), 'the text can wrap instead of pushing the buttons off-screen');
    assert.ok(line.includes('font-size:12px') && line.includes('var(--text-sub)'), 'P1 tokens for the reason text');

    const page = loadIndexHtml();
    const idx = page.indexOf('id="showTargetsCheck"');
    const block = page.slice(idx - 1500, idx + 400);
    for (const m of block.matchAll(/\bwidth:\s*(\d+)px/g)) {
      assert.ok(Number(m[1]) <= 412, `settings width ${m[1]}px exceeds the 412px frame`);
    }
  });
});

describe('P5-05 preference safety', () => {
  it('showTargets survives reload and export->import', () => {
    const store = new Map();
    const app = createApp({ store });
    app.api.setShowTargets(false);
    assert.equal(JSON.parse(store.get(STATE_KEY)).showTargets, false, 'preference persisted');

    const app2 = createApp({ store });
    assert.equal(app2.api.showTargetsEnabled(), false, 'preference survives reload');
    assert.equal(app2.el('showTargetsCheck').checked, false, 'checkbox reflects it');

    // A backup without the key restores the default; a false stays false; junk
    // is normalised instead of trusted.
    const noKey = app.api.validateBackupData({ schemaVersion: 2, unit: 'KG', exercises: [], routines: [], history: [] });
    assert.equal(noKey.ok, true);
    assert.equal(noKey.data.showTargets, true, 'old backups land on true');
    const kept = app.api.validateBackupData({ schemaVersion: 2, unit: 'KG', exercises: [], routines: [], history: [], showTargets: false });
    assert.equal(kept.data.showTargets, false, 'a backup with false keeps false');
    const junk = app.api.validateBackupData({ history: [], showTargets: 'no' });
    assert.equal(junk.data.showTargets, true, 'non-boolean is normalised, never trusted');

    // Restore normalises; undo brings the previous preference back.
    app.api.setShowTargets(true);
    app.api.pendingRestore = { history: [], routines: [], exercises: [], showTargets: 'no' };
    app.api.confirmRestore();
    assert.equal(app.api.state.showTargets, true, 'confirmRestore normalises to true');
    assert.equal(app.api.showTargetsEnabled(), true);
    app.api.undoLastRestore();
    assert.equal(app.api.state.showTargets, true, 'undo restores the snapshot preference');
    assert.equal(app.el('showTargetsCheck').checked, true);

    // No workout, no crash: the target helpers guard a null session.
    assert.equal(app.api.computeNextTarget(0), null);
    assert.equal(app.api.targetLineHtml(0), '');
    assert.equal(app.api.useNextTarget(0), false);
    assert.equal(app.api.undoTargetFill(), false);
    assert.equal(app.api.hideTargetsForWorkout(), false);
    assert.deepEqual(app.alerts, [], 'no alert, ever');
  });
});
