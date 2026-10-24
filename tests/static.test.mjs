// tests/static.test.mjs — delivery surfaces without a browser.
// 6. Script syntax check of index.html and sw.js; manifest.webmanifest is
//    valid JSON with 192 and 512 icons that exist. Plus the required
//    restore wiring strings and the removed unsafe patterns.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadIndexHtml, loadAppScript, REPO_ROOT, SW_PATH, MANIFEST_PATH } from './harness.mjs';

describe('static delivery checks', () => {
  it('index.html <script> parses (syntax check)', () => {
    new vm.Script(loadAppScript(), { filename: 'index.html<script>' });
  });

  it('sw.js parses (syntax check)', () => {
    new vm.Script(readFileSync(SW_PATH, 'utf8'), { filename: 'sw.js' });
  });

  it('manifest is valid JSON with 192 and 512 icons that exist', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'icons listed');
    const sizes = manifest.icons.map((i) => i.sizes);
    assert.ok(sizes.includes('192x192'), '192 icon declared');
    assert.ok(sizes.includes('512x512'), '512 icon declared');
    for (const icon of manifest.icons) {
      const rel = String(icon.src).replace(/^\.\//, '');
      const abs = path.join(REPO_ROOT, rel);
      assert.ok(existsSync(abs), `icon exists: ${icon.src}`);
    }
  });

  it('safe-restore wiring exists; unsafe patterns are gone', () => {
    const html = loadIndexHtml();
    for (const s of [
      'function validateBackupData(',
      'function applySeedDefaults(',
      'function confirmRestore(',
      'function undoLastRestore(',
      'function showRestorePreview(',
      'hevy_clone_state_before_restore',
      'id="restoreModal"',
      'Undo last restore',
      'id="restoreDoneBanner"',
      'name="restoreDraft"',
    ]) {
      assert.ok(html.includes(s), `index.html contains ${s}`);
    }
    assert.ok(!html.includes("if (!state.exercises || state.exercises.length === 0) state.exercises = DEFAULT_EXERCISES;"), 'no unconditional exercise reseed');
    assert.ok(!html.includes("if (!state.routines || state.routines.length === 0) state.routines = DEFAULT_ROUTINES;"), 'no unconditional routine reseed');
    assert.ok(!html.includes('Workout history & routines restored!'), 'old blind success message gone');
  });

  it('restore question appears once (modal title, not repeated in body)', () => {
    const html = loadIndexHtml();
    const count = html.split('Restore this backup?').length - 1;
    assert.equal(count, 1, 'title only; body starts with counts');
    assert.ok(html.includes('<span>Restore this backup?</span>'), 'title kept in modal header');
  });

  it('sw.js CACHE_VERSION is bumped to v5', () => {
    const sw = readFileSync(SW_PATH, 'utf8');
    assert.ok(sw.includes("var CACHE_VERSION = 'plz-fitzone-v5';"), 'v5 cache version');
  });

  it('sw.js precaches every local asset referenced by index.html', () => {
    const html = loadIndexHtml();
    const sw = readFileSync(SW_PATH, 'utf8');
    const refs = new Set();
    for (const m of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) refs.add('./' + m[1]);
    for (const m of html.matchAll(/src='\.\/([^']+)'/g)) refs.add('./' + m[1]);
    assert.ok(refs.size >= 4, `found the page asset references (${refs.size})`);
    for (const ref of refs) {
      const rel = ref.replace(/^\.\//, '');
      assert.ok(existsSync(path.join(REPO_ROOT, rel)), `referenced asset exists: ${ref}`);
      assert.ok(sw.includes("'" + ref + "'"), `sw.js precaches ${ref}`);
    }
    assert.ok(refs.has('./assets/brand/plz-fitzone-mascot.jpg'), 'onboarding mascot is referenced and precached');
  });

  it('sw.js page fetch uses a network timeout before the cache fallback', () => {
    const sw = readFileSync(SW_PATH, 'utf8');
    assert.ok(sw.includes('var NETWORK_TIMEOUT_MS'), 'timeout constant');
    assert.ok(sw.includes('AbortController'), 'aborts the slow request');
    const timeoutIdx = sw.indexOf('fetchWithTimeout(request, NETWORK_TIMEOUT_MS)');
    const cacheIdx = sw.indexOf("caches.match('./index.html')");
    assert.ok(timeoutIdx > 0, 'page request goes through fetchWithTimeout');
    assert.ok(cacheIdx > 0, 'cache fallback kept');
    assert.ok(timeoutIdx < cacheIdx, 'timeout first, cache fallback after');
  });

  it('index.html includes the offline pill markup', () => {
    const html = loadIndexHtml();
    assert.ok(html.includes('id="offlinePill"'), 'pill element');
    assert.ok(html.includes('Offline — your workouts are saved on this phone'), 'pill text');
    assert.ok(html.includes('pointer-events:none'), 'pill never blocks a tap');
  });
});
