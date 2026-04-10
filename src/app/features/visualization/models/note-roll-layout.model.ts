import { PositionedNote } from './positioned-note.model';

export interface NoteRollLayout {
  totalHeightPx: number;
  hiddenNoteCount: number;
  notes: ReadonlyArray<PositionedNote>;
}
