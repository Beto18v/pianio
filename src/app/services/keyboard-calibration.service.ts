import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import {
  KeyboardCalibrationRange,
  KeyboardCalibrationSource,
  KeyboardCalibrationState,
  KeyboardCalibrationStatus,
} from '../domain/models/keyboard-calibration-state.model';
import {
  MVP_KEYBOARD_LAYOUT,
  createKeyboardLayout,
  getPitchLabel,
} from '../features/visualization/utils/keyboard-layout.util';
import { MidiInputService } from './midi-input.service';

@Injectable({
  providedIn: 'root',
})
export class KeyboardCalibrationService {
  private readonly midiInputService = inject(MidiInputService);
  private readonly statusState = signal<KeyboardCalibrationStatus>('idle');
  private readonly sourceState = signal<KeyboardCalibrationSource>('default');
  private readonly firstPitchState = signal<number | null>(null);
  private readonly lastPitchState = signal<number | null>(null);
  private readonly errorMessageState = signal<string | null>(null);

  readonly status = this.statusState.asReadonly();
  readonly source = this.sourceState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();
  readonly firstPitch = this.firstPitchState.asReadonly();
  readonly lastPitch = this.lastPitchState.asReadonly();
  readonly isWaitingForInput = computed(() => {
    const status = this.status();

    return status === 'waitingFirstKey' || status === 'waitingLastKey';
  });
  readonly isCalibrated = computed(() => this.source() === 'calibrated');
  readonly usesFallbackRange = computed(() => this.source() !== 'calibrated');
  readonly activeRange = computed<KeyboardCalibrationRange>(() => {
    const firstPitch = this.firstPitch();
    const lastPitch = this.lastPitch();

    if (firstPitch !== null && lastPitch !== null) {
      return toCalibrationRange(firstPitch, lastPitch);
    }

    return toCalibrationRange(MVP_KEYBOARD_LAYOUT.startPitch, MVP_KEYBOARD_LAYOUT.endPitch);
  });
  readonly state = computed<KeyboardCalibrationState>(() => ({
    status: this.status(),
    source: this.source(),
    range: this.activeRange(),
    errorMessage: this.errorMessage(),
  }));
  readonly keyboardLayout = computed(() => {
    const range = this.activeRange();

    return createKeyboardLayout(range.firstPitch, range.lastPitch);
  });

  constructor() {
    effect(() => {
      const event = this.midiInputService.lastEvent();

      if (!event || event.type !== 'noteOn') {
        return;
      }

      untracked(() => {
        this.capturePitch(event.pitch);
      });
    });
  }

  startCalibration(): void {
    this.statusState.set('waitingFirstKey');
    this.sourceState.set('default');
    this.firstPitchState.set(null);
    this.lastPitchState.set(null);
    this.errorMessageState.set(null);
  }

  clearCalibration(): void {
    this.statusState.set('idle');
    this.sourceState.set('default');
    this.firstPitchState.set(null);
    this.lastPitchState.set(null);
    this.errorMessageState.set(null);
  }

  useFullRangeFallback(): void {
    this.statusState.set('ready');
    this.sourceState.set('fallback');
    this.firstPitchState.set(MVP_KEYBOARD_LAYOUT.startPitch);
    this.lastPitchState.set(MVP_KEYBOARD_LAYOUT.endPitch);
    this.errorMessageState.set(null);
  }

  private capturePitch(pitch: number): void {
    const status = this.status();

    if (status === 'waitingFirstKey') {
      this.firstPitchState.set(pitch);
      this.lastPitchState.set(null);
      this.errorMessageState.set(null);
      this.statusState.set('waitingLastKey');
      return;
    }

    if (status !== 'waitingLastKey') {
      return;
    }

    const firstPitch = this.firstPitch();

    if (firstPitch === null) {
      this.startCalibration();
      return;
    }

    if (pitch < firstPitch) {
      this.errorMessageState.set(
        `La ultima tecla debe ser igual o mayor que ${getPitchLabel(firstPitch)}.`,
      );
      return;
    }

    this.lastPitchState.set(pitch);
    this.sourceState.set('calibrated');
    this.errorMessageState.set(null);
    this.statusState.set('ready');
  }
}

function toCalibrationRange(firstPitch: number, lastPitch: number): KeyboardCalibrationRange {
  return {
    firstPitch,
    lastPitch,
    firstLabel: getPitchLabel(firstPitch),
    lastLabel: getPitchLabel(lastPitch),
  };
}
