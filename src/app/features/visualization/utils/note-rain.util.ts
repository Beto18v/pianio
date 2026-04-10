import { MidiSong } from '../../../domain/models/midi-song.model';
import { NoteEvent } from '../../../domain/models/note-event.model';
import {
  SongNoteIndex,
  createSongNoteIndex,
  getNotesStartingInRange,
} from '../../../domain/utils/song-note-index.util';
import { KeyboardLayout } from '../models/keyboard-layout.model';
import { MVP_KEYBOARD_LAYOUT, getPitchHorizontalPosition } from './keyboard-layout.util';

export interface NoteRainLayoutConfig {
  viewportHeightPx: number;
  pixelsPerSecond: number;
  hitLineOffsetPx: number;
  minNoteHeightPx: number;
}

export interface FallingNote {
  pitch: number;
  velocity: number;
  startTime: number;
  duration: number;
  track: number;
  leftPercent: number;
  widthPercent: number;
  topPx: number;
  heightPx: number;
  isBlack: boolean;
  isActive: boolean;
}

export interface NoteRainLayout {
  hitLineTopPx: number;
  notes: ReadonlyArray<FallingNote>;
  hiddenNoteCount: number;
}

export const DEFAULT_NOTE_RAIN_LAYOUT_CONFIG: Readonly<NoteRainLayoutConfig> = {
  viewportHeightPx: 640,
  pixelsPerSecond: 180,
  hitLineOffsetPx: 28,
  minNoteHeightPx: 10,
};

export function getFallingNote(
  note: NoteEvent,
  currentTime: number,
  config: NoteRainLayoutConfig = DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
  keyboardLayout: KeyboardLayout = MVP_KEYBOARD_LAYOUT,
): FallingNote | null {
  validateLayoutConfig(config);

  if (!Number.isFinite(currentTime)) {
    return null;
  }

  const horizontalPosition = getPitchHorizontalPosition(note.pitch, keyboardLayout);

  if (!horizontalPosition) {
    return null;
  }

  const hitLineTopPx = config.viewportHeightPx - config.hitLineOffsetPx;
  const heightPx = Math.max(note.duration * config.pixelsPerSecond, config.minNoteHeightPx);
  const bottomPx = hitLineTopPx - (note.startTime - currentTime) * config.pixelsPerSecond;
  const topPx = bottomPx - heightPx;

  if (bottomPx < 0 || topPx > config.viewportHeightPx) {
    return null;
  }

  return {
    pitch: note.pitch,
    velocity: note.velocity,
    startTime: note.startTime,
    duration: note.duration,
    track: note.track,
    leftPercent: horizontalPosition.leftPercent,
    widthPercent: horizontalPosition.widthPercent,
    topPx,
    heightPx,
    isBlack: horizontalPosition.isBlack,
    isActive: currentTime >= note.startTime && currentTime < note.startTime + note.duration,
  };
}

export function createNoteRainLayout(
  song: MidiSong,
  currentTime: number,
  config: NoteRainLayoutConfig = DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
  keyboardLayout: KeyboardLayout = MVP_KEYBOARD_LAYOUT,
  noteIndex: SongNoteIndex | null = null,
): NoteRainLayout {
  validateLayoutConfig(config);

  const resolvedIndex = noteIndex ?? createSongNoteIndex(song.notes);
  const { startTimeMin, startTimeMax } = getStartTimeWindow(currentTime, config, resolvedIndex);
  const candidateNotes = getNotesStartingInRange(resolvedIndex, startTimeMin, startTimeMax);

  const notes = candidateNotes
    .map((note) => getFallingNote(note, currentTime, config, keyboardLayout))
    .filter((note): note is FallingNote => note !== null);

  return {
    hitLineTopPx: config.viewportHeightPx - config.hitLineOffsetPx,
    notes,
    hiddenNoteCount: song.notes.length - notes.length,
  };
}

function getStartTimeWindow(
  currentTime: number,
  config: NoteRainLayoutConfig,
  noteIndex: SongNoteIndex,
): { startTimeMin: number; startTimeMax: number } {
  const hitLineTopPx = config.viewportHeightPx - config.hitLineOffsetPx;
  const pixelsPerSecond = config.pixelsPerSecond;

  if (!Number.isFinite(currentTime)) {
    return { startTimeMin: Number.POSITIVE_INFINITY, startTimeMax: Number.NEGATIVE_INFINITY };
  }

  const maxNoteHeightPx = Math.max(
    noteIndex.maxNoteDurationSeconds * pixelsPerSecond,
    config.minNoteHeightPx,
  );
  const lookaheadSeconds = hitLineTopPx / pixelsPerSecond;
  const lookbackSeconds = (config.hitLineOffsetPx + maxNoteHeightPx) / pixelsPerSecond;

  return {
    startTimeMin: currentTime - lookbackSeconds,
    startTimeMax: currentTime + lookaheadSeconds,
  };
}

function validateLayoutConfig(config: NoteRainLayoutConfig): void {
  if (!Number.isFinite(config.viewportHeightPx) || config.viewportHeightPx <= 0) {
    throw new Error('Note rain layout viewportHeightPx must be a positive number.');
  }

  if (!Number.isFinite(config.pixelsPerSecond) || config.pixelsPerSecond <= 0) {
    throw new Error('Note rain layout pixelsPerSecond must be a positive number.');
  }

  if (!Number.isFinite(config.hitLineOffsetPx) || config.hitLineOffsetPx < 0) {
    throw new Error('Note rain layout hitLineOffsetPx must be zero or greater.');
  }

  if (!Number.isFinite(config.minNoteHeightPx) || config.minNoteHeightPx <= 0) {
    throw new Error('Note rain layout minNoteHeightPx must be a positive number.');
  }
}
