export interface PositionedNote {
  pitch: number;
  velocity: number;
  startTime: number;
  duration: number;
  track: number;
  leftPercent: number;
  widthPercent: number;
  topPx: number;
  heightPx: number;
  isBlack: boolean;
}
