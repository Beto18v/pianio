import { TestBed } from '@angular/core/testing';
import { MockInstance, vi } from 'vitest';

import { MidiSong } from '../domain/models/midi-song.model';
import { FrameBudgetService } from './frame-budget.service';
import { PlaybackAudioService } from './playback-audio.service';
import { PlaybackService } from './playback.service';

describe('PlaybackAudioService', () => {
  let frameBudgetService: FrameBudgetService;
  let playbackService: PlaybackService;
  let playbackAudioService: PlaybackAudioService;
  let nowSpy: MockInstance<() => number>;

  const song: MidiSong = {
    fileName: 'exercise.mid',
    duration: 2,
    tempoBpm: 120,
    ppq: 480,
    trackCount: 1,
    notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 }],
  };

  beforeEach(() => {
    FakeAudioContext.reset();
    nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);

    vi.stubGlobal('AudioContext', FakeAudioContext as unknown as typeof AudioContext);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn(() => undefined),
    );

    TestBed.configureTestingModule({});
    frameBudgetService = TestBed.inject(FrameBudgetService);
    playbackService = TestBed.inject(PlaybackService);
    playbackAudioService = TestBed.inject(PlaybackAudioService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('resumes the audio context when playback is prepared from user interaction', async () => {
    await playbackAudioService.prepareForPlayback();

    expect(FakeAudioContext.lastInstance?.resumeCalls).toBe(1);
  });

  it('starts and stops voices following transport play and pause', () => {
    playbackService.setSong(song);
    playbackService.play();
    TestBed.flushEffects();

    expect(FakeAudioContext.lastInstance?.oscillatorStartCount).toBe(1);
    expect(FakeAudioContext.lastInstance?.filterCreateCount).toBe(1);
    expect(FakeAudioContext.lastInstance?.compressorCreateCount).toBe(1);
    expect(FakeAudioContext.lastInstance?.periodicWaveCreateCount).toBe(1);
    expect(FakeAudioContext.lastInstance?.periodicWaveSetCount).toBe(1);

    nowSpy.mockReturnValue(250);
    playbackService.pause();
    TestBed.flushEffects();

    expect(FakeAudioContext.lastInstance?.oscillatorStopCount).toBeGreaterThanOrEqual(1);
  });

  it('schedules only notes inside the lookahead window and advances with cursor', () => {
    const scheduledSong: MidiSong = {
      ...song,
      duration: 3,
      notes: [
        { pitch: 60, velocity: 0.7, startTime: 0, duration: 0.2, track: 0 },
        { pitch: 62, velocity: 0.7, startTime: 0.12, duration: 0.2, track: 0 },
        { pitch: 64, velocity: 0.7, startTime: 0.42, duration: 0.2, track: 0 },
      ],
    };

    playbackService.setSong(scheduledSong);
    playbackService.play();
    TestBed.flushEffects();

    expect(FakeAudioContext.lastInstance?.oscillatorStartCount).toBe(2);

    playbackService.seek(0.3);
    TestBed.flushEffects();

    expect(FakeAudioContext.lastInstance?.oscillatorStartCount).toBe(3);
  });

  it('resets and rehydrates the scheduler on seek, stop and song change', () => {
    const firstSong: MidiSong = {
      ...song,
      duration: 4,
      notes: [
        { pitch: 60, velocity: 0.8, startTime: 0, duration: 0.6, track: 0 },
        { pitch: 64, velocity: 0.8, startTime: 0.1, duration: 0.5, track: 0 },
        { pitch: 67, velocity: 0.8, startTime: 1.1, duration: 0.5, track: 0 },
      ],
    };
    const secondSong: MidiSong = {
      ...song,
      fileName: 'replacement.mid',
      notes: [{ pitch: 72, velocity: 0.9, startTime: 0, duration: 0.4, track: 0 }],
    };

    playbackService.setSong(firstSong);
    playbackService.play();
    TestBed.flushEffects();

    const startsAfterFirstPlay = FakeAudioContext.lastInstance?.oscillatorStartCount ?? 0;
    expect(startsAfterFirstPlay).toBe(2);

    playbackService.seek(1.1);
    TestBed.flushEffects();

    const startsAfterSeek = FakeAudioContext.lastInstance?.oscillatorStartCount ?? 0;
    expect(startsAfterSeek).toBe(3);

    playbackService.stop();
    TestBed.flushEffects();

    const stopsAfterStop = FakeAudioContext.lastInstance?.oscillatorStopCount ?? 0;
    expect(stopsAfterStop).toBeGreaterThanOrEqual(3);

    playbackService.setSong(secondSong);
    playbackService.play();
    TestBed.flushEffects();

    const startsAfterSongChange = FakeAudioContext.lastInstance?.oscillatorStartCount ?? 0;
    expect(startsAfterSongChange).toBe(4);
  });

  it('releases active voices with a short ramp when seeking forward', () => {
    const scheduledSong: MidiSong = {
      ...song,
      duration: 2.2,
      notes: [
        { pitch: 60, velocity: 0.8, startTime: 0, duration: 1.2, track: 0 },
        { pitch: 64, velocity: 0.8, startTime: 0.4, duration: 1, track: 0 },
      ],
    };

    playbackService.setSong(scheduledSong);
    playbackService.play();
    TestBed.flushEffects();

    playbackService.seek(1.1);
    TestBed.flushEffects();

    const releases = FakeAudioContext.lastInstance?.setTargetAtTimeCount ?? 0;

    expect(releases).toBeGreaterThanOrEqual(1);
  });

  it('smooths gain and filter ramps when starting a note', () => {
    playbackService.setSong(song);
    playbackService.play();
    TestBed.flushEffects();

    const smoothingCalls = FakeAudioContext.lastInstance?.setTargetAtTimeCount ?? 0;

    expect(smoothingCalls).toBeGreaterThanOrEqual(2);
  });

  it('respects adaptive polyphony cap under frame pressure', () => {
    const denseChordSong: MidiSong = {
      ...song,
      duration: 1,
      notes: [
        { pitch: 60, velocity: 0.9, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 62, velocity: 0.9, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 64, velocity: 0.9, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 65, velocity: 0.9, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 67, velocity: 0.9, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 69, velocity: 0.9, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 71, velocity: 0.9, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 72, velocity: 0.9, startTime: 0, duration: 0.5, track: 0 },
      ],
    };

    playbackService.setSong(denseChordSong);

    let timestamp = 0;
    frameBudgetService.recordFrame(timestamp);

    for (let frame = 0; frame < 120; frame += 1) {
      timestamp += 33;
      frameBudgetService.recordFrame(timestamp);
    }

    const adaptiveCap = frameBudgetService.guardrails().polyphonyCap;
    expect(adaptiveCap).toBeLessThan(10);

    playbackService.play();
    TestBed.flushEffects();

    expect(FakeAudioContext.lastInstance?.oscillatorStartCount).toBe(adaptiveCap);
  });
});

class FakeAudioContext {
  static lastInstance: FakeAudioContext | null = null;

  static reset(): void {
    FakeAudioContext.lastInstance = null;
  }

  state: AudioContextState = 'suspended';
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  oscillatorStartCount = 0;
  oscillatorStopCount = 0;
  filterCreateCount = 0;
  compressorCreateCount = 0;
  periodicWaveCreateCount = 0;
  periodicWaveSetCount = 0;
  gainLinearRampCount = 0;
  setTargetAtTimeCount = 0;
  resumeCalls = 0;

  constructor() {
    FakeAudioContext.lastInstance = this;
  }

  createGain(): GainNode {
    return new FakeGainNode(this) as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    return new FakeOscillatorNode(this) as unknown as OscillatorNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    this.filterCreateCount += 1;

    return new FakeBiquadFilterNode() as unknown as BiquadFilterNode;
  }

  createDynamicsCompressor(): DynamicsCompressorNode {
    this.compressorCreateCount += 1;

    return new FakeDynamicsCompressorNode() as unknown as DynamicsCompressorNode;
  }

  createPeriodicWave(): PeriodicWave {
    this.periodicWaveCreateCount += 1;

    return {} as PeriodicWave;
  }

  resume(): Promise<void> {
    this.state = 'running';
    this.resumeCalls += 1;

    return Promise.resolve();
  }
}

class FakeGainNode {
  readonly gain: FakeAudioParam;

  constructor(audioContext: FakeAudioContext) {
    this.gain = new FakeAudioParam(audioContext);
  }

  connect(): void {
    return;
  }

  disconnect(): void {
    return;
  }
}

class FakeOscillatorNode {
  readonly frequency = new FakeAudioParam();
  type: OscillatorType = 'triangle';
  onended: ((this: OscillatorNode, ev: Event) => unknown) | null = null;

  constructor(private readonly audioContext: FakeAudioContext) {}

  connect(): void {
    return;
  }

  setPeriodicWave(): void {
    this.audioContext.periodicWaveSetCount += 1;
  }

  disconnect(): void {
    return;
  }

  start(): void {
    this.audioContext.oscillatorStartCount += 1;
  }

  stop(): void {
    this.audioContext.oscillatorStopCount += 1;
    this.onended?.call(this as unknown as OscillatorNode, new Event('ended'));
  }
}

class FakeAudioParam {
  constructor(private readonly audioContext?: FakeAudioContext) {}

  value = 0;

  setValueAtTime(value: number): AudioParam {
    this.value = value;

    return this as unknown as AudioParam;
  }

  linearRampToValueAtTime(value: number): AudioParam {
    if (this.audioContext) {
      this.audioContext.gainLinearRampCount += 1;
    }
    this.value = value;

    return this as unknown as AudioParam;
  }

  setTargetAtTime(value: number, _startTime: number, _timeConstant: number): AudioParam {
    if (this.audioContext) {
      this.audioContext.setTargetAtTimeCount += 1;
    }
    this.value = value;

    return this as unknown as AudioParam;
  }

  cancelScheduledValues(): AudioParam {
    return this as unknown as AudioParam;
  }
}

class FakeBiquadFilterNode {
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
  type: BiquadFilterType = 'lowpass';

  connect(): void {
    return;
  }

  disconnect(): void {
    return;
  }
}

class FakeDynamicsCompressorNode {
  readonly threshold = new FakeAudioParam();
  readonly knee = new FakeAudioParam();
  readonly ratio = new FakeAudioParam();
  readonly attack = new FakeAudioParam();
  readonly release = new FakeAudioParam();

  connect(): void {
    return;
  }

  disconnect(): void {
    return;
  }
}
