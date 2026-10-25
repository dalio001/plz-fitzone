// tests/harness.mjs — zero-dependency test harness (P0-06, personal scale).
//
// Runs the REAL <script> from index.html inside node:vm with a small fake
// browser (in-memory localStorage, minimal document/element stubs,
// alert/confirm stubs, no-op timers). No copies of app functions: the script
// source is extracted from index.html and executed as-is, then the app's own
// globals are exposed through `globalThis.__app` (appended to the same
// script so it can close over the app's let/const bindings).
//
// If a function cannot run without a real DOM, only the missing piece is
// stubbed (see makeElement/makeDocument below). Nothing else is mocked.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '..');
export const INDEX_HTML_PATH = path.join(REPO_ROOT, 'index.html');
export const SW_PATH = path.join(REPO_ROOT, 'sw.js');
export const MANIFEST_PATH = path.join(REPO_ROOT, 'manifest.webmanifest');

export const STATE_KEY = 'hevy_clone_state';
export const DRAFT_KEY = 'hevy_clone_active_session';
export const BACKUP_V1_KEY = 'hevy_clone_state_backup_v1';
export const BEFORE_RESTORE_KEY = 'hevy_clone_state_before_restore';

export function loadIndexHtml() {
  return readFileSync(INDEX_HTML_PATH, 'utf8');
}

export function extractScript(html) {
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (matches.length === 0) throw new Error('no <script> block found in index.html');
  if (matches.length > 1) throw new Error(`expected 1 <script> block, found ${matches.length}`);
  return matches[0][1];
}

export function loadAppScript() {
  return extractScript(loadIndexHtml());
}

// ---- Fake browser -------------------------------------------------------

function makeClassList() {
  const s = new Set();
  return {
    add(...c) { c.forEach((x) => s.add(x)); },
    remove(...c) { c.forEach((x) => s.delete(x)); },
    contains(c) { return s.has(c); },
    toggle(c) {
      if (s.has(c)) { s.delete(c); return false; }
      s.add(c); return true;
    },
  };
}

// Minimal element stub: accepts innerHTML/value/classList/style/
// addEventListener and nothing else. Enough for every render path in
// index.html (routines, history, stats, drawer, modals, banners).
// `onHtml` (optional) is called with every innerHTML assignment, so a
// document can register the ids a render produced (as a browser would).
export function makeElement(tag = 'div', onHtml = null) {
  const el = {
    tagName: String(tag).toUpperCase(),
    innerText: '',
    textContent: '',
    value: '',
    checked: false,
    hidden: false,
    style: {},
    dataset: {},
    children: [],
    classList: makeClassList(),
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {},
    removeEventListener() {},
    click() {},
    setAttribute(k, v) {
      this._attrs = this._attrs || {};
      this._attrs[String(k)] = String(v);
      if (String(k) === 'hidden') this.hidden = true;
      // A real <input value="..."> starts with that value; render code relies on it.
      if (String(k) === 'value') this.value = String(v);
      if (String(k) === 'checked') this.checked = true;
    },
    getAttribute(k) { return (this._attrs && String(k) in this._attrs) ? this._attrs[String(k)] : null; },
    hasAttribute(k) { return this._attrs ? (String(k) in this._attrs) : false; },
    removeAttribute(k) {
      if (this._attrs) delete this._attrs[String(k)];
      if (String(k) === 'hidden') this.hidden = false;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  let html = '';
  Object.defineProperty(el, 'innerHTML', {
    get() {
      if (this.children.length > 0) {
        return html + this.children.map(c => c.innerHTML).join('');
      }
      return html;
    },
    set(v) {
      html = String(v);
      this.children = [];
      if (typeof onHtml === 'function') onHtml(html);
    },
    enumerable: true,
    configurable: true,
  });
  return el;
}

// Every id present in the static index.html markup, read once.
let markupIdsCache = null;
function markupIds() {
  if (markupIdsCache) return markupIdsCache;
  markupIdsCache = new Set();
  for (const m of loadIndexHtml().matchAll(/id="([^"]+)"/g)) markupIdsCache.add(m[1]);
  return markupIdsCache;
}

export function makeDocument() {
  const byId = new Map();
  // Every element registers the ids written into its innerHTML, exactly like a
  // browser (static containers included: their rendered rows are real nodes).
  const registerHtmlIds = (html) => {
    if (typeof html !== 'string' || html.indexOf('id=') < 0) return;
    for (const m of html.matchAll(/<([a-zA-Z0-9-]+)\s+([^>]*?)id="([^"]+)"([^>]*)>/g)) {
      const tag = m[1];
      const id = m[3];
      const rest = m[2] + ' ' + m[4];
      const el = byId.has(id) ? byId.get(id) : makeElement(tag, registerHtmlIds);
      for (const attr of rest.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g)) {
        el.setAttribute(attr[1], attr[2]);
      }
      if (!byId.has(id)) byId.set(id, el);
    }
    for (const m of html.matchAll(/id="([^"]+)"/g)) {
      if (!byId.has(m[1])) byId.set(m[1], makeElement('div', registerHtmlIds));
    }
  };
  for (const id of markupIds()) byId.set(id, makeElement('div', registerHtmlIds));
  registerHtmlIds(loadIndexHtml().split('<script>')[0]);
  const body = makeElement('body');
  const pushChild = body.appendChild.bind(body);
  // Banners (updateBar) are appended to document.body and then looked up by
  // id, so an appended child must be findable through getElementById.
  body.appendChild = (child) => {
    if (child && child.id) byId.set(String(child.id), child);
    return pushChild(child);
  };
  return {
    _byId: byId,
    body,
    // Unknown ids return null, exactly like a browser: the app uses
    // getElementById both to find static markup and to test whether it has
    // already created something (the "New version" bar).
    getElementById(id) {
      return byId.has(String(id)) ? byId.get(String(id)) : null;
    },
    createElement(tag) { return makeElement(tag, registerHtmlIds); },
    // No-op by default (today's behaviour); createApp({listeners:true}) records.
    addEventListener() {},
    removeEventListener() {},
    // confirmRestore/showRestorePreview guard null, so null is faithful.
    querySelector() { return null; },
    // switchTab() indexes [1] and forEach()es; two stubs keep that path real.
    querySelectorAll() { return [makeElement(), makeElement()]; },
  };
}

// ---- Optional fake IndexedDB (P0-01 draft mirror + P5-04 photos) ---------
// Only what the app uses: open() with onupgradeneeded/onsuccess,
// objectStoreNames.contains, createObjectStore(name[, {keyPath}]),
// transaction(store, mode[, options]), objectStore().put/get/getAll/delete
// and tx.oncomplete/onerror. Values are snapshotted like a structured clone,
// so a written record can never change afterwards. A keyPath store derives
// the key from the value (the photo store), while the draft mirror keeps
// using out-of-line keys.
function cloneValue(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cloneValue);
  const out = {};
  for (const k of Object.keys(value)) out[k] = cloneValue(value[k]);
  return out;
}

export function makeFakeIndexedDB() {
  const dbs = new Map(); // name -> { version, stores: Map<storeName, Map>, keyPaths: Map }
  function dbEntry(name, version) {
    let db = dbs.get(name);
    if (!db) {
      db = { version: typeof version === 'number' ? version : 1, stores: new Map(), keyPaths: new Map() };
      dbs.set(name, db);
    }
    if (!db.keyPaths) db.keyPaths = new Map();
    return db;
  }
  return {
    _dbs: dbs,
    _dump(dbName, storeName) {
      const db = dbs.get(dbName);
      return (db && db.stores.get(storeName)) || new Map();
    },
    _seed(dbName, storeName, key, value) {
      const db = dbEntry(dbName, 1);
      if (!db.stores.has(storeName)) db.stores.set(storeName, new Map());
      db.stores.get(storeName).set(key, cloneValue(value));
    },
    open(name, version) {
      const req = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
      const upgrade = !dbs.has(name) || (typeof version === 'number' && version > dbs.get(name).version);
      const db = dbEntry(name, version);
      if (upgrade && typeof version === 'number') db.version = version;
      const txFor = (storeName, mode) => {
        if (!db.stores.has(storeName)) db.stores.set(storeName, new Map());
        const map = db.stores.get(storeName);
        const keyPath = db.keyPaths ? db.keyPaths.get(storeName) : undefined;
        const tx = {
          mode, error: null, oncomplete: null, onerror: null, onabort: null,
          objectStore: () => store,
          abort() {},
        };
        const store = {
          name: storeName,
          keyPath,
          put(value, key) {
            let usedKey = key;
            if (usedKey === undefined && keyPath) usedKey = value ? value[keyPath] : undefined;
            const r = { result: usedKey, onsuccess: null, onerror: null };
            if (usedKey === undefined) throw new Error('fake IndexedDB: put() needs a key or keyPath');
            map.set(usedKey, cloneValue(value));
            queueMicrotask(() => { if (typeof tx.oncomplete === 'function') tx.oncomplete({ target: tx }); });
            return r;
          },
          get(key) {
            const r = { result: undefined, onsuccess: null, onerror: null };
            r.result = map.has(key) ? cloneValue(map.get(key)) : undefined;
            queueMicrotask(() => { if (typeof r.onsuccess === 'function') r.onsuccess({ target: r }); });
            return r;
          },
          getAll() {
            const r = { result: undefined, onsuccess: null, onerror: null };
            r.result = [...map.values()].map(cloneValue);
            queueMicrotask(() => { if (typeof r.onsuccess === 'function') r.onsuccess({ target: r }); });
            return r;
          },
          delete(key) {
            const r = { result: undefined, onsuccess: null, onerror: null };
            map.delete(key);
            queueMicrotask(() => { if (typeof tx.oncomplete === 'function') tx.oncomplete({ target: tx }); });
            return r;
          },
        };
        return tx;
      };
      req.result = {
        name,
        version: db.version,
        objectStoreNames: { contains: (n) => db.stores.has(String(n)) },
        createObjectStore(n, opts) {
          const storeName = String(n);
          if (!db.stores.has(storeName)) db.stores.set(storeName, new Map());
          if (!db.keyPaths) db.keyPaths = new Map();
          const keyPath = opts && opts.keyPath ? String(opts.keyPath) : undefined;
          if (keyPath) db.keyPaths.set(storeName, keyPath);
          return { name: storeName, keyPath };
        },
        transaction: txFor,
        close() {},
      };
      queueMicrotask(() => {
        try {
          if (upgrade && typeof req.onupgradeneeded === 'function') req.onupgradeneeded({ target: req });
          if (typeof req.onsuccess === 'function') req.onsuccess({ target: req });
        } catch (e) {
          if (typeof req.onerror === 'function') req.onerror({ target: req });
        }
      });
      return req;
    },
  };
}

// In-memory localStorage. The backing Map can be shared between app
// instances to simulate a reload (same device, fresh JS context).
export function makeLocalStorage(store) {
  return {
    getItem(k) {
      const key = String(k);
      return store.has(key) ? store.get(key) : null;
    },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(String(k)); },
    clear() { store.clear(); },
    get length() { return store.size; },
    key(i) { return [...store.keys()][i] ?? null; },
  };
}

const EXPORT_SNIPPET = `;globalThis.__app = {
  get state(){ return state; }, set state(v){ state = v; },
  get activeWorkout(){ return activeWorkout; }, set activeWorkout(v){ activeWorkout = v; },
  get restDeadline(){ return restDeadline; }, set restDeadline(v){ restDeadline = v; },
  get restRemaining(){ return restRemaining; },
  get pendingRestore(){ return pendingRestore; }, set pendingRestore(v){ pendingRestore = v; },
  get setInputErrors(){ return setInputErrors; }, set setInputErrors(v){ setInputErrors = v; },
  get histEditErrors(){ return histEditErrors; }, set histEditErrors(v){ histEditErrors = v; },
  get finishReviewPending(){ return finishReviewPending; }, set finishReviewPending(v){ finishReviewPending = v; },
  get restPickerTarget(){ return restPickerTarget; }, set restPickerTarget(v){ restPickerTarget = v; },
  get tempRoutineExercises(){ return tempRoutineExercises; },
  get setMenuTarget(){ return setMenuTarget; }, set setMenuTarget(v){ setMenuTarget = v; },
  get replaceTargetIdx(){ return replaceTargetIdx; }, set replaceTargetIdx(v){ replaceTargetIdx = v; },
  get deletedSetBackup(){ return deletedSetBackup; }, set deletedSetBackup(v){ deletedSetBackup = v; },
  DEFAULT_EXERCISES, DEFAULT_ROUTINES, DEFAULT_PLATE_SETTINGS,
  get editingRoutineId(){ return editingRoutineId; },
  get deletedRoutineBackup(){ return deletedRoutineBackup; },
  get pendingRoutineUpdate(){ return pendingRoutineUpdate; },
  DEFAULT_EXERCISES, DEFAULT_ROUTINES,
  SCHEMA_VERSION, LB_PER_KG, SET_MAX_WEIGHT_KG, SET_MAX_REPS, REST_OPTIONS,
  toDisplayWeight, fromInputWeight, formatDisplayWeight, toDisplayVolume,
  getWeightErrorKg, getRepsError, isSetTickable,
  SET_MAX_DURATION_SEC, isDurationEx, durationSetAllowsWeight, parseDurationInput,
  formatDurationClock, getDurationError, durationCountingSets, setUsesDuration,
  setFieldErrorsFor, isCountableDoneSet, pickDurationHistorySet, buildDurationSession,
  setElapsedSec, startSetTimer, stopSetTimer, toggleSetTimer, runningSetTimer,
  stopAllSetTimers, paintRunningSetClocks, updateSetDuration, handleSetDurationChange,
  getExerciseRestSec, setExerciseRest, openRestPicker, pickRestOption, formatRestLabel,
  countUntickedSets, countDoneValidSets,
  finishReviewTickAll, finishReviewDrop, finishReviewBack, doFinishSave,
  startRoutineWorkout, doStartRoutineWorkout, startEmptyWorkout,
  renderRoutines, openRoutineBuilder, editRoutine, saveRoutine,
  deleteRoutine, undoDeleteRoutine, expireDeletedRoutine,
  duplicateRoutine, moveRoutine, renderRoutineBuilderList,
  ROUTINE_IMPORT, validateRoutineImport, formatRoutineImportErrors,
  decodeRoutineImportHash, renderRoutineImportPreview,
  openRoutineImport, previewRoutineImportText, routineFileChosen,
  confirmRoutineImport, cancelRoutineImport, readHashRoutineImport,
  flushPendingRoutineImport,
  get pendingRoutineImport(){ return pendingRoutineImport; },
  normalizeRoutineItem, parseRepsTarget, formatRepsTarget,
  updateBuilderSets, updateBuilderReps, updateBuilderWeight, updateBuilderNote,
  updateBuilderDuration,
  moveBuilderExercise, removeBuilderExercise, openBuilderRestPicker, setBuilderRest,
  confirmRoutineUpdate, declineRoutineUpdate,
  updateSetVal, toggleSetDone, addSetToActive, finishWorkout, discardWorkout,
  cycleSetType, setSetType, openSetMenu, closeSetMenu, setSetTypeFromMenu, removeSetFromMenu,
  removeActiveSet, undoRemoveSet, expireDeletedSet,
  addWarmupSets, undoWarmupSets, expireWarmupBackup,
  isBarbellEquipment, isDumbbellMachineCableEquipment, roundDownToPlateLoad, roundDownToStep, buildWarmupRamp, getFirstWorkingWeight,
  moveActiveEx, openReplacePicker, replaceActiveEx, updateActiveNote,
  paintSetRowError, handleSetFieldChange,
  setDropStepPct, setSupersetAdvance, calcDropWeight, addDropSet,
  keepAwakeEnabled, setKeepAwake, wakeLockSupported, requestWakeLock, releaseWakeLock,
  syncWakeLock, paintKeepAwakeUi,
  get wakeLockOp(){ return wakeLockOp; },
  get wakeLockSentinel(){ return wakeLockSentinel; },
  openDropStepPicker, pickDropStep,
  SUPERSET_COLORS, computeSupersetLabels, openSupersetPicker, supersetWith, removeFromSuperset,
  scrollActiveSetIntoView, get lastScrolledTargetId(){ return lastScrolledTargetId; },
  updateBuilderDropsAfterLast,
  renderActiveWorkout, copyPreviousIntoSet,
  normalizePlateSettings, getPlateSettings, computePlates, calculatePlates,
  openPlateCalcModal, openPlateCalcFor, savePlateSettings,
  toggleUnit, getBest1RM, getPreviousSet,
  MUSCLES, EQUIPMENT, EXERCISE_TYPES, TYPE_LABELS, EXERCISE_ROWS,
  esc, exPrimary, typeLabel, mapLegacyMuscle, normalizeExerciseRecord, normalizeExercises,
  get pickerTarget(){ return pickerTarget; }, set pickerTarget(v){ pickerTarget = v; },
  get pickerSelected(){ return pickerSelected; },
  getFilteredExercises, getRecentExerciseIds, getPickerSections, countPickerSelected,
  getBestSet, getExerciseHistory,
  togglePickerSelect, clearPickerSelected, addPickerSelected, addExerciseToWorkout,
  toggleFav, setExFilter, setPickerFilter, toggleShowHidden,
  openExercisePicker, renderPickerList, selectExercise,
  renderExercisesTab, openCustomExModal, saveCustomExercise,
  deleteExercise, unhideExercise, openExerciseDetail, renderExerciseDetail, fillCustomExSelects,
  get pendingDeleteExId(){ return pendingDeleteExId; },
  confirmDeleteExercise, cancelDeleteExercise,
  normSetType, getPrevScope, setPrevScope, getExInstanceIdx, getSetLaneIndex,
  findPreviousExercise, copyPreviousIntoSet,
  previousExerciseEntry, computeNextTarget, nextTargetText, targetLineHtml,
  addTargetStep, targetMissCount, previousWorkingSets, TARGET_STALE_DAYS,
  showTargetsEnabled, setShowTargets, useNextTarget, undoTargetFill, expireTargetFill,
  planTargetFill, nextTargetCanFill, targetRowIsFillable,
  hideTargetsForWorkout, showTargetsForWorkout, targetsHiddenForWorkout,
  get targetFillBackup(){ return targetFillBackup; }, set targetFillBackup(v){ targetFillBackup = v; },
  get warmupBackup(){ return warmupBackup; }, set warmupBackup(v){ warmupBackup = v; },
  get warmupTimer(){ return warmupTimer; }, set warmupTimer(v){ warmupTimer = v; },
  ensureHistoryIds, scoreHistExercises, findHistEntry,
  openHistDetail, closeHistDetail, renderHistDetail,
  openHistEdit, renderHistEdit, cancelHistEdit, saveHistEdit,
  updateHistTitle, updateHistDate, updateHistDuration, updateHistNote,
  updateHistSetVal, histSetFieldChange, paintHistSetRowError,
  histCycleSetType, addHistSet, removeHistSet, removeHistExercise,
  askDeleteHist, confirmDeleteHist, cancelDeleteHist, undoDeleteHist, expireDeletedHist,
  startHistWorkout, doStartHistWorkout, saveHistAsRoutine,
  renderHistory,
  get histDetailId(){ return histDetailId; },
  get editingHistId(){ return editingHistId; },
  get editingHistDraft(){ return editingHistDraft; },
  get pendingDeleteHistId(){ return pendingDeleteHistId; },
  get deletedHistBackup(){ return deletedHistBackup; },
  loadActiveSessionDraft, loadActiveSessionDraftRaw, resumeSavedWorkout, discardSavedDraft,
  saveActiveSession, updateOfflinePill, requestPersistentStorage, flushDurableState,
  clearActiveSessionLocal, clearActiveSessionStorage, readDraftMirrorRecord, readMainStateMirrorRecord,
  adoptMainStateFromMirror, queueMainStateMirror,
  get mirrorChain(){ return mirrorChain; },
  get draftMirrorChain(){ return mirrorChain; },
  get draftMirrorReady(){ return draftMirrorReady; },
  get bootReady(){ return bootReady; },
  get mirrorRecord(){ return mirrorRecord; },
  get draftMirrorSupported(){ return draftMirrorSupported(); },
  saveState,
  migrateParsedStateToV2, applySeedDefaults,
  validateBackupData, describeRestoreSummary, showRestorePreview,
  cancelRestore, confirmRestore, undoLastRestore,
  defaultObProfile, normalizeProfile, shouldShowOnboarding,
  openOnboarding, startOnboardingRerun, closeOnboarding, renderOnboarding,
  obGoStep, obBack, obSkip, obContinue, obWelcomeGo,
  obUpdate, obSetUnit, obSetHeightUnit, obSetGoal, obSetExperience, obSetRoutineChoice,
  obHeightError, obAgeError, obAgeFor, obCanonicalHeightCm, obCanContinue, finishOnboarding,
  addMissingSampleRoutines, removeSeededSampleRoutines,
  showWorkoutTab, renderGettingStarted, dismissGettingStarted,
  renderProfileStats, renderProfileRecords,
  renderMyProfile, obFormatHeight, obFormatAge,
  get obStep(){ return obStep; }, get obDraft(){ return obDraft; },
  METRICS_VERSION, metricCountingSets, isLoadSet, epley1RMKg, usesLoadMetrics,
  exerciseRecords, exerciseSessions, exerciseSeries, exerciseProgressModel,
  openExerciseProgress, closeExerciseProgress, renderExerciseProgress,
  setProgressMetric, setProgressRange, renderProfileRecords,
  get progressMetric(){ return progressMetric; }, set progressMetric(v){ progressMetric = v; },
  get progressRange(){ return progressRange; }, set progressRange(v){ progressRange = v; },
  get progressExId(){ return progressExId; }, get progressOrigin(){ return progressOrigin; },
  get progressMetric(){ return progressMetric; }, get progressRange(){ return progressRange; },
  getWeekStart, getWeekStartDayNum, setWeekStart, dayKeyLocal, startOfDayMs, startOfWeekMs,
  historyByDay, buildCalendarModel, computeConsistency, MUSCLE_BUCKETS,
  muscleWorkloadCounts, muscleWorkloadForMonth, muscleWorkloadAllTime,
  renderTrainingCalendar, showCalendarMonth, calPrevMonth, calNextMonth, calThisMonth,
  setCalWorkloadRange, openCalendarDay, openCalDayPick, closeCalDay, goToTrainingCalendar,
  isPlanDayKey, normalizePlans, getPlan, planDoneOn, planStatus, planLabel, computePlanWeek,
  todayPlanKey, isPlanableDay, openPlanDay, openPlanEditor, openDaySheet, planEditorHtml,
  savePlanForDay, saveRestPlanForDay, savePlanFromSelect, deletePlan, movePlan, movePlanFromInput,
  copyWeekToNextWeek, refreshPlanSheet,
  get planEditKey(){ return planEditKey; },
  renderTodayPlan, startTodayPlanWorkout,
  switchTab,
  get calYear(){ return calYear; }, get calMonth(){ return calMonth; },
  get calWorkloadRange(){ return calWorkloadRange; },
  get obWelcomeIdx(){ return obWelcomeIdx; }, get obIsFirstRun(){ return obIsFirstRun; },
  PROFILE_SECTION_KEY, getProfileSection, setProfileSection, saveRestPreference, hydrateSettingsControls,
  get activeProfileSection(){ return activeProfileSection; },
  emptyStateHtml, renderExercisesList, onExSearchInput,
  EXERCISE_PICTURES, exercisePictureHtml, exerciseThumbHtml, exerciseHowtoHtml, EXERCISE_HOWTO, muscleChartHtml, muscleChartLevels,
  MUSCLE_CHART_REGIONS, BODY_MAP_POLYGONS,
  normalizeBodyEntries, bodyEntries, upsertBodyWeight, upsertBodyMeasures,
  bodySeries, bodyTrend, bodyBmi, toDisplayLength, fromInputLength,
  saveBodyEntry, bodyDateChanged, toggleBodyMore, setBodyRange, setBodyMeasure,
  openBodyEdit, saveBodyEdit, askDeleteBody, confirmDeleteBody, undoDeleteBody,
  expireDeletedBody, renderBodySection,
  get deletedBodyBackup(){ return deletedBodyBackup; },
  get bodyRange(){ return bodyRange; }, set bodyRange(v){ bodyRange = v; },
  get bodyMeasure(){ return bodyMeasure; }, set bodyMeasure(v){ bodyMeasure = v; },
  get bodyEditId(){ return bodyEditId; },
  get bodyMoreOpen(){ return bodyMoreOpen; },
  // P5-04 private progress photos (IndexedDB only, never state)
  PHOTOS_DB_NAME, PHOTOS_DB_VERSION, PHOTOS_STORE_NAME, PHOTO_POSES, PHOTO_FILTERS,
  PHOTO_FULL_MAX_PX, PHOTO_THUMB_MAX_PX, PHOTO_JPEG_QUALITY, PHOTO_UNDO_MS,
  photosSupported, openPhotosDb, getPhotos, loadPhotos, savePhotoRecord, deletePhotoRecord,
  normalizePhotoRecord, photoSourceSize, decodePhotoFile, resizeImageToBlob, buildPhotoRecord,
  releasePhotoUrls, photoObjectUrl,
  addPhoto, openPhotoAdd, closePhotoAdd, photoFileChosen, paintPhotoAddError,
  setPhotoFilter, renderPhotosSection, photoById, sortedPhotos, chronologicalPhotos,
  photoDateText, photoShortDateText, photoWeightKg, photoWeightText, photoDeltaText, photoUnitWord,
  openPhotoViewer, closePhotoViewer, renderPhotoViewerBody,
  deletePhoto, undoDeletePhoto, photoUndoDelete, expirePhotoDelete, savePhotoToPhone,
  openPhotoCompare, closePhotoCompare, setComparePhoto, renderCompareBody,
  requestPhotoPersistenceOnce,
  get photos(){ return photosCache; },
  get photosLoaded(){ return photosLoaded; },
  get photosUnavailable(){ return photosUnavailable; },
  get photosLoadError(){ return photosLoadError; },
  get photoFilter(){ return photoFilter; },
  get photoViewerId(){ return photoViewerId; },
  get photoCompareA(){ return photoCompareA; },
  get photoCompareB(){ return photoCompareB; },
  get pendingPhotoDelete(){ return pendingPhotoDelete; },
  get photoAddError(){ return photoAddError; },
  get activePhotoUrls(){ return activePhotoUrls; },
  get photoPersistRequested(){ return photoPersistRequested; },
  // P5 Weekly Summary
  get weekSummaryViewWeekStartMs(){ return weekSummaryViewWeekStartMs; }, set weekSummaryViewWeekStartMs(v){ weekSummaryViewWeekStartMs = v; },
  weekSummaryEndMs, formatWeekRangeLabel, formatTimeDisplay, diffLabel, computeWeekSummary,
  renderWeekSummaryCard, showWeekSummaryPrev, showWeekSummaryNext,
  normalizeSounds, getAudioContext, unlockAudioContext, soundVolumeGain, playTone,
  playRestEndSound, playSetCompleteSound, playPrChimeSound, playBeep,
  testRestSound, testSetSound, testPrSound,
  setSoundRestChoice, setSoundRestVolume, setSoundSetVolume, setSoundPrVolume,
  isNewLiveRecord,
  exportData, formatBackupAge, renderBackupReminder, snoozeBackupReminder,
};`;

// Creates one app instance: runs init() (the script self-initializes) in a
// fresh JS context. Pass the same `store` Map to simulate a reload.
//
// Optional (all default to today's behaviour):
//   options.confirmResult  result of confirm()
//   options.navigator      object used as `navigator` (mutable: online/offline)
//   options.location       injected as `location` (default: absent)
//   options.fetch          injected as `fetch` (default: absent)
//   options.indexedDB      injected as `indexedDB` (see makeFakeIndexedDB)
//   options.listeners      record window/document listeners; fire them with
//                          app.fire(type[, event])
// P5-04: a canvas fake that records every resize/encode. The app's real
// <canvas> calls are what the tests assert on (<=1080 and <=240 long side,
// JPEG quality 0.8); the produced "blob" carries its dimensions so a stored
// IndexedDB record can be checked without a browser.
export function makeFakeCanvasLog() {
  return [];
}

function attachFakeCanvas(el, log) {
  el.width = 0;
  el.height = 0;
  el.getContext = function (kind) {
    if (String(kind) !== '2d') return null;
    return {
      drawImage(source, x, y, w, h) {
        const s = source || {};
        log.push({
          type: 'drawImage',
          width: Number(w) || 0,
          height: Number(h) || 0,
          sourceWidth: Number(s.naturalWidth || s.width) || 0,
          sourceHeight: Number(s.naturalHeight || s.height) || 0,
        });
      },
    };
  };
  el.toBlob = function (cb, type, quality) {
    const w = Number(this.width) || 0;
    const h = Number(this.height) || 0;
    log.push({ type: 'toBlob', width: w, height: h, mime: type || '', quality: quality });
    const blob = {
      _fakeBlob: true,
      type: type || 'image/jpeg',
      size: Math.max(1, w * h),
      _canvasWidth: w,
      _canvasHeight: h,
      _quality: quality,
    };
    if (typeof cb === 'function') cb(blob);
  };
  return el;
}

// P4-11: a minimal FileReader that only does what the routine importer needs
// (readAsText). The fake file may carry `_text`, or parts joined like a real
// File, so a chosen file behaves like the browser's async read.
export function makeFakeFileReader() {
  function FileReader() {
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
  }
  FileReader.prototype.readAsText = function (file) {
    const self = this;
    queueMicrotask(() => {
      try {
        let text;
        if (file && typeof file._text === 'string') text = file._text;
        else if (file && Array.isArray(file.parts)) text = file.parts.join('');
        else text = String(file === null || file === undefined ? '' : file);
        self.result = text;
        if (typeof self.onload === 'function') self.onload({ target: self });
      } catch (e) {
        self.error = e;
        if (typeof self.onerror === 'function') self.onerror({ target: self });
      }
    });
  };
  return FileReader;
}

export function createApp(options = {}) {
  const store = options.store || new Map();
  const document = makeDocument();
  const alerts = [];
  const confirms = [];
  let confirmResult = options.confirmResult !== undefined ? options.confirmResult : true;
  const trackListeners = !!options.listeners;
  const listeners = [];
  const navigatorObj = options.navigator || {};
  const canvasLog = options.canvasLog || makeFakeCanvasLog();
  const bitmapCalls = [];
  const urlCalls = { created: [], revoked: [] };
  const origCreateElement = document.createElement.bind(document);
  document.createElement = function (tag) {
    const el = origCreateElement(tag);
    if (String(tag).toLowerCase() === 'canvas') attachFakeCanvas(el, canvasLog);
    return el;
  };

  if (trackListeners) {
    document.addEventListener = (type, fn) => {
      if (typeof fn === 'function') listeners.push({ target: 'document', type: String(type), fn });
    };
    document.removeEventListener = () => {};
  }

  const sandbox = {
    console,
    localStorage: makeLocalStorage(store),
    document,
    window: {
      addEventListener(type, fn) {
        if (trackListeners && typeof fn === 'function') {
          listeners.push({ target: 'window', type: String(type), fn });
        }
      },
      removeEventListener() {},
    },
    navigator: navigatorObj,
    alert: (msg) => { alerts.push(String(msg)); },
    confirm: (msg) => { confirms.push(String(msg)); return confirmResult; },
    // Timers must not keep the test process alive; the app stores absolute
    // deadlines (restDeadline), so no ticking is needed for assertions.
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    Blob: function Blob(parts, opts) {
      this.parts = parts || [];
      this.type = (opts && opts.type) || '';
      this.size = this.parts.join('').length;
    },
    // A fake File never validates parts, so a fake canvas blob can be shared
    // exactly like a real JPEG. Existing share tests only read name/type.
    File: function File(parts, name, opts) {
      this.name = name;
      this.parts = parts || [];
      this.type = (opts && opts.type) || '';
      this.size = this.parts.reduce((n, p) => n + (p && p.size ? p.size : 0), 0);
    },
    URL: options.URL || {
      createObjectURL(blob) {
        const url = 'blob:photo-' + (urlCalls.created.length + 1);
        urlCalls.created.push({ url, blob });
        return url;
      },
      revokeObjectURL(url) { urlCalls.revoked.push(url); },
    },
    FileReader: makeFakeFileReader(),
    // P4-11: browsers have atob; the import link is decoded with it.
    atob: (text) => Buffer.from(String(text), 'base64').toString('binary'),
  };
  // P5-04: default decoder returns a fixed-size bitmap; tests that need an
  // undecodable file pass their own createImageBitmap that rejects.
  sandbox.createImageBitmap = options.createImageBitmap || function (file, opts) {
    bitmapCalls.push({ file, options: opts });
    return Promise.resolve({
      width: (file && file._width) || 1600,
      height: (file && file._height) || 1200,
    });
  };
  if (options.Image) sandbox.Image = options.Image;
  if (options.location) sandbox.location = options.location;
  if (typeof options.fetch === 'function') sandbox.fetch = options.fetch;
  if (options.indexedDB) sandbox.indexedDB = options.indexedDB;
  if (options.AudioContext) {
    sandbox.AudioContext = options.AudioContext;
    sandbox.webkitAudioContext = options.AudioContext;
    sandbox.window.AudioContext = options.AudioContext;
    sandbox.window.webkitAudioContext = options.AudioContext;
  }
  vm.createContext(sandbox);
  const src = options.scriptSrc || loadAppScript();
  vm.runInContext(src + EXPORT_SNIPPET, sandbox, { filename: 'index.html<script>' });

  return {
    store,
    document,
    alerts,
    confirms,
    listeners,
    navigator: navigatorObj,
    canvasLog,
    bitmapCalls,
    urlCalls,
    setConfirmResult(v) { confirmResult = v; },
    api: sandbox.__app,
    el: (id) => document.getElementById(id),
    stateJson() { return JSON.stringify(sandbox.__app.state); },
    // Dispatches a recorded window/document event (see options.listeners).
    fire(type, event) {
      const matches = listeners.filter((l) => l.type === type);
      matches.forEach((l) => { l.fn(event || {}); });
      return matches.length;
    },
  };
}
