import { describe, expect, it } from 'vitest';

import { NoteEvent } from '../models/note-event.model';
import { createSongNoteIndex, getNotesStartingInRange } from './song-note-index.util';

describe('song-note-index.util', () => {
  it('sorts notes by startTime and computes max duration', () => {
    const notes: NoteEvent[] = [
      { pitch: 64, velocity: 0.7, startTime: 2, duration: 0.25, track: 0 },
      { pitch: 60, velocity: 0.7, startTime: 0.5, duration: 1, track: 0 },
      { pitch: 67, velocity: 0.7, startTime: 1, duration: 0.5, track: 0 },
    ];

    const index = createSongNoteIndex(notes);

    expect(index.startTimes).toEqual([0.5, 1, 2]);
    expect(index.maxNoteDurationSeconds).toBe(1);
    expect(index.notesSortedByStartTime.map((note) => note.pitch)).toEqual([60, 67, 64]);
  });

  it('returns only notes whose startTime is inside the given range', () => {
    const notes: NoteEvent[] = [
      { pitch: 60, velocity: 0.7, startTime: 0, duration: 0.25, track: 0 },
      { pitch: 62, velocity: 0.7, startTime: 0.5, duration: 0.25, track: 0 },
      { pitch: 64, velocity: 0.7, startTime: 1.0, duration: 0.25, track: 0 },
      { pitch: 65, velocity: 0.7, startTime: 2.0, duration: 0.25, track: 0 },
    ];

    const index = createSongNoteIndex(notes);

    const rangeNotes = getNotesStartingInRange(index, 0.5, 1.0);

    expect(rangeNotes.map((note) => note.pitch)).toEqual([62, 64]);
  });

  it('returns empty results on invalid input', () => {
    const notes: NoteEvent[] = [
      { pitch: 60, velocity: 0.7, startTime: 0, duration: 0.25, track: 0 },
    ];

    const index = createSongNoteIndex(notes);

    expect(getNotesStartingInRange(index, Number.NaN, 1)).toEqual([]);
    expect(getNotesStartingInRange(index, 1, Number.NaN)).toEqual([]);
    expect(getNotesStartingInRange(index, 2, 1)).toEqual([]);
  });
});
