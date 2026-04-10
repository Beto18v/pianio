import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MidiInputService } from './midi-input.service';

describe('MidiInputService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    deleteNavigatorRequestMIDIAccess();
  });

  it('falls back to mock mode when Web MIDI API is unavailable', async () => {
    const service = createService();

    await service.initialize();

    expect(service.connectionState()).toBe('mock');
    expect(service.devices()).toHaveLength(1);
    expect(service.errorMessage()).toBe('Web MIDI API no esta disponible en este navegador.');

    service.triggerMockNote();

    expect(service.lastEvent()?.type).toBe('noteOn');
    expect(service.lastEvent()?.pitch).toBe(60);
    expect(service.activePitches().has(60)).toBe(true);

    service.triggerMockNote();

    expect(service.lastEvent()?.type).toBe('noteOff');
    expect(service.activePitches().has(60)).toBe(false);
  });

  it('detects real devices and maps noteOn/noteOff events', async () => {
    const keyboardInput: MidiInputPortLike = {
      id: 'keyboard-1',
      name: 'Controller 61',
      manufacturer: 'PianoFlow Labs',
      onmidimessage: null,
    };
    const midiAccess: MidiAccessLike = {
      inputs: new Map([['keyboard-1', keyboardInput]]),
      onstatechange: null,
    };

    setNavigatorRequestMIDIAccess(vi.fn().mockResolvedValue(midiAccess));

    const service = createService();
    await service.initialize();

    expect(service.connectionState()).toBe('ready');
    expect(service.devices()[0]?.name).toBe('Controller 61');

    keyboardInput.onmidimessage?.({ data: new Uint8Array([0x90, 64, 100]) });
    expect(service.lastEvent()?.type).toBe('noteOn');
    expect(service.lastEvent()?.pitch).toBe(64);
    expect(service.activePitches().has(64)).toBe(true);

    keyboardInput.onmidimessage?.({ data: new Uint8Array([0x80, 64, 0]) });
    expect(service.lastEvent()?.type).toBe('noteOff');
    expect(service.lastEvent()?.pitch).toBe(64);
    expect(service.activePitches().has(64)).toBe(false);
  });

  it('surfaces the browser access error detail when requestMIDIAccess is rejected', async () => {
    setNavigatorRequestMIDIAccess(
      vi.fn().mockRejectedValue(new DOMException('Permission denied', 'SecurityError')),
    );

    const service = createService();
    await service.initialize();

    expect(service.connectionState()).toBe('mock');
    expect(service.errorMessage()).toContain('SecurityError');
    expect(service.errorMessage()).toContain('permiso MIDI');
  });
});

function createService(): MidiInputService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});

  return TestBed.inject(MidiInputService);
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
