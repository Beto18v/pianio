import { MidiSong } from '../../../domain/models/midi-song.model';
import { NoteEvent } from '../../../domain/models/note-event.model';
import {
  DEFAULT_NOTE_ROLL_LAYOUT_CONFIG,
  createNoteRollLayout,
  getPositionedNote,
} from './note-position.util';

describe('note-position.util', () => {
  it('maps pitch, start time, and duration into deterministic visual coordinates', () => {
    const note: NoteEvent = {
      pitch: 60,
      velocity: 0.7,
      startTime: 1.5,
      duration: 0.5,
      track: 1,
    };

    const positionedNote = getPositionedNote(note);

    expect(positionedNote).toMatchObject({
      pitch: 60,
      velocity: 0.7,
      startTime: 1.5,
      duration: 0.5,
      track: 1,
      topPx: 180,
      heightPx: 60,
      isBlack: false,
    });
    expect(positionedNote?.leftPercent).toBeCloseTo(44.23, 2);
    expect(positionedNote?.widthPercent).toBeCloseTo(1.92, 2);
  });

  it('preserves black key width and applies a minimum note height', () => {
    const note: NoteEvent = {
      pitch: 61,
      velocity: 0.5,
      startTime: 0.25,
      duration: 0.01,
      track: 0,
    };

    const positionedNote = getPositionedNote(note);

    expect(positionedNote?.isBlack).toBe(true);
    expect(positionedNote?.topPx).toBe(30);
    expect(positionedNote?.heightPx).toBe(DEFAULT_NOTE_ROLL_LAYOUT_CONFIG.minNoteHeightPx);
    expect(positionedNote?.leftPercent).toBeCloseTo(45.53, 2);
    expect(positionedNote?.widthPercent).toBeCloseTo(1.25, 2);
  });

  it('builds a song layout and filters notes outside the visible keyboard range', () => {
    const song: MidiSong = {
      fileName: 'exercise.mid',
      duration: 4,
      tempoBpm: 100,
      ppq: 480,
      trackCount: 1,
      notes: [
        { pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 110, velocity: 0.4, startTime: 3.2, duration: 0.25, track: 0 },
        { pitch: 64, velocity: 0.7, startTime: 3.8, duration: 0.6, track: 0 },
      ],
    };

    const layout = createNoteRollLayout(song);

    expect(layout.notes).toHaveLength(2);
    expect(layout.hiddenNoteCount).toBe(1);
    expect(layout.notes.map((note) => note.pitch)).toEqual([60, 64]);
    expect(layout.totalHeightPx).toBeCloseTo(528, 5);
  });

  it('rejects invalid layout configuration values', () => {
    const note: NoteEvent = {
      pitch: 60,
      velocity: 0.7,
      startTime: 0,
      duration: 0.5,
      track: 0,
    };

    expect(() =>
      getPositionedNote(note, {
        ...DEFAULT_NOTE_ROLL_LAYOUT_CONFIG,
        pixelsPerSecond: 0,
      }),
    ).toThrow('Note roll layout pixelsPerSecond must be a positive number.');
  });
});
