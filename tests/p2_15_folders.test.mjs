// tests/p2_15_folders.test.mjs — P2-15 step 1: routine folders on the REAL app code.
// One folder per routine (default "My routines"), new/rename/reorder/collapse,
// move routine, archive/restore, delete folder (archive some, delete others).
// History is never touched by folder actions.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml } from './harness.mjs';

const ids = (app) => app.api.state.routines.map((r) => r.id);

function withFolder(app, name) {
  app.api.openNewFolder();
  return app.api.saveFolderName('', name);
}

describe('P2-15 routine folders', () => {
  it('every routine starts in the default folder, which always exists', () => {
    const app = createApp();
    const st = app.api.state;
    assert.equal(st.folders[0].id, app.api.DEFAULT_FOLDER_ID);
    assert.equal(st.folders[0].name, 'My routines');
    st.routines.forEach((rt) => assert.equal(app.api.routineFolderId(rt), app.api.DEFAULT_FOLDER_ID));
    // Junk is cleaned; the default folder cannot be archived.
    const f = app.api.normalizeFolders([{ id: 'fd_default', name: '', archived: true }, { id: 'x', name: 'A' }, { id: 'x', name: 'dup' }, null]);
    same(f.map((x) => x.id), ['fd_default', 'x']);
    assert.equal(f[0].archived, false);
    assert.equal(f[0].name, 'My routines');
  });

  it('new folder, rename, collapse and order survive a reload', () => {
    const store = new Map();
    const app = createApp({ store });
    const id = withFolder(app, '8-day split');
    assert.ok(id);
    assert.equal(app.api.saveFolderName('', '   '), null, 'empty name refused');
    app.api.saveFolderName(id, 'Cycle A');
    app.api.toggleFolder(id);
    app.api.moveFolder(id, -1);
    const app2 = createApp({ store });
    const f = app2.api.state.folders;
    same(f.map((x) => x.name), ['Cycle A', 'My routines']);
    assert.equal(f[0].collapsed, true);
  });

  it('a routine moves to another folder; new and duplicated routines keep their folder', () => {
    const app = createApp();
    const id = withFolder(app, 'Program');
    assert.equal(app.api.moveRoutineToFolder('rt1', id), true);
    assert.equal(app.api.state.routines[0].folderId, id);
    app.api.duplicateRoutine('rt1');
    assert.equal(app.api.state.routines[1].folderId, id, 'copy stays in the same folder');
    app.api.editRoutine('rt2');
    app.el('routineFolderSelect').value = id;
    app.api.saveRoutine();
    assert.equal(app.api.state.routines.find((r) => r.id === 'rt2').folderId, id, 'edit can change the folder');
  });

  it('up/down only swaps with routines in the same folder', () => {
    const app = createApp();
    const id = withFolder(app, 'Program');
    app.api.moveRoutineToFolder('rt2', id);
    app.api.moveRoutine('rt1', 1);
    same(ids(app), ['rt3', 'rt2', 'rt1'], 'rt1 jumps over rt2 (other folder)');
  });

  it('archive hides a routine from lists and the plan picker; restore brings it back', () => {
    const app = createApp();
    app.api.archiveRoutine('rt1');
    assert.equal(app.api.isRoutineHidden(app.api.state.routines[0]), true);
    assert.ok(!app.api.planEditorHtml('2026-11-05', null).includes('value="rt1"'), 'not offered in plans');
    app.api.restoreRoutine('rt1');
    assert.equal(app.api.isRoutineHidden(app.api.state.routines[0]), false);
    assert.equal('archived' in app.api.state.routines[0], false);
  });

  it('archiving a folder hides its routines; restoring one routine sends it to the main folder', () => {
    const app = createApp();
    const id = withFolder(app, 'Old program');
    app.api.moveRoutineToFolder('rt1', id);
    app.api.archiveFolder(id);
    assert.equal(app.api.isRoutineHidden(app.api.state.routines[0]), true);
    app.api.archiveFolder(app.api.DEFAULT_FOLDER_ID);
    assert.equal(app.api.findFolder(app.api.DEFAULT_FOLDER_ID).archived, false, 'main folder never archived');
    app.api.restoreFolder(id);
    assert.equal(app.api.isRoutineHidden(app.api.state.routines[0]), false);
  });

  it('delete folder: ticked routines go to the archive, the others are deleted, history stays', () => {
    const app = createApp();
    const st = app.api.state;
    st.history.push({ id: 'h1', date: Date.now(), routineId: 'rt2', exercises: [] });
    const id = withFolder(app, 'Temp');
    app.api.moveRoutineToFolder('rt1', id);
    app.api.moveRoutineToFolder('rt2', id);
    assert.equal(app.api.confirmDeleteFolder(app.api.DEFAULT_FOLDER_ID, []), false, 'main folder cannot be deleted');
    assert.equal(app.api.confirmDeleteFolder(id, ['rt1']), true);
    assert.equal(app.api.findFolder(id), null);
    same(ids(app), ['rt1', 'rt3']);
    assert.equal(st.routines[0].archived, true);
    assert.equal(st.routines[0].folderId, app.api.DEFAULT_FOLDER_ID);
    assert.equal(app.api.state.history.length, 1, 'history untouched');
  });

  it('routines from import / AI with no folder land in the main folder; sync keeps folders', () => {
    const app = createApp();
    app.api.state.routines.push({ id: 'ai1', name: 'From AI', folderId: 'gone', exercises: [] });
    assert.equal(app.api.routineFolderId(app.api.state.routines[3]), app.api.DEFAULT_FOLDER_ID);
    const html = loadIndexHtml();
    assert.ok(html.includes('if (Array.isArray(newState.folders)) state.folders = newState.folders;'));
    assert.ok(html.includes('if (Array.isArray(serverState.folders)) state.folders = serverState.folders;'));
  });

  it('the screen shows folder headers and an archive section', () => {
    const app = createApp();
    const id = withFolder(app, 'Program <b>');
    app.api.moveRoutineToFolder('rt1', id);
    app.api.archiveRoutine('rt2');
    app.api.renderRoutines();
    const out = app.el('routinesList').innerHTML + collectChildren(app.el('routinesList'));
    assert.ok(out.includes('Program &lt;b&gt;'), 'folder names are escaped');
    assert.ok(out.includes('My routines'));
    assert.ok(out.includes('Archive (1)'));
  });
});

function collectChildren(node) {
  const kids = (node && (node.children || node.childNodes)) || [];
  return Array.from(kids).map((k) => (k.innerHTML || '') + (k.textContent || '')).join('\n');
}

// The app runs in its own JS realm, so compare plain copies.
function same(actual, expected, msg) {
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, msg);
}
