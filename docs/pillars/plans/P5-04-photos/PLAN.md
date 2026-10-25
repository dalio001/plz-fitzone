# Implementation Plan — P5-04 Private Progress Photos

## Goal Description
Provide private progress photos in the **Profile > Body** section, positioned directly below the weight card (`#bodyEntryCard`).
Photos are processed entirely on-device via `<canvas>` (max 1080 px long side @ 0.8 quality, plus a 240 px thumbnail) and stored **only** in a dedicated IndexedDB database (`plz_train_photos`). Photos are never stored in `localStorage` or `state` JSON, never included in backup exports, and never uploaded anywhere.

---

## Technical Specifications & Invariants

1. **Storage Separation**:
   - IndexedDB database: `plz_train_photos` (version 1), object store: `photos` with `keyPath: 'id'`.
   - Stored object: `{ id, date, pose, blob, thumbBlob, createdAt }`.
   - Fallback: If IndexedDB is blocked or unsupported, the photos section gracefully displays a message ("Photos unavailable: storage access is restricted") while the rest of the app functions normally.
   - `exportData()` continues exporting only `state`. Under the Settings backup button, a clear note states: *"Photos are not in the backup file. Use Save to phone for each photo."*
   - `confirmRestore()` operates strictly on `state` and never deletes IndexedDB photos.

2. **Image Processing**:
   - File input: `accept="image/*"` allowing camera capture or gallery selection.
   - Metadata inputs: Pose selection (`Front`, `Side`, `Back`, defaulting to `Front`) and Date (defaults to `today`).
   - Browser `<canvas>` resizing:
     - Full image: scaled to long side $\le 1080\text{ px}$, encoded via `canvas.toBlob(cb, 'image/jpeg', 0.8)`.
     - Thumbnail: scaled to long side $\le 240\text{ px}$, encoded via `canvas.toBlob(cb, 'image/jpeg', 0.8)`.

3. **UI & Interaction Design (Profile > Body)**:
   - Card `#bodyPhotosCard` placed below `#bodyEntryCard`.
   - Header with section title, subtitle ("Private — stored only on this device"), and action buttons: **+ Add photo** and **Compare**.
   - Filter chips: **All**, **Front**, **Side**, **Back** (min 44 px touch target, P1 token styling).
   - Thumbnail Grid: 2-column responsive grid (max 412 px compliant), newest first (sorted by date descending, then `createdAt` descending).
   - Empty State: When no photos match or exist, displays *"No photos yet"* with help text *"Photos stay on this phone only."*
   - Memory Management: Active `createObjectURL` references are tracked in `activePhotoUrls` and revoked (`URL.revokeObjectURL`) on re-renders, deletion, or modal closure.

4. **Viewer Modal (`#photoViewerModal`)**:
   - Shows the full 1080 px image, date, pose badge, and that day's weight from `state.body` (e.g. `74.5 kg` or `164.2 lbs` in current unit, or *"No weight logged"*).
   - **Delete button**: Triggers an immediate UI removal with a 5-second Undo banner (`photoUndoDelete()`). On timeout, deletion from IndexedDB is finalized.
   - **Save to phone button**: Uses Web Share API (`navigator.share({ files: [file] })`) if supported, falling back to triggering an `<a>` download of `.jpg`.

5. **Compare Modal (`#photoCompareModal`)**:
   - Allows picking two photos (Photo A and Photo B).
   - Side-by-side layout (wrapping to stacked on screens $\le 412\text{ px}$).
   - Displays Date, Pose, thumbnail/image, recorded weight on each date, and delta: e.g. `Δ +1.2 kg` or `Δ -0.8 kg`.
   - **Strict Invariant**: Plain facts only — no body advice, recommendations, or commentary.

---

## Proposed Changes

### `index.html`
- **Markup**:
  - Add `#bodyPhotosCard` inside `#profileBody` below `#bodyEntryCard`.
  - Add `#photoAddModal`, `#photoViewerModal`, and `#photoCompareModal` modals.
  - Add backup notice under `#settingsLastBackup` in Settings: *"Photos are not in the backup file. Use Save to phone for each photo."*
- **Script**:
  - Photos IndexedDB helpers: `openPhotosDb()`, `getPhotos()`, `savePhotoRecord()`, `deletePhotoRecord()`.
  - Canvas scaling routines: `resizeImageToBlob(file, maxLongSide, quality)`.
  - State & UI controller: `renderPhotosSection()`, `openPhotoViewer(id)`, `openPhotoCompare()`, `deletePhoto(id)`, `undoDeletePhoto()`, `savePhotoToPhone(id)`.
  - Hook `renderPhotosSection()` into `renderBodySection()`, ensuring text typing in body weight inputs never rebuilds the photos card.

### `tests/harness.mjs`
- Enhance `makeFakeIndexedDB()` to support `getAll()` and keyPath-based `put()`.
- Provide mock canvas / image resizing and `URL.createObjectURL` / `revokeObjectURL` stubs in `createApp()`.
- Export photos functions and variables in `EXPORT_SNIPPET`.

### `tests/p5_photos.test.mjs` (New test suite)
1. `add-photo-shrinks-and-stores-in-idb-not-state`: validates canvas resize to $\le 1080\text{ px}$ and $\le 240\text{ px}$, stored in `plz_train_photos`, neither `state` nor `localStorage` modified.
2. `thumbnail-grid-newest-first-and-filter`: validates newest-first ordering and All/Front/Side/Back chip filtering.
3. `viewer-shows-date-pose-and-weight`: verifies viewer shows correct pose, formatted date, and matching day's weight from `state.body`.
4. `delete-with-undo`: validates 5 s undo restoration and final deletion from IndexedDB.
5. `compare-two-shows-weight-change`: verifies side-by-side comparison, weight delta calculation, and absence of body advice.
6. `save-to-phone-share-or-download`: verifies `navigator.share` call or download fallback.
7. `backup-excludes-photos-and-restore-keeps-them`: checks JSON export excludes photos and `confirmRestore()` preserves IndexedDB photos.
8. `no-idb-shows-message-app-works`: verifies graceful fallback when IndexedDB is blocked.
9. `handlers-compile`: validates all generated `onclick` and event handlers.
10. `nothing-wider-than-412`: verifies viewport constraint compliance.

---

## Verification Plan
1. Run `node --test "tests/*.test.mjs"` — all 358 existing tests + new tests in `tests/p5_photos.test.mjs` must pass.
2. Verify zero regressions on schema, backups, and live workout mirror.

## Supervisor additions (approved with the plan)
1. Keep photos the right way up: decode with createImageBitmap(file, { imageOrientation: 'from-image' }) when available, fallback to an Image element.
2. When the first photo is saved, call navigator.storage.persist() if available (ignore errors).
3. Viewer and Compare: a date with no weight shows a dash and no weight change; weight change only when both dates have a weight, in state.unit with 1 decimal.
4. Add photo shows a clear error line if the file is not an image or cannot be decoded, and never saves a broken record.
