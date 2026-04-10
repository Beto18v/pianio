export type KeyboardCalibrationStatus = 'idle' | 'waitingFirstKey' | 'waitingLastKey' | 'ready';

export type KeyboardCalibrationSource = 'default' | 'fallback' | 'calibrated';

export interface KeyboardCalibrationRange {
  firstPitch: number;
  lastPitch: number;
  firstLabel: string;
  lastLabel: string;
}

export interface KeyboardCalibrationState {
  status: KeyboardCalibrationStatus;
  source: KeyboardCalibrationSource;
  range: KeyboardCalibrationRange;
  errorMessage: string | null;
}
