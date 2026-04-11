import { MidiSong } from '../../../domain/models/midi-song.model';
import { NoteEvent } from '../../../domain/models/note-event.model';
import { createNoteKey } from '../../../domain/utils/note-key.util';
import { MVP_KEYBOARD_LAYOUT } from './keyboard-layout.util';
import {
  DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
  createNoteRainLayout,
  getFallingNote,
} from './note-rain.util';

describe('note-rain.util', () => {
  it('maps a future note into falling coordinates aligned to the hit line', () => {
    const note: NoteEvent = {
      pitch: 60,
      velocity: 0.7,
      startTime: 2,
      duration: 0.5,
      track: 1,
    };

    const fallingNote = getFallingNote(note, 1);

    expect(fallingNote).toMatchObject({
      pitch: 60,
      velocity: 0.7,
      startTime: 2,
      duration: 0.5,
      track: 1,
      topPx: 342,
      heightPx: 90,
      isBlack: false,
      isActive: false,
    });
    expect(fallingNote?.leftPercent).toBeCloseTo(44.23, 2);
    expect(fallingNote?.widthPercent).toBeCloseTo(1.92, 2);
  });

  it('keeps active notes crossing the hit line while they are held', () => {
    const note: NoteEvent = {
      pitch: 61,
      velocity: 0.5,
      startTime: 0.5,
      duration: 1,
      track: 0,
    };

    const fallingNote = getFallingNote(note, 1);

    expect(fallingNote?.isBlack).toBe(true);
    expect(fallingNote?.isActive).toBe(true);
    expect(fallingNote?.topPx).toBe(522);
    expect(fallingNote?.heightPx).toBe(180);
  });

  it('filters notes outside the current viewport or calibrated range', () => {
    const song: MidiSong = {
      fileName: 'exercise.mid',
      duration: 6,
      tempoBpm: 100,
      ppq: 480,
      trackCount: 1,
      notes: [
        { pitch: 60, velocity: 0.8, startTime: 1, duration: 0.5, track: 0 },
        { pitch: 110, velocity: 0.5, startTime: 1.2, duration: 0.4, track: 0 },
        { pitch: 64, velocity: 0.7, startTime: 9, duration: 0.6, track: 0 },
      ],
    };

    const layout = createNoteRainLayout(song, 1);

    expect(layout.notes).toHaveLength(1);
    expect(layout.hiddenNoteCount).toBe(2);
    expect(layout.hitLineTopPx).toBe(612);
    expect(layout.notes[0]?.pitch).toBe(60);
  });

  it('caps visible notes and keeps active notes first under dense windows', () => {
    const song: MidiSong = {
      fileName: 'dense-window.mid',
      duration: 4,
      tempoBpm: 128,
      ppq: 480,
      trackCount: 1,
      notes: [
        { pitch: 60, velocity: 0.8, startTime: 0.2, duration: 2, track: 0 },
        { pitch: 62, velocity: 0.75, startTime: 0.9, duration: 0.8, track: 0 },
        { pitch: 64, velocity: 0.9, startTime: 1.02, duration: 0.6, track: 0 },
        { pitch: 65, velocity: 0.7, startTime: 1.08, duration: 0.6, track: 0 },
      ],
    };

    const layout = createNoteRainLayout(song, 1, {
      ...DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
      maxVisibleNotes: 2,
    });

    expect(layout.notes).toHaveLength(2);
    expect(layout.hiddenNoteCount).toBe(2);
    expect(layout.notes.map((note) => note.pitch)).toContain(60);
    expect(layout.notes.map((note) => note.pitch)).toContain(62);
  });

  it('attaches hand and fingering annotations when available', () => {
    const note: NoteEvent = {
      pitch: 60,
      velocity: 0.8,
      startTime: 1,
      duration: 0.5,
      track: 0,
    };
    const song: MidiSong = {
      fileName: 'annotated.mid',
      duration: 2,
      tempoBpm: 100,
      ppq: 480,
      trackCount: 1,
      notes: [note],
    };
    const noteAnnotations = {
      [createNoteKey(note)]: {
        hand: 'left' as const,
        finger: 5 as const,
      },
    };

    const layout = createNoteRainLayout(
      song,
      1,
      DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
      MVP_KEYBOARD_LAYOUT,
      null,
      noteAnnotations,
    );

    expect(layout.notes[0]?.hand).toBe('left');
    expect(layout.notes[0]?.finger).toBe(5);
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
      getFallingNote(note, 0, {
        ...DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
        viewportHeightPx: 0,
      }),
    ).toThrow('Note rain layout viewportHeightPx must be a positive number.');

    expect(() =>
      getFallingNote(note, 0, {
        ...DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
        maxVisibleNotes: 0,
      }),
    ).toThrow('Note rain layout maxVisibleNotes must be a positive number.');
  });
});
