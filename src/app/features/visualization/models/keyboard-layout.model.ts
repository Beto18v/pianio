import { KeyboardKey } from './keyboard-key.model';

export interface KeyboardLayout {
  startPitch: number;
  endPitch: number;
  keyCount: number;
  whiteKeyCount: number;
  totalWidthUnits: number;
  keys: ReadonlyArray<KeyboardKey>;
}
