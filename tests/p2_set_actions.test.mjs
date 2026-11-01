// tests/p2_set_actions.test.mjs — P2-05 personal parts on the REAL app code.
// 1. Multi-digit typing never rebuilds the focused box (container innerHTML
//    untouched during keystrokes; model + draft still saved every change).
// 2. Set menu (type directly, no blind cycling) + single-set remove with 5s undo.
// 3. Exercise reorder / replace / per-exercise note / plate calculator (KG+LBS).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, DRAFT_KEY, loadIndexHtml, finishWithDrop } from './harness.mjs';

function start(app, rtId = 'rt1') {
  app.api.startRoutineWorkout(rtId);
  return app;
}

// The harness DOM is a stub, so focus is proven honestly: the workout list
// container must NOT be rewritten while typing, while model+draft still save.
function sentinelBox(app) {
  app.api.renderActiveWorkout();
  const box = app.el('activeExercisesContainer');
  box.innerHTML = 'SENTINEL';
  return box;
}

describe('P2-05 multi-digit input fix', () => {
  it('multidigit-keeps-same-element-and-saves-10', () => {
    const app = start(createApp());
    const box = sentinelBox(app);
    app.api.updateSetVal(0, 0, 'weight', '1');
    app.api.updateSetVal(0, 0, 'weight', '10');
    assert.equal(box.innerHTML, 'SENTINEL', 'container NOT rewritten during keystrokes (focused box survives)');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 10, 'model holds 10 after typing 1 then 10');
    const draft = JSON.parse(app.store.get(DRAFT_KEY));
    assert.equal(draft.exercises[0].sets[0].weight, 10, 'draft saved 10 (reload safety kept)');
  });

  it('decimal-22-5-keeps-focus-and-saves', () => {
    const app = start(createApp());
    const box = sentinelBox(app);
    for (const v of ['2', '22', '22.', '22.5']) app.api.updateSetVal(0, 0, 'weight', v);
    assert.equal(box.innerHTML, 'SENTINEL', 'container NOT rewritten while typing 22.5');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 22.5, 'model holds 22.5');
  });

  it('moving-from-kg-to-reps-does-not-rebuild-the-list', () => {
    const app = start(createApp());
    const box = sentinelBox(app);
    app.api.updateSetVal(0, 0, 'weight', '100');
    app.api.handleSetFieldChange(0, 0); // blur KG = old buggy re-render point
    app.api.updateSetVal(0, 0, 'reps', '12');
    app.api.handleSetFieldChange(0, 0); // blur REPS
    assert.equal(box.innerHTML, 'SENTINEL', 'container NOT rewritten when moving between boxes (next tap lands)');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 100, 'model weight 100 kept');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].reps, 12, 'model reps 12 kept');
    assert.equal(app.el('set-w-0-0').value, '100', 'KG box normalised in place');
    assert.equal(app.el('set-r-0-0').value, '12', 'REPS box normalised in place');
    const draft = JSON.parse(app.store.get(DRAFT_KEY));
    assert.equal(draft.exercises[0].sets[0].weight, 100, 'draft weight saved');
    assert.equal(draft.exercises[0].sets[0].reps, 12, 'draft reps saved');
  });

  it('invalid-shows-row-error-without-rerendering-focused-box', () => {
    const app = start(createApp());
    const box = sentinelBox(app);
    app.api.updateSetVal(0, 0, 'weight', '-5');
    assert.equal(box.innerHTML, 'SENTINEL', 'container NOT rewritten on invalid input');
    assert.ok(app.api.setInputErrors['0:0']?.weight, 'row error recorded (red outline + message)');
    assert.notEqual(app.api.activeWorkout.exercises[0].sets[0].weight, -5, 'invalid weight never saved');
  });

  it('reload-after-keystrokes-restores-draft', () => {
    const store = new Map();
    const app = start(createApp({ store }));
    app.api.updateSetVal(0, 0, 'weight', '80');
    app.api.updateSetVal(0, 0, 'reps', '8');
    const app2 = createApp({ store });
    const draft = app2.api.loadActiveSessionDraft();
    assert.ok(draft, 'draft exists after reload');
    assert.equal(draft.exercises[0].sets[0].weight, 80, 'typed weight survives reload');
    assert.equal(draft.exercises[0].sets[0].reps, 8, 'typed reps survive reload');
  });
});

describe('P2-05 set menu and single-set remove', () => {
  it('set-menu-sets-type-directly', () => {
    const app = start(createApp());
    app.api.openSetMenu(0, 0);
    assert.equal(JSON.stringify(app.api.setMenuTarget), JSON.stringify({ exIdx: 0, sIdx: 0 }), 'menu target recorded');
    assert.equal(app.api.setSetTypeFromMenu('W'), true, 'Warm-up picked directly');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].type, 'W', 'type set without cycling');
    assert.equal(app.api.setMenuTarget, null, 'menu closed after choice');
    app.api.openSetMenu(0, 0);
    app.api.closeSetMenu();
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].type, 'W', 'closing menu changes nothing');
  });

  it('remove-set-renumbers-and-undo-restores-5s', () => {
    const app = start(createApp());
    for (let i = 0; i < 3; i++) app.api.updateSetVal(0, i, 'weight', String(60 + i * 10));
    assert.equal(app.api.removeActiveSet(0, 1), true, 'middle set removed');
    const sets = app.api.activeWorkout.exercises[0].sets;
    assert.equal(sets.length, 2, 'two sets left');
    assert.deepEqual([sets[0].weight, sets[1].weight], [60, 80], 'order kept, numbers renumber at render');
    const wait = app.api.deletedSetBackup.expiresAt - Date.now();
    assert.ok(wait > 4000 && wait <= 5000, `undo window is 5s (got ${wait}ms)`);
    assert.equal(app.api.undoRemoveSet(), true, 'undo restores');
    assert.equal(
      JSON.stringify(app.api.activeWorkout.exercises[0].sets.map((s) => s.weight)),
      JSON.stringify([60, 70, 80]),
      'restored at the same index'
    );
    app.api.removeActiveSet(0, 0);
    app.api.expireDeletedSet(Date.now() + 6000);
    assert.equal(app.api.deletedSetBackup, null, 'expired undo is gone');
    assert.equal(app.api.activeWorkout.exercises[0].sets.length, 2, 'removal stands after expiry');
  });

  it('removed-set-previous-lanes-still-match', () => {
    const app = start(createApp());
    app.api.cycleSetType(0, 0); // N -> W
    app.api.updateSetVal(0, 0, 'weight', '40');
    app.api.updateSetVal(0, 0, 'reps', '10');
    app.api.updateSetVal(0, 1, 'weight', '80');
    app.api.updateSetVal(0, 1, 'reps', '8');
    app.api.updateSetVal(0, 2, 'weight', '70');
    app.api.updateSetVal(0, 2, 'reps', '8');
    for (let i = 0; i < 3; i++) app.api.toggleSetDone(0, i);
    app.api.removeActiveSet(0, 1); // drop the 80x8 Normal set
    finishWithDrop(app);
    assert.equal(app.api.state.history.length, 1, 'workout saved');
    const prev = app.api.getPreviousSet('ex1', 0, 'N', 0, 'rt1');
    assert.deepEqual([prev.weight, prev.reps], [70, 8], 'Normal lane 0 is now 70x8, warm-up skipped');
    app.api.startRoutineWorkout('rt1');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 70, 'prefill follows the matched lane');
  });
});

describe('P2-05 reorder, replace, note', () => {
  it('move-exercise-up-down-keeps-sets-and-draft', () => {
    const store = new Map();
    const app = start(createApp({ store }));
    const id0 = app.api.activeWorkout.exercises[0].exId;
    app.api.updateSetVal(0, 0, 'weight', '60');
    app.api.updateSetVal(0, 0, 'reps', '8');
    assert.equal(app.api.moveActiveEx(0, 1), true, 'moved down');
    assert.equal(app.api.activeWorkout.exercises[1].exId, id0, 'exercise moved');
    assert.equal(app.api.activeWorkout.exercises[1].sets[0].weight, 60, 'sets travel with the exercise');
    const draft = JSON.parse(store.get(DRAFT_KEY));
    assert.equal(draft.exercises[1].exId, id0, 'draft order matches');
    assert.equal(app.api.moveActiveEx(1, -1), true, 'moved back up');
    assert.equal(app.api.activeWorkout.exercises[0].exId, id0, 'original order restored');
    assert.equal(app.api.moveActiveEx(0, -1), false, 'top exercise cannot move up');
  });

  it('replace-default-empties-keep-values-option', () => {
    const app = start(createApp());
    app.api.updateSetVal(0, 0, 'weight', '60');
    app.api.updateSetVal(0, 0, 'reps', '8');
    const count = app.api.activeWorkout.exercises[0].sets.length;
    assert.equal(app.api.replaceActiveEx(0, 'ex2', false), true, 'replaced');
    const ex = app.api.activeWorkout.exercises[0];
    assert.equal(ex.exId, 'ex2', 'new exercise');
    assert.equal(ex.sets.length, count, 'same set count');
    assert.ok(ex.sets.every((s) => s.weight === '' && s.reps === '' && s.type === 'N' && s.done === false), 'default: empty Normal sets');
    app.api.updateSetVal(0, 0, 'weight', '61');
    app.api.updateSetVal(0, 0, 'reps', '9');
    app.api.replaceActiveEx(0, 'ex3', true);
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].weight, 61, 'keep-values copies weight');
    assert.equal(app.api.activeWorkout.exercises[0].sets[0].reps, 9, 'keep-values copies reps');
  });

  it('workout-note-saved-to-history-and-reload', () => {
    const store = new Map();
    const app = start(createApp({ store }));
    assert.equal(app.api.updateActiveNote(0, 'knees out'), true, 'note saved');
    const draft = JSON.parse(store.get(DRAFT_KEY));
    assert.equal(draft.exercises[0].note, 'knees out', 'note in the draft (reload safety)');
    app.api.updateSetVal(0, 0, 'weight', '60');
    app.api.updateSetVal(0, 0, 'reps', '8');
    app.api.toggleSetDone(0, 0);
    finishWithDrop(app);
    const saved = app.api.state.history[0].exercises.find((e) => e.exId === draft.exercises[0].exId);
    assert.equal(saved.note, 'knees out', 'note saved with the workout in history');
    assert.ok(app.el('historyList').innerHTML.includes('knees out'), 'note rendered in history');
  });
});

describe('P2-05 plate calculator', () => {
  it('plates-exact-per-side-kg-and-lb', () => {
    const app = createApp();
    const kg = app.api.computePlates(100, 'KG');
    assert.equal(JSON.stringify(kg.perSide), JSON.stringify([25, 15]), '100kg: 25+15 per side');
    assert.equal(kg.loadable, 100, 'loads exactly 100');
    assert.equal(kg.exact, true, 'exact');
    const lb = app.api.computePlates(135, 'LBS');
    assert.equal(JSON.stringify(lb.perSide), JSON.stringify([45]), '135lb: 45 per side');
    assert.equal(lb.exact, true, 'exact in LBS');
  });

  it('plates-remainder-never-pretends', () => {
    const app = createApp();
    const r = app.api.computePlates(99, 'KG');
    assert.equal(r.exact, false, '99kg is not exactly loadable');
    assert.equal(r.loadable, 97.5, 'closest loadable shown');
    assert.equal(r.remainder, 1.5, 'remainder shown');
    assert.ok(r.loadable < 99, 'never rounds up');
    const lb = app.api.computePlates(101, 'LBS');
    assert.equal(lb.exact, false, '101lb not exact');
    assert.equal(lb.loadable + lb.remainder, 101, 'loadable + remainder = target');
    const under = app.api.computePlates(10, 'KG');
    assert.equal(under.under, true, 'target below the bar flagged');
    assert.equal(JSON.stringify(under.perSide), JSON.stringify([]), 'no plates below the bar');
  });

  it('plates-custom-bar-and-inventory', () => {
    const app = createApp();
    app.api.state.plateSettings = { barKg: 15, barLb: 45, platesKg: [10, 5], platesLb: [45, 35, 25, 10, 5, 2.5] };
    const r = app.api.computePlates(45, 'KG');
    assert.equal(r.bar, 15, 'custom bar used');
    assert.equal(JSON.stringify(r.perSide), JSON.stringify([10, 5]), 'custom inventory used');
    assert.equal(r.exact, true, 'exact with custom plates');
    const norm = app.api.normalizePlateSettings({ barKg: -5, platesKg: [], platesLb: 'x' });
    assert.equal(JSON.stringify(norm), JSON.stringify(app.api.DEFAULT_PLATE_SETTINGS), 'invalid settings fall back to defaults');
  });
});

describe('P2-05 wiring in index.html', () => {
  it('menu, undo, reorder, replace, note and plate controls exist', () => {
    const html = loadIndexHtml();
    for (const s of [
      'id="setMenuModal"', 'Warm-up', 'Remove set', 'openSetMenu(', 'setSetTypeFromMenu(',
      'removeActiveSet(', 'undoRemoveSet()', 'Undo (5s)', 'moveActiveEx(', 'openReplacePicker(',
      'updateActiveNote(', 'openPlateCalcFor(', 'less than the bar', 'remainder',
      'plateBarKgInput', 'platePlatesKgInput', 'savePlateSettings()',
      'handleSetFieldChange(', 'paintSetRowError(',
    ]) {
      assert.ok(html.includes(s), `index.html contains ${s}`);
    }
  });
});
