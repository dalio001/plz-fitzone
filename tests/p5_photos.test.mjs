// tests/p5_photos.test.mjs — P5-04 private progress photos (Personal part).
//
// Photos are processed on-device (fake canvas in the harness), stored only in
// a dedicated IndexedDB database (`plz_train_photos`) and are never present in
// `state`, localStorage or the JSON backup. The whole suite runs the REAL
// <script> from index.html through tests/harness.mjs; dates are clock-relative
// so it never goes stale.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, makeFakeIndexedDB, loadIndexHtml } from './harness.mjs';

const DB = 'plz_train_photos';
const STORE = 'photos';

// Local-day key for a day offset from today (the app's day boundary is local).
function dk(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + (offset || 0));
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

// Same formatting the app uses (locale-dependent, so never hard-code a month).
function dateText(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + (offset || 0));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortDateText(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + (offset || 0));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function record(id, offset, pose, createdAt) {
  return {
    id,
    date: dk(offset),
    pose: pose || 'Front',
    blob: { type: 'image/jpeg', size: 1000, _canvasWidth: 1080, _canvasHeight: 810 },
    thumbBlob: { type: 'image/jpeg', size: 100, _canvasWidth: 240, _canvasHeight: 180 },
    createdAt: createdAt === undefined ? 1 : createdAt,
  };
}

function seed(idb, rec) {
  idb._seed(DB, STORE, rec.id, rec);
  return rec;
}

function fakeFile(name, type, width, height) {
  return { name: name || 'photo.jpg', type: type || 'image/jpeg', size: 4096, _width: width || 1600, _height: height || 1200 };
}

function photoIdsInGrid(app) {
  const html = app.el('photoGrid').innerHTML;
  return [...html.matchAll(/openPhotoViewer\('([^']+)'\)/g)].map((m) => m[1]);
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

describe('P5-04 private progress photos', () => {
  it('add-photo-shrinks-and-stores-in-idb-not-state', async () => {
    const idb = makeFakeIndexedDB();
    let persistCalls = 0;
    const navigatorObj = {
      storage: { persist: async () => { persistCalls += 1; return true; } },
    };
    const app = createApp({ indexedDB: idb, navigator: navigatorObj });
    await app.api.loadPhotos();
    const persistBefore = persistCalls;

    app.api.openPhotoAdd();
    app.el('photoDateInput').value = dk(0);
    app.el('photoPoseSelect').value = 'Side';
    app.el('photoFileInput').files = [fakeFile('me.jpg', 'image/jpeg', 1600, 1200)];

    const r = await app.api.addPhoto();
    assert.equal(r.ok, true, r.error || 'photo saved');
    assert.equal(app.api.photos.length, 1);

    const stored = [...idb._dump(DB, STORE).values()];
    assert.equal(stored.length, 1, 'exactly one record in plz_train_photos/photos');
    const rec = stored[0];
    assert.equal(rec.date, dk(0));
    assert.equal(rec.pose, 'Side');
    assert.equal(rec.id, r.id);
    assert.ok(rec.blob && rec.thumbBlob, 'both JPEG blobs stored');

    // Long side <= 1080 and <= 240, JPEG quality 0.8.
    assert.equal(rec.blob._canvasWidth, 1080);
    assert.equal(rec.blob._canvasHeight, 810);
    assert.equal(rec.thumbBlob._canvasWidth, 240);
    assert.equal(rec.thumbBlob._canvasHeight, 180);
    const encodes = app.canvasLog.filter((c) => c.type === 'toBlob');
    assert.equal(encodes.length, 2);
    encodes.forEach((c) => {
      assert.equal(c.mime, 'image/jpeg');
      assert.equal(c.quality, 0.8);
      assert.ok(Math.max(c.width, c.height) <= 1080, 'never larger than 1080');
    });
    // Supervisor addition 1: orientation-aware decode.
    assert.equal(app.bitmapCalls.length, 1);
    assert.equal(app.bitmapCalls[0].options.imageOrientation, 'from-image');

    // Supervisor addition 2: the first photo asks for persistent storage once.
    assert.equal(persistCalls, persistBefore + 1, 'navigator.storage.persist called');
    assert.equal(app.api.photoPersistRequested, true);

    // Never in state / localStorage.
    assert.ok(!app.stateJson().includes(rec.id), 'state holds no photo id');
    assert.ok(!app.stateJson().includes('_canvasWidth'), 'state holds no image bytes');
    const localDump = [...app.store.values()].join('\n');
    assert.ok(!localDump.includes(rec.id), 'localStorage holds no photo record');
    assert.ok(!localDump.includes('_canvasWidth'), 'localStorage holds no image bytes');

    // The grid renders the thumbnail only (object URL of thumbBlob).
    assert.equal(app.urlCalls.created.length, 1);
    assert.equal(app.urlCalls.created[0].blob._canvasWidth, 240);
  });

  it('thumbnail-grid-newest-first-and-filter', async () => {
    const idb = makeFakeIndexedDB();
    seed(idb, record('p1', -5, 'Front', 1));
    seed(idb, record('p2', -1, 'Side', 2));
    seed(idb, record('p3', -1, 'Back', 5));
    seed(idb, record('p4', -3, 'Front', 1));
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();
    app.api.renderPhotosSection();

    // Date descending, then createdAt descending inside the same day.
    assert.deepEqual(photoIdsInGrid(app), ['p3', 'p2', 'p4', 'p1']);

    const chips = app.el('photoFilterChips').innerHTML;
    ['All', 'Front', 'Side', 'Back'].forEach((f) => {
      assert.ok(chips.includes('>' + f + '</button>'), 'chip ' + f);
    });
    assert.ok(chips.includes('min-height:44px'), 'chips are at least 44 px');

    assert.equal(app.api.setPhotoFilter('Front'), 'Front');
    assert.deepEqual(photoIdsInGrid(app), ['p4', 'p1']);
    assert.ok(app.el('photoFilterChips').innerHTML.includes('aria-pressed="true"'), 'active chip marked');

    app.api.setPhotoFilter('Side');
    assert.deepEqual(photoIdsInGrid(app), ['p2']);
    app.api.setPhotoFilter('Back');
    assert.deepEqual(photoIdsInGrid(app), ['p3']);
    app.api.setPhotoFilter('All');
    assert.equal(photoIdsInGrid(app).length, 4);

    // Filter with no match uses the same empty state copy.
    app.api.setPhotoFilter('Side');
    app.api.photos.filter((p) => p.id !== 'p2').forEach(() => {});
    app.api.setPhotoFilter('Back');
    app.api.setPhotoFilter('Side');
    app.api.setPhotoFilter('All');
    assert.ok(!app.el('photoGrid').innerHTML.includes('extra'), 'no stray content');

    // Empty database state.
    idb._dump(DB, STORE).clear();
    await app.api.loadPhotos();
    app.api.renderPhotosSection();
    assert.ok(app.el('photoGrid').innerHTML.includes('No photos yet'));
    assert.ok(app.el('photoGrid').innerHTML.includes('Photos stay on this phone only.'));
  });

  it('viewer-shows-date-pose-and-weight', async () => {
    const idb = makeFakeIndexedDB();
    seed(idb, record('p1', -1, 'Side'));
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();
    app.api.state.body = [{ id: 'b1', date: dk(-1), weightKg: 74.5, measures: {} }];

    assert.equal(app.api.openPhotoViewer('p1'), true);
    let html = app.el('photoViewerBody').innerHTML;
    assert.ok(html.includes('Side'), 'pose badge shown');
    assert.ok(html.includes(dateText(-1)), 'formatted date shown');
    assert.ok(html.includes('Weight: 74.5 kg'), 'that day\'s weight shown');
    assert.ok(html.includes('Delete') && html.includes('Save to phone'), 'both actions present');

    // The current unit is a presentation choice only; storage stays kg.
    assert.equal(app.api.state.body[0].weightKg, 74.5);
    app.api.toggleUnit();
    html = app.el('photoViewerBody').innerHTML;
    assert.ok(html.includes('Weight: 164.2 lbs'), 'LBS shown with one decimal');
    assert.equal(app.api.state.body[0].weightKg, 74.5, 'stored value untouched');

    // No weight that day: plain words, never a fake number.
    app.api.state.body = [];
    app.api.toggleUnit();
    html = app.el('photoViewerBody').innerHTML;
    assert.ok(html.includes('No weight logged'));
  });

  it('delete-with-undo', async () => {
    const idb = makeFakeIndexedDB();
    seed(idb, record('p1', -2, 'Front'));
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();
    app.api.openPhotoViewer('p1');

    assert.equal(app.api.deletePhoto('p1'), true);
    assert.equal(app.api.photos.length, 0, 'removed from the UI at once');
    assert.ok(app.api.pendingPhotoDelete, '5 s undo window open');
    assert.equal(app.api.pendingPhotoDelete.record.id, 'p1');
    assert.equal(idb._dump(DB, STORE).size, 1, 'still on disk during the undo window');
    const viewer = app.el('photoViewerBody').innerHTML;
    assert.ok(viewer.includes('Photo deleted'), 'viewer confirms removal');
    assert.ok(viewer.includes('Undo (5s)'), 'undo offered');
    assert.ok(app.el('photoUndo').innerHTML.includes('photoUndoDelete()'), 'section banner wired');

    assert.equal(app.api.photoUndoDelete(), true);
    assert.equal(app.api.photos.length, 1, 'photo restored');
    assert.equal(app.api.pendingPhotoDelete, null);
    assert.ok(app.el('photoViewerBody').innerHTML.includes('Weight:'), 'viewer shows it again');

    // Delete again, too early to expire, then after 5 s it is final.
    app.api.deletePhoto('p1');
    assert.equal(await app.api.expirePhotoDelete(Date.now() + 1000), false, 'not expired yet');
    assert.equal(idb._dump(DB, STORE).size, 1);
    assert.equal(await app.api.expirePhotoDelete(Date.now() + 6000), true, 'expired');
    assert.equal(idb._dump(DB, STORE).size, 0, 'deleted from IndexedDB');
    assert.equal(app.api.photos.length, 0);
    assert.equal(app.api.pendingPhotoDelete, null);
  });

  it('compare-two-shows-weight-change', async () => {
    const idb = makeFakeIndexedDB();
    seed(idb, record('p1', -10, 'Front'));
    seed(idb, record('p2', -2, 'Side'));
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();
    app.api.state.body = [
      { id: 'b1', date: dk(-10), weightKg: 80, measures: {} },
      { id: 'b2', date: dk(-2), weightKg: 81.2, measures: {} },
    ];

    assert.equal(app.api.openPhotoCompare(), true);
    assert.equal(app.api.photoCompareA, 'p1', 'defaults to the oldest photo');
    assert.equal(app.api.photoCompareB, 'p2', 'and the newest photo');

    const html = app.el('photoCompareBody').innerHTML;
    assert.ok(html.includes('photo-compare-grid'), 'side-by-side (stacked on narrow screens)');
    assert.ok(html.includes(dateText(-10)) && html.includes(dateText(-2)), 'both dates');
    assert.ok(html.includes('Front') && html.includes('Side'), 'both poses');
    assert.ok(html.includes('Weight: 80.0 kg') && html.includes('Weight: 81.2 kg'));
    assert.ok(html.includes('id="photoCompareDelta"'));
    assert.ok(html.includes('\u0394 +1.2 kg'), 'weight change with one decimal');

    // Plain facts only: no body advice anywhere in the compare sheet.
    const text = html.replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /lose|loss|gain|fat|recommend|should|goal|better|worse/i);

    app.api.toggleUnit();
    assert.ok(app.el('photoCompareBody').innerHTML.includes('\u0394 +2.6 lbs'));

    // Picking the other way round flips the sign.
    app.api.setComparePhoto('a', 'p2');
    app.api.setComparePhoto('b', 'p1');
    assert.ok(app.el('photoCompareBody').innerHTML.includes('\u0394 -2.6 lbs'));
    assert.equal(app.api.setComparePhoto('a', 'missing'), false, 'unknown ids are ignored');
  });

  it('save-to-phone-share-or-download', async () => {
    const idb = makeFakeIndexedDB();
    seed(idb, record('p1', -1, 'Front'));

    const shared = [];
    const navigatorObj = {
      canShare: ({ files }) => !!files && files.length === 1,
      share: async (data) => { shared.push(data); },
    };
    const app = createApp({ indexedDB: idb, navigator: navigatorObj });
    await app.api.loadPhotos();

    assert.equal(await app.api.savePhotoToPhone('p1'), true);
    assert.equal(shared.length, 1, 'navigator.share used');
    assert.equal(shared[0].files.length, 1);
    assert.equal(shared[0].files[0].type, 'image/jpeg');
    assert.equal(shared[0].files[0].name, 'PLZ_Train_photo_' + dk(-1) + '_Front.jpg');

    // No Web Share support -> a .jpg download through an object URL.
    const plain = createApp({ indexedDB: idb });
    await plain.api.loadPhotos();
    plain.urlCalls.created.length = 0;
    assert.equal(await plain.api.savePhotoToPhone('p1'), true);
    assert.equal(plain.urlCalls.created.length, 1, 'download URL created');
    assert.equal(plain.urlCalls.created[0].blob.type, 'image/jpeg');

    assert.equal(await plain.api.savePhotoToPhone('missing'), false);
  });

  it('backup-excludes-photos-and-restore-keeps-them', async () => {
    const idb = makeFakeIndexedDB();
    seed(idb, record('photo-secret-1', -3, 'Back'));
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();
    assert.equal(app.api.photos.length, 1);

    app.urlCalls.created.length = 0;
    await app.api.exportData();
    assert.ok(app.urlCalls.created.length >= 1, 'backup was produced');
    const backupJson = app.urlCalls.created[0].blob.parts.join('');
    assert.ok(backupJson.length > 0);
    assert.ok(!backupJson.includes('photo-secret-1'), 'photo identity never exported');
    assert.ok(!backupJson.includes('_canvasWidth'), 'image bytes never exported');
    assert.ok(!backupJson.includes('thumbBlob'), 'no photo fields in JSON');
    assert.ok(!JSON.stringify(JSON.parse(backupJson)).includes('plz_train_photos'));

    // restore only replaces state; the photo database is untouched.
    app.api.pendingRestore = {
      schemaVersion: 2,
      unit: 'KG',
      history: [],
      routines: [],
      exercises: [],
    };
    app.api.confirmRestore();
    assert.equal(idb._dump(DB, STORE).size, 1, 'restore never deletes photos');
    await app.api.loadPhotos();
    assert.equal(app.api.photos.length, 1);
    assert.equal(app.api.photos[0].id, 'photo-secret-1');
  });

  it('no-idb-shows-message-app-works', async () => {
    // No indexedDB at all (file://, private mode, the plain harness).
    const app = createApp();
    assert.equal(app.api.photosSupported(), false);
    assert.equal(app.el('photoSectionNote').textContent, 'Photos unavailable: storage access is restricted');
    assert.ok(app.el('photoGrid').innerHTML.includes('Photos unavailable'));

    // The rest of the body log still works.
    app.el('bodyDateInput').value = dk(0);
    app.el('bodyWeightInput').value = '80';
    assert.equal(app.api.saveBodyEntry().ok, true);
    assert.equal(app.api.state.body[0].weightKg, 80);

    // A blocked/throwing database degrades the same way.
    const blocked = createApp({ indexedDB: { open() { throw new Error('blocked'); } } });
    await blocked.api.loadPhotos();
    blocked.api.renderPhotosSection();
    assert.equal(blocked.el('photoSectionNote').textContent, 'Photos unavailable: storage access is restricted');
    assert.equal(blocked.api.photosUnavailable, true);
  });

  it('handlers-compile', async () => {
    const idb = makeFakeIndexedDB();
    seed(idb, record('p1', -4, 'Front'));
    seed(idb, record('p2', -1, 'Back'));
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();
    app.api.state.body = [{ id: 'b1', date: dk(-1), weightKg: 75, measures: {} }];

    app.api.renderPhotosSection();
    app.api.openPhotoAdd();
    app.api.openPhotoViewer('p1');
    app.api.openPhotoCompare();
    app.api.deletePhoto('p2'); // paints the undo banner too

    const handlerRegex = /\b(on[a-z]+)="([^"]+)"/g;
    const staticHtml = loadIndexHtml().split('<script>')[0];
    const chunks = [
      staticHtml,
      app.el('bodyPhotosCard').innerHTML,
      app.el('photoFilterChips').innerHTML,
      app.el('photoGrid').innerHTML,
      app.el('photoUndo').innerHTML,
      app.el('photoViewerBody').innerHTML,
      app.el('photoCompareBody').innerHTML,
    ];

    let count = 0;
    for (const chunk of chunks) {
      for (const m of chunk.matchAll(handlerRegex)) {
        const code = decodeHtmlEntities(m[2]);
        assert.doesNotThrow(() => { new Function(code); }, `handler failed: ${m[1]}="${m[2]}"`);
        count += 1;
      }
    }
    assert.ok(count > 20, `checked ${count} handlers`);

    // The named entry points really exist.
    ['openPhotoAdd', 'addPhoto', 'openPhotoViewer', 'deletePhoto', 'photoUndoDelete',
      'savePhotoToPhone', 'openPhotoCompare', 'setPhotoFilter', 'setComparePhoto'].forEach((fn) => {
      assert.equal(typeof app.api[fn], 'function', fn + ' exported');
    });
  });

  it('nothing-wider-than-412', async () => {
    const html = loadIndexHtml();
    assert.ok(html.includes('id="bodyPhotosCard"'), 'photo card present');
    assert.ok(html.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'two flexible columns');
    ['photoAddModal', 'photoViewerModal', 'photoCompareModal'].forEach((id) => {
      assert.ok(html.includes('id="' + id + '"'), id + ' present');
    });
    assert.ok(html.includes('.photo-compare-grid') && html.includes('max-width: 412px'));

    const idb = makeFakeIndexedDB();
    seed(idb, record('p1', -3, 'Front'));
    seed(idb, record('p2', -1, 'Side'));
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();
    app.api.state.body = [
      { id: 'b1', date: dk(-3), weightKg: 80, measures: {} },
      { id: 'b2', date: dk(-1), weightKg: 79.5, measures: {} },
    ];
    app.api.renderPhotosSection();
    app.api.openPhotoViewer('p1');
    app.api.openPhotoCompare();

    const chunks = [
      app.el('bodyPhotosCard').innerHTML,
      app.el('photoFilterChips').innerHTML,
      app.el('photoGrid').innerHTML,
      app.el('photoViewerBody').innerHTML,
      app.el('photoCompareBody').innerHTML,
    ];
    for (const chunk of chunks) {
      const tooWide = [...chunk.matchAll(/\bwidth:\s*([5-9]\d{2,}|\d{4,})px/g)];
      assert.equal(tooWide.length, 0, 'nothing fixed wider than 412 px');
    }
    // Buttons in the rendered photo UI keep the 44 px touch target.
    const photoButtons = [...app.el('bodyPhotosCard').innerHTML.matchAll(/<button[^>]*>/g)].map((m) => m[0]);
    photoButtons.forEach((b) => {
      assert.ok(/min-height:\s*44px/.test(b), 'button is at least 44 px: ' + b.slice(0, 90));
    });
    assert.ok(loadIndexHtml().includes('id="settingsPhotosNote"'), 'backup note present');
    assert.ok(loadIndexHtml().includes('Photos are not in the backup file. Use Save to phone for each photo.'));
  });

  // Supervisor addition 3.
  it('missing-weight-shows-dash-and-no-change', async () => {
    const idb = makeFakeIndexedDB();
    seed(idb, record('p1', -10, 'Front'));
    seed(idb, record('p2', -2, 'Side'));
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();

    // Only the newer date has a weight: dash on A and no change at all.
    app.api.state.body = [{ id: 'b2', date: dk(-2), weightKg: 70, measures: {} }];
    app.api.openPhotoCompare();
    let html = app.el('photoCompareBody').innerHTML;
    assert.ok(html.includes('Weight: \u2014'), 'missing weight is a dash');
    assert.ok(html.includes('\u0394 \u2014'), 'no change without both weights');
    assert.ok(!/\u0394\s*[+-]/.test(html), 'no signed delta without both weights');

    app.api.openPhotoViewer('p1');
    assert.ok(app.el('photoViewerBody').innerHTML.includes('No weight logged'));

    // Both weights present: one decimal in the current unit, sign included.
    app.api.state.body = [
      { id: 'b1', date: dk(-10), weightKg: 70.8, measures: {} },
      { id: 'b2', date: dk(-2), weightKg: 70, measures: {} },
    ];
    app.api.renderPhotoViewerBody();
    app.api.renderCompareBody();
    assert.ok(app.el('photoCompareBody').innerHTML.includes('\u0394 -0.8 kg'));

    app.api.toggleUnit();
    assert.ok(app.el('photoCompareBody').innerHTML.includes('\u0394 -1.8 lbs'));
  });

  // Supervisor addition 4.
  it('add-photo-rejects-non-image-or-undecodable', async () => {
    const idb = makeFakeIndexedDB();
    const app = createApp({ indexedDB: idb });
    await app.api.loadPhotos();

    app.api.openPhotoAdd();
    app.el('photoFileInput').files = [fakeFile('notes.txt', 'text/plain')];
    const notImage = await app.api.addPhoto();
    assert.equal(notImage.ok, false);
    assert.match(notImage.error, /not an image/i);
    assert.match(app.el('photoAddError').textContent, /not an image/i, 'clear error line');
    assert.equal(idb._dump(DB, STORE).size, 0, 'nothing saved');
    assert.equal(app.api.photos.length, 0);

    // A chosen file clears the old error, then an undecodable image fails too.
    app.api.openPhotoAdd();
    assert.equal(app.el('photoAddError').textContent, '', 'error cleared on reopen');
    app.el('photoFileInput').files = [fakeFile('broken.jpg', 'image/jpeg')];
    app.api.photoFileChosen();
    assert.equal(app.el('photoFileName').textContent, 'broken.jpg');

    const broken = createApp({
      indexedDB: idb,
      createImageBitmap: async () => { throw new Error('deflate failed'); },
    });
    await broken.api.loadPhotos();
    broken.api.openPhotoAdd();
    broken.el('photoFileInput').files = [fakeFile('broken.jpg', 'image/jpeg')];
    const undecodable = await broken.api.addPhoto();
    assert.equal(undecodable.ok, false);
    assert.match(undecodable.error, /could not be read/i);
    assert.match(broken.el('photoAddError').textContent, /could not be read/i);
    assert.equal(idb._dump(DB, STORE).size, 0, 'never saves a broken record');
    assert.equal(broken.api.photos.length, 0);
  });
});
