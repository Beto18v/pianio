import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { siteContent } from '../../core/site';
import { KeyboardCalibrationState } from '../../domain/models/keyboard-calibration-state.model';
import { MidiInputConnectionState } from '../../services/midi-input.service';
import { PianoKeyboardComponent } from '../visualization/piano-keyboard/piano-keyboard.component';
import { KeyboardLayout } from '../visualization/models/keyboard-layout.model';
import { MVP_KEYBOARD_LAYOUT, getPitchLabel } from '../visualization/utils/keyboard-layout.util';

type OnboardingStep = 'welcome' | 'calibration' | 'main';

const DEFAULT_CALIBRATION_STATE: KeyboardCalibrationState = {
  status: 'idle',
  source: 'default',
  range: {
    firstPitch: MVP_KEYBOARD_LAYOUT.startPitch,
    lastPitch: MVP_KEYBOARD_LAYOUT.endPitch,
    firstLabel: getPitchLabel(MVP_KEYBOARD_LAYOUT.startPitch),
    lastLabel: getPitchLabel(MVP_KEYBOARD_LAYOUT.endPitch),
  },
  errorMessage: null,
};

@Component({
  selector: 'app-onboarding-flow',
  imports: [NgOptimizedImage, PianoKeyboardComponent],
  templateUrl: './onboarding-flow.component.html',
  styleUrl: './onboarding-flow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingFlowComponent {
  protected readonly site = siteContent;

  readonly step = input<OnboardingStep>('welcome');
  readonly keyboardLayout = input<KeyboardLayout>(MVP_KEYBOARD_LAYOUT);
  readonly activeInputPitches = input<ReadonlySet<number>>(new Set<number>());
  readonly connectionState = input<MidiInputConnectionState>('idle');
  readonly keyboardCalibrationState = input<KeyboardCalibrationState>(DEFAULT_CALIBRATION_STATE);
  readonly calibrationErrorMessage = input<string | null>(null);
  readonly firstCalibrationLabel = input<string | null>(null);
  readonly lastCalibrationLabel = input<string | null>(null);
  readonly calibrationSourceLabel = input('');
  readonly calibrationConnectionLabel = input('');
  readonly calibrationMappingStatusLabel = input('');
  readonly calibrationMappingHint = input('');
  readonly isMappingInProgress = input(false);
  readonly canEnterMainScene = input(false);

  readonly goToCalibration = output<void>();
  readonly goToWelcome = output<void>();
  readonly startCalibration = output<void>();
  readonly retryCalibration = output<void>();
  readonly useFallbackRange = output<void>();
  readonly confirmCalibration = output<void>();

  protected requestGoToCalibration(): void {
    this.goToCalibration.emit();
  }

  protected requestGoToWelcome(): void {
    this.goToWelcome.emit();
  }

  protected requestStartCalibration(): void {
    this.startCalibration.emit();
  }

  protected requestRetryCalibration(): void {
    this.retryCalibration.emit();
  }

  protected requestUseFallbackRange(): void {
    this.useFallbackRange.emit();
  }

  protected requestConfirmCalibration(): void {
    this.confirmCalibration.emit();
  }
}
