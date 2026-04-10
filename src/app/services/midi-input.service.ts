import { Injectable, computed, signal } from '@angular/core';

import { siteContent } from '../core/site';
import { MidiDevice } from '../domain/models/midi-device.model';
import { MidiInputEvent, MidiInputEventType } from '../domain/models/midi-input-event.model';

const MOCK_DEVICE_ID = 'mock-midi-device';
const MOCK_PITCH_SEQUENCE = [60, 62, 64, 67, 69];
const midiInputCopy = siteContent.midiInput;

export type MidiInputConnectionState = 'idle' | 'ready' | 'mock';

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

@Injectable({
  providedIn: 'root',
})
export class MidiInputService {
  private readonly connectionStateState = signal<MidiInputConnectionState>('idle');
  private readonly devicesState = signal<ReadonlyArray<MidiDevice>>([]);
  private readonly lastEventState = signal<MidiInputEvent | null>(null);
  private readonly errorMessageState = signal<string | null>(null);
  private readonly activePitchesState = signal<ReadonlySet<number>>(new Set<number>());

  readonly connectionState = this.connectionStateState.asReadonly();
  readonly devices = this.devicesState.asReadonly();
  readonly lastEvent = this.lastEventState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();
  readonly activePitches = this.activePitchesState.asReadonly();
  readonly isMockMode = computed(() => this.connectionState() === 'mock');

  private midiAccess: MidiAccessLike | null = null;
  private readonly inputHandlers = new Map<string, (event: MidiMessageLike) => void>();
  private isInitialized = false;
  private mockTick = 0;

  async initialize(): Promise<void> {
    if (this.midiAccess) {
      this.syncDevicesFromAccess();
      return;
    }

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    const requestMIDIAccess = getRequestMIDIAccess();

    if (!requestMIDIAccess) {
      this.enableMockMode(midiInputCopy.errors.webMidiNotAvailable);
      return;
    }

    try {
      this.midiAccess = await requestMIDIAccess();
      this.midiAccess.onstatechange = () => {
        this.syncDevicesFromAccess();
      };
      this.syncDevicesFromAccess();
    } catch (error) {
      this.midiAccess = null;
      this.enableMockMode(formatMidiAccessError(error));
    }
  }

  async refresh(): Promise<void> {
    if (this.midiAccess) {
      this.syncDevicesFromAccess();
      return;
    }

    this.isInitialized = false;
    await this.initialize();
  }

  triggerMockNote(): void {
    if (!this.isMockMode()) {
      return;
    }

    const sequenceIndex = Math.floor(this.mockTick / 2) % MOCK_PITCH_SEQUENCE.length;
    const pitch = MOCK_PITCH_SEQUENCE[sequenceIndex] ?? 60;
    const type: MidiInputEventType = this.mockTick % 2 === 0 ? 'noteOn' : 'noteOff';
    const velocity = type === 'noteOn' ? 0.78 : 0;
    this.mockTick += 1;

    this.lastEventState.set({
      type,
      pitch,
      velocity,
      timestamp: Date.now(),
      deviceId: MOCK_DEVICE_ID,
      deviceName: midiInputCopy.mockDeviceName,
    });
    this.updateActivePitch(pitch, type);
  }

  private syncDevicesFromAccess(): void {
    const midiAccess = this.midiAccess;

    if (!midiAccess) {
      this.enableMockMode(midiInputCopy.errors.noActiveAccess);
      return;
    }

    const inputs = Array.from(midiAccess.inputs.values());

    if (inputs.length === 0) {
      this.detachAllInputListeners();
      this.enableMockMode(midiInputCopy.errors.noInputsDetected);
      return;
    }

    this.connectionStateState.set('ready');
    this.errorMessageState.set(null);
    this.clearActivePitches();
    this.devicesState.set(inputs.map((input) => toMidiDevice(input)));
    this.attachInputListeners(inputs);
  }

  private attachInputListeners(inputs: ReadonlyArray<MidiInputPortLike>): void {
    const activeInputIds = new Set(inputs.map((input) => input.id));

    for (const [inputId, handler] of Array.from(this.inputHandlers.entries())) {
      if (activeInputIds.has(inputId)) {
        continue;
      }

      const input = this.midiAccess?.inputs.get(inputId);

      if (input && input.onmidimessage === handler) {
        input.onmidimessage = null;
      }

      this.inputHandlers.delete(inputId);
    }

    for (const input of inputs) {
      if (this.inputHandlers.has(input.id)) {
        continue;
      }

      const handler = (event: MidiMessageLike): void => {
        this.handleMidiMessage(input, event);
      };

      input.onmidimessage = handler;
      this.inputHandlers.set(input.id, handler);
    }
  }

  private detachAllInputListeners(): void {
    const midiAccess = this.midiAccess;

    if (!midiAccess) {
      this.inputHandlers.clear();
      return;
    }

    for (const [inputId, handler] of Array.from(this.inputHandlers.entries())) {
      const input = midiAccess.inputs.get(inputId);

      if (input && input.onmidimessage === handler) {
        input.onmidimessage = null;
      }
    }

    this.inputHandlers.clear();
  }

  private handleMidiMessage(input: MidiInputPortLike, event: MidiMessageLike): void {
    const data = event.data;

    if (!data || data.length < 3) {
      return;
    }

    const status = Number(data[0]) & 0xf0;
    const pitch = Number(data[1]);
    const rawVelocity = Number(data[2]);

    if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127) {
      return;
    }

    const type = getEventType(status, rawVelocity);

    if (!type) {
      return;
    }

    this.lastEventState.set({
      type,
      pitch,
      velocity: clamp(rawVelocity / 127, 0, 1),
      timestamp: Date.now(),
      deviceId: input.id,
      deviceName: input.name?.trim() || midiInputCopy.defaultDeviceName,
    });
    this.updateActivePitch(pitch, type);
  }

  private enableMockMode(message: string): void {
    this.connectionStateState.set('mock');
    this.errorMessageState.set(message);
    this.clearActivePitches();
    this.devicesState.set([
      {
        id: MOCK_DEVICE_ID,
        name: midiInputCopy.mockDeviceName,
        manufacturer: midiInputCopy.mockManufacturer,
        isMock: true,
      },
    ]);
  }

  private clearActivePitches(): void {
    this.activePitchesState.set(new Set<number>());
  }

  private updateActivePitch(pitch: number, type: MidiInputEventType): void {
    this.activePitchesState.update((current) => {
      const next = new Set(current);

      if (type === 'noteOn') {
        next.add(pitch);
      } else {
        next.delete(pitch);
      }

      return next;
    });
  }
}

function getRequestMIDIAccess(): (() => Promise<MidiAccessLike>) | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  if (typeof navigator.requestMIDIAccess !== 'function') {
    return null;
  }

  return () => navigator.requestMIDIAccess() as unknown as Promise<MidiAccessLike>;
}

function toMidiDevice(input: MidiInputPortLike): MidiDevice {
  return {
    id: input.id,
    name: input.name?.trim() || midiInputCopy.defaultDeviceName,
    manufacturer: input.manufacturer?.trim() || null,
    isMock: false,
  };
}

function getEventType(status: number, velocity: number): MidiInputEventType | null {
  if (status === 0x90 && velocity > 0) {
    return 'noteOn';
  }

  if (status === 0x80 || (status === 0x90 && velocity === 0)) {
    return 'noteOff';
  }

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatMidiAccessError(error: unknown): string {
  const detail = getErrorDetail(error);

  if (!detail) {
    return midiInputCopy.errors.noAccessWithPermissionHint;
  }

  if (detail.name === 'SecurityError' || detail.name === 'NotAllowedError') {
    return midiInputCopy.errors.blockedAccess(detail.name);
  }

  return midiInputCopy.errors.accessWithDetail(detail.name, detail.message);
}

function getErrorDetail(error: unknown): { name: string; message: string } | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const name = 'name' in error && typeof error.name === 'string' ? error.name : 'Error';
  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : midiInputCopy.errors.noErrorDetail;

  return { name, message };
}
