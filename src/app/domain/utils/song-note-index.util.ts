import { NoteEvent } from '../models/note-event.model';

export interface SongNoteIndex {
  readonly notesSortedByStartTime: ReadonlyArray<NoteEvent>;
  readonly startTimes: ReadonlyArray<number>;
  readonly maxNoteDurationSeconds: number;
}

export function createSongNoteIndex(notes: ReadonlyArray<NoteEvent>): SongNoteIndex {
  const notesSortedByStartTime = [...notes].sort(
    (left, right) =>
      left.startTime - right.startTime || left.pitch - right.pitch || left.track - right.track,
  );

  const startTimes = notesSortedByStartTime.map((note) => note.startTime);
  const maxNoteDurationSeconds = notesSortedByStartTime.reduce((maximum, note) => {
    if (!Number.isFinite(note.duration) || note.duration <= 0) {
      return maximum;
    }

    return Math.max(maximum, note.duration);
  }, 0);

  return {
    notesSortedByStartTime,
    startTimes,
    maxNoteDurationSeconds,
  };
}

export function getNotesStartingInRange(
  index: SongNoteIndex,
  startTimeInclusive: number,
  endTimeInclusive: number,
): ReadonlyArray<NoteEvent> {
  if (!Number.isFinite(startTimeInclusive) || !Number.isFinite(endTimeInclusive)) {
    return [];
  }

  if (endTimeInclusive < startTimeInclusive) {
    return [];
  }

  const startIndex = lowerBound(index.startTimes, startTimeInclusive);
  const endExclusive = upperBound(index.startTimes, endTimeInclusive);

  if (endExclusive <= startIndex) {
    return [];
  }

  return index.notesSortedByStartTime.slice(startIndex, endExclusive);
}

function lowerBound(values: ReadonlyArray<number>, target: number): number {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = values[middle] ?? 0;

    if (value < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function upperBound(values: ReadonlyArray<number>, target: number): number {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = values[middle] ?? 0;

    if (value <= target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}
