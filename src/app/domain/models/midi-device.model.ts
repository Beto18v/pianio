export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string | null;
  isMock: boolean;
}
