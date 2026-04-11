import { NoteEvent } from '../models/note-event.model';

export function createNoteKey(note: Pick<NoteEvent, 'track' | 'startTime' | 'pitch'>): string {
  return `${note.track}-${note.startTime}-${note.pitch}`;
}
