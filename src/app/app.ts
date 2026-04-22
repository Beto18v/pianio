import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { MidiSong } from './domain/models/midi-song.model';
import { createNoteKey } from './domain/utils/note-key.util';
import { createSongNoteIndex, getNotesStartingInRange } from './domain/utils/song-note-index.util';
import { MidiInputMonitorComponent } from './features/midi-input/midi-input-monitor.component';
import { PlaybackControlsComponent } from './features/playback/playback-controls/playback-controls.component';
import { MidiUploadComponent } from './features/midi-upload/midi-upload.component';
import { OnboardingFlowComponent } from './features/onboarding/onboarding-flow.component';
import { NoteRainComponent } from './features/visualization/note-rain/note-rain.component';
import { PianoKeyboardComponent } from './features/visualization/piano-keyboard/piano-keyboard.component';
import { getPitchLabel } from './features/visualization/utils/keyboard-layout.util';
import { siteContent } from './core/site';
import { KeyboardCalibrationService } from './services/keyboard-calibration.service';
import { MidiInputService } from './services/midi-input.service';
import { FrameBudgetService } from './services/frame-budget.service';
import { PlaybackAudioService } from './services/playback-audio.service';
import { PlaybackService } from './services/playback.service';
import { PlayerSettingsService } from './services/player-settings.service';
import { PracticeService } from './services/practice.service';
import { SongAnalysisService } from './services/song-analysis.service';

type AppFlowStep = 'welcome' | 'calibration' | 'main';

const KEY_GUIDE_START_TOLERANCE_SECONDS = 0.01;
const KEY_GUIDE_RELEASE_TOLERANCE_SECONDS = 0.025;

@Component({
  selector: 'app-root',
  imports: [
    NgOptimizedImage,
    OnboardingFlowComponent,
    MidiUploadComponent,
    PlaybackControlsComponent,
    MidiInputMonitorComponent,
    PianoKeyboardComponent,
    NoteRainComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly site = siteContent;
  private readonly playbackService = inject(PlaybackService);
  private readonly midiInputService = inject(MidiInputService);
  private readonly frameBudgetService = inject(FrameBudgetService);
  private readonly keyboardCalibrationService = inject(KeyboardCalibrationService);
  private readonly songAnalysisService = inject(SongAnalysisService);
  private readonly playerSettingsService = inject(PlayerSettingsService);
  private readonly practiceService = inject(PracticeService);
  private readonly playbackAudioService = inject(PlaybackAudioService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly flowStepState = signal<AppFlowStep>('welcome');

  protected readonly flowStep = this.flowStepState.asReadonly();
  protected readonly currentSong = this.playbackService.song;
  protected readonly playbackState = this.playbackService.playbackState;
  protected readonly activeInputPitches = this.midiInputService.activePitches;
  private readonly noteAnnotations = computed(() => {
    const song = this.currentSong();

    return song ? this.songAnalysisService.analyze(song).noteAnnotations : {};
  });
  private readonly songNoteIndex = computed(() => {
    const song = this.currentSong();

    return song ? createSongNoteIndex(song.notes) : null;
  });
  private readonly guideCurrentTime = computed(() => {
    const currentTime = this.playbackState().currentTime;
    const mode = this.frameBudgetService.guardrails().mode;
    const frameStepSeconds = mode === 'stable' ? 1 / 60 : mode === 'adaptive' ? 1 / 45 : 1 / 30;

    return Math.round(currentTime / frameStepSeconds) * frameStepSeconds;
  });
  protected readonly guideSongPitches = computed<ReadonlySet<number>>(() => {
    const song = this.currentSong();
    const noteIndex = this.songNoteIndex();

    if (!song || !noteIndex) {
      return new Set<number>();
    }

    const currentTime = this.guideCurrentTime();

    if (!Number.isFinite(currentTime)) {
      return new Set<number>();
    }

    const searchWindowStart = Math.max(
      0,
      currentTime - noteIndex.maxNoteDurationSeconds - KEY_GUIDE_RELEASE_TOLERANCE_SECONDS,
    );
    const searchWindowEnd = Math.min(
      song.duration,
      currentTime + KEY_GUIDE_START_TOLERANCE_SECONDS,
    );

    if (searchWindowEnd < searchWindowStart) {
      return new Set<number>();
    }

    const candidateNotes = getNotesStartingInRange(noteIndex, searchWindowStart, searchWindowEnd);
    const guidePitches = new Set<number>();
    const noteAnnotations = this.noteAnnotations();

    for (const note of candidateNotes) {
      const noteEnd = note.startTime + note.duration;
      const isNoteGuidedNow =
        currentTime + KEY_GUIDE_START_TOLERANCE_SECONDS >= note.startTime &&
        currentTime <= noteEnd + KEY_GUIDE_RELEASE_TOLERANCE_SECONDS;
      const noteAnnotation = noteAnnotations[createNoteKey(note)];

      if (
        isNoteGuidedNow &&
        Number.isFinite(note.pitch) &&
        this.playerSettingsService.matchesHandMode(noteAnnotation?.hand ?? 'unknown')
      ) {
        guidePitches.add(note.pitch);
      }
    }

    return guidePitches;
  });
  protected readonly connectionState = this.midiInputService.connectionState;
  protected readonly keyboardCalibrationState = this.keyboardCalibrationService.state;
  protected readonly keyboardLayout = this.keyboardCalibrationService.keyboardLayout;
  protected readonly calibrationErrorMessage = this.keyboardCalibrationService.errorMessage;
  protected readonly firstCalibrationPitch = this.keyboardCalibrationService.firstPitch;
  protected readonly lastCalibrationPitch = this.keyboardCalibrationService.lastPitch;
  protected readonly canEnterMainScene = computed(
    () => this.keyboardCalibrationState().status === 'ready',
  );
  protected readonly isMappingInProgress = computed(() => {
    const status = this.keyboardCalibrationState().status;

    return status === 'waitingFirstKey' || status === 'waitingLastKey';
  });
  protected readonly firstCalibrationLabel = computed(() => {
    const firstPitch = this.firstCalibrationPitch();

    return firstPitch === null ? null : getPitchLabel(firstPitch);
  });
  protected readonly lastCalibrationLabel = computed(() => {
    const lastPitch = this.lastCalibrationPitch();

    return lastPitch === null ? null : getPitchLabel(lastPitch);
  });
  protected readonly calibrationSourceLabel = computed(() => {
    const source = this.keyboardCalibrationState().source;

    switch (source) {
      case 'fallback':
        return this.site.calibration.states.fallback;
      case 'calibrated':
        return this.site.calibration.states.calibrated;
      case 'default':
      default:
        return this.site.calibration.states.default;
    }
  });
  protected readonly calibrationConnectionLabel = computed(() => {
    const connectionState = this.connectionState();

    if (connectionState === 'ready') {
      return this.site.calibration.connectionStates.ready;
    }

    if (connectionState === 'mock') {
      return this.site.calibration.connectionStates.mock;
    }

    return this.site.calibration.connectionStates.idle;
  });
  protected readonly calibrationMappingStatusLabel = computed(() => {
    const { status, source } = this.keyboardCalibrationState();

    if (status === 'waitingFirstKey') {
      return this.site.calibration.mapping.states.waitingFirstKey;
    }

    if (status === 'waitingLastKey') {
      return this.site.calibration.mapping.states.waitingLastKey;
    }

    if (status === 'ready' && source === 'calibrated') {
      return this.site.calibration.mapping.states.readyCalibrated;
    }

    if (status === 'ready') {
      return this.site.calibration.mapping.states.readyFallback;
    }

    return this.site.calibration.mapping.states.idle;
  });
  protected readonly calibrationMappingHint = computed(() => {
    const { status, source } = this.keyboardCalibrationState();

    if (status === 'waitingFirstKey') {
      return this.site.calibration.mapping.hints.waitingFirstKey;
    }

    if (status === 'waitingLastKey') {
      return this.site.calibration.mapping.hints.waitingLastKey;
    }

    if (status === 'ready' && source === 'calibrated') {
      return this.site.calibration.mapping.hints.readyCalibrated;
    }

    if (status === 'ready') {
      return this.site.calibration.mapping.hints.readyFallback;
    }

    return this.site.calibration.mapping.hints.idle;
  });

  constructor() {
    this.applySeoMetadata();
    void this.midiInputService.initialize();

    effect(() => {
      const currentStep = this.flowStep();
      const calibrationStatus = this.keyboardCalibrationState().status;

      if (currentStep === 'main' && calibrationStatus !== 'ready') {
        this.flowStepState.set('calibration');
      }
    });
  }

  protected onSongParsed(song: MidiSong | null): void {
    this.playbackService.setSong(song);
  }

  protected async onSongPlayRequested(): Promise<void> {
    await this.playbackAudioService.prepareForPlayback();
    this.practiceService.requestPlay();
  }

  protected goToCalibration(): void {
    this.flowStepState.set('calibration');
    void this.midiInputService.refresh();

    if (this.keyboardCalibrationState().status === 'idle') {
      this.keyboardCalibrationService.useFullRangeFallback();
    }
  }

  protected goToWelcome(): void {
    this.keyboardCalibrationService.clearCalibration();
    this.flowStepState.set('welcome');
  }

  protected confirmCalibration(): void {
    if (!this.canEnterMainScene()) {
      return;
    }

    this.flowStepState.set('main');
  }

  protected startCalibration(): void {
    this.keyboardCalibrationService.startCalibration();
  }

  protected retryCalibration(): void {
    this.keyboardCalibrationService.startCalibration();
  }

  protected useFallbackRange(): void {
    this.keyboardCalibrationService.useFullRangeFallback();
  }

  private applySeoMetadata(): void {
    this.titleService.setTitle(this.site.seo.title);
    this.metaService.updateTag({
      name: 'description',
      content: this.site.seo.description,
    });
    this.metaService.updateTag({
      name: 'keywords',
      content: this.site.seo.keywords.join(', '),
    });
    this.metaService.updateTag({
      property: 'og:title',
      content: this.site.seo.title,
    });
    this.metaService.updateTag({
      property: 'og:description',
      content: this.site.seo.description,
    });
    this.metaService.updateTag({
      name: 'twitter:title',
      content: this.site.seo.title,
    });
    this.metaService.updateTag({
      name: 'twitter:description',
      content: this.site.seo.description,
    });
  }
}
