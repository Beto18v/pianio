import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { siteContent } from '../../../core/site';
import { KeyboardCalibrationService } from '../../../services/keyboard-calibration.service';
import { MidiInputService } from '../../../services/midi-input.service';
import { FrameBudgetService } from '../../../services/frame-budget.service';
import { InstrumentPresetId } from '../../../services/playback-audio.service';
import { PlaybackAudioService } from '../../../services/playback-audio.service';
import {
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  PlaybackService,
} from '../../../services/playback.service';
import { HandMode, PlayerSettingsService } from '../../../services/player-settings.service';
import { PracticeService } from '../../../services/practice.service';

@Component({
  selector: 'app-playback-controls',
  imports: [DecimalPipe],
  templateUrl: './playback-controls.component.html',
  styleUrl: './playback-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaybackControlsComponent {
  protected readonly site = siteContent;
  protected readonly playbackService = inject(PlaybackService);
  protected readonly playbackAudioService = inject(PlaybackAudioService);
  protected readonly frameBudgetService = inject(FrameBudgetService);
  protected readonly practiceService = inject(PracticeService);
  protected readonly keyboardCalibrationService = inject(KeyboardCalibrationService);
  protected readonly midiInputService = inject(MidiInputService);
  protected readonly playerSettingsService = inject(PlayerSettingsService);
  protected readonly song = this.playbackService.song;
  protected readonly playbackState = this.playbackService.playbackState;
  protected readonly frameBudgetSnapshot = this.frameBudgetService.snapshot;
  protected readonly adaptiveGuardrails = this.frameBudgetService.guardrails;
  protected readonly hasSong = this.playbackService.hasSong;
  protected readonly canPlay = this.playbackService.canPlay;
  protected readonly practiceState = this.practiceService.state;
  protected readonly isPracticeModeEnabled = this.practiceService.isPracticeModeEnabled;
  protected readonly waitModeStatus = this.practiceService.waitModeStatus;
  protected readonly shouldBlockPlayback = this.practiceService.shouldBlockPlayback;
  protected readonly activeRange = this.keyboardCalibrationService.activeRange;
  protected readonly calibrationSource = this.keyboardCalibrationService.source;
  protected readonly connectionState = this.midiInputService.connectionState;
  protected readonly isMockMode = this.midiInputService.isMockMode;
  protected readonly isPracticeDetailsVisible = computed(() => this.isPracticeModeEnabled());
  protected readonly selectedPresetId = this.playbackAudioService.selectedPresetId;
  protected readonly instrumentPresetOptions = this.playbackAudioService.instrumentPresetOptions;
  protected readonly masterVolume = this.playbackAudioService.masterVolume;
  protected readonly handMode = this.playerSettingsService.handMode;
  protected readonly showNoteLabels = this.playerSettingsService.showNoteLabels;
  protected readonly minTempoPercent = Math.round(MIN_PLAYBACK_RATE * 100);
  protected readonly maxTempoPercent = Math.round(MAX_PLAYBACK_RATE * 100);
  protected readonly tempoScalePercent = computed(() =>
    Math.round(this.playbackState().playbackRate * 100),
  );
  protected readonly masterVolumePercent = computed(() => Math.round(this.masterVolume() * 100));
  protected readonly midiTempoBpm = computed(() => {
    const tempoBpm = this.song()?.tempoBpm;

    if (typeof tempoBpm !== 'number' || !Number.isFinite(tempoBpm)) {
      return null;
    }

    return tempoBpm;
  });
  protected readonly effectiveTempoBpm = computed(() => {
    const midiTempoBpm = this.midiTempoBpm();

    if (midiTempoBpm === null) {
      return null;
    }

    return midiTempoBpm * this.playbackState().playbackRate;
  });
  protected readonly hasExtraInputPitches = computed(
    () => this.practiceState().extraInputPitches.length > 0,
  );
  protected readonly longFramePercent = computed(() =>
    Math.round(this.frameBudgetSnapshot().longFrameRatio * 100),
  );
  protected readonly guardrailModeLabel = computed(() => {
    const mode = this.adaptiveGuardrails().mode;

    switch (mode) {
      case 'adaptive':
        return this.site.playback.performance.modes.adaptive;
      case 'constrained':
        return this.site.playback.performance.modes.constrained;
      case 'stable':
      default:
        return this.site.playback.performance.modes.stable;
    }
  });
  protected readonly practiceMatchStatus = computed(() => {
    if (!this.isPracticeModeEnabled()) {
      return this.site.playback.practice.states.disabled;
    }

    if (this.shouldBlockPlayback()) {
      return this.site.playback.practice.states.blocked;
    }

    if (this.hasExtraInputPitches()) {
      return this.site.playback.practice.states.matchWithExtra;
    }

    return this.site.playback.practice.states.match;
  });
  protected readonly practiceWaitModeStatus = computed(() => {
    const waitModeStatus = this.waitModeStatus();

    switch (waitModeStatus) {
      case 'idle':
        return this.site.playback.practice.waitModeStates.idle;
      case 'waiting':
        return this.site.playback.practice.waitModeStates.waiting;
      case 'advancing':
        return this.site.playback.practice.waitModeStates.advancing;
      case 'disabled':
      default:
        return this.site.playback.practice.waitModeStates.disabled;
    }
  });
  protected readonly connectionStatusLabel = computed(() => {
    const state = this.connectionState();

    if (state === 'ready') {
      return this.site.midiInput.states.ready;
    }

    if (state === 'mock') {
      return this.site.midiInput.states.mock;
    }

    return this.site.midiInput.states.idle;
  });
  protected readonly calibrationSourceLabel = computed(() => {
    const source = this.calibrationSource();

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
  protected readonly isStopDisabled = computed(() => {
    const playbackState = this.playbackState();

    return !this.hasSong() || (!playbackState.isPlaying && playbackState.currentTime === 0);
  });
  protected readonly selectedHandModeLabel = computed(() => {
    switch (this.handMode()) {
      case 'left':
        return this.site.playback.settings.handModes.left;
      case 'right':
        return this.site.playback.settings.handModes.right;
      case 'both':
      default:
        return this.site.playback.settings.handModes.both;
    }
  });
  protected readonly selectedPresetLabel = computed(
    () =>
      this.instrumentPresetOptions.find((preset) => preset.id === this.selectedPresetId())?.label ??
      this.instrumentPresetOptions[0]?.label ??
      this.site.playback.settings.fields.sound,
  );

  protected play(): void {
    void this.playbackAudioService.prepareForPlayback();
    this.practiceService.requestPlay();
  }

  protected pause(): void {
    this.practiceService.requestPause();
  }

  protected stop(): void {
    this.practiceService.requestStop();
  }

  protected recalibrate(): void {
    this.keyboardCalibrationService.startCalibration();
  }

  protected triggerMockNote(): void {
    this.midiInputService.triggerMockNote();
  }

  protected onPracticeModeToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.practiceService.setPracticeModeEnabled(input.checked);
  }

  protected onSeek(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.playbackService.seek(Number(input.value));
  }

  protected onTempoScaleInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    const tempoPercent = Number(input.value);

    if (!Number.isFinite(tempoPercent)) {
      return;
    }

    this.playbackService.setPlaybackRate(tempoPercent / 100);
  }

  protected onHandModeChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;

    if (!select) {
      return;
    }

    this.playerSettingsService.setHandMode(select.value as HandMode);
  }

  protected onInstrumentPresetChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;

    if (!select) {
      return;
    }

    this.playbackAudioService.setSelectedPresetId(select.value as InstrumentPresetId);
  }

  protected onMasterVolumeInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    const volumePercent = Number(input.value);

    if (!Number.isFinite(volumePercent)) {
      return;
    }

    this.playbackAudioService.setMasterVolume(volumePercent / 100);
  }

  protected onShowNoteLabelsToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.playerSettingsService.setShowNoteLabels(input.checked);
  }

  protected formatPitchList(pitches: ReadonlyArray<number>): string {
    if (pitches.length === 0) {
      return this.site.playback.practice.emptyPitches;
    }

    return pitches.join(', ');
  }
}
