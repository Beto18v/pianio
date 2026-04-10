import { TestBed } from '@angular/core/testing';
import { MockInstance, vi } from 'vitest';

import { MidiSong } from '../domain/models/midi-song.model';
import { PlaybackAudioService } from './playback-audio.service';
import { PlaybackService } from './playback.service';

describe('PlaybackAudioService', () => {
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

    nowSpy.mockReturnValue(250);
    playbackService.pause();
    TestBed.flushEffects();

    expect(FakeAudioContext.lastInstance?.oscillatorStopCount).toBe(1);
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
  resumeCalls = 0;

  constructor() {
    FakeAudioContext.lastInstance = this;
  }

  createGain(): GainNode {
    return new FakeGainNode() as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    return new FakeOscillatorNode(this) as unknown as OscillatorNode;
  }

  resume(): Promise<void> {
    this.state = 'running';
    this.resumeCalls += 1;

    return Promise.resolve();
  }
}

class FakeGainNode {
  readonly gain = new FakeAudioParam();

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
  value = 0;

  setValueAtTime(value: number): AudioParam {
    this.value = value;

    return this as unknown as AudioParam;
  }

  linearRampToValueAtTime(value: number): AudioParam {
    this.value = value;

    return this as unknown as AudioParam;
  }

  cancelScheduledValues(): AudioParam {
    return this as unknown as AudioParam;
  }
}
