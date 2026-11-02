// tests/p6_01_look_size.test.mjs — P6-01: Look (dark / light / same as phone)
// and Text size (normal / large / extra large). Presentation only.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createApp, loadIndexHtml, STATE_KEY } from './harness.mjs';

const PREFS_KEY = 'hevy_clone_display_prefs';

// Runs the small <head> script against a fake page and returns the attributes it set.
function runBootScript(prefsJson) {
  const html = loadIndexHtml();
  const m = html.match(/<script id="displayPrefsBoot">([\s\S]*?)<\/script>/);
  assert.ok(m, 'boot script present in <head>');
  assert.ok(html.indexOf(m[0]) < html.indexOf('<style>'), 'runs before the styles');
  const attrs = {};
  const sandbox = {
    localStorage: { getItem: k => (k === PREFS_KEY ? prefsJson : null) },
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } }
  };
  vm.runInNewContext(m[1], sandbox);
  return attrs;
}

describe('P6-01 look and text size', () => {
  it('defaults are dark and normal; unknown values fall back to them', () => {
    const app = createApp();
    assert.equal(app.api.state.theme, 'dark');
    assert.equal(app.api.state.textSize, 'normal');
    assert.equal(app.api.normalizeTheme('pink'), 'dark');
    assert.equal(app.api.normalizeTextSize('huge'), 'normal');
  });

  it('choices are saved, survive a reload and keep the small copy for <head>', () => {
    const store = new Map();
    const app = createApp({ store });
    app.api.setTheme('light');
    app.api.setTextSize('xlarge');
    assert.deepEqual(JSON.parse(store.get(PREFS_KEY)), { theme: 'light', textSize: 'xlarge' });
    const app2 = createApp({ store });
    assert.equal(app2.api.state.theme, 'light');
    assert.equal(app2.api.state.textSize, 'xlarge');
    app2.api.setTheme('device');
    assert.equal(JSON.parse(store.get(STATE_KEY)).theme, 'device');
  });

  it('a broken saved value is fixed on load', () => {
    const store = new Map();
    const seed = createApp({ store });
    seed.api.state.theme = 42;
    seed.api.state.textSize = 'tiny';
    seed.api.saveState();
    const app = createApp({ store });
    assert.equal(app.api.state.theme, 'dark');
    assert.equal(app.api.state.textSize, 'normal');
  });

  it('the <head> script applies light / large before the first paint, and ignores junk', () => {
    assert.deepEqual(runBootScript(JSON.stringify({ theme: 'light', textSize: 'large' })),
      { 'data-theme': 'light', 'data-text-size': 'large' });
    assert.deepEqual(runBootScript(JSON.stringify({ theme: 'dark', textSize: 'normal' })), {});
    assert.deepEqual(runBootScript('{not json'), {});
    assert.deepEqual(runBootScript(null), {});
  });

  it('settings show both choices, and the light look and sizes exist in the styles', () => {
    const html = loadIndexHtml();
    for (const v of ['dark', 'light', 'device']) assert.ok(html.includes('<option value="' + v + '">'), v);
    for (const v of ['normal', 'large', 'xlarge']) assert.ok(html.includes('<option value="' + v + '">'), v);
    assert.ok(html.includes('html[data-theme="light"] {'));
    assert.ok(html.includes('@media (prefers-color-scheme: light)'));
    assert.ok(html.includes('html[data-text-size="large"] { --zoom: 1.12; }'));
    assert.ok(html.includes('html[data-text-size="xlarge"] { --zoom: 1.25; }'));
    assert.ok(html.includes('max-height: calc(82vh / var(--zoom));'), 'pop-ups fit the screen at every size');
    const app = createApp();
    app.api.state.theme = 'light';
    app.api.state.textSize = 'large';
    app.api.hydrateSettingsControls();
    assert.equal(app.el('themeSelect').value, 'light');
    assert.equal(app.el('textSizeSelect').value, 'large');
  });
});
