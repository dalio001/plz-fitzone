// tests/p2_13_pictures.test.mjs — P2-13 (personal part): one start/end
// picture per exercise in the detail sheet, plus a front/back muscle body
// chart for every exercise with muscle data. Runs against the REAL
// <script> in index.html via tests/harness.mjs and the REAL sw.js in a vm.
// Pictures are runtime-cached by the service worker, never precached.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createApp, loadIndexHtml, REPO_ROOT, SW_PATH } from './harness.mjs';

const PIC_DIR = path.join(REPO_ROOT, 'assets', 'exercises');

function detailHtml(app, exId) {
  app.api.openExerciseDetail(exId);
  return app.el('exDetailBody').innerHTML;
}

// ---- minimal service-worker host ----------------------------------------
function makeSw() {
  const state = {
    listeners: {},
    cache: new Map(),
    puts: [],
    network: [],
    ok: true,
    offline: false,
  };
  const urlOf = (req) => String(req && req.url ? req.url : req);
  const cacheObj = {
    put(req, res) {
      state.puts.push(urlOf(req));
      state.cache.set(urlOf(req), res);
      return Promise.resolve();
    },
    addAll() { return Promise.resolve(); },
  };
  const cachesObj = {
    open() { return Promise.resolve(cacheObj); },
    match(req) { return Promise.resolve(state.cache.get(urlOf(req))); },
    keys() { return Promise.resolve([]); },
    delete() { return Promise.resolve(true); },
  };
  const selfObj = {
    addEventListener(type, fn) { state.listeners[String(type)] = fn; },
    skipWaiting() {},
    clients: { claim() {} },
  };
  const sandbox = {
    self: selfObj,
    caches: cachesObj,
    URL,
    Promise,
    console,
    setTimeout,
    clearTimeout,
    fetch(req) {
      state.network.push(urlOf(req));
      if (state.offline) return Promise.reject(new Error('offline'));
      const ok = state.ok;
      return Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        clone() { return { ok, status: ok ? 200 : 404 }; },
      });
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(SW_PATH, 'utf8'), sandbox, { filename: 'sw.js' });
  state.context = sandbox;
  return state;
}

function swRespond(sw, url, method) {
  const request = { method: method || 'GET', mode: 'no-cors', url };
  let captured;
  sw.listeners.fetch({ request, respondWith(p) { captured = p; } });
  return captured;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('P2-13 exercise pictures (detail sheet only)', () => {
  it('picture-shown-only-for-listed-ids', () => {
    const app = createApp();
    const listed = app.api.EXERCISE_PICTURES;
    assert.ok(Array.isArray(listed) && listed.length === 10, 'batch 1 lists 10 ids');
    assert.deepEqual(
      [...listed].sort(),
      ['ex1', 'ex11', 'ex12', 'ex13', 'ex2', 'ex4', 'ex5', 'ex7', 'ex8', 'ex9'],
      'exactly the batch-1 ids',
    );

    for (const id of listed) {
      const ex = app.api.state.exercises.find((e) => e.id === id);
      assert.ok(ex, 'listed id exists in the catalogue: ' + id);
      const html = app.api.exercisePictureHtml(ex);
      assert.ok(html.includes('assets/exercises/' + id + '.webp'), 'picture for ' + id);
      assert.ok(detailHtml(app, id).includes('assets/exercises/' + id + '.webp'), 'detail shows ' + id);
    }
  });

  it('no-img-for-unlisted', () => {
    const app = createApp();
    for (const ex of app.api.state.exercises) {
      if (app.api.EXERCISE_PICTURES.indexOf(ex.id) >= 0) continue;
      assert.equal(app.api.exercisePictureHtml(ex), '', 'no picture html for ' + ex.id);
      assert.ok(!detailHtml(app, ex.id).includes('<img'), 'no img in detail for ' + ex.id);
    }
    assert.equal(app.api.exercisePictureHtml(null), '', 'null exercise renders nothing');
    assert.equal(app.api.exercisePictureHtml(undefined), '', 'undefined exercise renders nothing');
  });

  it('img-lazy-async-and-16x9-box', () => {
    const app = createApp();
    const html = app.api.exercisePictureHtml(app.api.state.exercises.find((e) => e.id === 'ex7'));
    assert.ok(html.includes('class="ex-pic"'), 'picture box');
    assert.ok(html.includes('loading="lazy"'), 'lazy image');
    assert.ok(html.includes('decoding="async"'), 'async decode');
    assert.ok(html.includes('alt="Squat (Barbell) start and end position"'), 'alt text names the exercise');
    assert.ok(html.includes('Start → End'), 'start/end caption');

    const css = loadIndexHtml();
    assert.ok(css.includes('.ex-pic { width:100%; aspect-ratio:16/9;'), 'box is full width 16:9');
    assert.ok(css.includes('border-radius:var(--radius-12);'), 'rounded box');
    assert.ok(css.includes('.ex-pic img { width:100%; height:100%; object-fit:cover; display:block; }'), 'image fills the box');
    assert.ok(css.includes('.ex-pic-cap { font-size:var(--font-12);'), 'caption style present');
  });

  it('picture-files-exist-for-every-listed-id', () => {
    const app = createApp();
    const listed = app.api.EXERCISE_PICTURES;
    const files = readdirSync(PIC_DIR).filter((f) => f.endsWith('.webp')).sort();
    for (const id of listed) {
      const file = path.join(PIC_DIR, id + '.webp');
      assert.ok(existsSync(file), 'committed webp for ' + id);
      const head = readFileSync(file).subarray(0, 12);
      assert.equal(head.subarray(0, 4).toString('ascii'), 'RIFF', id + ' is a RIFF file');
      assert.equal(head.subarray(8, 12).toString('ascii'), 'WEBP', id + ' is WebP');
    }
    // Nothing unlisted is sitting in the folder: a taken picture is a listed one.
    assert.deepEqual(files.map((f) => f.replace(/.webp$/, '')), [...listed].sort(), 'folder and EXERCISE_PICTURES match');
  });

  it('picture-hides-itself-on-error', () => {
    const app = createApp();
    const html = app.api.exercisePictureHtml(app.api.state.exercises.find((e) => e.id === 'ex1'));
    assert.ok(html.includes('onerror="'), 'image has an error handler');
    assert.ok(html.includes("style.display='none'"), 'the failure path hides the block');
    assert.ok(html.includes("closest('.ex-pic-wrap')"), 'hidden with the caption, not just the frame');
  });

  it('handlers-compile', () => {
    const app = createApp();
    app.api.renderExercisesTab();
    app.api.renderExercisesList();
    // Every detail sheet builds (listed, unlisted, hidden, custom, no muscle).
    for (const id of ['ex1', 'ex3', 'ex7', 'ex13', 'ex100']) {
      assert.ok(detailHtml(app, id).length > 0, 'detail builds for ' + id);
    }
    app.api.state.exercises.push({
      id: 'custom_bare',
      name: 'Bare Minimum',
      equipment: 'Other',
      secondary: [],
      type: 'weight_reps',
      custom: true,
    });
    assert.ok(detailHtml(app, 'custom_bare').includes('Bare Minimum'), 'detail builds without muscle fields');
    assert.ok(app.api.muscleChartHtml({ id: 'x', name: 'No Muscle' }).includes('<svg '), 'chart builds without muscle fields');
  });

  it('list-has-no-thumbnails', () => {
    const app = createApp();
    app.api.renderExercisesTab();
    app.api.renderExercisesList();
    const listHtml = app.el('exercisesDirectory').innerHTML;
    assert.ok(listHtml.includes('Bench Press'), 'the list rendered');
    assert.ok(!listHtml.includes('<img'), 'exercise list stays text only');
  });
});

describe('P2-13 muscle body chart', () => {
  it('body-chart-front-and-back', () => {
    const app = createApp();
    const ex = app.api.state.exercises.find((e) => e.id === 'ex1');
    const html = app.api.muscleChartHtml(ex);
    assert.ok(html.includes('<svg '), 'inline svg');
    assert.ok(html.includes('viewBox="0 0 210 220"'), 'both figures in one 210x220 viewBox');
    assert.ok(html.includes('<g data-view="front">'), 'front figure');
    assert.ok(html.includes('<g data-view="back" transform="translate(110,0)">'), 'back figure beside it');
    assert.ok(html.includes('role="img"') && html.includes('aria-label="Working muscles:'), 'described for screen readers');
    assert.ok(html.includes('data-region="chest"'), 'chest region drawn');
    assert.ok(html.includes('data-region="upper-back"'), 'back figure drawn');
    assert.ok(html.includes('Main: <b>Chest</b>'), 'legend names the main muscle');
    assert.ok(html.includes('Also: Shoulders, Triceps'), 'legend names the secondary muscles');
    assert.equal(app.api.muscleChartHtml(null), '', 'no exercise, no chart');
  });

  it('primary-and-secondary-colours', () => {
    const app = createApp();
    const ex = app.api.state.exercises.find((e) => e.id === 'ex1'); // Chest + Shoulders, Triceps
    const html = app.api.muscleChartHtml(ex);
    assert.ok(html.includes('data-region="chest" data-level="primary" fill="#ef4444"'), 'chest is strong red');
    assert.ok(html.includes('data-region="front-deltoids" data-level="secondary" fill="#fca5a5"'), 'front delts light red');
    assert.ok(html.includes('data-region="triceps" data-level="secondary" fill="#fca5a5"'), 'triceps light red');
    assert.ok(html.includes('data-region="head" data-level="idle" fill="#475569"'), 'untouched regions slate');

    const levels = app.api.muscleChartLevels(ex);
    assert.deepEqual([...levels.primary], ['chest'], 'one main region');
    assert.ok(levels.secondary.includes('front-deltoids') && levels.secondary.includes('triceps'), 'secondaries mapped');

    // A secondary never overrides a main region.
    const overlap = app.api.muscleChartLevels({ name: 'X', primary: 'Chest', muscle: 'Chest', secondary: ['Chest'] });
    assert.deepEqual([...overlap.primary], ['chest']);
    assert.deepEqual([...overlap.secondary], [], 'chest stays primary only');
  });

  it('every-catalogue-muscle-maps-or-is-safe', () => {
    const app = createApp();
    const polygons = app.api.BODY_MAP_POLYGONS;
    const known = new Set();
    for (const side of ['front', 'back']) {
      for (const row of polygons[side]) known.add(row[0]);
    }
    assert.ok(known.size >= 20, 'geometry loaded for both figures');

    const regions = app.api.MUSCLE_CHART_REGIONS;
    for (const name of app.api.MUSCLES) {
      assert.ok(Object.prototype.hasOwnProperty.call(regions, name), 'mapped: ' + name);
      for (const r of regions[name]) assert.ok(known.has(r), name + ' -> known region ' + r);
      const levels = app.api.muscleChartLevels({ name: 'Probe', primary: name, secondary: [] });
      const lit = levels.primary.concat(levels.secondary);
      assert.ok(lit.length > 0, name + ' lights at least one region');
      if (name === 'Full body') {
        assert.equal(levels.primary.length, 0, 'Full body has no single main muscle');
        assert.ok(levels.secondary.length >= 5, 'Full body lights the whole body as secondary');
      } else {
        assert.ok(levels.primary.length > 0, name + ' has a main region');
      }
      for (const r of lit) assert.ok(known.has(r), name + ' lit region exists in the drawing');
    }

    // All 100 catalogue rows produce a valid chart, and every region used is drawn.
    assert.equal(app.api.state.exercises.length, 100, 'catalogue size');
    for (const ex of app.api.state.exercises) {
      const levels = app.api.muscleChartLevels(ex);
      assert.ok(levels.primary.length > 0 || levels.secondary.length > 0, 'catalogue chart has data: ' + ex.id);
      for (const r of levels.primary.concat(levels.secondary)) {
        assert.ok(known.has(r), ex.id + ' region drawn: ' + r);
      }
      const html = app.api.muscleChartHtml(ex);
      assert.ok(html.includes('<svg '), ex.id + ' renders a chart');
      assert.ok(!/undefined|NaN/.test(html), ex.id + ' chart has no undefined/NaN');
    }
  });

  it('custom-exercise-gets-chart', () => {
    const app = createApp();
    app.api.state.exercises.push({
      id: 'custom_glute_bridge',
      name: 'Custom Glute Bridge',
      equipment: 'Bodyweight',
      muscle: 'Glutes',
      primary: 'Glutes',
      secondary: ['Hamstrings'],
      type: 'weight_reps',
      custom: true,
      hidden: false,
    });
    const html = detailHtml(app, 'custom_glute_bridge');
    assert.ok(html.includes('<svg '), 'custom exercise gets the chart');
    assert.ok(html.includes('data-region="gluteal" data-level="primary" fill="#ef4444"'), 'glutes main');
    assert.ok(html.includes('data-region="hamstring" data-level="secondary" fill="#fca5a5"'), 'hamstrings also');
    assert.ok(html.includes('Main: <b>Glutes</b>'), 'legend follows the custom muscle');
    assert.ok(!html.includes('<img'), 'custom exercises still have no picture');
  });

  it('unknown-muscle-no-crash', () => {
    const app = createApp();
    app.api.state.exercises.push({
      id: 'custom_weird',
      name: 'Mystery Movement',
      equipment: 'Other',
      muscle: 'Traps?',
      primary: 'Traps?',
      secondary: ['Nope'],
      type: 'weight_reps',
      custom: true,
    });
    const levels = app.api.muscleChartLevels({ name: 'Mystery', primary: 'Traps?', secondary: ['Nope'] });
    assert.deepEqual([...levels.primary], [], 'unknown main lights nothing');
    assert.deepEqual([...levels.secondary], [], 'unknown secondary lights nothing');

    const html = app.api.muscleChartHtml(app.api.state.exercises.find((e) => e.id === 'custom_weird'));
    assert.ok(html.includes('<svg '), 'chart still renders the idle body');
    assert.ok(!html.includes('data-level="primary"'), 'nothing is painted main');
    assert.ok(!html.includes('data-level="secondary"'), 'nothing is painted also');
    assert.ok(html.includes('Main: <b>—</b>'), 'legend says nothing is mapped');

    // Legacy records still map (Arms / Legs), an empty record renders idle.
    assert.deepEqual([...app.api.muscleChartLevels({ name: 'Curl', muscle: 'Arms' }).primary], ['biceps']);
    assert.deepEqual([...app.api.muscleChartLevels({ name: 'Press', muscle: 'Legs' }).primary], ['quadriceps']);
    assert.deepEqual([...app.api.muscleChartLevels({}).primary], [], 'no muscle data, no highlight');
    assert.ok(detailHtml(app, 'custom_weird').includes('Mystery Movement'), 'detail sheet still renders');
  });

  it('nothing-wider-than-412', () => {
    const app = createApp();
    app.api.state.exercises.push({
      id: 'custom_long_pic',
      name: 'Extraordinary Incline Dumbbell Hammer Curl With Extended Iso-Hold '.repeat(2),
      equipment: 'Dumbbell',
      muscle: 'Biceps',
      primary: 'Biceps',
      secondary: ['Forearms'],
      type: 'weight_reps',
    });
    for (const id of ['ex1', 'ex8', 'custom_long_pic']) {
      const html = detailHtml(app, id);
      const wide = [...html.matchAll(/\bwidth:\s*([5-9]\d{2,}|\d{4,})px/g)];
      assert.equal(wide.length, 0, 'no fixed width above 412px in ' + id);
      assert.ok(html.includes('width:100%'), id + ' chart is fluid');
      assert.ok(html.includes('max-width:240px'), id + ' chart is capped for small screens');
    }
  });
});

describe('P2-13 service worker (pictures cached at runtime)', () => {
  it('pictures-not-precached-but-runtime-cached', async () => {
    const sw = makeSw();
    const core = sw.context.CORE_ASSETS;
    assert.ok(Array.isArray(core) && core.length > 0, 'precache list present');
    assert.ok(!core.some((a) => String(a).includes('assets/exercises')), 'pictures are not precached');
    assert.ok(readFileSync(SW_PATH, 'utf8').includes("var CACHE_VERSION = 'plz-fitzone-v5';"), 'cache bumped to v5');
    assert.equal(typeof sw.listeners.fetch, 'function', 'fetch handler registered');

    const pic = 'https://app.test/assets/exercises/ex1.webp';

    // First view: network, then stored for later.
    const first = await swRespond(sw, pic);
    const res = await first;
    await flush();
    assert.equal(res.status, 200, 'online miss returns the picture');
    assert.deepEqual(sw.network, [pic], 'one network request');
    assert.deepEqual(sw.puts, [pic], 'stored in the runtime cache');

    // Second view: served from cache, no network at all.
    const second = await swRespond(sw, pic);
    const cached = await second;
    await flush();
    assert.equal(cached.status, 200, 'cached picture returned');
    assert.deepEqual(sw.network, [pic], 'no second network request');

    // A 404/error page is never cached, so a missing file cannot stick.
    sw.ok = false;
    const bad = 'https://app.test/assets/exercises/ex999.webp';
    const badRes = await swRespond(sw, bad);
    const badOut = await badRes;
    await flush();
    assert.equal(badOut.status, 404, 'error response passed through');
    assert.ok(!sw.puts.includes(bad), '404 not cached');
    sw.ok = true;

    // Offline miss rejects (the page's onerror hides the box); cache survives.
    sw.offline = true;
    const offlineUrl = 'https://app.test/assets/exercises/ex2.webp';
    const offlineRes = swRespond(sw, offlineUrl);
    await assert.rejects(offlineRes, 'offline miss rejects instead of caching junk');
    assert.ok(!sw.puts.includes(offlineUrl), 'nothing cached while offline');

    // Back online: the generic branch is untouched — icons cache-first.
    sw.offline = false;
    const icon = 'https://app.test/icons/icon-192.png';
    const iconRes = await swRespond(sw, icon);
    await iconRes;
    await flush();
    assert.deepEqual(sw.puts, [pic, icon], 'icons still go through the generic runtime cache');
  });
});
