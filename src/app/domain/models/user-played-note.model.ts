export interface UserPlayedNote {
  type: 'noteOn' | 'noteOff';
  pitch: number;
  velocity: number;
  timestamp: number;
  deviceId: string;
  deviceName: string;
}
