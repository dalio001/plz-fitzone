// tests/p5_body.test.mjs — P5-04 private body weight and measurements
// (personal slice). Runs against the REAL <script> in index.html via
// tests/harness.mjs; dates are clock-relative so the suite never goes stale.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml } from './harness.mjs';

function plain(v) { return JSON.parse(JSON.stringify(v)); }

// Local-day key for a day offset from today (the app's day boundary is local).
function dk(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + (offset || 0));
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

function baseBackup() {
  return {
    schemaVersion: 2,
    unit: 'KG',
    exercises: [{ id: 'ex1', name: 'Bench Press (Barbell)' }],
    routines: [],
    history: [],
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

describe('P5-04 body entry and history (UI)', () => {
  it('body-section-in-segmented-control-and-remembered', () => {
    const store = new Map();
    const app = createApp({ store });

    assert.equal(app.api.getProfileSection(), 'progress');
    assert.equal(app.el('profileBody').hidden, true, 'body panel hidden by default');
    assert.equal(app.el('profSecBtn-body').getAttribute('aria-pressed'), 'false');
    assert.equal(app.el('profileSectionControl').tagName, 'DIV');

    app.api.setProfileSection('body');
    assert.equal(app.api.getProfileSection(), 'body');
    assert.equal(app.el('profileBody').hidden, false);
    assert.equal(app.el('profileProgress').hidden, true);
    assert.equal(app.el('profileRecordsSection').hidden, true);
    assert.equal(app.el('profileSettings').hidden, true);
    assert.equal(app.el('profSecBtn-body').getAttribute('aria-pressed'), 'true');
    assert.equal(store.get(app.api.PROFILE_SECTION_KEY), 'body');

    const reloaded = createApp({ store });
    assert.equal(reloaded.api.getProfileSection(), 'body', 'section is remembered');
    assert.equal(reloaded.el('profileBody').hidden, false);

    store.set(app.api.PROFILE_SECTION_KEY, 'nonsense');
    assert.equal(createApp({ store }).api.getProfileSection(), 'progress', 'unknown value falls back');
  });

  it('save-weight-today-one-per-day-replaces', () => {
    const app = createApp();
    const today = dk(0);

    assert.equal(app.el('bodyDateInput').value, today, 'date defaults to today');
    assert.equal(app.el('bodyDateInput').getAttribute('max'), today, 'no future dates');

    app.el('bodyWeightInput').value = '82.4';
    const r = app.api.saveBodyEntry();
    assert.equal(r.ok, true);
    assert.equal(app.api.state.body.length, 1);
    assert.equal(app.api.state.body[0].date, today);
    assert.equal(app.api.state.body[0].weightKg, 82.4);
    const id = app.api.state.body[0].id;
    assert.match(app.el('bodyEntryNote').textContent, /Saved/);
    assert.equal(app.el('bodyError').textContent, '');

    app.el('bodyWeightInput').value = '81.9';
    assert.equal(app.api.saveBodyEntry().ok, true);
    assert.equal(app.api.state.body.length, 1, 'one entry per day');
    assert.equal(app.api.state.body[0].id, id, 'replacing keeps the entry id');
    assert.equal(app.api.state.body[0].weightKg, 81.9);
    assert.match(app.el('bodyEntryNote').textContent, /Updated/);

    const reloaded = createApp({ store: app.store });
    assert.equal(reloaded.api.state.body.length, 1, 'saved to storage');
    assert.equal(reloaded.api.state.body[0].weightKg, 81.9);
  });

  it('past-date-entry', () => {
    const app = createApp();
    const past = dk(-4);

    app.el('bodyDateInput').value = past;
    assert.equal(app.api.bodyDateChanged(), true);
    app.el('bodyWeightInput').value = '83.2';
    assert.equal(app.api.saveBodyEntry().ok, true);
    assert.equal(app.api.state.body[0].date, past);
    assert.equal(app.api.state.body[0].weightKg, 83.2);

    // Back to today: the form clears, because today has no entry yet.
    app.el('bodyDateInput').value = dk(0);
    app.api.bodyDateChanged();
    assert.equal(app.el('bodyWeightInput').value, '');

    app.el('bodyWeightInput').value = '82';
    assert.equal(app.api.saveBodyEntry().ok, true);
    assert.equal(app.api.state.body.length, 2);

    // Returning to the past date loads that entry back into the form.
    app.el('bodyDateInput').value = past;
    app.api.bodyDateChanged();
    assert.equal(app.el('bodyWeightInput').value, '83.2');
  });

  it('lbs-and-inches-display-store-kg-cm', () => {
    const app = createApp();
    app.api.toggleUnit(); // KG -> LBS

    assert.equal(app.el('bodyWeightUnit').textContent, 'LBS');
    assert.ok(app.el('bodyLbl-waistCm').textContent.includes('(in)'), 'lengths show inches in LBS');
    assert.equal(app.el('bodyLbl-bodyFatPct').textContent, 'Body fat (%)');

    app.el('bodyWeightInput').value = '180';
    app.el('bodyWaistInput').value = '32';
    assert.equal(app.api.saveBodyEntry().ok, true);

    const e = app.api.state.body[0];
    assert.equal(e.weightKg, 81.65, 'stored in kg');
    assert.equal(e.measures.waistCm, 81.3, 'stored in cm');
    assert.equal(app.el('bodyWeightInput').value, '180', 'shown back in lbs');
    assert.equal(app.el('bodyWaistInput').value, '32', 'shown back in inches');

    app.api.toggleUnit(); // back to KG
    assert.equal(app.el('bodyWeightUnit').textContent, 'KG');
    assert.ok(app.el('bodyLbl-waistCm').textContent.includes('(cm)'));
    assert.equal(app.el('bodyWeightInput').value, '81.65', 'the same body weight shown in kg');
    assert.equal(app.el('bodyWaistInput').value, '81.3', 'the same waist shown in cm');
    assert.equal(app.api.state.body[0].weightKg, 81.65, 'display switch never rewrites storage');
  });

  it('invalid-values-rejected-with-message', () => {
    const app = createApp();
    const err = () => app.el('bodyError').textContent;

    assert.equal(app.api.saveBodyEntry().ok, false);
    assert.match(err(), /Enter a weight or at least one measurement/);

    app.el('bodyWeightInput').value = 'abc';
    assert.equal(app.api.saveBodyEntry().ok, false);
    assert.match(err(), /must be a number/);

    app.el('bodyWeightInput').value = '10';
    assert.equal(app.api.saveBodyEntry().ok, false);
    assert.match(err(), /out of range/);

    app.el('bodyWeightInput').value = '82';
    app.el('bodyWaistInput').value = '5';
    assert.equal(app.api.saveBodyEntry().ok, false);
    assert.match(err(), /Waist looks out of range/);

    app.el('bodyWaistInput').value = '';
    app.el('bodyFatInput').value = '90';
    assert.equal(app.api.saveBodyEntry().ok, false);
    assert.match(err(), /Body fat looks out of range/);

    app.el('bodyFatInput').value = '';
    app.el('bodyDateInput').value = dk(1);
    assert.equal(app.api.saveBodyEntry().ok, false);
    assert.match(err(), /date up to today/);
    app.el('bodyDateInput').value = dk(0);

    assert.equal(app.api.state.body.length, 0, 'nothing invalid was stored');

    app.el('bodyWeightInput').value = '82';
    assert.equal(app.api.saveBodyEntry().ok, true);
    assert.equal(app.api.state.body.length, 1);
    assert.equal(app.el('bodyError').textContent, '', 'error clears after a good save');
  });

  it('measurements-optional', () => {
    const app = createApp();

    // A measurement-only day: weight stays empty.
    app.el('bodyWaistInput').value = '91';
    app.el('bodyNeckInput').value = '40';
    assert.equal(app.api.saveBodyEntry().ok, true);
    assert.equal(app.api.state.body[0].weightKg, null, 'weight is optional');
    assert.deepEqual(plain(app.api.state.body[0].measures), { waistCm: 91, neckCm: 40 });

    // Weight only: no measurements are invented.
    app.el('bodyDateInput').value = dk(-1);
    app.api.bodyDateChanged();
    app.el('bodyWeightInput').value = '82';
    assert.equal(app.api.saveBodyEntry().ok, true);
    assert.equal(app.api.state.body.length, 2);
    const byDate = (key) => app.api.state.body.find((e) => e.date === key);
    assert.deepEqual(plain(byDate(dk(-1)).measures), {});

    // Clearing a saved measurement removes it (form is prefilled per date).
    app.el('bodyDateInput').value = dk(0);
    app.api.bodyDateChanged();
    assert.equal(app.el('bodyWaistInput').value, '91', 'prefill shows the saved waist');
    app.el('bodyWaistInput').value = '';
    assert.equal(app.api.saveBodyEntry().ok, true);
    assert.deepEqual(plain(byDate(dk(0)).measures), { neckCm: 40 }, 'cleared waist removed');
  });

  it('edit-and-delete-with-undo', () => {
    const app = createApp();
    app.api.state.body = [
      { id: 'b1', date: dk(-2), weightKg: 80, measures: { waistCm: 90, chestCm: 100 } },
      { id: 'b2', date: dk(-1), weightKg: 79.5, measures: {} },
    ];
    app.api.renderBodySection();

    const list = app.el('bodyHistoryList').innerHTML;
    assert.ok(list.includes('aria-label="Edit entry'), 'rows are buttons with an aria label');
    assert.ok(list.indexOf('b2') !== -1 && list.indexOf('b2') < list.indexOf('b1'), 'newest first');
    assert.ok(list.includes('+2 measurements'), 'measurement count shown');
    assert.ok(list.includes('No weight') === false, 'both rows have a weight');

    assert.equal(app.api.openBodyEdit('b1'), true);
    assert.equal(app.api.bodyEditId, 'b1');
    assert.equal(app.el('bodyEditWeight').value, '80');
    assert.equal(app.el('bodyEdit-waistCm').value, '90');

    app.el('bodyEditWeight').value = '78.5';
    app.el('bodyEdit-waistCm').value = '88';
    const saved = app.api.saveBodyEdit();
    assert.equal(saved.ok, true);
    assert.equal(app.api.state.body[0].weightKg, 78.5);
    assert.equal(app.api.state.body[0].measures.waistCm, 88);
    assert.equal(app.api.bodyEditId, null, 'editor closes after save');

    // Editing onto a date that already has an entry is refused.
    app.api.openBodyEdit('b1');
    app.el('bodyEditDate').value = dk(-1);
    assert.equal(app.api.saveBodyEdit().ok, false);
    assert.match(app.api.bodyEditId, /b1/, 'editor stays open on error');

    // Delete asks first, then removes with a 5 s undo.
    assert.equal(app.api.askDeleteBody('b1'), true);
    assert.equal(app.api.state.body.length, 2, 'asking deletes nothing');
    assert.equal(app.api.confirmDeleteBody(), true);
    assert.equal(app.api.state.body.length, 1);
    assert.equal(app.api.state.body[0].id, 'b2');
    assert.ok(app.api.deletedBodyBackup, 'undo snapshot kept');
    assert.match(app.el('bodyUndo').innerHTML, /Undo/);

    assert.equal(app.api.undoDeleteBody(), true);
    assert.equal(app.api.state.body.length, 2, 'undo restores the entry');
    assert.equal(app.api.deletedBodyBackup, null);
    assert.equal(app.el('bodyUndo').innerHTML, '', 'banner gone after undo');

    // Expiry is time-based and testable.
    app.api.askDeleteBody('b2');
    app.api.confirmDeleteBody();
    assert.equal(app.api.expireDeletedBody(Date.now() + 1000), false, 'not expired yet');
    assert.equal(app.api.expireDeletedBody(Date.now() + 10000), true, 'expired after 5 s');
    assert.equal(app.api.deletedBodyBackup, null);
    assert.equal(app.api.state.body.length, 1);
  });

  it('typing-does-not-rebuild', () => {
    const app = createApp();
    app.api.switchTab('profile');
    app.api.setProfileSection('body');

    const panel = app.el('profileBody');
    const weight = app.el('bodyWeightInput');
    const waist = app.el('bodyWaistInput');

    weight.value = '80';
    waist.value = '90';

    app.api.renderProfileStats();
    assert.equal(app.el('bodyWeightInput'), weight, 'weight input identity kept');
    assert.equal(app.el('bodyWaistInput'), waist, 'measure input identity kept');
    assert.equal(app.el('profileBody'), panel, 'panel never rebuilt');
    assert.equal(app.el('bodyWeightInput').value, '80', 'typed weight kept');
    assert.equal(app.el('bodyWaistInput').value, '90', 'typed measurement kept');

    app.api.setBodyRange('1M');
    app.api.toggleBodyMore();
    assert.equal(app.el('bodyWeightInput').value, '80', 'range / more toggle never wipe typing');

    app.api.saveBodyEntry();
    assert.equal(app.el('bodyWeightInput'), weight, 'save keeps the input element');
  });

  it('handlers-compile', () => {
    const app = createApp();
    app.api.setProfileSection('body');
    app.api.state.body = [{ id: 'b1', date: dk(-1), weightKg: 80, measures: { waistCm: 90 } }];
    app.api.renderBodySection();

    app.api.openBodyEdit('b1');
    app.api.askDeleteBody('b1');

    const html = loadIndexHtml();
    const bodyPanelMarkup = html.slice(html.indexOf('id="profileBody"'), html.indexOf('id="profileSettings"'));
    const chunks = [
      bodyPanelMarkup,
      app.el('bodyChart').innerHTML,
      app.el('bodyTrend').innerHTML,
      app.el('bodyRangeChips').innerHTML,
      app.el('bodyHistoryList').innerHTML,
      app.el('bodyUndo').innerHTML,
    ];
    let checked = 0;
    for (const chunk of chunks) {
      for (const m of chunk.matchAll(/\b(on[a-z]+)="([^"]+)"/g)) {
        const code = decodeHtmlEntities(m[2]);
        assert.doesNotThrow(() => new Function(code), 'handler failed to compile: ' + m[1] + '="' + m[2] + '"');
        checked++;
      }
    }
    assert.ok(checked >= 8, 'checked ' + checked + ' body handlers');
  });
});

describe('P5-04 body data (private log)', () => {
  it('normalize-body-idempotent-and-dedupes', () => {
    const app = createApp();
    const n = app.api.normalizeBodyEntries;

    assert.deepEqual(plain(n(undefined)), [], 'missing body -> []');
    assert.deepEqual(plain(n('junk')), [], 'non-array -> []');
    assert.deepEqual(plain(n([null, 3, 'x', []])), [], 'non-objects dropped');

    const src = [
      { id: 'a', date: dk(-5), weightKg: 80, measures: { waistCm: 90 } },
      { id: 'b', date: dk(-5), weightKg: 81.5, measures: { waistCm: 91 } }, // duplicate date: later wins
      { id: 'c', date: dk(-4), weightKg: 4 },                              // out of range -> nothing left
      { id: 'd', date: dk(-3), weightKg: 'abc' },                          // not a number -> nothing left
      { id: 'e', date: '2026-13-40', weightKg: 80 },                       // impossible date
      { id: 'f', date: dk(2), weightKg: 80 },                              // future day
      { id: 'g', date: dk(-2), weightKg: 79, measures: { waistCm: 5, bodyFatPct: 300, chestCm: 100 } },
      { date: dk(-1), weightKg: 78.25 }                                    // no id -> body-<date>
    ];
    const out = plain(n(src));

    assert.equal(out.length, 3, 'three usable days survive: ' + JSON.stringify(out));
    assert.deepEqual(out.map((e) => e.date), [dk(-5), dk(-2), dk(-1)], 'sorted oldest first');
    assert.equal(out[0].id, 'b', 'duplicate date keeps the later entry');
    assert.equal(out[0].weightKg, 81.5);
    assert.deepEqual(out[1].measures, { chestCm: 100 }, 'invalid measurements dropped, valid kept');
    assert.equal(out[1].weightKg, 79);
    assert.equal(out[2].id, 'body-' + dk(-1), 'missing id backfilled from the date');
    assert.equal(out[2].weightKg, 78.25);

    assert.deepEqual(plain(n(out)), out, 'idempotent');
    assert.deepEqual(plain(n(n(out))), out, 'idempotent twice');
  });

  it('lbs-and-inches-conversions-store-canonical', () => {
    const app = createApp();

    assert.equal(app.api.toDisplayLength(80, 'KG'), 80);
    assert.equal(app.api.toDisplayLength(80, 'LBS'), 31.5);
    assert.equal(app.api.fromInputLength(31.5, 'LBS'), 80.01);
    assert.equal(app.api.fromInputLength('', 'KG'), '');
    assert.equal(app.api.fromInputLength('abc', 'KG'), 0);
    assert.equal(app.api.toDisplayLength(null, 'KG'), '');

    // Weight stays the P5-01 canonical conversion (kg stored, lbs shown).
    assert.equal(app.api.fromInputWeight(180, 'LBS'), 81.65);
    assert.equal(app.api.toDisplayLength(2.54, 'KG'), 2.5, 'one decimal for cm');
  });

  it('upsert-weight-and-measures-one-entry-per-day', () => {
    const app = createApp();
    const today = dk(0);

    const first = app.api.upsertBodyWeight(today, 82.4);
    assert.equal(app.api.state.body.length, 1);
    assert.equal(first.updated, false);
    assert.equal(app.api.state.body[0].id, 'body-' + today);

    const again = app.api.upsertBodyWeight(today, 81.9);
    assert.equal(app.api.state.body.length, 1, 'same day replaces, never duplicates');
    assert.equal(again.updated, true);
    assert.equal(app.api.state.body[0].id, 'body-' + today, 'keeps its id');
    assert.equal(app.api.state.body[0].weightKg, 81.9);

    app.api.upsertBodyMeasures(today, { waistCm: 90, bodyFatPct: 18 });
    assert.deepEqual(plain(app.api.state.body[0].measures), { waistCm: 90, bodyFatPct: 18 });
    app.api.upsertBodyMeasures(today, { waistCm: 89 });
    assert.deepEqual(plain(app.api.state.body[0].measures), { waistCm: 89 }, 'cleared measurement is removed');
    assert.equal(app.api.state.body[0].weightKg, 81.9, 'measures never touch the weight');

    // Weight-only day, then measurement-only day.
    app.api.upsertBodyWeight(dk(-2), 80);
    app.api.upsertBodyMeasures(dk(-1), { neckCm: 40 });
    const all = app.api.bodyEntries();
    assert.equal(all.length, 3);
    assert.deepEqual(plain(all.map((e) => e.date)), [dk(-2), dk(-1), today], 'sorted ascending');
    assert.equal(all[1].weightKg, null, 'measurement-only day has no weight');
  });

  it('restore-keeps-body-and-accepts-old-backup', () => {
    const app = createApp();
    const body = [{ id: 'b1', date: dk(-2), weightKg: 80.5, measures: { waistCm: 90 } }];

    const b = baseBackup();
    b.body = body;
    const v = app.api.validateBackupData(b);
    assert.equal(v.ok, true);
    assert.equal(v.data.body.length, 1);
    assert.equal(v.data.body[0].weightKg, 80.5);
    assert.equal(v.data.body[0].measures.waistCm, 90);

    // Bad body values are dropped, never a reason to refuse the whole backup.
    const b2 = baseBackup();
    b2.body = [
      { date: dk(-1), weightKg: 900 },
      { date: '2026-99-99', weightKg: 80 },
      { date: dk(-3), measures: { waistCm: 4 } },
    ];
    const v2 = app.api.validateBackupData(b2);
    assert.equal(v2.ok, true, 'a bad body array never blocks a restore');
    assert.equal(v2.data.body.length, 0);

    // Old backups have no body at all.
    const v3 = app.api.validateBackupData(baseBackup());
    assert.equal(v3.ok, true);
    assert.deepEqual(plain(v3.data.body), []);

    // Through the real restore path, then a reload from the same storage.
    app.api.pendingRestore = v.data;
    app.api.confirmRestore();
    assert.equal(app.api.state.body.length, 1);
    assert.equal(app.api.state.body[0].id, 'b1');
    assert.equal(app.api.state.body[0].weightKg, 80.5);

    const reloaded = createApp({ store: app.store });
    assert.equal(reloaded.api.state.body.length, 1, 'body survives a reload');
    assert.equal(reloaded.api.state.body[0].measures.waistCm, 90);
    assert.ok(app.store.get('hevy_clone_state').includes('"body"'), 'body is part of the saved state');
  });
});

describe('P5-04 body chart, ranges and trend', () => {
  it('chart-empty-one-point-and-line', () => {
    const app = createApp();

    assert.match(app.el('bodyChart').innerHTML, /No weight yet/, 'empty state before any entry');
    assert.match(app.el('bodyChart').innerHTML, /Save today/, 'empty state explains the action');

    app.api.state.body = [{ id: 'b1', date: dk(-30), weightKg: 83 }];
    app.api.renderBodySection();
    let html = app.el('bodyChart').innerHTML;
    assert.match(html, /Log another day to see a line/, 'one point asks for a second day');
    assert.match(html, /<circle/, 'the single point is drawn');

    app.api.state.body.push({ id: 'b2', date: dk(-1), weightKg: 81 });
    app.api.renderBodySection();
    html = app.el('bodyChart').innerHTML;
    assert.match(html, /<polyline/, 'two points draw a line');
    assert.match(html, /viewBox="0 0 360 160"/, 'reuses the P5-02 chart frame');

    // A measure with no saved values has its own empty state.
    app.api.setBodyMeasure('waistCm');
    assert.match(app.el('bodyChart').innerHTML, /No waist yet/);
    assert.ok(app.el('bodyChartTitle').textContent.includes('Waist'), 'title follows the measure');

    // Entries exist but none inside the chosen range.
    app.api.state.body = [
      { id: 'old1', date: dk(-200), weightKg: 90 },
      { id: 'old2', date: dk(-150), weightKg: 88 },
    ];
    app.api.setBodyMeasure('weight');
    app.api.setBodyRange('3M');
    assert.match(app.el('bodyChart').innerHTML, /in this range/, 'nothing in range says so');
    app.api.setBodyRange('All');
    assert.match(app.el('bodyChart').innerHTML, /<polyline/, 'wider range brings the line back');
  });

  it('range-filter-and-measurement-switch', () => {
    const app = createApp();
    app.api.state.body = [
      { id: 'a', date: dk(-10), weightKg: 82, measures: { waistCm: 90 } },
      { id: 'b', date: dk(-60), weightKg: 84, measures: { waistCm: 92 } },
      { id: 'c', date: dk(-200), weightKg: 86, measures: { waistCm: 94 } },
      { id: 'd', date: dk(-500), weightKg: 90, measures: { waistCm: 96 } },
    ];

    assert.equal(app.api.bodyRange, '3M', 'default range is 3M');
    assert.equal(app.api.bodySeries('weight', '1M').length, 1);
    assert.equal(app.api.bodySeries('weight', '3M').length, 2);
    assert.equal(app.api.bodySeries('weight', '1Y').length, 3);
    assert.equal(app.api.bodySeries('weight', 'All').length, 4);
    assert.equal(app.api.bodySeries('waistCm', 'All').length, 4, 'measure switch reads the same days');

    const points = app.api.bodySeries('weight', 'All');
    assert.equal(points[0].y, 90, 'oldest first, canonical kg');
    assert.equal(points[3].y, 82);

    assert.equal(app.api.setBodyMeasure('waistCm'), true);
    assert.equal(app.api.bodyMeasure, 'waistCm');
    assert.equal(app.el('bodyMeasureSelect').value, 'waistCm', 'select stays in sync');
    assert.ok(app.el('bodyChartTitle').textContent.includes('cm'), 'length axis shows cm');

    assert.equal(app.api.setBodyMeasure('nonsense'), true);
    assert.equal(app.api.bodyMeasure, 'weight', 'unknown measure falls back to weight');

    assert.equal(app.api.setBodyRange('2M'), false, 'unknown range rejected');
    assert.equal(app.api.bodyRange, '3M');
    assert.equal(app.api.setBodyRange('1Y'), true);
    assert.equal(app.api.bodyRange, '1Y');
  });

  it('trend-7-and-30-days', () => {
    const app = createApp();
    app.api.state.body = [
      { id: 'a', date: dk(-40), weightKg: 85 },
      { id: 'b', date: dk(-30), weightKg: 84 },
      { id: 'c', date: dk(-7), weightKg: 83 },
      { id: 'd', date: dk(0), weightKg: 82 },
    ];
    app.api.renderBodySection();

    const t = app.api.bodyTrend();
    assert.equal(t.latest.weightKg, 82);
    assert.equal(t.week.weightKg, 83, 'newest entry at or before 7 days ago');
    assert.equal(t.week.deltaKg, -1);
    assert.equal(t.month.weightKg, 84, 'newest entry at or before 30 days ago');
    assert.equal(t.month.deltaKg, -2);

    const html = app.el('bodyTrend').innerHTML;
    assert.match(html, /Latest: <b>82 kg<\/b>/);
    assert.match(html, /\u22121 kg in 7 days/, 'week change shown with a minus sign');
    assert.match(html, /\u22122 kg in 30 days/, 'month change shown');

    // Only one day of weight: both windows say so instead of inventing a delta.
    app.api.state.body = [{ id: 'only', date: dk(0), weightKg: 82 }];
    app.api.renderBodySection();
    assert.match(app.el('bodyTrend').innerHTML, /Not enough history yet for 7 days/);
    assert.match(app.el('bodyTrend').innerHTML, /Not enough history yet for 30 days/);

    // Gaining weight reads as a plain plus.
    app.api.state.body = [
      { id: 'p', date: dk(-8), weightKg: 80 },
      { id: 'q', date: dk(0), weightKg: 81.2 },
    ];
    app.api.renderBodySection();
    assert.match(app.el('bodyTrend').innerHTML, /\+1\.2 kg in 7 days/);
  });

  it('bmi-only-with-height-and-labelled', () => {
    const app = createApp();
    app.api.state.body = [{ id: 'b1', date: dk(0), weightKg: 82 }];

    assert.equal(app.api.bodyBmi(), null, 'no height -> no BMI');
    app.api.renderBodySection();
    assert.ok(!app.el('bodyTrend').innerHTML.includes('BMI'), 'nothing invented without a height');

    app.api.state.profile = { onboardingDone: true, heightCm: '180' };
    const bmi = app.api.bodyBmi();
    assert.equal(bmi.heightCm, 180);
    assert.equal(bmi.bmi, 25.3, '82 kg over 1.8 m squared');
    app.api.renderBodySection();
    const html = app.el('bodyTrend').innerHTML;
    assert.match(html, /BMI \(from your height\): 25\.3/, 'labelled and sourced');

    // Out-of-range height is ignored, never guessed at.
    app.api.state.profile = { onboardingDone: true, heightCm: '30' };
    assert.equal(app.api.bodyBmi(), null);
    app.api.state.profile = { onboardingDone: true, heightCm: 'abc' };
    assert.equal(app.api.bodyBmi(), null);

    // No weight at all -> no BMI either.
    app.api.state.profile = { onboardingDone: true, heightCm: '180' };
    app.api.state.body = [{ id: 'm', date: dk(0), weightKg: null, measures: { waistCm: 90 } }];
    assert.equal(app.api.bodyBmi(), null);
  });

  it('nothing-wider-than-412', () => {
    const html = loadIndexHtml();
    assert.ok(html.includes('max-width: 412px'), 'main layout capped at 412px');

    const start = html.indexOf('id="profileBody"');
    const end = html.indexOf('id="profileSettings"');
    assert.ok(start > 0 && end > start, 'body panel sits between records and settings');
    const panel = html.slice(start, end);

    const wide = [...panel.matchAll(/\bwidth:\s*(\d{3,})px/g)]
      .map((m) => Number(m[1]))
      .filter((n) => n > 412);
    assert.deepEqual(wide, [], 'nothing in the body panel declares a width above 412px');

    // Four equally-sized buttons that fit a 320px phone by sharing the row.
    const buttons = [...html.matchAll(/id="profSecBtn-([a-z]+)"/g)].map((m) => m[1]);
    assert.deepEqual(buttons, ['progress', 'records', 'body', 'settings'], 'four sections in order');
    const css = html.slice(html.indexOf('.profile-section-control {'), html.indexOf('.profile-section-panel[hidden]'));
    assert.ok(css.includes('gap: var(--space-4)'), 'tight gap so four labels fit');
    assert.ok(css.includes('flex: 1'), 'buttons share the width instead of a fixed size');
    assert.ok(css.includes('white-space: nowrap'), 'labels never wrap onto two lines');
    assert.ok(css.includes('font-size: var(--font-12)'), 'small enough for 320px');
    assert.ok(css.includes('min-height: var(--control-min-height)'), 'still 44px tall');
  });
});
