import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { NoteEvent } from '../domain/models/note-event.model';
import { PracticeState } from '../domain/models/practice-state.model';
import { UserPlayedNote } from '../domain/models/user-played-note.model';
import { MidiInputService } from './midi-input.service';
import { PlaybackService } from './playback.service';

@Injectable({
  providedIn: 'root',
})
export class PracticeService {
  private readonly playbackService = inject(PlaybackService);
  private readonly midiInputService = inject(MidiInputService);
  private readonly practiceModeEnabledState = signal(false);
  private readonly playIntentState = signal(false);

  readonly state = computed<PracticeState>(() => {
    const song = this.playbackService.song();
    const playbackState = this.playbackService.playbackState();
    const activeInputPitches = toSortedPitches(this.midiInputService.activePitches());
    const expectedPitches = song
      ? getExpectedPitchesAtTime(song.notes, playbackState.currentTime)
      : [];

    return {
      currentTime: playbackState.currentTime,
      expectedPitches,
      activeInputPitches,
      isMatch: isMatch(expectedPitches, activeInputPitches),
      lastPlayedNote: toUserPlayedNote(this.midiInputService.lastEvent()),
    };
  });

  readonly expectedPitches = computed(() => this.state().expectedPitches);
  readonly activeInputPitches = computed(() => this.state().activeInputPitches);
  readonly isMatch = computed(() => this.state().isMatch);
  readonly lastPlayedNote = computed(() => this.state().lastPlayedNote);
  readonly isPracticeModeEnabled = this.practiceModeEnabledState.asReadonly();
  readonly playIntent = this.playIntentState.asReadonly();
  readonly shouldBlockPlayback = computed(
    () => this.isPracticeModeEnabled() && this.expectedPitches().length > 0 && !this.isMatch(),
  );

  constructor() {
    effect(() => {
      const isPracticeModeEnabled = this.isPracticeModeEnabled();
      const playIntent = this.playIntent();
      const shouldBlockPlayback = this.shouldBlockPlayback();
      const playbackState = this.playbackService.playbackState();
      const canPlay = this.playbackService.canPlay();

      if (!isPracticeModeEnabled || !playIntent || !canPlay) {
        return;
      }

      if (shouldBlockPlayback && playbackState.isPlaying) {
        this.playbackService.pause();
        return;
      }

      if (!shouldBlockPlayback && !playbackState.isPlaying) {
        this.playbackService.play();
      }
    });
  }

  setPracticeModeEnabled(enabled: boolean): void {
    this.practiceModeEnabledState.set(enabled);
    this.syncPlaybackWithPracticeGate();
  }

  requestPlay(): void {
    this.playIntentState.set(true);
    this.syncPlaybackWithPracticeGate();
  }

  requestPause(): void {
    this.playIntentState.set(false);
    this.playbackService.pause();
  }

  requestStop(): void {
    this.playIntentState.set(false);
    this.playbackService.stop();
  }

  private syncPlaybackWithPracticeGate(): void {
    if (!this.playIntent() || !this.playbackService.canPlay()) {
      return;
    }

    const playbackState = this.playbackService.playbackState();

    if (this.shouldBlockPlayback()) {
      if (playbackState.isPlaying) {
        this.playbackService.pause();
      }

      return;
    }

    if (!playbackState.isPlaying) {
      this.playbackService.play();
    }
  }
}

function getExpectedPitchesAtTime(notes: ReadonlyArray<NoteEvent>, currentTime: number): number[] {
  if (!Number.isFinite(currentTime)) {
    return [];
  }

  const activePitches = notes
    .filter((note) => {
      if (
        !Number.isFinite(note.startTime) ||
        !Number.isFinite(note.duration) ||
        note.duration <= 0
      ) {
        return false;
      }

      const noteEnd = note.startTime + note.duration;

      return currentTime >= note.startTime && currentTime < noteEnd;
    })
    .map((note) => note.pitch)
    .filter((pitch): pitch is number => Number.isInteger(pitch) && pitch >= 0 && pitch <= 127);

  return Array.from(new Set(activePitches)).sort((left, right) => left - right);
}

function toSortedPitches(pitches: ReadonlySet<number>): number[] {
  return Array.from(pitches)
    .filter((pitch): pitch is number => Number.isInteger(pitch) && pitch >= 0 && pitch <= 127)
    .sort((left, right) => left - right);
}

function isMatch(
  expectedPitches: ReadonlyArray<number>,
  activeInputPitches: ReadonlyArray<number>,
): boolean {
  if (expectedPitches.length === 0) {
    return false;
  }

  const activeSet = new Set(activeInputPitches);

  return expectedPitches.every((pitch) => activeSet.has(pitch));
}

function toUserPlayedNote(
  event: {
    type: 'noteOn' | 'noteOff';
    pitch: number;
    velocity: number;
    timestamp: number;
    deviceId: string;
    deviceName: string;
  } | null,
): UserPlayedNote | null {
  if (!event) {
    return null;
  }

  return {
    type: event.type,
    pitch: event.pitch,
    velocity: event.velocity,
    timestamp: event.timestamp,
    deviceId: event.deviceId,
    deviceName: event.deviceName,
  };
}
