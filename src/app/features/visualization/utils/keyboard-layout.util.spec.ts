import {
  MVP_KEYBOARD_LAYOUT,
  createKeyboardLayout,
  getKeyboardKey,
  getPitchHorizontalPosition,
  isPitchVisible,
} from './keyboard-layout.util';

describe('keyboard-layout.util', () => {
  it('defines the MVP keyboard as the full 88-key piano range', () => {
    expect(MVP_KEYBOARD_LAYOUT.startPitch).toBe(21);
    expect(MVP_KEYBOARD_LAYOUT.endPitch).toBe(108);
    expect(MVP_KEYBOARD_LAYOUT.keyCount).toBe(88);
    expect(MVP_KEYBOARD_LAYOUT.whiteKeyCount).toBe(52);
    expect(MVP_KEYBOARD_LAYOUT.totalWidthUnits).toBe(52);
  });

  it('maps white and black keys to deterministic horizontal positions', () => {
    const a0 = getKeyboardKey(21);
    const aSharp0 = getKeyboardKey(22);
    const c4 = getKeyboardKey(60);
    const cSharp4Position = getPitchHorizontalPosition(61);

    expect(a0).toEqual({
      pitch: 21,
      pitchClass: 9,
      octave: 0,
      label: 'A0',
      isBlack: false,
      leftOffsetUnits: 0,
      widthUnits: 1,
    });

    expect(aSharp0?.pitch).toBe(22);
    expect(aSharp0?.pitchClass).toBe(10);
    expect(aSharp0?.octave).toBe(0);
    expect(aSharp0?.label).toBe('A#0');
    expect(aSharp0?.isBlack).toBe(true);
    expect(aSharp0?.leftOffsetUnits).toBeCloseTo(0.675, 5);
    expect(aSharp0?.widthUnits).toBeCloseTo(0.65, 5);

    expect(c4?.label).toBe('C4');
    expect(c4?.leftOffsetUnits).toBe(23);
    expect(cSharp4Position?.leftUnits).toBeCloseTo(23.675, 5);
    expect(cSharp4Position?.widthUnits).toBeCloseTo(0.65, 5);
    expect(cSharp4Position?.leftPercent).toBeCloseTo(45.53, 2);
    expect(cSharp4Position?.widthPercent).toBeCloseTo(1.25, 2);
  });

  it('supports calibrated ranges that start or end on black keys', () => {
    const layout = createKeyboardLayout(61, 72);
    const firstKey = layout.keys[0];
    const lastKey = layout.keys.at(-1);

    expect(layout.startPitch).toBe(61);
    expect(layout.endPitch).toBe(72);
    expect(layout.keyCount).toBe(12);
    expect(layout.whiteKeyCount).toBe(7);
    expect(layout.totalWidthUnits).toBeCloseTo(7.325, 5);
    expect(firstKey?.pitch).toBe(61);
    expect(firstKey?.leftOffsetUnits).toBe(0);
    expect(lastKey?.pitch).toBe(72);
    expect(lastKey?.leftOffsetUnits).toBeCloseTo(6.325, 5);
  });

  it('rejects ranges outside the MIDI pitch boundary', () => {
    expect(() => createKeyboardLayout(-1, 108)).toThrow(
      'Keyboard layout startPitch must be inside the MIDI pitch range 0-127.',
    );
    expect(() => createKeyboardLayout(21, 128)).toThrow(
      'Keyboard layout endPitch must be inside the MIDI pitch range 0-127.',
    );
  });

  it('marks only in-range pitches as visible', () => {
    expect(isPitchVisible(21)).toBe(true);
    expect(isPitchVisible(108)).toBe(true);
    expect(isPitchVisible(20)).toBe(false);
    expect(isPitchVisible(109)).toBe(false);
    expect(getKeyboardKey(15)).toBeNull();
    expect(getPitchHorizontalPosition(110)).toBeNull();
  });
});
