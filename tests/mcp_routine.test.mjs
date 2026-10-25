// tests/mcp_routine.test.mjs — P4-11 phase 1 in-app routine import.
// Runs the REAL index.html script through the harness: link import, paste,
// file, preview-only (nothing saved), duplicate names, the shared error table
// against mcp/routine-format.mjs, handler compilation and the 412 px frame.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml, STATE_KEY } from './harness.mjs';
import {
  validateRoutinePayload,
  buildRoutinePayload
} from '../mcp/routine-format.mjs';

function encodeLink(payload) {
  return '#import-routine=' + Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function validPayload(name = 'Push Day') {
  return {
    plzTrainRoutine: 1,
    name: name,
    exercises: [
      { exId: 'ex1', sets: 3, reps: '8-12', restSec: 90 },
      { exId: 'ex7', sets: 4, reps: '5', note: 'Brace hard' }
    ]
  };
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function builtinIds(app) {
  return app.api.EXERCISE_ROWS.map((row) => row[0]);
}

// A state whose onboarding is finished, so an import link at start-up is shown
// immediately (a true first run defers it until the overlay closes).
function finishedStore() {
  const store = new Map();
  const seed = createApp({ store });
  seed.api.finishOnboarding();
  return store;
}

describe('P4-11 routine import: link', () => {
  it('link-import-shows-preview-and-clears-hash', () => {
    const location = { hash: encodeLink(validPayload('AI Push')), pathname: '/app', search: '?x=1' };
    const app = createApp({ store: finishedStore(), location });

    assert.equal(location.hash, '', 'hash is dropped before validation/display');
    assert.ok(app.el('routineImportModal').classList.contains('open'), 'preview modal opened');
    const preview = app.el('routineImportPreview').innerHTML;
    assert.ok(preview.includes('AI Push'), 'routine name shown');
    assert.ok(preview.includes('Bench Press (Barbell) — 3 × 8-12 · rest 90s'), 'per-exercise line shown: ' + preview);
    assert.ok(preview.includes('Squat (Barbell) — 4 × 5'), 'second exercise shown');
    assert.equal(app.el('routineImportErrors').style.display, 'none', 'no errors');
    assert.equal(app.api.pendingRoutineImport.name, 'AI Push', 'pending routine ready for confirm');
    assert.deepEqual(app.alerts, [], 'no alert for a valid link');
  });

  it('invalid link clears the hash first and lists every error', () => {
    const bad = validPayload('Bad');
    bad.exercises[1].sets = 25;
    bad.exercises[0].exId = 'ex999';
    const location = { hash: encodeLink(bad), pathname: '/', search: '' };
    const app = createApp({ store: finishedStore(), location });

    assert.equal(location.hash, '', 'hash still cleared');
    assert.equal(app.alerts.length, 1, 'one alert');
    assert.ok(app.alerts[0].startsWith('❌ '), 'alert is the error list');
    assert.ok(app.alerts[0].includes('exercises[1].sets must be a whole number 1–10 (got 25)'), app.alerts[0]);
    assert.ok(app.alerts[0].includes('exercises[0].exId must be one of the built-in exercise ids (got ex999)'), app.alerts[0]);
    assert.equal(app.api.pendingRoutineImport, null, 'nothing pending');
    assert.ok(!app.el('routineImportModal').classList.contains('open'), 'no preview modal');
  });
});

describe('P4-11 routine import: nothing saved without confirm', () => {
  it('nothing-saved-without-confirm', () => {
    const app = createApp();
    const before = app.stateJson();
    const storeBefore = [...app.store.entries()];
    const count = app.api.state.routines.length;

    app.api.previewRoutineImportText(JSON.stringify(validPayload('Saved Later')));
    assert.ok(app.api.pendingRoutineImport, 'valid payload previewed');
    assert.equal(app.stateJson(), before, 'state untouched by preview');
    assert.deepEqual([...app.store.entries()], storeBefore, 'storage untouched by preview');

    app.api.cancelRoutineImport();
    assert.equal(app.api.pendingRoutineImport, null, 'cancel clears pending');
    assert.equal(app.api.state.routines.length, count, 'cancel saves nothing');

    // A rejected payload can never be confirmed, even via the Add button.
    const bad = validPayload('Broken');
    bad.exercises[0].sets = 0;
    app.api.previewRoutineImportText(JSON.stringify(bad));
    assert.equal(app.api.pendingRoutineImport, null, 'invalid payload not pending');
    app.api.confirmRoutineImport();
    assert.equal(app.api.state.routines.length, count, 'Add does nothing without a valid routine');
  });

  it('invalid-payload-lists-errors', () => {
    const app = createApp();
    app.api.openRoutineImport();
    assert.ok(app.el('routineImportModal').classList.contains('open'), 'manual open works');

    const payload = validPayload('Too Many Errors');
    // 10 bad exercises x 2 problems = 20 errors; only 8 are shown + a count.
    payload.exercises = [];
    for (let i = 0; i < 10; i++) payload.exercises.push({ exId: 'ex' + (900 + i), sets: 25, reps: '8' });
    app.api.previewRoutineImportText(JSON.stringify(payload));

    const shown = app.el('routineImportErrors');
    assert.equal(shown.style.display, 'block', 'errors visible');
    const lines = shown.textContent.split('\n');
    assert.equal(lines.length, 9, '8 errors + the "and N more" line');
    assert.equal(lines[0], 'exercises[0].exId must be one of the built-in exercise ids (got ex900)');
    assert.equal(lines[1], 'exercises[0].sets must be a whole number 1–10 (got 25)');
    assert.equal(lines[8], 'and 12 more');
    assert.equal(app.api.pendingRoutineImport, null, 'nothing pending');

    // Non-JSON paste gets one plain line, never a crash.
    app.api.previewRoutineImportText('definitely not json');
    assert.ok(app.el('routineImportErrors').textContent.includes('This is not JSON'));
  });

  it('unknown-exercise-rejected', () => {
    const app = createApp();
    const payload = validPayload('Ghost');
    payload.exercises[0].exId = 'ex_custom_private';
    const r = app.api.validateRoutineImport(payload);
    assert.equal(r.ok, false, 'custom/unknown id rejected in phase 1');
    assert.equal(JSON.stringify(r.errors), JSON.stringify(['exercises[0].exId must be one of the built-in exercise ids (got ex_custom_private)']));
    assert.equal(app.api.validateRoutineImport(validPayload()).ok, true, 'a built-in id still passes');
  });

  it('duplicate-name-gets-suffix', () => {
    const app = createApp();
    for (let i = 0; i < 3; i++) {
      app.api.previewRoutineImportText(JSON.stringify(validPayload('Leg Day')));
      app.api.confirmRoutineImport();
    }
    const names = app.api.state.routines.map((r) => r.name);
    assert.equal(names.filter((n) => n === 'Leg Day').length, 1, 'first keeps the name');
    assert.ok(names.includes('Leg Day (2)'), 'second gets (2)');
    assert.ok(names.includes('Leg Day (3)'), 'third gets (3)');

    // Double tap on Add adds exactly one routine.
    const count = app.api.state.routines.length;
    app.api.previewRoutineImportText(JSON.stringify(validPayload('Once Only')));
    app.api.confirmRoutineImport();
    app.api.confirmRoutineImport();
    assert.equal(app.api.state.routines.length, count + 1, 'second confirm is a no-op');
  });
});

describe('P4-11 routine import: paste and file', () => {
  it('paste-and-file-import', async () => {
    const app = createApp();
    const text = JSON.stringify(validPayload('Pasted Plan'));

    // Paste: one tap on Add validates and saves it.
    app.api.openRoutineImport();
    app.el('routineImportText').value = text;
    app.api.confirmRoutineImport();
    const pasted = app.api.state.routines.find((r) => r.name === 'Pasted Plan');
    assert.ok(pasted, 'pasted routine saved');
    assert.deepEqual(
      { sets: pasted.exercises[0].sets, lo: pasted.exercises[0].targetRepsMin, hi: pasted.exercises[0].targetRepsMax, rest: pasted.exercises[0].restSec },
      { sets: 3, lo: 8, hi: 12, rest: 90 },
      'reps string became a rep target and rest was kept'
    );
    assert.equal(pasted.exercises[1].note, 'Brace hard', 'note kept');
    assert.ok(!app.el('routineImportModal').classList.contains('open'), 'modal closed after add');
    assert.ok(!app.el('routineImportText').value, 'textarea cleared');
    const stored = JSON.parse(app.store.get(STATE_KEY));
    assert.ok(stored.routines.some((r) => r.name === 'Pasted Plan'), 'saved to localStorage');

    // File: the same text read by FileReader, preview first, then confirm.
    const file = { _text: JSON.stringify(validPayload('From File')) };
    app.api.openRoutineImport();
    app.api.routineFileChosen({ target: { files: [file], value: 'C:\\fakepath\\routine.json' } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(app.api.pendingRoutineImport, 'file content validated');
    assert.ok(app.el('routineImportPreview').innerHTML.includes('From File'), 'file preview rendered');
    assert.equal(app.api.state.routines.filter((r) => r.name === 'From File').length, 0, 'nothing saved before Add');
    app.api.confirmRoutineImport();
    assert.equal(app.api.state.routines.filter((r) => r.name === 'From File').length, 1, 'file routine saved after Add');
  });

  it('pending-import-waits-for-onboarding-to-close', () => {
    // location is injected but no hash: use the public flush path with a
    // pending routine to prove the overlay is respected.
    const app = createApp();
    app.api.previewRoutineImportText(JSON.stringify(validPayload('After Setup')));
    app.api.cancelRoutineImport();
    assert.equal(app.api.pendingRoutineImport, null);

    app.api.previewRoutineImportText(JSON.stringify(validPayload('After Setup')));
    const overlay = app.el('onboardingOverlay');
    overlay.classList.add('open');
    app.api.flushPendingRoutineImport();
    assert.ok(!app.el('routineImportModal').classList.contains('open'), 'held while onboarding is open');
    overlay.classList.remove('open');
    app.api.flushPendingRoutineImport();
    assert.ok(app.el('routineImportModal').classList.contains('open'), 'shown once onboarding closes');
    assert.ok(app.el('routineImportPreview').innerHTML.includes('After Setup'));
  });
});

describe('P4-11 routine import: shared rules', () => {
  it('mcp-and-app-validate-same-cases', () => {
    const app = createApp();
    const ids = builtinIds(app);
    const longNote = 'x'.repeat(141);
    const tooMany = [];
    for (let i = 0; i < 21; i++) tooMany.push({ exId: 'ex1', sets: 3, reps: '8' });

    const cases = [
      ['minimal valid', { plzTrainRoutine: 1, name: 'A', exercises: [{ exId: 'ex1', sets: 3, reps: '8' }] }],
      ['valid with range/rest/note', validPayload('Full Push')],
      ['valid trimmed name', { plzTrainRoutine: 1, name: '  Push  ', exercises: [{ exId: 'ex7', sets: 4, reps: '5', restSec: 0 }] }],
      ['not an object', [1, 2, 3]],
      ['wrong version', Object.assign(validPayload(), { plzTrainRoutine: 2 })],
      ['empty name', { plzTrainRoutine: 1, name: '   ', exercises: [{ exId: 'ex1', sets: 3, reps: '8' }] }],
      ['long name', { plzTrainRoutine: 1, name: 'n'.repeat(61), exercises: [{ exId: 'ex1', sets: 3, reps: '8' }] }],
      ['no exercises', { plzTrainRoutine: 1, name: 'Empty', exercises: [] }],
      ['21 exercises', { plzTrainRoutine: 1, name: 'Huge', exercises: tooMany }],
      ['bad ids', { plzTrainRoutine: 1, name: 'Ids', exercises: [{ exId: 'ex999', sets: 3, reps: '8' }, { exId: 7, sets: 3, reps: '8' }] }],
      ['bad sets', { plzTrainRoutine: 1, name: 'Sets', exercises: [{ exId: 'ex1', sets: 25, reps: '8' }, { exId: 'ex1', sets: 3.5, reps: '8' }, { exId: 'ex1', sets: '3', reps: '8' }] }],
      ['bad reps/rest/note', { plzTrainRoutine: 1, name: 'Rest', exercises: [
        { exId: 'ex1', sets: 3, reps: 8, restSec: 900, note: longNote },
        { exId: 'ex1', sets: 3, reps: 'zero', restSec: '90', note: 42 },
        { exId: 'ex1', sets: 3, reps: '0-5' },
        { exId: 'ex1', sets: 3, reps: '12-8' },
        { exId: 'ex1', sets: 3, reps: '101' }
      ] }]
    ];
    assert.equal(cases.length, 12, 'the documented table is 12 cases');

    for (const [label, payload] of cases) {
      const appResult = app.api.validateRoutineImport(payload);
      const mcpResult = validateRoutinePayload(payload, ids);
      assert.equal(appResult.ok, mcpResult.ok, label + ': ok agrees');
      if (appResult.ok) {
        // The app runs in a vm realm; compare the data, not the prototype.
        assert.equal(JSON.stringify(appResult.routine), JSON.stringify(mcpResult.routine), label + ': routine agrees');
      } else {
        assert.equal(JSON.stringify(appResult.errors), JSON.stringify(mcpResult.errors), label + ': error text agrees');
      }
    }

    // The encoded payload round-trips through the same normaliser.
    const built = buildRoutinePayload(validPayload('Round Trip'));
    assert.equal(validateRoutinePayload(built, ids).ok, true, 'buildRoutinePayload output is valid');
  });
});

describe('P4-11 routine import: markup contract', () => {
  it('handlers-compile', () => {
    const html = loadIndexHtml();
    const start = html.indexOf('id="routineImportModal"');
    assert.ok(start > 0, 'import modal exists');
    const block = html.slice(start - 100, html.indexOf('<!-- FIRST-RUN ONBOARDING', start));
    let checked = 0;
    for (const m of block.matchAll(/\bon[a-z]+="([^"]+)"/g)) {
      const code = decodeHtmlEntities(m[1]);
      assert.doesNotThrow(() => new Function(code), `handler failed to compile: ${m[1]}`);
      checked++;
    }
    assert.ok(checked >= 3, 'textarea, file input and buttons all wired');
    for (const id of ['routineImportText', 'routineImportFile', 'routineImportPreview', 'routineImportErrors']) {
      const n = [...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length;
      assert.equal(n, 1, `${id} must appear exactly once`);
    }
    assert.ok(block.includes('onclick="confirmRoutineImport()"'), 'Add routine wired');
    assert.ok(block.includes('onclick="cancelRoutineImport()"'), 'Cancel wired');
    assert.ok(block.includes('accept=".json,.txt,application/json,text/plain"'), 'file picker accepts JSON/text');
    assert.ok(block.includes('role="alert"'), 'errors are announced');

    // The Import routine entry point sits directly under the My Routines header.
    const header = html.indexOf('My Routines (Unlimited)');
    const list = html.indexOf('id="routinesList"', header);
    const between = html.slice(header, list);
    assert.ok(between.includes('onclick="openRoutineImport()"'), 'Import routine button under the header');
    assert.ok(between.includes('⬇ Import routine'), 'plain label');
  });

  it('nothing-wider-than-412', () => {
    const html = loadIndexHtml();
    const start = html.indexOf('id="routineImportModal"');
    const block = html.slice(start, html.indexOf('<!-- FIRST-RUN ONBOARDING', start));
    const widths = [...block.matchAll(/(?<!max-)\bwidth:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of widths) assert.ok(w <= 412, `width ${w}px exceeds the 412 px frame`);
    assert.ok(block.includes('max-width:412px'), 'modal capped at 412 px');
    for (const label of ['Choose file', 'Add routine', 'Cancel']) {
      const at = block.indexOf(label + '</button>');
      assert.ok(at > 0, label + ' button exists');
      const tagStart = block.lastIndexOf('<button', at);
      const tag = block.slice(tagStart, at);
      assert.ok(tag.includes('min-height:44px'), label + ' is at least 44 px tall');
    }
    const importAt = html.indexOf('⬇ Import routine');
    const tagStart = html.lastIndexOf('<button', importAt);
    assert.ok(html.slice(tagStart, importAt).includes('min-height:44px'), 'Import routine button is 44 px');
  });
});
