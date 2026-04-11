import { Injectable, computed, inject, signal } from '@angular/core';

import { MidiSong } from '../domain/models/midi-song.model';
import { PlaybackState } from '../domain/models/playback-state.model';
import { FrameBudgetService } from './frame-budget.service';

const INITIAL_PLAYBACK_STATE: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

@Injectable({
  providedIn: 'root',
})
export class PlaybackService {
  private readonly frameBudgetService = inject(FrameBudgetService);
  private readonly songState = signal<MidiSong | null>(null);
  private readonly playbackStateState = signal<PlaybackState>(INITIAL_PLAYBACK_STATE);

  readonly song = this.songState.asReadonly();
  readonly playbackState = this.playbackStateState.asReadonly();
  readonly hasSong = computed(() => this.song() !== null);
  readonly canPlay = computed(() => this.hasSong() && this.playbackState().duration > 0);

  private animationFrameId: number | null = null;
  private playbackAnchorTimeMs: number | null = null;
  private anchorSongTime = 0;

  setSong(song: MidiSong | null): void {
    this.cancelFrame();
    this.frameBudgetService.clearSamples();
    this.songState.set(song);
    this.playbackAnchorTimeMs = null;
    this.anchorSongTime = 0;
    this.playbackStateState.set({
      isPlaying: false,
      currentTime: 0,
      duration: song?.duration ?? 0,
    });
  }

  play(): void {
    if (!this.canPlay()) {
      return;
    }

    const state = this.playbackStateState();

    if (state.isPlaying) {
      return;
    }

    const nextTime = state.currentTime >= state.duration ? 0 : state.currentTime;

    this.anchorSongTime = nextTime;
    this.playbackAnchorTimeMs = performance.now();
    this.frameBudgetService.resetFrameClock();
    this.playbackStateState.update((current) => ({
      ...current,
      isPlaying: true,
      currentTime: nextTime,
    }));
    this.scheduleFrame();
  }

  pause(): void {
    if (!this.playbackStateState().isPlaying) {
      return;
    }

    this.syncCurrentTime(performance.now());
    this.cancelFrame();
    this.frameBudgetService.resetFrameClock();
    this.playbackStateState.update((current) => ({
      ...current,
      isPlaying: false,
    }));
    this.playbackAnchorTimeMs = null;
    this.anchorSongTime = this.playbackStateState().currentTime;
  }

  stop(): void {
    this.cancelFrame();
    this.frameBudgetService.resetFrameClock();
    this.playbackAnchorTimeMs = null;
    this.anchorSongTime = 0;
    this.playbackStateState.update((current) => ({
      ...current,
      isPlaying: false,
      currentTime: 0,
    }));
  }

  seek(time: number): void {
    const duration = this.playbackStateState().duration;
    const nextTime = clampTime(time, duration);
    const isPlaying = this.playbackStateState().isPlaying;

    this.playbackStateState.update((current) => ({
      ...current,
      currentTime: nextTime,
    }));
    this.anchorSongTime = nextTime;
    this.playbackAnchorTimeMs = isPlaying ? performance.now() : null;

    if (isPlaying) {
      this.frameBudgetService.resetFrameClock();
      this.scheduleFrame();
    }
  }

  private readonly onAnimationFrame = (timestamp: number): void => {
    this.animationFrameId = null;

    if (!this.playbackStateState().isPlaying) {
      return;
    }

    this.frameBudgetService.recordFrame(timestamp);
    this.syncCurrentTime(timestamp);

    if (this.playbackStateState().isPlaying) {
      this.scheduleFrame();
    }
  };

  private syncCurrentTime(timestamp: number): void {
    const state = this.playbackStateState();

    if (!state.isPlaying) {
      return;
    }

    const anchorTimeMs = this.playbackAnchorTimeMs ?? timestamp;
    const elapsedSeconds = Math.max(0, (timestamp - anchorTimeMs) / 1000);
    const nextTime = clampTime(this.anchorSongTime + elapsedSeconds, state.duration);

    if (nextTime >= state.duration) {
      this.playbackStateState.update((current) => ({
        ...current,
        isPlaying: false,
        currentTime: current.duration,
      }));
      this.playbackAnchorTimeMs = null;
      this.anchorSongTime = state.duration;
      return;
    }

    this.playbackStateState.update((current) => ({
      ...current,
      currentTime: nextTime,
    }));
  }

  private scheduleFrame(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.onAnimationFrame);
  }

  private cancelFrame(): void {
    if (this.animationFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }
}

function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) {
    return 0;
  }

  return Math.min(Math.max(time, 0), duration);
}
