export type MidiInputEventType = 'noteOn' | 'noteOff';

export interface MidiInputEvent {
  type: MidiInputEventType;
  pitch: number;
  velocity: number;
  timestamp: number;
  deviceId: string;
  deviceName: string;
}
