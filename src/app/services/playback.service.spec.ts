import { TestBed } from '@angular/core/testing';
import { MockInstance, vi } from 'vitest';

import { MidiSong } from '../domain/models/midi-song.model';
import { PlaybackService } from './playback.service';

describe('PlaybackService', () => {
  let service: PlaybackService;
  let nowSpy: MockInstance<() => number>;
  let pendingFrame: FrameRequestCallback | null = null;

  const song: MidiSong = {
    fileName: 'exercise.mid',
    duration: 2,
    tempoBpm: 120,
    ppq: 480,
    trackCount: 1,
    notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 }],
  };

  beforeEach(() => {
    pendingFrame = null;
    nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        pendingFrame = callback;
        return 1;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn(() => {
        pendingFrame = null;
      }),
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(PlaybackService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores the current song and resets the base transport state', () => {
    service.setSong(song);

    expect(service.song()).toEqual(song);
    expect(service.playbackState()).toEqual({
      isPlaying: false,
      currentTime: 0,
      duration: 2,
      playbackRate: 1,
    });
  });

  it('advances currentTime while playing and keeps the position on pause', () => {
    service.setSong(song);
    service.play();

    runFrame(500);

    expect(service.playbackState().isPlaying).toBe(true);
    expect(service.playbackState().currentTime).toBe(0.5);

    nowSpy.mockReturnValue(750);
    service.pause();

    expect(service.playbackState().isPlaying).toBe(false);
    expect(service.playbackState().currentTime).toBe(0.75);
  });

  it('stops at the song duration when the transport reaches the end', () => {
    service.setSong(song);
    service.play();

    runFrame(2500);

    expect(service.playbackState()).toEqual({
      isPlaying: false,
      currentTime: 2,
      duration: 2,
      playbackRate: 1,
    });
  });

  it('seeks within the song bounds and clamps out-of-range values', () => {
    service.setSong(song);

    service.seek(1.25);
    expect(service.playbackState().currentTime).toBe(1.25);

    service.seek(99);
    expect(service.playbackState().currentTime).toBe(2);

    service.seek(-5);
    expect(service.playbackState().currentTime).toBe(0);
  });

  it('applies playbackRate scaling when tempo is adjusted', () => {
    service.setSong(song);
    service.setPlaybackRate(0.5);
    service.play();

    runFrame(1000);

    expect(service.playbackState().playbackRate).toBe(0.5);
    expect(service.playbackState().currentTime).toBe(0.5);

    nowSpy.mockReturnValue(1000);
    service.setPlaybackRate(2);
    runFrame(1500);

    expect(service.playbackState().playbackRate).toBe(2);
    expect(service.playbackState().currentTime).toBe(1.5);
  });

  function runFrame(timestamp: number): void {
    const callback = pendingFrame;

    if (!callback) {
      throw new Error('No animation frame was scheduled.');
    }

    pendingFrame = null;
    callback(timestamp);
  }
});
