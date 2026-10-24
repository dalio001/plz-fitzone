// tests/onboarding.test.mjs — P1-05 first-run onboarding on the REAL app code.
// Flag rule, gating, validation, routine safety, restore, prefill, handlers.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, STATE_KEY } from './harness.mjs';

function overlayOpen(app) {
  return app.el('onboardingOverlay').classList.contains('open');
}

function savedStateWithoutProfile() {
  return {
    schemaVersion: 2, unit: 'KG', defaultRest: 90,
    exercises: [{ id: 'ex1', name: 'Bench Press (Barbell)', muscle: 'Chest' }],
    routines: [{ id: 'rt9', name: 'Mine', exercises: [{ exId: 'ex1', sets: 3 }] }],
    history: [{
      id: 'wk1', title: 'W', date: 1728000000000, durationSec: 60,
      totalVolume: 500, totalSets: 1,
      exercises: [{ exId: 'ex1', sets: [{ weight: 100, reps: 5 }] }],
    }],
  };
}

// Drives the full flow to completion on a fresh or re-run overlay.
function completeOnboarding(app, opts = {}) {
  const api = app.api;
  api.obContinue(); api.obContinue(); api.obContinue(); // welcome slides -> step 1
  api.obSetUnit(opts.unit || 'KG');
  api.obContinue(); // step 2 height
  if (opts.heightCm !== undefined) api.obUpdate('heightCm', opts.heightCm);
  api.obContinue(); // step 3 age
  if (opts.age !== undefined) api.obUpdate('age', opts.age);
  if (opts.birthDate !== undefined) api.obUpdate('birthDate', opts.birthDate);
  api.obContinue(); // step 4 goal
  api.obSetGoal(opts.goal || 'build muscle');
  api.obContinue(); // step 5 experience
  api.obSetExperience(opts.experience || 'intermediate');
  api.obContinue(); // step 6 routines
  if (opts.routine) api.obSetRoutineChoice(opts.routine);
  api.obContinue(); // step 7 ready
  api.obContinue(); // finish
  return api.state;
}

describe('onboarding first-run flag', () => {
  it('onboarding_shows_on_true_first_run', () => {
    const app = createApp(); // no saved state at all
    assert.equal(app.api.state.profile.onboardingDone, false, 'profile seeded unfinished');
    assert.ok(overlayOpen(app), 'overlay open on true first run');
    const html = app.el('onboardingOverlay').innerHTML;
    assert.ok(html.includes('Welcome to PLZ Train'), 'welcome slide shown');
    assert.ok(html.includes('plz-fitzone-mascot.jpg'), 'mascot picture used');
    assert.ok(html.includes('id="obContinueBtn"'), 'sticky footer rendered');
    assert.ok(JSON.parse(app.store.get(STATE_KEY)).profile, 'profile persisted for reload');
  });

  it('onboarding_never_forces_existing_users', () => {
    const store = new Map();
    store.set(STATE_KEY, JSON.stringify(savedStateWithoutProfile()));
    const app = createApp({ store });
    assert.ok(!overlayOpen(app), 'no overlay for saved state without profile');
    assert.equal('profile' in app.api.state, false, 'no profile invented');
    assert.equal(app.api.state.routines.length, 1, 'routines untouched');
    assert.equal(app.el('gettingStartedCard').style.display, 'none', 'no new card');
  });

  it('onboarding_reload_midway_shows_again', () => {
    const store = new Map();
    createApp({ store }); // true first run, overlay open, profile saved false
    assert.equal(JSON.parse(store.get(STATE_KEY)).profile.onboardingDone, false);
    const reloaded = createApp({ store }); // reload before finishing
    assert.ok(overlayOpen(reloaded), 'overlay shown again after reload');
    assert.equal(reloaded.api.state.profile.onboardingDone, false);
  });
});

describe('onboarding flow', () => {
  it('onboarding_skip_completes_to_workout', () => {
    const app = createApp();
    for (let i = 0; i < 12 && !app.api.state.profile.onboardingDone; i++) app.api.obSkip();
    assert.equal(app.api.state.profile.onboardingDone, true, 'skips finish the flow');
    assert.ok(!overlayOpen(app), 'overlay closed');
    assert.ok(app.el('tab-workout').classList.contains('active'), 'landed on Workout tab');
    assert.equal(app.el('gettingStartedCard').style.display, '', 'how-to card visible');
    assert.ok(app.el('gettingStartedCard').innerHTML !== undefined, 'card rendered');
    app.api.dismissGettingStarted();
    assert.equal(app.el('gettingStartedCard').style.display, 'none', 'card dismissible');
  });

  it('onboarding_experience_gates_continue', () => {
    const app = createApp();
    app.api.obContinue(); app.api.obContinue(); app.api.obContinue();
    app.api.obContinue(); app.api.obContinue(); app.api.obContinue();
    app.api.obSetGoal('build muscle');
    app.api.obContinue(); // step 5 experience
    assert.equal(app.api.obStep, 5);
    assert.equal(app.api.obCanContinue(), false, 'Continue blocked without a choice');
    assert.ok(app.el('onboardingOverlay').innerHTML.includes('disabled'), 'button disabled');
    app.api.obSetExperience('beginner');
    assert.equal(app.api.obCanContinue(), true, 'Continue enabled after choice');
  });

  it('onboarding_template_keeps_routines_own_starts_empty', () => {
    const keep = createApp();
    completeOnboarding(keep, { routine: 'template' });
    assert.equal(keep.api.state.routines.length, keep.api.DEFAULT_ROUTINES.length, 'samples kept');
    const own = createApp();
    completeOnboarding(own, { routine: 'own' });
    assert.equal(JSON.stringify(own.api.state.routines), '[]', 'own starts empty');
    assert.equal(own.api.state.exercises.length, own.api.DEFAULT_EXERCISES.length, 'exercises intact');
    assert.equal(JSON.stringify(own.api.state.history), '[]', 'no history invented');
  });

  it('onboarding_unit_sets_preference', () => {
    const store = new Map();
    store.set(STATE_KEY, JSON.stringify(savedStateWithoutProfile()));
    const app = createApp({ store });
    app.api.startOnboardingRerun();
    completeOnboarding(app, { unit: 'LBS', routine: 'keep' });
    assert.equal(app.api.state.unit, 'LBS', 'unit preference set');
    const saved = JSON.parse(store.get(STATE_KEY));
    assert.equal(saved.history[0].exercises[0].sets[0].weight, 100, 'stored kg untouched');
  });

  it('onboarding_profile_private_editable', () => {
    const app = createApp();
    completeOnboarding(app, { goal: 'lose fat', heightCm: '180', age: '30' });
    const body = app.el('myProfileBody').innerHTML;
    assert.ok(body.includes('lose fat'), 'goal shown');
    assert.ok(body.includes('180 cm'), 'height shown');
    assert.ok(body.includes('Age 30'), 'age shown');
    assert.ok(body.includes('Edit / re-run setup'), 'edit entry point shown');
    for (const k of app.store.keys()) assert.ok(k.startsWith('hevy_clone_'), 'local only: ' + k);
    app.api.startOnboardingRerun(); // answers prefilled, nothing deleted
    assert.ok(overlayOpen(app), 're-run opens');
    completeOnboarding(app, { goal: 'get stronger' });
    assert.equal(app.api.state.profile.goal, 'get stronger', 'answer updated');
    assert.equal(String(app.api.state.profile.heightCm), '180', 'untouched answer kept');
  });
});

describe('onboarding validation', () => {
  it('onboarding_height_age_ranges_optional', () => {
    const app = createApp();
    app.api.obContinue(); app.api.obContinue(); app.api.obContinue();
    app.api.obContinue(); // step 2 height
    assert.equal(app.api.obStep, 2);
    assert.equal(app.api.obCanContinue(), true, 'empty height allowed');
    const before = app.el('onboardingOverlay').innerHTML;
    app.api.obUpdate('heightCm', '50');
    assert.ok(app.api.obHeightError().length > 0, '50 cm rejected');
    assert.equal(app.api.obCanContinue(), false, 'Continue blocked while invalid');
    assert.equal(app.el('onboardingOverlay').innerHTML, before, 'typing never rebuilds');
    assert.ok(app.el('obFieldError').textContent.length > 0, 'message shown in place');
    app.api.obUpdate('heightCm', '');
    assert.equal(app.api.obCanContinue(), true, 'cleared is allowed again');
    app.api.obSetHeightUnit('ftin');
    app.api.obUpdate('heightFt', '2');
    assert.ok(app.api.obHeightError().length > 0, '2 ft rejected');
    app.api.obUpdate('heightFt', '5');
    app.api.obUpdate('heightIn', '9');
    assert.equal(app.api.obHeightError(), '', '5ft9 accepted');
    app.api.obGoStep(3);
    assert.equal(app.api.obCanContinue(), true, 'empty age allowed');
    app.api.obUpdate('age', '5');
    assert.ok(app.api.obAgeError().length > 0, 'age 5 rejected');
    assert.equal(app.api.obCanContinue(), false, 'Continue blocked while invalid');
    app.api.obUpdate('age', '');
    app.api.obUpdate('birthDate', '2020-01-01');
    assert.ok(app.api.obAgeError().length > 0, 'recent birthday rejected');
    app.api.obUpdate('birthDate', '');
    assert.equal(app.api.obCanContinue(), true, 'cleared is allowed again');
  });
});

describe('onboarding restore + rerun safety', () => {
  it('onboarding_restore_with_without_profile', () => {
    const app = createApp();
    const base = savedStateWithoutProfile();
    delete base.history;
    base.routines = [];
    let r = app.api.validateBackupData(base);
    assert.equal(r.ok, true, 'backup without profile accepted');
    assert.equal(r.data.profile, undefined, 'missing stays missing');
    r = app.api.validateBackupData({ ...base, profile: 'x' });
    assert.equal(r.ok, false, 'non-object profile rejected');
    const done = { ...base, profile: { onboardingDone: true, v: 1, goal: 'stay healthy' } };
    r = app.api.validateBackupData(done);
    assert.equal(r.ok, true, 'backup with profile accepted');
    app.api.pendingRestore = r.data;
    app.api.confirmRestore();
    assert.equal(app.api.state.profile.goal, 'stay healthy', 'profile restored');
    assert.ok(!overlayOpen(app), 'finished profile shows nothing new');
    const undone = { ...base, profile: { onboardingDone: false, v: 1 } };
    app.api.pendingRestore = app.api.validateBackupData(undone).data;
    app.api.confirmRestore();
    assert.ok(overlayOpen(app), 'unfinished backup re-opens safely');
    assert.equal(app.api.state.routines.length, 0, 'restore data intact');
  });

  it('onboarding_rerun_never_deletes_routines', () => {
    const store = new Map();
    store.set(STATE_KEY, JSON.stringify(savedStateWithoutProfile()));
    const app = createApp({ store });
    const histBefore = JSON.stringify(app.api.state.history);
    const exBefore = JSON.stringify(app.api.state.exercises);
    app.api.startOnboardingRerun();
    assert.equal(app.api.obIsFirstRun, false, 'rerun mode, never first-run');
    completeOnboarding(app, { routine: 'addsamples' });
    const names = app.api.state.routines.map((x) => x.name);
    assert.ok(names.includes('Mine'), 'custom routine kept');
    assert.equal(app.api.state.routines.length, 4, '3 samples added by name');
    assert.equal(JSON.stringify(app.api.state.history), histBefore, 'history untouched');
    assert.equal(JSON.stringify(app.api.state.exercises), exBefore, 'exercises untouched');

    const store2 = new Map();
    store2.set(STATE_KEY, JSON.stringify(savedStateWithoutProfile()));
    const app2 = createApp({ store: store2 });
    const rtBefore = JSON.stringify(app2.api.state.routines);
    app2.api.startOnboardingRerun();
    completeOnboarding(app2, { routine: 'keep' });
    assert.equal(JSON.stringify(app2.api.state.routines), rtBefore, 'keep changes nothing');
  });
});
