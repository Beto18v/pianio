import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { PracticeState, PracticeWaitModeStatus } from '../domain/models/practice-state.model';
import { UserPlayedNote } from '../domain/models/user-played-note.model';
import {
  createPracticeStepIndex,
  getExpectedPitchesAtTime as getExpectedPitchesAtTimeFromIndex,
} from '../domain/utils/practice-step-index.util';
import { MidiInputService } from './midi-input.service';
import { PlaybackService } from './playback.service';

type PracticeTransportMode = 'idle' | 'waiting' | 'advancing';

interface PracticePitchEvaluation {
  matchedPitches: number[];
  missingPitches: number[];
  extraInputPitches: number[];
  isMatch: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PracticeService {
  private readonly playbackService = inject(PlaybackService);
  private readonly midiInputService = inject(MidiInputService);
  private readonly practiceModeEnabledState = signal(false);
  private readonly playIntentState = signal(false);
  private readonly practiceStepIndex = computed(() => {
    const song = this.playbackService.song();

    return song ? createPracticeStepIndex(song.notes) : null;
  });

  readonly state = computed<PracticeState>(() => {
    const playbackState = this.playbackService.playbackState();
    const activeInputPitches = toSortedPitches(this.midiInputService.activePitches());
    const practiceStepIndex = this.practiceStepIndex();
    const expectedPitches = practiceStepIndex
      ? getExpectedPitchesAtTimeFromIndex(practiceStepIndex, playbackState.currentTime)
      : [];
    const pitchEvaluation = evaluatePracticePitches(expectedPitches, activeInputPitches);
    const isPracticeModeEnabled = this.practiceModeEnabledState();
    const playIntent = this.playIntentState();
    const canPlay = this.playbackService.canPlay();
    const waitModeStatus = resolveWaitModeStatus({
      isPracticeModeEnabled,
      playIntent,
      canPlay,
      missingPitchCount: pitchEvaluation.missingPitches.length,
      isMatch: pitchEvaluation.isMatch,
    });

    return {
      currentTime: playbackState.currentTime,
      expectedPitches,
      activeInputPitches,
      matchedPitches: pitchEvaluation.matchedPitches,
      missingPitches: pitchEvaluation.missingPitches,
      extraInputPitches: pitchEvaluation.extraInputPitches,
      isMatch: pitchEvaluation.isMatch,
      isPracticeModeEnabled,
      waitModeStatus,
      isWaitingForMatch: waitModeStatus === 'waiting',
      lastPlayedNote: toUserPlayedNote(this.midiInputService.lastEvent()),
    };
  });

  readonly expectedPitches = computed(() => this.state().expectedPitches);
  readonly activeInputPitches = computed(() => this.state().activeInputPitches);
  readonly matchedPitches = computed(() => this.state().matchedPitches);
  readonly missingPitches = computed(() => this.state().missingPitches);
  readonly extraInputPitches = computed(() => this.state().extraInputPitches);
  readonly isMatch = computed(() => this.state().isMatch);
  readonly lastPlayedNote = computed(() => this.state().lastPlayedNote);
  readonly isPracticeModeEnabled = this.practiceModeEnabledState.asReadonly();
  readonly playIntent = this.playIntentState.asReadonly();
  readonly waitModeStatus = computed(() => this.state().waitModeStatus);
  readonly isWaitingForMatch = computed(() => this.state().isWaitingForMatch);
  readonly shouldBlockPlayback = computed(() => this.isWaitingForMatch());

  private readonly transportMode = computed<PracticeTransportMode>(() => {
    if (!this.playIntent() || !this.playbackService.canPlay()) {
      return 'idle';
    }

    if (!this.isPracticeModeEnabled()) {
      return 'advancing';
    }

    return this.isWaitingForMatch() ? 'waiting' : 'advancing';
  });

  constructor() {
    effect(() => {
      const playbackState = this.playbackService.playbackState();

      this.syncTransportWithWaitMode(playbackState.isPlaying);
    });
  }

  setPracticeModeEnabled(enabled: boolean): void {
    this.practiceModeEnabledState.set(enabled);
    this.syncTransportWithWaitMode(this.playbackService.playbackState().isPlaying);
  }

  requestPlay(): void {
    this.playIntentState.set(true);
    this.syncTransportWithWaitMode(this.playbackService.playbackState().isPlaying);
  }

  requestPause(): void {
    this.playIntentState.set(false);
    this.playbackService.pause();
  }

  requestStop(): void {
    this.playIntentState.set(false);
    this.playbackService.stop();
  }

  private syncTransportWithWaitMode(isPlaying: boolean): void {
    const transportMode = this.transportMode();

    if (transportMode === 'idle') {
      return;
    }

    if (transportMode === 'waiting') {
      if (isPlaying) {
        this.playbackService.pause();
      }

      return;
    }

    if (!isPlaying) {
      this.playbackService.play();
    }
  }
}

function resolveWaitModeStatus({
  isPracticeModeEnabled,
  playIntent,
  canPlay,
  missingPitchCount,
  isMatch,
}: {
  isPracticeModeEnabled: boolean;
  playIntent: boolean;
  canPlay: boolean;
  missingPitchCount: number;
  isMatch: boolean;
}): PracticeWaitModeStatus {
  if (!isPracticeModeEnabled) {
    return 'disabled';
  }

  if (!playIntent || !canPlay) {
    return 'idle';
  }

  if (missingPitchCount > 0 && !isMatch) {
    return 'waiting';
  }

  return 'advancing';
}

function evaluatePracticePitches(
  expectedPitches: ReadonlyArray<number>,
  activeInputPitches: ReadonlyArray<number>,
): PracticePitchEvaluation {
  const expectedSet = new Set(expectedPitches);
  const activeSet = new Set(activeInputPitches);
  const matchedPitches = expectedPitches.filter((pitch) => activeSet.has(pitch));
  const missingPitches = expectedPitches.filter((pitch) => !activeSet.has(pitch));
  const extraInputPitches = activeInputPitches.filter((pitch) => !expectedSet.has(pitch));
  const isMatch = expectedPitches.length > 0 && missingPitches.length === 0;

  return {
    matchedPitches,
    missingPitches,
    extraInputPitches,
    isMatch,
  };
}

function toSortedPitches(pitches: ReadonlySet<number>): number[] {
  return Array.from(pitches)
    .filter((pitch): pitch is number => Number.isInteger(pitch) && pitch >= 0 && pitch <= 127)
    .sort((left, right) => left - right);
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
