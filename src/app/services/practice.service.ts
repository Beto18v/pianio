import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { PracticeState, PracticeWaitModeStatus } from '../domain/models/practice-state.model';
import { UserPlayedNote } from '../domain/models/user-played-note.model';
import { createNoteKey } from '../domain/utils/note-key.util';
import {
  DEFAULT_PRACTICE_STEP_TIME_TOLERANCE_SECONDS,
  createPracticeStepIndex,
  getPracticeStepIndexAtTime,
} from '../domain/utils/practice-step-index.util';
import { MidiInputService } from './midi-input.service';
import { PlaybackService } from './playback.service';
import { PlayerSettingsService } from './player-settings.service';
import { SongAnalysisService } from './song-analysis.service';

type PracticeTransportMode = 'idle' | 'waiting' | 'advancing';

const STEP_GATE_TOLERANCE_SECONDS = 0.02;

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
  private readonly songAnalysisService = inject(SongAnalysisService);
  private readonly playerSettingsService = inject(PlayerSettingsService);
  private readonly practiceModeEnabledState = signal(false);
  private readonly playIntentState = signal(false);
  private readonly stepPointerIndexState = signal<number | null>(null);
  private readonly matchedPitchesState = signal<ReadonlySet<number>>(new Set<number>());
  private readonly practiceNotes = computed(() => {
    const song = this.playbackService.song();

    if (!song) {
      return [];
    }

    const handMode = this.playerSettingsService.handMode();

    if (handMode === 'both') {
      return song.notes;
    }

    const noteAnnotations = this.songAnalysisService.analyze(song).noteAnnotations;

    return song.notes.filter((note) => noteAnnotations[createNoteKey(note)]?.hand === handMode);
  });
  private readonly practiceStepIndex = computed(() => {
    const practiceNotes = this.practiceNotes();

    return practiceNotes.length > 0 ? createPracticeStepIndex(practiceNotes) : null;
  });
  private readonly activeInputPitchesState = computed(() =>
    toSortedPitches(this.midiInputService.activePitches()),
  );
  private readonly currentStep = computed(() => {
    const index = this.practiceStepIndex();
    const stepIndex = this.stepPointerIndexState();

    if (!index || stepIndex === null) {
      return null;
    }

    return index.steps[stepIndex] ?? null;
  });
  private readonly expectedPitchesState = computed(() => this.currentStep()?.pitches ?? []);
  private readonly pitchEvaluationState = computed(() =>
    evaluatePracticePitches(
      this.expectedPitchesState(),
      this.activeInputPitchesState(),
      this.matchedPitchesState(),
    ),
  );
  private readonly shouldWaitForMatch = computed(() => {
    if (!this.practiceModeEnabledState()) {
      return false;
    }

    if (!this.playIntentState() || !this.playbackService.canPlay()) {
      return false;
    }

    const step = this.currentStep();

    if (!step) {
      return false;
    }

    if (this.pitchEvaluationState().isMatch) {
      return false;
    }

    const currentTime = this.playbackService.playbackState().currentTime;

    if (!Number.isFinite(currentTime)) {
      return false;
    }

    return currentTime + STEP_GATE_TOLERANCE_SECONDS >= step.startTime;
  });
  private readonly waitModeStatusState = computed<PracticeWaitModeStatus>(() => {
    const isPracticeModeEnabled = this.practiceModeEnabledState();

    if (!isPracticeModeEnabled) {
      return 'disabled';
    }

    const playIntent = this.playIntentState();
    const canPlay = this.playbackService.canPlay();

    if (!playIntent || !canPlay) {
      return 'idle';
    }

    return this.shouldWaitForMatch() ? 'waiting' : 'advancing';
  });

  readonly state = computed<PracticeState>(() => {
    const playbackState = this.playbackService.playbackState();
    const activeInputPitches = this.activeInputPitchesState();
    const expectedPitches = this.expectedPitchesState();
    const pitchEvaluation = this.pitchEvaluationState();
    const isPracticeModeEnabled = this.practiceModeEnabledState();
    const waitModeStatus = this.waitModeStatusState();

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

    return this.shouldWaitForMatch() ? 'waiting' : 'advancing';
  });

  constructor() {
    effect(() => {
      const index = this.practiceStepIndex();
      const stepPointerIndex = this.stepPointerIndexState();

      if (!index) {
        if (stepPointerIndex !== null) {
          this.stepPointerIndexState.set(null);
        }

        if (this.matchedPitchesState().size > 0) {
          this.matchedPitchesState.set(new Set<number>());
        }

        return;
      }

      const playbackState = this.playbackService.playbackState();
      const playIntent = this.playIntentState();
      const isPracticeModeEnabled = this.practiceModeEnabledState();

      if (!playIntent || !isPracticeModeEnabled) {
        const nextPointer = getPracticeStepIndexAtTime(index, playbackState.currentTime, {
          toleranceSeconds: DEFAULT_PRACTICE_STEP_TIME_TOLERANCE_SECONDS,
        });

        if (stepPointerIndex !== nextPointer) {
          this.stepPointerIndexState.set(nextPointer);
        }

        if (this.matchedPitchesState().size > 0) {
          this.matchedPitchesState.set(new Set<number>());
        }

        return;
      }

      if (
        stepPointerIndex === null ||
        stepPointerIndex < 0 ||
        stepPointerIndex >= index.steps.length
      ) {
        this.stepPointerIndexState.set(
          getPracticeStepIndexAtTime(index, playbackState.currentTime, {
            toleranceSeconds: DEFAULT_PRACTICE_STEP_TIME_TOLERANCE_SECONDS,
          }),
        );
        this.matchedPitchesState.set(new Set<number>());
      }
    });

    effect(() => {
      const isPracticeModeEnabled = this.practiceModeEnabledState();
      const playIntent = this.playIntentState();

      if (!isPracticeModeEnabled || !playIntent) {
        return;
      }

      const lastEvent = this.midiInputService.lastEvent();

      if (!lastEvent || lastEvent.type !== 'noteOn') {
        return;
      }

      const expectedPitches = this.expectedPitchesState();

      if (expectedPitches.length === 0) {
        return;
      }

      if (!expectedPitches.includes(lastEvent.pitch)) {
        return;
      }

      this.matchedPitchesState.update((current) => {
        if (current.has(lastEvent.pitch)) {
          return current;
        }

        const next = new Set(current);
        next.add(lastEvent.pitch);
        return next;
      });
    });

    effect(() => {
      const isPracticeModeEnabled = this.practiceModeEnabledState();
      const playIntent = this.playIntentState();

      if (!isPracticeModeEnabled || !playIntent || !this.playbackService.canPlay()) {
        return;
      }

      const index = this.practiceStepIndex();
      const stepPointerIndex = this.stepPointerIndexState();

      if (!index || stepPointerIndex === null) {
        return;
      }

      const step = index.steps[stepPointerIndex];

      if (!step) {
        return;
      }

      if (!this.pitchEvaluationState().isMatch) {
        return;
      }

      this.matchedPitchesState.update((current) => {
        let didChange = false;
        const next = new Set(current);

        for (const pitch of step.pitches) {
          if (!next.has(pitch)) {
            next.add(pitch);
            didChange = true;
          }
        }

        return didChange ? next : current;
      });

      const currentTime = this.playbackService.playbackState().currentTime;

      if (!Number.isFinite(currentTime)) {
        return;
      }

      if (currentTime + STEP_GATE_TOLERANCE_SECONDS < step.startTime) {
        return;
      }

      const nextStepIndex = stepPointerIndex + 1;

      if (nextStepIndex >= index.steps.length) {
        return;
      }

      this.stepPointerIndexState.set(nextStepIndex);
      this.matchedPitchesState.set(new Set<number>());
    });

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
    this.initializeStepPointerForActiveSession();
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
      const stepStartTime = this.currentStep()?.startTime ?? null;

      if (isPlaying) {
        this.playbackService.pause();
      }

      if (stepStartTime !== null) {
        const currentTime = this.playbackService.playbackState().currentTime;

        if (Number.isFinite(currentTime) && Math.abs(currentTime - stepStartTime) > 0.002) {
          this.playbackService.seek(stepStartTime);
        }
      }

      return;
    }

    if (!isPlaying) {
      this.playbackService.play();
    }
  }

  private initializeStepPointerForActiveSession(): void {
    const index = this.practiceStepIndex();

    if (!index) {
      this.stepPointerIndexState.set(null);
      this.matchedPitchesState.set(new Set<number>());
      return;
    }

    const playbackState = this.playbackService.playbackState();
    const nextPointer = getPracticeStepIndexAtTime(index, playbackState.currentTime, {
      toleranceSeconds: DEFAULT_PRACTICE_STEP_TIME_TOLERANCE_SECONDS,
    });

    this.stepPointerIndexState.set(nextPointer);
    this.matchedPitchesState.set(new Set<number>());
  }
}

function evaluatePracticePitches(
  expectedPitches: ReadonlyArray<number>,
  activeInputPitches: ReadonlyArray<number>,
  matchedPitches: ReadonlySet<number>,
): PracticePitchEvaluation {
  const expectedSet = new Set(expectedPitches);
  const activeSet = new Set(activeInputPitches);
  const isPitchMatched = (pitch: number): boolean =>
    matchedPitches.has(pitch) || activeSet.has(pitch);
  const resolvedMatchedPitches = expectedPitches.filter((pitch) => isPitchMatched(pitch));
  const missingPitches = expectedPitches.filter((pitch) => !isPitchMatched(pitch));
  const extraInputPitches = activeInputPitches.filter((pitch) => !expectedSet.has(pitch));
  const isMatch = expectedPitches.length > 0 && missingPitches.length === 0;

  return {
    matchedPitches: resolvedMatchedPitches,
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
