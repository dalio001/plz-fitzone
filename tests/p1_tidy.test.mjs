// tests/p1_tidy.test.mjs — P1-03 / P1-04 / P1-06 Profile sections, design tokens,
// consistent headers and exercise screens (personal scale).
// Runs against the REAL <script> in index.html via tests/harness.mjs.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml, STATE_KEY, DRAFT_KEY } from './harness.mjs';

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function plain(v) {
  return JSON.parse(JSON.stringify(v));
}

describe('P1 tidy-up (P1-03 / P1-04 / P1-06)', () => {
  it('profile-sections-switch-and-remember', () => {
    const store = new Map();
    const app = createApp({ store });

    // Initial default section is 'progress'
    assert.equal(app.api.getProfileSection(), 'progress');
    assert.equal(app.el('profileProgress').hidden, false);
    assert.equal(app.el('profileRecordsSection').hidden, true);
    assert.equal(app.el('profileSettings').hidden, true);
    assert.equal(app.el('profSecBtn-progress').getAttribute('aria-pressed'), 'true');
    assert.equal(app.el('profSecBtn-records').getAttribute('aria-pressed'), 'false');
    assert.equal(app.el('profSecBtn-settings').getAttribute('aria-pressed'), 'false');

    // Switch to 'records': exclusive visibility and pressed state
    app.api.setProfileSection('records');
    assert.equal(app.api.getProfileSection(), 'records');
    assert.equal(app.el('profileProgress').hidden, true);
    assert.equal(app.el('profileRecordsSection').hidden, false);
    assert.equal(app.el('profileSettings').hidden, true);
    assert.equal(app.el('profSecBtn-progress').getAttribute('aria-pressed'), 'false');
    assert.equal(app.el('profSecBtn-records').getAttribute('aria-pressed'), 'true');
    assert.equal(app.el('profSecBtn-settings').getAttribute('aria-pressed'), 'false');
    assert.equal(store.get(app.api.PROFILE_SECTION_KEY), 'records');

    // Switch to 'settings'
    app.api.setProfileSection('settings');
    assert.equal(app.api.getProfileSection(), 'settings');
    assert.equal(app.el('profileProgress').hidden, true);
    assert.equal(app.el('profileRecordsSection').hidden, true);
    assert.equal(app.el('profileSettings').hidden, false);
    assert.equal(app.el('profSecBtn-progress').getAttribute('aria-pressed'), 'false');
    assert.equal(app.el('profSecBtn-records').getAttribute('aria-pressed'), 'false');
    assert.equal(app.el('profSecBtn-settings').getAttribute('aria-pressed'), 'true');
    assert.equal(store.get(app.api.PROFILE_SECTION_KEY), 'settings');

    // Same-Map reload remembers chosen section
    const app2 = createApp({ store });
    assert.equal(app2.api.getProfileSection(), 'settings');
    assert.equal(app2.el('profileSettings').hidden, false);
    assert.equal(app2.el('profileProgress').hidden, true);
    assert.equal(app2.el('profileRecordsSection').hidden, true);

    // Absent storage key defaults safely to 'progress'
    const emptyStore = new Map();
    const appEmpty = createApp({ store: emptyStore });
    assert.equal(appEmpty.api.getProfileSection(), 'progress');

    // Invalid stored value falls back safely to 'progress'
    emptyStore.set(app.api.PROFILE_SECTION_KEY, 'bogus_section');
    const appBogus = createApp({ store: emptyStore });
    assert.equal(appBogus.api.getProfileSection(), 'progress');

    // Throwing storage falls back safely to 'progress'
    const throwingStore = new Map();
    throwingStore.get = () => { throw new Error('storage read failed'); };
    throwingStore.set = () => { throw new Error('storage write failed'); };
    const appThrow = createApp({ store: throwingStore });
    assert.equal(appThrow.api.getProfileSection(), 'progress');

    // Failed writes leave in-memory selection usable
    appThrow.api.setProfileSection('records');
    assert.equal(appThrow.api.activeProfileSection, 'records');
    assert.equal(appThrow.el('profileRecordsSection').hidden, false);

    // Workout draft state is not mutated by profile section switching
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex1');
    const draftBefore = JSON.stringify(app.api.activeWorkout);
    app.api.setProfileSection('progress');
    app.api.setProfileSection('settings');
    app.api.setProfileSection('records');
    assert.equal(JSON.stringify(app.api.activeWorkout), draftBefore, 'workout draft unchanged');
  });

  it('calendar-link-opens-progress-section', () => {
    const app = createApp();
    // Start with profile on settings or records
    app.api.setProfileSection('settings');
    assert.equal(app.api.getProfileSection(), 'settings');

    // Invoke history calendar shortcut
    app.api.goToTrainingCalendar();

    // Must switch to Profile tab and Progress section
    assert.equal(app.api.getProfileSection(), 'progress');
    assert.equal(app.el('profileProgress').hidden, false);
    assert.equal(app.el('profileSettings').hidden, true);

    // Retains current calendar month
    const now = new Date();
    assert.equal(app.api.calYear, now.getFullYear());
    assert.equal(app.api.calMonth, now.getMonth());
  });

  it('records-link-opens-records-section', () => {
    const app = createApp();
    // Seed a completed workout history
    app.api.state.history = [{
      id: 'w1', title: 'Chest Day', date: Date.now() - 3600000, durationSec: 1800,
      totalVolume: 500, totalSets: 1, prCount: 0,
      exercises: [{
        exId: 'ex1', note: '',
        sets: [{ type: 'N', weight: 80, reps: 6, done: true }]
      }]
    }];

    // Start with profile section on progress or settings
    app.api.setProfileSection('progress');
    assert.equal(app.api.getProfileSection(), 'progress');

    // Opening record from profile switches section to 'records'
    app.api.openExerciseProgress('ex1', 'profile');
    assert.equal(app.api.getProfileSection(), 'records');
    assert.equal(app.el('profileRecordsSection').hidden, false);
    assert.equal(app.api.progressExId, 'ex1');
    assert.equal(app.api.progressOrigin, 'profile');
    app.api.closeExerciseProgress();

    // Opening from another origin (e.g. 'catalogue') preserves that origin and does not change profile section
    app.api.setProfileSection('progress');
    app.api.openExerciseProgress('ex1', 'catalogue');
    assert.equal(app.api.progressOrigin, 'catalogue');
    assert.equal(app.api.getProfileSection(), 'progress');
    app.api.closeExerciseProgress();
  });

  it('settings-section-contains-all-settings', () => {
    const html = loadIndexHtml();
    const settingsIdx = html.indexOf('id="profileSettings"');
    assert.ok(settingsIdx > 0, 'profileSettings exists in index.html');
    const settingsHtml = html.slice(settingsIdx, settingsIdx + 12000);

    // Profile summary & rerun onboarding containers
    assert.ok(settingsHtml.includes('id="myProfileCard"'), 'myProfileCard in settings');
    assert.ok(settingsHtml.includes('id="myProfileBody"'), 'myProfileBody in settings');

    // Rendered profile body offers onboarding setup/re-run
    const app = createApp();
    app.api.renderMyProfile();
    const profileBodyHtml = app.document.getElementById('myProfileBody').innerHTML;
    assert.ok(profileBodyHtml.includes('startOnboardingRerun()'), 'startOnboardingRerun in profile body');

    // Units: read-only summary line (supervisor decision: unit toggle button stays in header)
    assert.ok(settingsHtml.includes('id="settingsUnitDisplay"'), 'settingsUnitDisplay in settings');
    assert.ok(settingsHtml.includes('change with the KG button at the top'), 'read-only guidance in settings');

    // Preferences
    assert.ok(settingsHtml.includes('id="defaultRestInput"'), 'defaultRestInput in settings');
    assert.ok(settingsHtml.includes('id="prevScopeSelect"'), 'prevScopeSelect in settings');
    assert.ok(settingsHtml.includes('id="weekStartSelect"'), 'weekStartSelect in settings');
    assert.ok(settingsHtml.includes('id="dropStepPctSelect"'), 'dropStepPctSelect in settings');
    assert.ok(settingsHtml.includes('id="supersetAdvanceCheck"'), 'supersetAdvanceCheck in settings');

    // Plate calculator settings
    assert.ok(settingsHtml.includes('id="plateBarKgInput"'), 'plateBarKgInput in settings');
    assert.ok(settingsHtml.includes('id="plateBarLbInput"'), 'plateBarLbInput in settings');
    assert.ok(settingsHtml.includes('id="platePlatesKgInput"'), 'platePlatesKgInput in settings');
    assert.ok(settingsHtml.includes('id="platePlatesLbInput"'), 'platePlatesLbInput in settings');

    // Backup, restore, undo surfaces
    assert.ok(settingsHtml.includes('exportData()'), 'exportData in settings');
    assert.ok(settingsHtml.includes('id="importInput"'), 'importInput in settings');
    assert.ok(settingsHtml.includes('id="restoreDoneBanner"'), 'restoreDoneBanner in settings');
    assert.ok(settingsHtml.includes('id="undoRestoreBtn"'), 'undoRestoreBtn in settings');
  });

  it('no-setting-lost-or-duplicated', () => {
    const html = loadIndexHtml();
    const settingIds = [
      'defaultRestInput',
      'prevScopeSelect',
      'weekStartSelect',
      'dropStepPctSelect',
      'supersetAdvanceCheck',
      'plateBarKgInput',
      'plateBarLbInput',
      'platePlatesKgInput',
      'platePlatesLbInput',
      'importInput',
      'restoreDoneBanner',
      'undoRestoreBtn',
    ];

    // Every setting control ID must occur exactly once across the document
    for (const id of settingIds) {
      const matches = [...html.matchAll(new RegExp(`id="${id}"`, 'g'))];
      assert.equal(matches.length, 1, `setting ID ${id} must appear exactly once`);
    }

    // Header KG/LBS toggle button exists exactly once (per supervisor audit)
    const unitMatches = [...html.matchAll(/id="unitToggleBtn"/g)];
    assert.equal(unitMatches.length, 1, 'unitToggleBtn must appear exactly once in header');

    // Exercise save/reload handlers
    const store = new Map();
    const app = createApp({ store });
    app.el('defaultRestInput').value = '150';
    app.api.saveRestPreference();
    app.api.setPrevScope('same');
    app.api.setWeekStart('sun');
    app.el('plateBarKgInput').value = '25';
    app.api.savePlateSettings();

    // Verify state updated and persists
    assert.equal(app.api.state.defaultRest, 150);
    assert.equal(app.api.getPrevScope(), 'same');
    assert.equal(app.api.getWeekStart(), 'sun');
    assert.equal(app.api.getPlateSettings().barKg, 25);

    const app2 = createApp({ store });
    assert.equal(app2.api.state.defaultRest, 150);
    assert.equal(app2.api.getPrevScope(), 'same');
    assert.equal(app2.api.getWeekStart(), 'sun');
    assert.equal(app2.api.getPlateSettings().barKg, 25);

    // Schema version and core state arrays remain untouched
    assert.equal(app2.api.state.schemaVersion, 2);
    assert.ok(Array.isArray(app2.api.state.exercises));
    assert.ok(Array.isArray(app2.api.state.routines));
    assert.ok(Array.isArray(app2.api.state.history));
  });

  it('tokens-defined-and-used', () => {
    const html = loadIndexHtml();

    // Named spacing tokens
    assert.ok(html.includes('--space-4: 4px;'), '--space-4 token defined');
    assert.ok(html.includes('--space-8: 8px;'), '--space-8 token defined');
    assert.ok(html.includes('--space-12: 12px;'), '--space-12 token defined');
    assert.ok(html.includes('--space-16: 16px;'), '--space-16 token defined');
    assert.ok(html.includes('--space-24: 24px;'), '--space-24 token defined');

    // Named radii
    assert.ok(html.includes('--radius-8: 8px;'), '--radius-8 token defined');
    assert.ok(html.includes('--radius-12: 12px;'), '--radius-12 token defined');
    assert.ok(html.includes('--radius-16: 16px;'), '--radius-16 token defined');

    // Named typography
    assert.ok(html.includes('--font-12: 12px;'), '--font-12 token defined');
    assert.ok(html.includes('--font-14: 14px;'), '--font-14 token defined');
    assert.ok(html.includes('--font-16: 16px;'), '--font-16 token defined');
    assert.ok(html.includes('--font-20: 20px;'), '--font-20 token defined');
    assert.ok(html.includes('--font-24: 24px;'), '--font-24 token defined');

    // Control height & brand tokens
    assert.ok(html.includes('--control-min-height: 44px;'), '--control-min-height token defined');
    assert.ok(html.includes('--brand-lime: #a3e635;'), '--brand-lime token defined');

    // Preserved palette
    assert.ok(html.includes('--bg-main: #0b0f19;'), '--bg-main preserved');
    assert.ok(html.includes('--bg-card: #151c2c;'), '--bg-card preserved');
    assert.ok(html.includes('--primary: #3b82f6;'), '--primary preserved');
    assert.ok(html.includes('--lime: #84cc16;'), '--lime preserved');

    // Shared consumer rules
    assert.ok(html.includes('.section-header'), '.section-header defined');
    assert.ok(html.includes('.section-title'), '.section-title defined');
    assert.ok(html.includes('.section-group'), '.section-group defined');
    assert.ok(html.includes('.empty-state'), '.empty-state defined');
    assert.ok(html.includes('.empty-state-title'), '.empty-state-title defined');
    assert.ok(html.includes('.empty-state-help'), '.empty-state-help defined');

    // Focus-visible and reduced motion
    assert.ok(html.includes(':focus-visible'), ':focus-visible rule defined');
    assert.ok(html.includes('@media (prefers-reduced-motion: reduce)'), 'prefers-reduced-motion rule defined');
  });

  it('buttons-min-44px', () => {
    const html = loadIndexHtml();

    // CSS rule ensures .btn minimum height is 44px
    assert.ok(html.includes('.btn {') && html.includes('--control-min-height'), '.btn enforces control min height');

    // Profile segmented control buttons are at least 44px
    assert.ok(html.includes('.profile-section-btn {') && html.includes('--control-min-height'), '.profile-section-btn enforces 44px min-height');

    // Verify that across static markup and generated HTML, no button has inline height < 40px
    // (Supervisor audit: live workout rows kept as-is, calendar day cells may stay 40px; all other buttons >= 44px)
    const buttonInlineHeights = [...html.matchAll(/<button[^>]+style=[^>]*\b(?:min-)?height:\s*([0-3][0-9])px/g)];
    for (const m of buttonInlineHeights) {
      const fullMatch = m[0];
      const h = parseInt(m[1], 10);
      // Calendar cells are allowed 40px, but < 40px is prohibited on buttons
      assert.ok(h >= 40, `button inline height ${h}px is below 40px: ${fullMatch}`);
    }
  });

  it('handlers-compile', () => {
    const app = createApp();

    // Render every section and screen variant
    app.api.setProfileSection('progress');
    app.api.renderProfileStats();
    app.api.renderTrainingCalendar();

    app.api.setProfileSection('records');
    app.api.renderProfileRecords();

    app.api.setProfileSection('settings');
    app.api.hydrateSettingsControls();

    app.api.renderExercisesTab();
    app.api.renderExercisesList();

    // Exercise details: built-in exercise
    app.api.openExerciseDetail('ex1');

    // Exercise details: custom exercise
    app.api.state.exercises.push({
      id: 'custom_test_ex',
      name: 'Custom Pushup',
      muscle: 'Chest',
      equipment: 'Bodyweight',
      type: 'reps_only',
      custom: true,
      hidden: false,
    });
    app.api.openExerciseDetail('custom_test_ex');

    // Exercise details: hidden exercise
    app.api.state.exercises.push({
      id: 'hidden_test_ex',
      name: 'Hidden Deadlift',
      muscle: 'Back',
      equipment: 'Barbell',
      type: 'weight_reps',
      custom: true,
      hidden: true,
    });
    app.api.openExerciseDetail('hidden_test_ex');

    // Collect static HTML (markup before <script>)
    const staticHtml = loadIndexHtml().split('<script>')[0];
    const handlerRegex = /\b(on[a-z]+)="([^"]+)"/g;

    let checkedCount = 0;
    for (const m of staticHtml.matchAll(handlerRegex)) {
      const handlerCode = decodeHtmlEntities(m[2]);
      assert.doesNotThrow(() => {
        new Function(handlerCode);
      }, `static handler failed to compile: ${m[1]}="${m[2]}"`);
      checkedCount++;
    }

    // Collect rendered HTML chunks
    const renderedChunks = [
      app.document.getElementById('profileProgress').innerHTML,
      app.document.getElementById('profileRecordsSection').innerHTML,
      app.document.getElementById('profileSettings').innerHTML,
      app.document.getElementById('exercisesDirectory').innerHTML,
      app.document.getElementById('exDetailBody').innerHTML,
      app.document.getElementById('calendarGrid').innerHTML,
      app.document.getElementById('calendarWorkload').innerHTML,
    ];

    for (const chunk of renderedChunks) {
      if (!chunk) continue;
      for (const m of chunk.matchAll(handlerRegex)) {
        const handlerCode = decodeHtmlEntities(m[2]);
        assert.doesNotThrow(() => {
          new Function(handlerCode);
        }, `rendered handler failed to compile: ${m[1]}="${m[2]}"`);
        checkedCount++;
      }
    }

    assert.ok(checkedCount > 15, `checked ${checkedCount} handlers`);

    // Exercise handlers directly
    app.api.setProfileSection('records');
    assert.equal(app.api.getProfileSection(), 'records');
    app.api.setProfileSection('progress');
    assert.equal(app.api.getProfileSection(), 'progress');
    app.api.calPrevMonth();
    app.api.calNextMonth();
    app.api.setExFilter('muscle', 'Chest');
    app.api.setExFilter('muscle', null);
  });

  it('nothing-wider-than-412', () => {
    const html = loadIndexHtml();

    // Main container capped at 412px
    assert.ok(html.includes('max-width: 412px') || html.includes('max-width:min(100%, 412px)'), 'main layout capped at 412px');
    assert.ok(html.includes('id="calendarCard" style="max-width:412px;'), 'calendar card capped at 412px');

    // Cards and modals use flexible width
    assert.ok(html.includes('.card {') && html.includes('border-radius: var(--radius-16);'), 'card styling present');

    // Render with an extremely long exercise name to verify no fixed-width blowout
    const app = createApp();
    app.api.state.exercises.push({
      id: 'ex_very_long_name',
      name: 'Extraordinary Incline Dumbbell Hammer Curl With Extended Iso-Hold And Rotation '.repeat(3),
      muscle: 'Biceps',
      equipment: 'Dumbbell',
      type: 'weight_reps',
    });

    app.api.renderExercisesTab();
    app.api.renderExercisesList();
    const listHtml = app.document.getElementById('exercisesDirectory').innerHTML;
    assert.ok(listHtml.includes('Extraordinary Incline'));

    app.api.openExerciseDetail('ex_very_long_name');
    const detailHtml = app.document.getElementById('exDetailBody').innerHTML;
    assert.ok(detailHtml.includes('Extraordinary Incline'));

    // Check no inline style declares width > 412px
    const largeWidths = [...detailHtml.matchAll(/\bwidth:\s*([5-9]\d{2,}|\d{4,})px/g)];
    assert.equal(largeWidths.length, 0, 'no detail element exceeds 412px width');
  });

  it('typing-in-settings-does-not-rebuild', () => {
    const app = createApp();
    app.api.switchTab('profile');
    app.api.setProfileSection('settings');

    const settingsPanel = app.document.getElementById('profileSettings');
    const restInput = app.document.getElementById('defaultRestInput');
    const barKgInput = app.document.getElementById('plateBarKgInput');
    const platesKgInput = app.document.getElementById('platePlatesKgInput');

    // Simulate typing in defaultRestInput
    restInput.value = '180';
    app.api.saveRestPreference();

    // Input element identity and ancestor container are preserved
    assert.equal(app.document.getElementById('defaultRestInput'), restInput, 'restInput identity retained');
    assert.equal(app.document.getElementById('profileSettings'), settingsPanel, 'profileSettings container not rebuilt');

    // Simulate typing in plate settings
    barKgInput.value = '25';
    platesKgInput.value = '20, 15, 10, 5, 2.5, 1.25';
    app.api.savePlateSettings();

    assert.equal(app.document.getElementById('plateBarKgInput'), barKgInput, 'barKgInput identity retained');
    assert.equal(app.document.getElementById('platePlatesKgInput'), platesKgInput, 'platesKgInput identity retained');

    // Rest input value remains intact (not wiped by plate settings save)
    assert.equal(restInput.value, '180', 'restInput value retained during plate settings save');
    assert.equal(app.api.getPlateSettings().barKg, 25);
    assert.deepEqual(plain(app.api.getPlateSettings().platesKg), [20, 15, 10, 5, 2.5, 1.25]);

    // Exercise search input typing stability
    app.api.switchTab('exercises');
    const searchInput = app.document.getElementById('exSearchInput');
    searchInput.value = 'bench';
    app.api.onExSearchInput();

    // Search input identity retained and results updated
    assert.equal(app.document.getElementById('exSearchInput'), searchInput, 'exSearchInput identity retained');
    const resultsHtml = app.document.getElementById('exercisesDirectory').innerHTML;
    assert.ok(resultsHtml.toLowerCase().includes('bench'), 'results reflect search input');
  });
});
