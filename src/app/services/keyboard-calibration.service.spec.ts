import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { KeyboardCalibrationService } from './keyboard-calibration.service';
import { MidiInputService } from './midi-input.service';

describe('KeyboardCalibrationService', () => {
  let midiInputService: MidiInputService;
  let calibrationService: KeyboardCalibrationService;
  let keyboardInput: MidiInputPortLike;

  beforeEach(async () => {
    keyboardInput = {
      id: 'keyboard-1',
      name: 'Controller 61',
      manufacturer: 'PianoFlow Labs',
      onmidimessage: null,
    };

    setNavigatorRequestMIDIAccess(
      vi.fn().mockResolvedValue({
        inputs: new Map([['keyboard-1', keyboardInput]]),
        onstatechange: null,
      }),
    );

    TestBed.configureTestingModule({});
    midiInputService = TestBed.inject(MidiInputService);
    calibrationService = TestBed.inject(KeyboardCalibrationService);

    await midiInputService.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    deleteNavigatorRequestMIDIAccess();
  });

  it('uses the full piano range before any explicit calibration happens', () => {
    expect(calibrationService.state()).toEqual({
      status: 'idle',
      source: 'default',
      range: {
        firstPitch: 21,
        lastPitch: 108,
        firstLabel: 'A0',
        lastLabel: 'C8',
      },
      errorMessage: null,
    });
    expect(calibrationService.keyboardLayout().keyCount).toBe(88);
  });

  it('captures first and last noteOn events as the calibrated keyboard range', () => {
    calibrationService.startCalibration();

    emitNoteOn(keyboardInput, 61);
    TestBed.flushEffects();

    expect(calibrationService.status()).toBe('waitingLastKey');
    expect(calibrationService.firstPitch()).toBe(61);
    expect(calibrationService.lastPitch()).toBeNull();

    emitNoteOn(keyboardInput, 84);
    TestBed.flushEffects();

    expect(calibrationService.state()).toEqual({
      status: 'ready',
      source: 'calibrated',
      range: {
        firstPitch: 61,
        lastPitch: 84,
        firstLabel: 'C#4',
        lastLabel: 'C6',
      },
      errorMessage: null,
    });
    expect(calibrationService.keyboardLayout().startPitch).toBe(61);
    expect(calibrationService.keyboardLayout().endPitch).toBe(84);
    expect(calibrationService.keyboardLayout().totalWidthUnits).toBeCloseTo(14.325, 5);
  });

  it('keeps waiting for the last key when it is lower than the first one', () => {
    calibrationService.startCalibration();

    emitNoteOn(keyboardInput, 72);
    TestBed.flushEffects();
    emitNoteOn(keyboardInput, 60);
    TestBed.flushEffects();

    expect(calibrationService.status()).toBe('waitingLastKey');
    expect(calibrationService.firstPitch()).toBe(72);
    expect(calibrationService.lastPitch()).toBeNull();
    expect(calibrationService.errorMessage()).toContain('C5');
  });

  it('switches to the full fallback range when hardware calibration is skipped', () => {
    calibrationService.useFullRangeFallback();

    expect(calibrationService.state()).toEqual({
      status: 'ready',
      source: 'fallback',
      range: {
        firstPitch: 21,
        lastPitch: 108,
        firstLabel: 'A0',
        lastLabel: 'C8',
      },
      errorMessage: null,
    });
  });
});

function emitNoteOn(input: MidiInputPortLike, pitch: number, velocity = 100): void {
  input.onmidimessage?.({
    data: new Uint8Array([0x90, pitch, velocity]),
  });
}

function setNavigatorRequestMIDIAccess(implementation: () => Promise<MidiAccessLike>): void {
  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    value: implementation,
    writable: true,
  });
}

function deleteNavigatorRequestMIDIAccess(): void {
  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    value: undefined,
    writable: true,
  });
}

interface MidiAccessLike {
  inputs: ReadonlyMap<string, MidiInputPortLike>;
  onstatechange: ((event: unknown) => void) | null;
}

interface MidiInputPortLike {
  id: string;
  name?: string | null;
  manufacturer?: string | null;
  onmidimessage: ((event: MidiMessageLike) => void) | null;
}

interface MidiMessageLike {
  data?: Uint8Array | number[];
}
