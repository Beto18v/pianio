import { KeyboardLayout } from '../models/keyboard-layout.model';
import { KeyboardKey } from '../models/keyboard-key.model';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
const WHITE_KEY_WIDTH_UNITS = 1;
const BLACK_KEY_WIDTH_UNITS = 0.65;

export interface PitchHorizontalPosition {
  leftUnits: number;
  widthUnits: number;
  leftPercent: number;
  widthPercent: number;
  isBlack: boolean;
}

export const MVP_KEYBOARD_LAYOUT = createKeyboardLayout(21, 108);

export function createKeyboardLayout(startPitch: number, endPitch: number): KeyboardLayout {
  validatePitchBoundary(startPitch, 'startPitch');
  validatePitchBoundary(endPitch, 'endPitch');

  if (startPitch > endPitch) {
    throw new Error('Keyboard layout startPitch must be less than or equal to endPitch.');
  }

  let whiteKeyCursor = 0;
  const keys: KeyboardKey[] = [];

  for (let pitch = startPitch; pitch <= endPitch; pitch += 1) {
    const pitchClass = getPitchClass(pitch);
    const isBlack = BLACK_PITCH_CLASSES.has(pitchClass);

    if (isBlack) {
      keys.push({
        pitch,
        pitchClass,
        octave: getOctave(pitch),
        label: getNoteLabel(pitch),
        isBlack: true,
        leftOffsetUnits: whiteKeyCursor - BLACK_KEY_WIDTH_UNITS / 2,
        widthUnits: BLACK_KEY_WIDTH_UNITS,
      });

      continue;
    }

    keys.push({
      pitch,
      pitchClass,
      octave: getOctave(pitch),
      label: getNoteLabel(pitch),
      isBlack: false,
      leftOffsetUnits: whiteKeyCursor,
      widthUnits: WHITE_KEY_WIDTH_UNITS,
    });

    whiteKeyCursor += WHITE_KEY_WIDTH_UNITS;
  }

  return {
    startPitch,
    endPitch,
    keyCount: keys.length,
    whiteKeyCount: whiteKeyCursor,
    totalWidthUnits: whiteKeyCursor,
    keys,
  };
}

export function isPitchVisible(
  pitch: number,
  layout: KeyboardLayout = MVP_KEYBOARD_LAYOUT,
): boolean {
  return Number.isInteger(pitch) && pitch >= layout.startPitch && pitch <= layout.endPitch;
}

export function getKeyboardKey(
  pitch: number,
  layout: KeyboardLayout = MVP_KEYBOARD_LAYOUT,
): KeyboardKey | null {
  if (!isPitchVisible(pitch, layout)) {
    return null;
  }

  return layout.keys[pitch - layout.startPitch] ?? null;
}

export function getPitchHorizontalPosition(
  pitch: number,
  layout: KeyboardLayout = MVP_KEYBOARD_LAYOUT,
): PitchHorizontalPosition | null {
  const key = getKeyboardKey(pitch, layout);

  if (!key) {
    return null;
  }

  return {
    leftUnits: key.leftOffsetUnits,
    widthUnits: key.widthUnits,
    leftPercent: toPercent(key.leftOffsetUnits, layout),
    widthPercent: toPercent(key.widthUnits, layout),
    isBlack: key.isBlack,
  };
}

function validatePitchBoundary(pitch: number, label: string): void {
  if (!Number.isInteger(pitch)) {
    throw new Error(`Keyboard layout ${label} must be an integer MIDI pitch.`);
  }

  if (BLACK_PITCH_CLASSES.has(getPitchClass(pitch))) {
    throw new Error(`Keyboard layout ${label} must land on a white key.`);
  }
}

function getPitchClass(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
}

function getOctave(pitch: number): number {
  return Math.floor(pitch / 12) - 1;
}

function getNoteLabel(pitch: number): string {
  return `${NOTE_NAMES[getPitchClass(pitch)]}${getOctave(pitch)}`;
}

function toPercent(value: number, layout: KeyboardLayout): number {
  return (value / layout.totalWidthUnits) * 100;
}
