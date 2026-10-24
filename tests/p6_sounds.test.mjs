// tests/p6_sounds.test.mjs — P6-08 Web Audio sounds in Profile > Settings and workout events.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, loadIndexHtml } from './harness.mjs';

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function plain(v) {
  return JSON.parse(JSON.stringify(v));
}

function makeFakeAudioContext() {
  class FakeGainNode {
    constructor() {
      this.gain = {
        value: 1,
        targetValue: null,
        setValueAtTime: (v) => { this.gain.value = v; },
        linearRampToValueAtTime: (v) => { this.gain.targetValue = v; },
        exponentialRampToValueAtTime: (v) => { this.gain.rampEnd = v; }
      };
      this.connectedTo = null;
    }
    connect(dest) { this.connectedTo = dest; }
  }

  class FakeOscillatorNode {
    constructor() {
      this.type = 'sine';
      this.frequency = {
        value: 440,
        startValue: null,
        endValue: null,
        setValueAtTime: (v) => { this.frequency.value = v; this.frequency.startValue = v; },
        exponentialRampToValueAtTime: (v) => { this.frequency.value = v; this.frequency.endValue = v; }
      };
      this.started = false;
      this.stopped = false;
      this.connectedTo = null;
    }
    connect(dest) { this.connectedTo = dest; }
    start(t) { this.started = true; this.startTime = t; }
    stop(t) { this.stopped = true; this.stopTime = t; }
  }

  class FakeAudioContext {
    constructor() {
      FakeAudioContext.instances.push(this);
      this.state = 'running';
      this.currentTime = 0;
      this.destination = { type: 'destination' };
      this.nodes = [];
    }
    createGain() {
      const g = new FakeGainNode();
      this.nodes.push(g);
      FakeAudioContext.createdGains.push(g);
      return g;
    }
    createOscillator() {
      const osc = new FakeOscillatorNode();
      this.nodes.push(osc);
      FakeAudioContext.createdOscillators.push(osc);
      return osc;
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
  }

  FakeAudioContext.instances = [];
  FakeAudioContext.createdGains = [];
  FakeAudioContext.createdOscillators = [];
  FakeAudioContext.reset = () => {
    FakeAudioContext.instances = [];
    FakeAudioContext.createdGains = [];
    FakeAudioContext.createdOscillators = [];
  };
  return FakeAudioContext;
}

describe('P6-08 Web Audio sounds', () => {
  let FakeAudioContext;

  beforeEach(() => {
    FakeAudioContext = makeFakeAudioContext();
  });

  it('sound-settings-default-and-saved', () => {
    const store = new Map();
    const app = createApp({ store, AudioContext: FakeAudioContext });

    // Defaults keep today's behaviour: rest beep on, set complete off, PR chime medium
    assert.deepEqual(plain(app.api.state.sounds), {
      restSound: 'beep',
      restVolume: 'medium',
      setVolume: 'off',
      prVolume: 'medium'
    });

    assert.equal(app.el('soundRestChoiceSelect').value, 'beep');
    assert.equal(app.el('soundRestVolumeSelect').value, 'medium');
    assert.equal(app.el('soundSetVolumeSelect').value, 'off');
    assert.equal(app.el('soundPrVolumeSelect').value, 'medium');

    // Update settings
    app.api.setSoundRestChoice('alarm');
    app.api.setSoundRestVolume('high');
    app.api.setSoundSetVolume('low');
    app.api.setSoundPrVolume('high');

    assert.deepEqual(plain(app.api.state.sounds), {
      restSound: 'alarm',
      restVolume: 'high',
      setVolume: 'low',
      prVolume: 'high'
    });

    // Reload preserves saved preferences
    const app2 = createApp({ store, AudioContext: FakeAudioContext });
    assert.deepEqual(plain(app2.api.state.sounds), {
      restSound: 'alarm',
      restVolume: 'high',
      setVolume: 'low',
      prVolume: 'high'
    });
    assert.equal(app2.el('soundRestChoiceSelect').value, 'alarm');
    assert.equal(app2.el('soundRestVolumeSelect').value, 'high');
    assert.equal(app2.el('soundSetVolumeSelect').value, 'low');
    assert.equal(app2.el('soundPrVolumeSelect').value, 'high');
  });

  it('rest-end-uses-chosen-sound-and-volume', () => {
    const app = createApp({ AudioContext: FakeAudioContext });

    // Alarm at low volume (gain = 0.25)
    app.api.setSoundRestChoice('alarm');
    app.api.setSoundRestVolume('low');
    FakeAudioContext.reset();

    app.api.playRestEndSound();
    assert.equal(FakeAudioContext.createdOscillators.length, 2, 'alarm has 2 chirp oscillators');
    assert.equal(FakeAudioContext.createdOscillators[0].frequency.value, 880);
    assert.equal(FakeAudioContext.createdOscillators[1].frequency.value, 1174);
    assert.equal(FakeAudioContext.createdGains[0].gain.targetValue, 0.25);

    // Bell at high volume (gain = 1.0)
    FakeAudioContext.reset();
    app.api.setSoundRestChoice('bell');
    app.api.setSoundRestVolume('high');

    app.api.playRestEndSound();
    assert.equal(FakeAudioContext.createdOscillators.length, 2, 'bell has 2 tone oscillators');
    assert.equal(FakeAudioContext.createdOscillators[0].frequency.value, 600);
    assert.equal(FakeAudioContext.createdOscillators[1].frequency.value, 1200);
    assert.equal(FakeAudioContext.createdGains[0].gain.value, 1.0);
    assert.equal(FakeAudioContext.createdGains[1].gain.value, 0.5);

    // Beep at medium volume (wrapper playBeep() also works)
    FakeAudioContext.reset();
    app.api.setSoundRestChoice('beep');
    app.api.setSoundRestVolume('medium');
    app.api.playBeep();
    assert.equal(FakeAudioContext.createdOscillators.length, 1, 'beep has 1 oscillator');
    assert.equal(FakeAudioContext.createdOscillators[0].frequency.value, 880);
    assert.equal(FakeAudioContext.createdGains[0].gain.targetValue, 0.5);
  });

  it('off-plays-nothing', () => {
    const app = createApp({ AudioContext: FakeAudioContext });

    // Rest sound Off
    app.api.setSoundRestChoice('off');
    FakeAudioContext.reset();
    app.api.playRestEndSound();
    assert.equal(FakeAudioContext.createdOscillators.length, 0);
    assert.equal(FakeAudioContext.createdGains.length, 0);

    // Set complete sound Off
    app.api.setSoundSetVolume('off');
    FakeAudioContext.reset();
    app.api.playSetCompleteSound();
    assert.equal(FakeAudioContext.createdOscillators.length, 0);
    assert.equal(FakeAudioContext.createdGains.length, 0);

    // PR chime Off
    app.api.setSoundPrVolume('off');
    FakeAudioContext.reset();
    app.api.playPrChimeSound();
    assert.equal(FakeAudioContext.createdOscillators.length, 0);
    assert.equal(FakeAudioContext.createdGains.length, 0);
  });

  it('set-complete-click-only-when-on', () => {
    const app = createApp({ AudioContext: FakeAudioContext });

    // Seed prior history for Bench Press (ex1) so sets below aren't PRs
    app.api.state.history = [{
      id: 'h1',
      date: Date.now() - 86400000,
      exercises: [{
        exId: 'ex1',
        sets: [{ type: 'N', weight: 100, reps: 10, done: true }]
      }]
    }];

    // Start routine workout containing ex1
    app.api.startRoutineWorkout('rt1');

    // Default setVolume is 'off'
    assert.equal(app.api.state.sounds.setVolume, 'off');
    app.api.updateSetVal(0, 0, 'weight', '50');
    app.api.updateSetVal(0, 0, 'reps', '5');

    FakeAudioContext.reset();
    app.api.toggleSetDone(0, 0);
    assert.equal(FakeAudioContext.createdOscillators.length, 0, 'no sound when setVolume is off');

    // Untick set
    app.api.toggleSetDone(0, 0);

    // Turn setVolume to 'medium'
    app.api.setSoundSetVolume('medium');
    FakeAudioContext.reset();
    app.api.toggleSetDone(0, 0);
    assert.equal(FakeAudioContext.createdOscillators.length, 1, 'click sound plays when setVolume is on');
    assert.equal(FakeAudioContext.createdOscillators[0].frequency.startValue, 1400);
    assert.equal(FakeAudioContext.createdOscillators[0].frequency.endValue, 300);

    // Turn back to off
    app.api.toggleSetDone(0, 0);
    app.api.setSoundSetVolume('off');
    FakeAudioContext.reset();
    app.api.toggleSetDone(0, 0);
    assert.equal(FakeAudioContext.createdOscillators.length, 0, 'no sound after turning off');
  });

  it('pr-chime-once-per-record', () => {
    const app = createApp({ AudioContext: FakeAudioContext });

    // Seed history with bench press (ex1) at 100 kg x 5
    app.api.state.history = [{
      id: 'h_bench',
      date: Date.now() - 86400000,
      exercises: [{
        exId: 'ex1',
        sets: [{ type: 'N', weight: 100, reps: 5, done: true }]
      }]
    }];

    app.api.setSoundSetVolume('high');
    app.api.setSoundPrVolume('medium');

    // Start routine workout containing ex1
    app.api.startRoutineWorkout('rt1');

    // Set 0: 105 kg x 5 (breaks previous 100 kg record!)
    app.api.updateSetVal(0, 0, 'weight', '105');
    app.api.updateSetVal(0, 0, 'reps', '5');

    FakeAudioContext.reset();
    app.api.toggleSetDone(0, 0);

    // PR chime played (3 notes) and set complete click was suppressed
    assert.equal(FakeAudioContext.createdOscillators.length, 3, 'chime has 3 notes');
    assert.equal(FakeAudioContext.createdOscillators[0].frequency.value, 1046.5);
    assert.equal(FakeAudioContext.createdOscillators[1].frequency.value, 1318.5);
    assert.equal(FakeAudioContext.createdOscillators[2].frequency.value, 1568.0);

    // Set 1: add another set with same weight (105 kg x 5). Does NOT beat running best 105 kg!
    app.api.updateSetVal(0, 1, 'weight', '105');
    app.api.updateSetVal(0, 1, 'reps', '5');

    FakeAudioContext.reset();
    app.api.toggleSetDone(0, 1);
    // Only regular click played (1 oscillator), not chime
    assert.equal(FakeAudioContext.createdOscillators.length, 1, 'non-PR set only plays regular click');

    // Set 2: add set with 110 kg x 5 (new record again!)
    app.api.updateSetVal(0, 2, 'weight', '110');
    app.api.updateSetVal(0, 2, 'reps', '5');

    FakeAudioContext.reset();
    app.api.toggleSetDone(0, 2);
    assert.equal(FakeAudioContext.createdOscillators.length, 3, 'new record chimes again');

    // Finish workout (drop unticked sets from rt1) and verify prChimed was stripped from history
    app.api.finishWorkout();
    if (app.api.finishReviewPending) app.api.finishReviewDrop();
    assert.equal(app.api.state.history.length, 2);
    const savedSets = app.api.state.history[0].exercises[0].sets;
    assert.equal(savedSets.length, 3);
    for (const s of savedSets) {
      assert.equal(s.prChimed, undefined, 'prChimed must never be saved into history');
    }
  });

  it('single-shared-audiocontext', () => {
    const app = createApp({ AudioContext: FakeAudioContext });

    app.api.playRestEndSound();
    app.api.playSetCompleteSound();
    app.api.playPrChimeSound();
    app.api.testRestSound();
    app.api.testSetSound();
    app.api.testPrSound();

    assert.equal(FakeAudioContext.instances.length, 1, 'exactly one AudioContext instance is created and shared');
    assert.equal(app.api.getAudioContext(), FakeAudioContext.instances[0]);
  });

  it('test-buttons-play', () => {
    const app = createApp({ AudioContext: FakeAudioContext });

    // Rest test
    FakeAudioContext.reset();
    app.api.testRestSound();
    assert.ok(FakeAudioContext.createdOscillators.length >= 1, 'rest test triggered sound');

    // Set test (when setVolume is medium)
    app.api.setSoundSetVolume('medium');
    FakeAudioContext.reset();
    app.api.testSetSound();
    assert.equal(FakeAudioContext.createdOscillators.length, 1, 'set test triggered click');

    // PR test
    FakeAudioContext.reset();
    app.api.testPrSound();
    assert.equal(FakeAudioContext.createdOscillators.length, 3, 'PR test triggered chime');
  });

  it('handlers-compile', () => {
    const html = loadIndexHtml();
    const idx = html.indexOf('id="soundsHelpNote"');
    assert.ok(idx > 0, 'soundsHelpNote exists');

    const endIdx = html.indexOf('Barbell plates', idx);
    const block = html.slice(idx - 100, endIdx);
    assert.ok(block.includes('Sounds may not play when the phone is on silent or the screen is locked.'), 'exact help text present');

    let checked = 0;
    for (const m of block.matchAll(/\bon[a-z]+="([^"]+)"/g)) {
      const code = decodeHtmlEntities(m[1]);
      assert.doesNotThrow(() => new Function(code), `handler failed to compile: ${m[1]}`);
      checked++;
    }
    assert.equal(checked, 7, 'all 7 onchange and onclick handlers compiled');

    // Verify unique ids
    for (const id of [
      'soundsHelpNote',
      'soundRestChoiceSelect',
      'soundRestVolumeSelect',
      'testSoundRestBtn',
      'soundSetVolumeSelect',
      'testSoundSetBtn',
      'soundPrVolumeSelect',
      'testSoundPrBtn'
    ]) {
      const n = [...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length;
      assert.equal(n, 1, `${id} must appear exactly once`);
    }
  });

  it('nothing-wider-than-412', () => {
    const html = loadIndexHtml();
    const idx = html.indexOf('id="soundsHelpNote"');
    const endIdx = html.indexOf('Barbell plates', idx);
    const block = html.slice(idx - 100, endIdx);

    const widths = [...block.matchAll(/\bwidth:\s*(\d+)px/g)].map((m) => Number(m[1]));
    assert.ok(widths.length > 0, 'found width declarations');
    for (const w of widths) {
      assert.ok(w <= 412, `width ${w}px exceeds 412px frame`);
    }

    // Verify 44px min-height on test buttons
    const btnMatches = [...block.matchAll(/id="testSound[^"]+"[^>]*style="([^"]*)"/g)];
    assert.equal(btnMatches.length, 3, 'found all 3 test buttons');
    for (const bm of btnMatches) {
      assert.ok(bm[1].includes('min-height:44px'), 'test button must be at least 44px tall');
    }
  });

  it('restore-keeps-sounds-and-accepts-old-backup', () => {
    const app = createApp({ AudioContext: FakeAudioContext });

    // 1. Old backup without sounds
    const oldBackup = {
      schemaVersion: 2,
      unit: 'KG',
      exercises: [],
      routines: [],
      history: []
    };

    const valResult = app.api.validateBackupData(oldBackup);
    assert.equal(valResult.ok, true, 'old backup without sounds is valid');
    assert.deepEqual(plain(valResult.data.sounds), {
      restSound: 'beep',
      restVolume: 'medium',
      setVolume: 'off',
      prVolume: 'medium'
    }, 'old backup receives safe defaults');

    // 2. Backup with custom sounds
    const customBackup = {
      schemaVersion: 2,
      unit: 'KG',
      sounds: {
        restSound: 'alarm',
        restVolume: 'high',
        setVolume: 'high',
        prVolume: 'off'
      },
      exercises: [],
      routines: [],
      history: []
    };

    const valResult2 = app.api.validateBackupData(customBackup);
    assert.equal(valResult2.ok, true, 'backup with sounds is valid');
    assert.deepEqual(plain(valResult2.data.sounds), {
      restSound: 'alarm',
      restVolume: 'high',
      setVolume: 'high',
      prVolume: 'off'
    }, 'custom sounds preserved on restore');
  });
});
