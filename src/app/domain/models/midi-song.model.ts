import { NoteEvent } from './note-event.model';
import { NoteAnnotationMap } from './note-annotation.model';

export type SongSourceFormat = 'midi' | 'musicxml';

export interface MidiSong {
  fileName: string;
  notes: NoteEvent[];
  duration: number;
  tempoBpm: number | null;
  ppq: number | null;
  trackCount: number;
  sourceFormat?: SongSourceFormat;
  fileNoteAnnotations?: NoteAnnotationMap;
}
