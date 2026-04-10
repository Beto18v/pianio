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
    midiInputService = TestBed.inject(MidiInputService);
    practiceService = TestBed.inject(PracticeService);

    await midiInputService.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    deleteNavigatorRequestMIDIAccess();
  });

  it('exposes empty practice state when there are no expected notes at current time', () => {
    playbackService.setSong(song);
    playbackService.seek(0.75);

    const state = practiceService.state();

    expect(state.expectedPitches).toEqual([]);
    expect(state.activeInputPitches).toEqual([]);
    expect(state.matchedPitches).toEqual([]);
    expect(state.missingPitches).toEqual([]);
    expect(state.extraInputPitches).toEqual([]);
    expect(state.isMatch).toBe(false);
    expect(state.isPracticeModeEnabled).toBe(false);
    expect(state.waitModeStatus).toBe('disabled');
    expect(state.isWaitingForMatch).toBe(false);
    expect(state.lastPlayedNote).toBeNull();
  });

  it('keeps wait mode in idle state until play is requested', () => {
    playbackService.setSong(song);
    playbackService.seek(0.1);

    practiceService.setPracticeModeEnabled(true);
    TestBed.flushEffects();

    expect(practiceService.waitModeStatus()).toBe('idle');
    expect(practiceService.isWaitingForMatch()).toBe(false);
  });

  it('reports a match when expected pitch is currently active from midi input', () => {
    playbackService.setSong(song);
    playbackService.seek(0.1);

    midiInputService.triggerMockNote();

    const state = practiceService.state();

    expect(state.expectedPitches).toEqual([60]);
    expect(state.activeInputPitches).toEqual([60]);
    expect(state.matchedPitches).toEqual([60]);
    expect(state.missingPitches).toEqual([]);
    expect(state.extraInputPitches).toEqual([]);
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
    expect(state.matchedPitches).toEqual([]);
    expect(state.missingPitches).toEqual([60]);
    expect(state.extraInputPitches).toEqual([]);
    expect(state.isMatch).toBe(false);
    expect(state.lastPlayedNote?.type).toBe('noteOff');
    expect(state.lastPlayedNote?.pitch).toBe(60);
  });

  it('reports missing and extra pitches when current input differs from expected notes', () => {
    playbackService.setSong(song);
    playbackService.seek(0.1);

    midiInputService.triggerMockNote();
    midiInputService.triggerMockNote();
    midiInputService.triggerMockNote();

    const state = practiceService.state();

    expect(state.expectedPitches).toEqual([60]);
    expect(state.activeInputPitches).toEqual([62]);
    expect(state.matchedPitches).toEqual([]);
    expect(state.missingPitches).toEqual([60]);
    expect(state.extraInputPitches).toEqual([62]);
    expect(state.isMatch).toBe(false);
  });

  it('blocks playback start in practice mode when there is no match', () => {
    playbackService.setSong(song);
    playbackService.seek(0.1);

    const playSpy = vi.spyOn(playbackService, 'play');

    practiceService.setPracticeModeEnabled(true);
    practiceService.requestPlay();
    TestBed.flushEffects();

    expect(practiceService.shouldBlockPlayback()).toBe(true);
    expect(practiceService.waitModeStatus()).toBe('waiting');
    expect(practiceService.isWaitingForMatch()).toBe(true);
    expect(playSpy).not.toHaveBeenCalled();
    expect(playbackService.playbackState().isPlaying).toBe(false);
  });

  it('resumes playback on match and pauses again when match is lost', () => {
    playbackService.setSong(song);
    playbackService.seek(0.1);

    const playSpy = vi.spyOn(playbackService, 'play');
    const pauseSpy = vi.spyOn(playbackService, 'pause');

    practiceService.setPracticeModeEnabled(true);
    practiceService.requestPlay();
    TestBed.flushEffects();

    expect(practiceService.waitModeStatus()).toBe('waiting');

    midiInputService.triggerMockNote();
    TestBed.flushEffects();

    expect(practiceService.waitModeStatus()).toBe('advancing');
    expect(playSpy).toHaveBeenCalled();
    expect(playbackService.playbackState().isPlaying).toBe(true);

    midiInputService.triggerMockNote();
    TestBed.flushEffects();

    expect(practiceService.waitModeStatus()).toBe('waiting');
    expect(pauseSpy).toHaveBeenCalled();
    expect(playbackService.playbackState().isPlaying).toBe(false);
  });

  it('keeps transport advancing when practice mode is disabled with active play intent', () => {
    playbackService.setSong(song);
    playbackService.seek(0.1);

    const playSpy = vi.spyOn(playbackService, 'play');

    practiceService.setPracticeModeEnabled(true);
    practiceService.requestPlay();
    TestBed.flushEffects();

    expect(practiceService.waitModeStatus()).toBe('waiting');
    expect(playbackService.playbackState().isPlaying).toBe(false);

    practiceService.setPracticeModeEnabled(false);
    TestBed.flushEffects();

    expect(practiceService.waitModeStatus()).toBe('disabled');
    expect(playSpy).toHaveBeenCalled();
    expect(playbackService.playbackState().isPlaying).toBe(true);
  });
});

function deleteNavigatorRequestMIDIAccess(): void {
  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    value: undefined,
    writable: true,
  });
}
