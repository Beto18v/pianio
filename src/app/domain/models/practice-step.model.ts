import { NoteEvent } from './note-event.model';

export interface PracticeStep {
  startTime: number;
  pitches: ReadonlyArray<number>;
  notes: ReadonlyArray<NoteEvent>;
  maxEndTime: number;
}
