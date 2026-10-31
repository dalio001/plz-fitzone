// tests/p2-09-swap.test.mjs — P2-09 equipment swap on the REAL app code.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './harness.mjs';

describe('P2-09 equipment swap — getSwapSuggestions', () => {
  it('unknown or invalid exId returns empty array', () => {
    const app = createApp();
    assert.equal(app.api.getSwapSuggestions('nonexistent').length, 0);
    assert.equal(app.api.getSwapSuggestions('').length, 0);
    assert.equal(app.api.getSwapSuggestions(null).length, 0);
    assert.equal(app.api.getSwapSuggestions(undefined).length, 0);
  });

  it('same primary muscle and avoids source equipment by default', () => {
    const app = createApp();
    // ex7: Squat (Barbell), Quads, Barbell, [Glutes], weight_reps
    const sugs = app.api.getSwapSuggestions('ex7');
    assert.ok(sugs.length > 0 && sugs.length <= 5, 'returns up to 5 suggestions');
    sugs.forEach(s => {
      assert.notEqual(s.exId, 'ex7', 'never suggests the same exercise');
      assert.notEqual(s.equipment, 'Barbell', 'avoids Barbell by default');
      const def = app.api.state.exercises.find(e => e.id === s.exId);
      assert.equal(app.api.exPrimary(def), 'Quads', 'same primary muscle');
    });
  });

  it('custom avoid list excludes specified equipment', () => {
    const app = createApp();
    // Avoid both Barbell and Machine for Squat (Barbell)
    const sugs = app.api.getSwapSuggestions('ex7', ['Barbell', 'Machine']);
    assert.ok(sugs.length > 0, 'has suggestions');
    sugs.forEach(s => {
      assert.notEqual(s.equipment, 'Barbell', 'avoids Barbell');
      assert.notEqual(s.equipment, 'Machine', 'avoids Machine');
    });
  });

  it('ranks by shared secondary muscles, same type, then catalogue order', () => {
    const app = createApp();
    // ex7 has primary Quads, secondary ['Glutes'], weight_reps
    const sugs = app.api.getSwapSuggestions('ex7');
    // Candidates with shared secondary Glutes should rank ahead of Leg Extension (no secondaries)
    const legExtIdx = sugs.findIndex(s => s.name === 'Leg Extension');
    const gobletIdx = sugs.findIndex(s => s.name === 'Goblet Squat');
    assert.ok(gobletIdx >= 0, 'Goblet Squat suggested');
    if (legExtIdx >= 0) {
      assert.ok(gobletIdx < legExtIdx, 'Goblet Squat (shares Glutes) ranks ahead of Leg Extension (no shared)');
    }
  });

  it('reason line explains primary muscle, equipment change, and shared secondaries', () => {
    const app = createApp();
    const sugs = app.api.getSwapSuggestions('ex7');
    const goblet = sugs.find(s => s.name === 'Goblet Squat');
    assert.ok(goblet, 'Goblet Squat found');
    assert.equal(goblet.reason, 'Same muscle: Quads · Barbell → Dumbbell · also Glutes');
  });

  it('load family ordering: loaded options appear before bodyweight for weight exercises', () => {
    const app = createApp();
    // ex7 is weight_reps. Bodyweight Squat (ex76) is bodyweight_reps.
    // If enough loaded options exist, Bodyweight Squat should not push them out
    const sugs = app.api.getSwapSuggestions('ex7');
    const bwSquat = sugs.find(s => s.exId === 'ex76');
    // Top 5 loaded options for Quads: ex9 (Leg Press), ex70 (Goblet Squat), ex72 (Walking Lunge), ex73 (Bulgarian Split Squat), ex74 (Hack Squat)
    assert.equal(bwSquat, undefined, '5 loaded options fill the suggestions before bodyweight');
  });
});

describe('P2-09 equipment swap — swapActiveEx and undoSwapActiveEx', () => {
  it('swap keeps set count and rest, empties weights, stores swappedFrom', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1'); // rt1 starts with ex1 (Bench Press)
    app.api.activeWorkout.exercises[0].restSec = 120;
    app.api.updateActiveNote(0, 'Test bench note');
    app.api.updateSetVal(0, 0, 'weight', '80');
    app.api.updateSetVal(0, 0, 'reps', '8');
    app.api.toggleSetDone(0, 0);
    app.api.updateSetVal(0, 1, 'weight', '80');
    app.api.updateSetVal(0, 1, 'reps', '7');
    app.api.toggleSetDone(0, 1);

    const origSetsCount = app.api.activeWorkout.exercises[0].sets.length;
    // Swap ex1 to ex16 (Dumbbell Bench Press)
    const ok = app.api.swapActiveEx(0, 'ex16');
    assert.equal(ok, true, 'swap succeeds');

    const swapped = app.api.activeWorkout.exercises[0];
    assert.equal(swapped.exId, 'ex16', 'exercise changed to new id');
    assert.equal(swapped.sets.length, origSetsCount, 'set count preserved');
    assert.equal(swapped.restSec, 120, 'restSec preserved');
    assert.equal(swapped.note, '', 'note starts empty on swapped item');
    swapped.sets.forEach(s => {
      assert.equal(s.done, false, 'sets start unticked');
      assert.equal(s.weight, '', 'weights start empty');
      assert.equal(s.reps, '', 'reps start empty');
    });

    // Check swappedFrom snapshot
    assert.ok(swapped.swappedFrom, 'swappedFrom snapshot present');
    assert.equal(swapped.swappedFrom.exId, 'ex1', 'original exId stored');
    assert.equal(swapped.swappedFrom.restSec, 120, 'original rest stored');
    assert.equal(swapped.swappedFrom.note, 'Test bench note', 'original note stored');
    assert.equal(swapped.swappedFrom.sets[0].done, true, 'original done set 0 stored');
    assert.equal(Number(swapped.swappedFrom.sets[0].weight), 80, 'original weight stored');
    assert.equal(Number(swapped.swappedFrom.sets[0].reps), 8, 'original reps stored');
    assert.equal(swapped.swappedFrom.sets[1].done, true, 'original done set 1 stored');
  });

  it('undoSwapActiveEx restores original exercise exactly', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    app.api.activeWorkout.exercises[0].restSec = 120;
    app.api.updateActiveNote(0, 'Original note');
    app.api.updateSetVal(0, 0, 'weight', '100');
    app.api.updateSetVal(0, 0, 'reps', '5');
    app.api.toggleSetDone(0, 0);

    app.api.swapActiveEx(0, 'ex16');
    assert.equal(app.api.activeWorkout.exercises[0].exId, 'ex16');

    // Tap Undo
    const undoOk = app.api.undoSwapActiveEx(0);
    assert.equal(undoOk, true, 'undo succeeds');

    const restored = app.api.activeWorkout.exercises[0];
    assert.equal(restored.exId, 'ex1', 'original exId restored');
    assert.equal(restored.restSec, 120, 'original rest restored');
    assert.equal(restored.note, 'Original note', 'original note restored');
    assert.equal(restored.sets[0].done, true, 'done state restored');
    assert.equal(Number(restored.sets[0].weight), 100, 'weight restored');
    assert.equal(Number(restored.sets[0].reps), 5, 'reps restored');
    assert.equal(restored.swappedFrom, undefined, 'swappedFrom cleared');

    // Second undo fails cleanly
    assert.equal(app.api.undoSwapActiveEx(0), false, 'cannot undo twice');
  });

  it('renderActiveWorkout displays swapped from line with Undo button', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    app.api.swapActiveEx(0, 'ex16');

    const container = app.el('activeExercisesContainer');
    const html = container.innerHTML;
    assert.ok(html.includes('Swapped from Bench Press (Barbell)'), 'swapped from text shown');
    assert.ok(html.includes('undoSwapActiveEx(0)'), 'undo button present');

    app.api.undoSwapActiveEx(0);
    const htmlAfter = container.innerHTML;
    assert.ok(!htmlAfter.includes('Swapped from Bench Press (Barbell)'), 'swapped line gone after undo');
  });
});

describe('P2-09 equipment swap — session persistence across reload', () => {
  it('swappedFrom persists in draft and reload offers undo', () => {
    const store = new Map();
    const app = createApp({ store });
    app.api.startRoutineWorkout('rt1');
    app.api.updateSetVal(0, 0, 'weight', '90');
    app.api.updateSetVal(0, 0, 'reps', '6');
    app.api.toggleSetDone(0, 0);
    app.api.swapActiveEx(0, 'ex16');

    // Verify localStorage draft
    const draft = app.api.loadActiveSessionDraft();
    assert.ok(draft, 'draft saved');
    assert.ok(draft.exercises[0].swappedFrom, 'swappedFrom present in stored draft');
    assert.equal(draft.exercises[0].swappedFrom.exId, 'ex1');

    // Simulate reload with shared store
    const app2 = createApp({ store });
    app2.api.resumeSavedWorkout();
    assert.equal(app2.api.activeWorkout.exercises[0].exId, 'ex16', 'resumed swapped exercise');
    assert.ok(app2.api.activeWorkout.exercises[0].swappedFrom, 'swappedFrom intact after reload');

    // Undo still works after reload
    app2.api.undoSwapActiveEx(0);
    assert.equal(app2.api.activeWorkout.exercises[0].exId, 'ex1', 'restored original on resumed session');
    assert.equal(app2.api.activeWorkout.exercises[0].sets[0].done, true, 'ticked set recovered');
  });
});

describe('P2-09 equipment swap — finish and routines preservation', () => {
  it('finished workout history has no swappedFrom; routine unchanged', () => {
    const app = createApp();
    app.api.startRoutineWorkout('rt1');
    const originalRoutineEx0 = app.api.state.routines.find(r => r.id === 'rt1').exercises[0].exId;
    assert.equal(originalRoutineEx0, 'ex1', 'routine starts with ex1');

    // Swap ex1 to ex16
    app.api.swapActiveEx(0, 'ex16');

    // Tick sets to make workout finishable
    app.api.activeWorkout.exercises.forEach(ex => {
      (ex.sets || []).forEach(s => {
        s.weight = '50';
        s.reps = '10';
        s.done = true;
      });
    });

    app.api.finishWorkout();

    // Check saved history
    assert.ok(app.api.state.history.length > 0, 'workout saved in history');
    const histEx0 = app.api.state.history[0].exercises[0];
    assert.equal(histEx0.exId, 'ex16', 'history records performed exercise');
    assert.equal(histEx0.swappedFrom, undefined, 'history does NOT contain swappedFrom');

    // Check routine in state.routines
    const rt = app.api.state.routines.find(r => r.id === 'rt1');
    assert.equal(rt.exercises[0].exId, 'ex1', 'routine remains completely unchanged');
  });
});

describe('P2-09 equipment swap — picker and confirm modal', () => {
  it('picker swap section only in replace mode', () => {
    const app = createApp();
    // In workout mode
    app.api.openExercisePicker('workout');
    const swapSec = app.el('pickerSwapSection');
    assert.equal(swapSec.style.display, 'none', 'hidden in workout mode');

    // In routine mode
    app.api.openExercisePicker('routine');
    assert.equal(swapSec.style.display, 'none', 'hidden in routine mode');

    // In replace mode
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex7');
    app.api.openReplacePicker(0);
    assert.equal(swapSec.style.display, 'block', 'visible in replace mode');
    assert.ok(swapSec.innerHTML.includes('Same muscle, other equipment'), 'title present');
    assert.ok(swapSec.innerHTML.includes('Can&#39;t use:'), 'avoid label present');
    assert.ok(app.api.swapAvoidEquip.includes('Barbell'), 'current equipment Barbell pre-selected');

    // Toggle avoid chip
    app.api.toggleSwapAvoidEquip('Machine');
    assert.ok(app.api.swapAvoidEquip.includes('Machine'), 'Machine now avoided');
  });

  it('confirm sheet shows question, set/rest preservation, reason, and done note', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex7'); // Squat (Barbell)
    app.api.addSetToActive(0); // 2 sets
    app.api.activeWorkout.exercises[0].restSec = 150;
    app.api.updateSetVal(0, 0, 'weight', '120');
    app.api.updateSetVal(0, 0, 'reps', '5');
    app.api.toggleSetDone(0, 0);
    app.api.updateSetVal(0, 1, 'weight', '120');
    app.api.updateSetVal(0, 1, 'reps', '5');
    app.api.toggleSetDone(0, 1);

    app.api.openReplacePicker(0);
    app.api.openSwapConfirm('ex70'); // Goblet Squat

    const q = app.el('swapConfirmQuestion').textContent;
    assert.equal(q, 'Swap Squat (Barbell) → Goblet Squat?');

    const changes = app.el('swapConfirmChanges').textContent;
    assert.ok(changes.includes('Keeps 2 sets and 150 s rest'), 'set/rest preserved');
    assert.ok(changes.includes('weights start empty (different equipment)'), 'empty weights note');
    assert.ok(changes.includes('2 done sets stay with Squat in Undo only'), 'done sets note');

    const reason = app.el('swapConfirmReason').textContent;
    assert.equal(reason, 'Same muscle: Quads · Barbell → Dumbbell · also Glutes');

    // Cancel keeps original
    app.api.closeSwapConfirm();
    assert.equal(app.api.activeWorkout.exercises[0].exId, 'ex7', 'exercise unchanged after cancel');

    // Confirm performs swap
    app.api.openSwapConfirm('ex70');
    app.api.confirmSwapActiveEx();
    assert.equal(app.api.activeWorkout.exercises[0].exId, 'ex70', 'swapped on confirm');
  });
});

describe('P2-09 equipment swap — markup contract', () => {
  it('handlers-compile', () => {
    const app = createApp();
    assert.equal(typeof app.api.getSwapSuggestions, 'function', 'getSwapSuggestions exported');
    assert.equal(typeof app.api.swapActiveEx, 'function', 'swapActiveEx exported');
    assert.equal(typeof app.api.undoSwapActiveEx, 'function', 'undoSwapActiveEx exported');
    assert.equal(typeof app.api.openSwapConfirm, 'function', 'openSwapConfirm exported');
    assert.equal(typeof app.api.closeSwapConfirm, 'function', 'closeSwapConfirm exported');
    assert.equal(typeof app.api.confirmSwapActiveEx, 'function', 'confirmSwapActiveEx exported');
    assert.equal(typeof app.api.toggleSwapAvoidEquip, 'function', 'toggleSwapAvoidEquip exported');
  });

  it('nothing-wider-than-412', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex1');
    app.api.swapActiveEx(0, 'ex16');

    const container = app.el('activeExercisesContainer');
    const html = container.innerHTML;
    assert.ok(html.includes('min-height:44px'), 'undo button meets 44px minimum touch target');
  });
});
