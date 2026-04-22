import { MidiSong } from '../../../domain/models/midi-song.model';
import {
  NoteAnnotation,
  NoteAnnotationMap,
  NoteFinger,
  NoteHand,
} from '../../../domain/models/note-annotation.model';
import { NoteEvent } from '../../../domain/models/note-event.model';
import { createNoteKey } from '../../../domain/utils/note-key.util';
import {
  SongNoteIndex,
  createSongNoteIndex,
  getNotesStartingInRange,
} from '../../../domain/utils/song-note-index.util';
import { KeyboardLayout } from '../models/keyboard-layout.model';
import {
  MVP_KEYBOARD_LAYOUT,
  getPitchHorizontalPosition,
  getPitchName,
} from './keyboard-layout.util';

export interface NoteRainLayoutConfig {
  viewportHeightPx: number;
  pixelsPerSecond: number;
  hitLineOffsetPx: number;
  minNoteHeightPx: number;
  maxVisibleNotes: number;
}

export type NoteRainHandMode = 'both' | 'left' | 'right';

export interface FallingNote {
  pitch: number;
  label: string;
  velocity: number;
  startTime: number;
  duration: number;
  track: number;
  hand: NoteHand;
  finger: NoteFinger;
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
  maxVisibleNotes: 220,
};

export function getFallingNote(
  note: NoteEvent,
  currentTime: number,
  config: NoteRainLayoutConfig = DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
  keyboardLayout: KeyboardLayout = MVP_KEYBOARD_LAYOUT,
  noteAnnotation: NoteAnnotation | null = null,
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
    label: getPitchName(note.pitch),
    velocity: note.velocity,
    startTime: note.startTime,
    duration: note.duration,
    track: note.track,
    hand: noteAnnotation?.hand ?? 'unknown',
    finger: noteAnnotation?.finger ?? null,
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
  noteAnnotations: NoteAnnotationMap = {},
  handMode: NoteRainHandMode = 'both',
): NoteRainLayout {
  validateLayoutConfig(config);

  const resolvedIndex = noteIndex ?? createSongNoteIndex(song.notes);
  const { startTimeMin, startTimeMax } = getStartTimeWindow(currentTime, config, resolvedIndex);
  const candidateNotes = getNotesStartingInRange(resolvedIndex, startTimeMin, startTimeMax);

  const notes: FallingNote[] = [];

  for (const note of candidateNotes) {
    const noteAnnotation = noteAnnotations[createNoteKey(note)] ?? null;
    const hand = noteAnnotation?.hand ?? 'unknown';

    if (!matchesHandMode(handMode, hand)) {
      continue;
    }

    const fallingNote = getFallingNote(note, currentTime, config, keyboardLayout, noteAnnotation);

    if (fallingNote) {
      notes.push(fallingNote);
    }
  }

  const cappedNotes = applyVisibleNoteCap(notes, currentTime, config.maxVisibleNotes);

  return {
    hitLineTopPx: config.viewportHeightPx - config.hitLineOffsetPx,
    notes: cappedNotes,
    hiddenNoteCount: song.notes.length - cappedNotes.length,
  };
}

function applyVisibleNoteCap(
  notes: ReadonlyArray<FallingNote>,
  currentTime: number,
  maxVisibleNotes: number,
): ReadonlyArray<FallingNote> {
  const safeCap = Math.max(1, Math.floor(maxVisibleNotes));

  if (notes.length <= safeCap) {
    return notes;
  }

  const prioritized = notes
    .map((note, index) => ({
      index,
      score: getVisibilityPriorityScore(note, currentTime),
      note,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.note.startTime !== right.note.startTime) {
        return left.note.startTime - right.note.startTime;
      }

      if (left.note.pitch !== right.note.pitch) {
        return left.note.pitch - right.note.pitch;
      }

      return left.index - right.index;
    });

  const keptIndices = new Set(prioritized.slice(0, safeCap).map((entry) => entry.index));

  return notes.filter((_, index) => keptIndices.has(index));
}

function getVisibilityPriorityScore(note: FallingNote, currentTime: number): number {
  const activeBoost = note.isActive ? 3 : 0;
  const distanceFromNow = Math.abs(note.startTime - currentTime);
  const temporalProximityBoost = 1 / (1 + distanceFromNow * 4);
  const velocityBoost = clamp(note.velocity, 0, 1) * 0.15;

  return activeBoost + temporalProximityBoost + velocityBoost;
}

function matchesHandMode(handMode: NoteRainHandMode, hand: NoteHand): boolean {
  if (handMode === 'both') {
    return true;
  }

  return hand === handMode;
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

  if (!Number.isFinite(config.maxVisibleNotes) || config.maxVisibleNotes <= 0) {
    throw new Error('Note rain layout maxVisibleNotes must be a positive number.');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
