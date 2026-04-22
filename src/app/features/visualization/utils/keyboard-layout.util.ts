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

  const absoluteKeys: Array<KeyboardKey & { absoluteLeftOffsetUnits: number }> = [];

  for (let pitch = startPitch; pitch <= endPitch; pitch += 1) {
    const pitchClass = getPitchClass(pitch);
    const isBlack = BLACK_PITCH_CLASSES.has(pitchClass);
    const absoluteLeftOffsetUnits = getAbsoluteLeftOffsetUnits(pitch, isBlack);

    absoluteKeys.push({
      pitch,
      pitchClass,
      octave: getOctave(pitch),
      label: getPitchLabel(pitch),
      isBlack,
      leftOffsetUnits: absoluteLeftOffsetUnits,
      widthUnits: isBlack ? BLACK_KEY_WIDTH_UNITS : WHITE_KEY_WIDTH_UNITS,
      absoluteLeftOffsetUnits,
    });
  }

  const minLeftOffsetUnits = absoluteKeys.reduce(
    (minimum, key) => Math.min(minimum, key.absoluteLeftOffsetUnits),
    Number.POSITIVE_INFINITY,
  );
  const maxRightOffsetUnits = absoluteKeys.reduce(
    (maximum, key) => Math.max(maximum, key.absoluteLeftOffsetUnits + key.widthUnits),
    Number.NEGATIVE_INFINITY,
  );
  const totalWidthUnits = Math.max(maxRightOffsetUnits - minLeftOffsetUnits, BLACK_KEY_WIDTH_UNITS);
  const keys = absoluteKeys.map(({ absoluteLeftOffsetUnits, ...key }) => ({
    ...key,
    leftOffsetUnits: absoluteLeftOffsetUnits - minLeftOffsetUnits,
  }));

  return {
    startPitch,
    endPitch,
    keyCount: keys.length,
    whiteKeyCount: keys.filter((key) => !key.isBlack).length,
    totalWidthUnits,
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
  if (pitch < 0 || pitch > 127) {
    throw new Error(`Keyboard layout ${label} must be inside the MIDI pitch range 0-127.`);
  }
}

function getPitchClass(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
}

function getOctave(pitch: number): number {
  return Math.floor(pitch / 12) - 1;
}

export function getPitchLabel(pitch: number): string {
  return `${getPitchName(pitch)}${getOctave(pitch)}`;
}

export function getPitchName(pitch: number): string {
  return NOTE_NAMES[getPitchClass(pitch)];
}

function toPercent(value: number, layout: KeyboardLayout): number {
  return (value / layout.totalWidthUnits) * 100;
}

function getAbsoluteLeftOffsetUnits(pitch: number, isBlack: boolean): number {
  const whiteKeysBeforePitch = getWhiteKeyCountBeforePitch(pitch);

  if (isBlack) {
    return whiteKeysBeforePitch - BLACK_KEY_WIDTH_UNITS / 2;
  }

  return whiteKeysBeforePitch;
}

function getWhiteKeyCountBeforePitch(pitch: number): number {
  let whiteKeyCount = 0;

  for (let currentPitch = 0; currentPitch < pitch; currentPitch += 1) {
    if (!BLACK_PITCH_CLASSES.has(getPitchClass(currentPitch))) {
      whiteKeyCount += 1;
    }
  }

  return whiteKeyCount;
}
