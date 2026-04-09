import { NoteEvent } from './note-event.model';

export interface MidiSong {
  fileName: string;
  notes: NoteEvent[];
  duration: number;
  tempoBpm: number | null;
  ppq: number;
  trackCount: number;
}
