// tests/p2_13_thumbs.test.mjs — P2-13 follow-up: every row of the Exercises
// list shows a small start-pose thumbnail (or the name's first letter when
// the exercise has no picture). Runs against the REAL index.html script.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { createApp, loadIndexHtml, REPO_ROOT } from './harness.mjs';

const THUMB_DIR = path.join(REPO_ROOT, 'assets', 'exercises', 'thumbs');

describe('P2-13 exercise list thumbnails', () => {
  it('thumb-file-for-every-listed-picture-and-small', () => {
    const app = createApp();
    for (const id of app.api.EXERCISE_PICTURES) {
      const f = path.join(THUMB_DIR, id + '.webp');
      assert.ok(existsSync(f), 'thumb exists for ' + id);
      assert.ok(statSync(f).size < 6 * 1024, 'thumb under 6 KB for ' + id);
    }
  });

  it('list-row-shows-thumb-for-each-exercise', () => {
    const app = createApp();
    app.api.renderExercisesList();
    const html = app.el('exercisesDirectory').innerHTML;
    const visible = app.api.state.exercises.filter((e) => !e.hidden);
    assert.equal((html.match(/class="ex-thumb"/g) || []).length, visible.length, 'one box per row');
    for (const id of app.api.EXERCISE_PICTURES) {
      const ex = app.api.state.exercises.find((e) => e.id === id);
      if (ex && !ex.hidden) assert.ok(html.includes('assets/exercises/thumbs/' + id + '.webp'), 'thumb in list for ' + id);
    }
    assert.ok(html.includes('loading="lazy"'), 'thumbs load lazily');
  });

  it('custom-exercise-gets-letter-no-img', () => {
    const app = createApp();
    const html = app.api.exerciseThumbHtml({ id: 'ex_123', name: 'zercher <b>squat', custom: true });
    assert.ok(!html.includes('<img'), 'no img for custom');
    assert.ok(html.includes('>Z<'), 'first letter shown');
    assert.equal(app.api.exerciseThumbHtml(null), '', 'null renders nothing');
  });

  it('no-literal-thumb-asset-url-in-page', () => {
    assert.ok(!/(src|href)=["']\.?\/?assets\/exercises\/thumbs/.test(loadIndexHtml()), 'no precachable literal url');
  });
  it('workout-card-has-tappable-thumb-opening-howto', () => {
    const app = createApp();
    app.api.startEmptyWorkout();
    app.api.addExerciseToWorkout('ex1');
    app.api.renderActiveWorkout();
    const html = app.el('activeExercisesContainer').innerHTML;
    assert.ok(html.includes('assets/exercises/thumbs/ex1.webp'), 'thumb shown in workout');
    assert.ok(html.includes('class="ex-thumb ex-thumb-btn"'), 'thumb is a button');
    assert.ok(html.includes("onclick=\"openExerciseDetail('ex1')\""), 'tap opens the how-to sheet');
    app.api.openExerciseDetail('ex1');
    assert.ok(app.el('exDetailBody').innerHTML.includes('How to do it'), 'how-to sheet has the steps');
    assert.ok(app.api.activeWorkout, 'workout still running');
  });

  it('workout-thumb-button-handler-compiles', () => {
    const app = createApp();
    const html = app.api.exerciseThumbHtml({ id: 'ex_9', name: "O'Brien press" }, true);
    const m = html.match(/onclick="([^"]*)"/);
    assert.ok(m, 'has onclick');
    assert.doesNotThrow(() => new Function(m[1].replace(/&#39;/g, "'")), 'handler compiles');
    assert.ok(html.includes('>O<') && !html.includes('<img'), 'letter, no img for custom');
  });
});
