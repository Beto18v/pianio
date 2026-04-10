import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MidiSong } from '../domain/models/midi-song.model';
import { MidiInputService } from './midi-input.service';
import { PlaybackService } from './playback.service';
import { PracticeService } from './practice.service';

describe('PracticeService', () => {
  let playbackService: PlaybackService;
  let midiInputService: MidiInputService;
  let practiceService: PracticeService;

  const song: MidiSong = {
    fileName: 'practice.mid',
    duration: 2,
    tempoBpm: 110,
    ppq: 480,
    trackCount: 1,
    notes: [
      { pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 },
      { pitch: 64, velocity: 0.6, startTime: 1, duration: 0.5, track: 0 },
    ],
  };

  beforeEach(async () => {
    deleteNavigatorRequestMIDIAccess();

    TestBed.configureTestingModule({});

    playbackService = TestBed.inject(PlaybackService);
    midiInputService = TestBed.inject(MidiInputService);
    practiceService = TestBed.inject(PracticeService);

    await midiInputService.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    deleteNavigatorRequestMIDIAccess();
  });

  it('exposes empty practice state when there are no expected notes at current time', () => {
    playbackService.setSong(song);
    playbackService.seek(0.75);

    const state = practiceService.state();

    expect(state.expectedPitches).toEqual([]);
    expect(state.activeInputPitches).toEqual([]);
    expect(state.isMatch).toBe(false);
    expect(state.lastPlayedNote).toBeNull();
  });

  it('reports a match when expected pitch is currently active from midi input', () => {
    playbackService.setSong(song);
    playbackService.seek(0.1);

    midiInputService.triggerMockNote();

    const state = practiceService.state();

    expect(state.expectedPitches).toEqual([60]);
    expect(state.activeInputPitches).toEqual([60]);
    expect(state.isMatch).toBe(true);
    expect(state.lastPlayedNote?.type).toBe('noteOn');
    expect(state.lastPlayedNote?.pitch).toBe(60);
  });

  it('drops match status when noteOff is received for the expected pitch', () => {
    playbackService.setSong(song);
    playbackService.seek(0.1);

    midiInputService.triggerMockNote();
    midiInputService.triggerMockNote();

    const state = practiceService.state();

    expect(state.expectedPitches).toEqual([60]);
    expect(state.activeInputPitches).toEqual([]);
    expect(state.isMatch).toBe(false);
    expect(state.lastPlayedNote?.type).toBe('noteOff');
    expect(state.lastPlayedNote?.pitch).toBe(60);
  });
});

function deleteNavigatorRequestMIDIAccess(): void {
  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    value: undefined,
    writable: true,
  });
}
