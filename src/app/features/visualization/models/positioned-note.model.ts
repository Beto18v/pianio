import { NoteFinger, NoteHand } from '../../../domain/models/note-annotation.model';

export interface PositionedNote {
  pitch: number;
  label: string;
  velocity: number;
  startTime: number;
  duration: number;
  track: number;
  hand: NoteHand;
  finger: NoteFinger;
  leftPercent: number;
  widthPercent: number;
  topPx: number;
  heightPx: number;
  isBlack: boolean;
}
