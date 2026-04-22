import { MidiSong } from '../../../domain/models/midi-song.model';
import { NoteAnnotation, NoteAnnotationMap } from '../../../domain/models/note-annotation.model';
import { NoteEvent } from '../../../domain/models/note-event.model';
import { createNoteKey } from '../../../domain/utils/note-key.util';
import { KeyboardLayout } from '../models/keyboard-layout.model';
import { NoteRollLayout } from '../models/note-roll-layout.model';
import { PositionedNote } from '../models/positioned-note.model';
import {
  MVP_KEYBOARD_LAYOUT,
  getPitchHorizontalPosition,
  getPitchName,
} from './keyboard-layout.util';

export interface NoteRollLayoutConfig {
  pixelsPerSecond: number;
  minNoteHeightPx: number;
  minRollHeightPx: number;
}

export const DEFAULT_NOTE_ROLL_LAYOUT_CONFIG: Readonly<NoteRollLayoutConfig> = {
  pixelsPerSecond: 120,
  minNoteHeightPx: 6,
  minRollHeightPx: 240,
};

export function getPositionedNote(
  note: NoteEvent,
  config: NoteRollLayoutConfig = DEFAULT_NOTE_ROLL_LAYOUT_CONFIG,
  keyboardLayout: KeyboardLayout = MVP_KEYBOARD_LAYOUT,
  noteAnnotation: NoteAnnotation | null = null,
): PositionedNote | null {
  validateLayoutConfig(config);

  const horizontalPosition = getPitchHorizontalPosition(note.pitch, keyboardLayout);

  if (!horizontalPosition) {
    return null;
  }

  return {
    pitch: note.pitch,
    label: getPitchName(note.pitch),
    velocity: note.velocity,
    startTime: note.startTime,
    duration: note.duration,
    track: note.track,
    hand: noteAnnotation?.hand ?? 'unknown',
    finger: noteAnnotation?.finger ?? null,
    leftPercent: horizontalPosition.leftPercent,
    widthPercent: horizontalPosition.widthPercent,
    topPx: note.startTime * config.pixelsPerSecond,
    heightPx: Math.max(note.duration * config.pixelsPerSecond, config.minNoteHeightPx),
    isBlack: horizontalPosition.isBlack,
  };
}

export function createNoteRollLayout(
  song: MidiSong,
  config: NoteRollLayoutConfig = DEFAULT_NOTE_ROLL_LAYOUT_CONFIG,
  keyboardLayout: KeyboardLayout = MVP_KEYBOARD_LAYOUT,
  noteAnnotations: NoteAnnotationMap = {},
): NoteRollLayout {
  validateLayoutConfig(config);

  const notes = song.notes
    .map((note) =>
      getPositionedNote(note, config, keyboardLayout, noteAnnotations[createNoteKey(note)] ?? null),
    )
    .filter((note): note is PositionedNote => note !== null);

  return {
    totalHeightPx: Math.max(getSongContentHeightPx(song, config), config.minRollHeightPx),
    hiddenNoteCount: song.notes.length - notes.length,
    notes,
  };
}

function getSongContentHeightPx(song: MidiSong, config: NoteRollLayoutConfig): number {
  const songEndTime = song.notes.reduce(
    (maxEndTime, note) => Math.max(maxEndTime, note.startTime + note.duration),
    song.duration,
  );

  return songEndTime * config.pixelsPerSecond;
}

function validateLayoutConfig(config: NoteRollLayoutConfig): void {
  if (!Number.isFinite(config.pixelsPerSecond) || config.pixelsPerSecond <= 0) {
    throw new Error('Note roll layout pixelsPerSecond must be a positive number.');
  }

  if (!Number.isFinite(config.minNoteHeightPx) || config.minNoteHeightPx <= 0) {
    throw new Error('Note roll layout minNoteHeightPx must be a positive number.');
  }

  if (!Number.isFinite(config.minRollHeightPx) || config.minRollHeightPx <= 0) {
    throw new Error('Note roll layout minRollHeightPx must be a positive number.');
  }
}
