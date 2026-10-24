// tests/p2_13_howto.test.mjs — P2-13 (personal part): "How to do it" text
// (Setup / Move / Avoid) for all 100 built-in exercises in the detail sheet.
// Runs against the REAL <script> in index.html via tests/harness.mjs.
// The text is read-only: no schema, storage or network involvement.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml } from './harness.mjs';

const BUILTIN_IDS = Array.from({ length: 100 }, (_, i) => 'ex' + (i + 1));

function detailHtml(app, exId) {
  app.api.openExerciseDetail(exId);
  return app.el('exDetailBody').innerHTML;
}

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

describe('P2-13 how-to text (exercise detail sheet)', () => {
  it('howto-shown-for-every-builtin', () => {
    const app = createApp();
    const table = app.api.EXERCISE_HOWTO;
    for (const id of BUILTIN_IDS) {
      const ex = app.api.state.exercises.find((e) => e.id === id);
      assert.ok(ex, 'built-in exercise exists: ' + id);
      const html = detailHtml(app, id);
      assert.ok(html.includes('How to do it'), 'how-to block shown for ' + id);
      assert.ok(html.includes(app.api.esc(table[id].setup)), 'setup text shown for ' + id);
      assert.ok(html.includes(app.api.esc(table[id].move)), 'move text shown for ' + id);
      assert.ok(html.includes(app.api.esc(table[id].avoid)), 'avoid text shown for ' + id);
    }
  });

  it('howto-has-setup-move-avoid', () => {
    const app = createApp();
    const table = app.api.EXERCISE_HOWTO;
    assert.deepEqual(Object.keys(table).sort(), [...BUILTIN_IDS].sort(), 'exactly ex1..ex100');
    for (const id of BUILTIN_IDS) {
      const entry = table[id];
      assert.equal(typeof entry, 'object', id + ' is an object');
      assert.deepEqual(Object.keys(entry).sort(), ['avoid', 'move', 'setup'], id + ' has the three fields only');
      for (const field of ['setup', 'move', 'avoid']) {
        assert.equal(typeof entry[field], 'string', id + '.' + field + ' is a string');
        assert.ok(entry[field].trim().length > 0, id + '.' + field + ' is not empty');
        assert.equal(entry[field], entry[field].trim(), id + '.' + field + ' has no outer spaces');
      }
    }
  });

  it('howto-short-max-words', () => {
    const app = createApp();
    const table = app.api.EXERCISE_HOWTO;
    for (const id of BUILTIN_IDS) {
      const s = words(table[id].setup).length;
      const m = words(table[id].move).length;
      const a = words(table[id].avoid).length;
      assert.ok(s <= 14, id + ' setup is at most 14 words (got ' + s + ')');
      assert.ok(m <= 20, id + ' move is at most 20 words (got ' + m + ')');
      assert.ok(a <= 14, id + ' avoid is at most 14 words (got ' + a + ')');
      assert.ok(s + m + a <= 45, id + ' whole block is at most 45 words (got ' + (s + m + a) + ')');

      const parts = (t) => (t.match(/[.!?]+/g) || []).length;
      assert.ok(parts(table[id].setup) <= 1, id + ' setup is one sentence');
      assert.ok(parts(table[id].avoid) <= 1, id + ' avoid is one sentence');
      assert.ok(parts(table[id].move) <= 2, id + ' move is one or two sentences');
      assert.ok(!/[0-9]/.test(table[id].setup + table[id].move + table[id].avoid), id + ' has no numbers');
    }
  });

  it('howto-no-medical-or-rep-advice', () => {
    const app = createApp();
    const table = app.api.EXERCISE_HOWTO;
    const banned = /\b(reps?|sets?|kgs?|lbs?|pounds?|fail(?:ed|ure)?|pain(?:ful)?|injur\w*|doctor|medical|weight\s+loss|guarantee\w*)\b/i;
    for (const id of BUILTIN_IDS) {
      const all = [table[id].setup, table[id].move, table[id].avoid].join(' | ');
      assert.ok(!banned.test(all), id + ' gives no dose, medical or guarantee wording: ' + all);
    }
  });

  it('howto-texts-are-distinct', () => {
    const app = createApp();
    const table = app.api.EXERCISE_HOWTO;
    const seen = new Map();
    for (const id of BUILTIN_IDS) {
      const key = [table[id].setup, table[id].move, table[id].avoid].join('|').toLowerCase();
      assert.ok(!seen.has(key), id + ' does not repeat ' + seen.get(key));
      seen.set(key, id);
    }
  });

  it('no-howto-for-custom', () => {
    const app = createApp();
    assert.equal(app.api.exerciseHowtoHtml(null), '', 'null exercise renders nothing');
    assert.equal(app.api.exerciseHowtoHtml(undefined), '', 'undefined exercise renders nothing');
    assert.equal(app.api.exerciseHowtoHtml({ id: 'ex999', name: 'Unknown' }), '', 'unknown id renders nothing');

    app.api.state.exercises.push({
      id: 'custom_lunge',
      name: 'Custom Lunge',
      equipment: 'Bodyweight',
      muscle: 'Quads',
      primary: 'Quads',
      secondary: [],
      type: 'bodyweight_reps',
      custom: true,
    });
    const html = detailHtml(app, 'custom_lunge');
    assert.ok(html.includes('Custom Lunge'), 'custom sheet still renders');
    assert.ok(!html.includes('How to do it'), 'no how-to block for a custom exercise');
    assert.equal(app.api.exerciseHowtoHtml({ id: 'custom_lunge', name: 'Custom Lunge' }), '', 'helper refuses a custom id');
    assert.equal(
      app.api.exerciseHowtoHtml({ id: '__proto__', name: 'Prototype Probe' }),
      '',
      'a prototype key is not treated as an exercise',
    );
  });

  it('howto-escaped', () => {
    const app = createApp();
    const entry = app.api.EXERCISE_HOWTO.ex1;
    const original = entry.setup;
    const probe = '<b>x</b> & "q" \'q\'';
    try {
      entry.setup = probe;
      const html = app.api.exerciseHowtoHtml(app.api.state.exercises.find((e) => e.id === 'ex1'));
      assert.ok(html.includes('&lt;b&gt;'), 'tags are escaped');
      assert.ok(html.includes('&amp;'), 'ampersand is escaped');
      assert.ok(html.includes('&quot;'), 'double quote is escaped');
      assert.ok(html.includes('&#39;'), 'single quote is escaped');
      assert.ok(!html.includes('<b>x</b>'), 'raw tag never reaches the page');
    } finally {
      entry.setup = original;
    }
    assert.equal(app.api.EXERCISE_HOWTO.ex1.setup, original, 'fixture restored');
    assert.ok(!app.api.exerciseHowtoHtml({ id: 'ex1' }).includes('<b>'), 'restored entry is plain text again');
  });

  it('handlers-compile', () => {
    const app = createApp();
    app.api.state.exercises.push({
      id: 'custom_probe',
      name: 'Custom Probe',
      equipment: 'Other',
      secondary: [],
      type: 'weight_reps',
      custom: true,
    });
    const hidden = app.api.state.exercises.find((e) => e.id === 'ex50');
    hidden.hidden = true;
    for (const id of ['ex1', 'ex60', 'ex100', 'custom_probe', 'ex50']) {
      const html = detailHtml(app, id);
      assert.ok(html.length > 0, 'sheet builds for ' + id);
      const handlers = [...html.matchAll(/\son[a-z]+="([^"]*)"/g)].map((m) => m[1]);
      assert.ok(handlers.length > 0, 'sheet has handlers for ' + id);
      for (const code of handlers) {
        assert.doesNotThrow(() => new Function(code), 'handler compiles in ' + id + ': ' + code);
      }
    }
    assert.ok(detailHtml(app, 'ex50').includes('How to do it'), 'hidden exercise still shows its how-to text');
  });

  it('nothing-wider-than-412', () => {
    const app = createApp();
    const longest = app.api.state.exercises
      .filter((e) => Object.prototype.hasOwnProperty.call(app.api.EXERCISE_HOWTO, e.id))
      .sort((a, b) => b.name.length - a.name.length)[0];
    assert.ok(longest, 'found the longest built-in name');
    const html = detailHtml(app, longest.id);
    assert.ok(html.includes('class="ex-howto"'), 'how-to block present for ' + longest.id);
    assert.ok(html.includes('width:100%'), 'block is fluid');
    const wide = [...html.matchAll(/\bwidth:\s*([5-9]\d{2,}|\d{4,})px/g)];
    assert.equal(wide.length, 0, 'no fixed width above 412px in the sheet');
    assert.ok(!html.includes('<input'), 'no input in the how-to sheet');

    const css = loadIndexHtml();
    assert.ok(css.includes('.ex-howto { width:100%; box-sizing:border-box;'), 'how-to block style present');
    assert.ok(css.includes('.ex-howto-k { flex:0 0 52px;'), 'label column is a fixed 52px');
    assert.ok(css.includes('.ex-howto-t { flex:1; min-width:0; overflow-wrap:anywhere; }'), 'text column wraps anywhere');
    assert.ok(css.includes('.ex-howto-title { font-size:var(--font-12);'), 'title style present');
  });
});
