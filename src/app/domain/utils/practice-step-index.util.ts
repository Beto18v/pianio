import { NoteEvent } from '../models/note-event.model';
import { PracticeStep } from '../models/practice-step.model';

export interface PracticeStepIndex {
  readonly steps: ReadonlyArray<PracticeStep>;
  readonly startTimes: ReadonlyArray<number>;
  readonly maxNoteDurationSeconds: number;
  readonly epsilonSeconds: number;
}

export const DEFAULT_PRACTICE_STEP_EPSILON_SECONDS = 0.04;
export const DEFAULT_PRACTICE_STEP_TIME_TOLERANCE_SECONDS = 0.08;

export function createPracticeStepIndex(
  notes: ReadonlyArray<NoteEvent>,
  { epsilonSeconds = DEFAULT_PRACTICE_STEP_EPSILON_SECONDS }: { epsilonSeconds?: number } = {},
): PracticeStepIndex {
  if (!Number.isFinite(epsilonSeconds) || epsilonSeconds < 0) {
    throw new Error('Practice step epsilonSeconds must be a number greater than or equal to 0.');
  }

  const normalizedNotes = notes
    .filter((note) => isValidPracticeNote(note))
    .slice()
    .sort(
      (left, right) =>
        left.startTime - right.startTime || left.pitch - right.pitch || left.track - right.track,
    );

  const maxNoteDurationSeconds = normalizedNotes.reduce(
    (maximum, note) => Math.max(maximum, note.duration),
    0,
  );

  const steps: PracticeStep[] = [];
  let currentNotes: NoteEvent[] = [];
  let currentStartTime: number | null = null;

  const finalizeStep = (): void => {
    if (currentStartTime === null || currentNotes.length === 0) {
      return;
    }

    const pitches = Array.from(new Set(currentNotes.map((note) => note.pitch))).sort(
      (left, right) => left - right,
    );
    const maxEndTime = currentNotes.reduce(
      (maximum, note) => Math.max(maximum, note.startTime + note.duration),
      currentStartTime,
    );

    steps.push({
      startTime: currentStartTime,
      pitches,
      notes: currentNotes,
      maxEndTime,
    });
  };

  for (const note of normalizedNotes) {
    if (currentStartTime === null) {
      currentStartTime = note.startTime;
      currentNotes = [note];
      continue;
    }

    if (note.startTime - currentStartTime <= epsilonSeconds) {
      currentNotes.push(note);
      continue;
    }

    finalizeStep();
    currentStartTime = note.startTime;
    currentNotes = [note];
  }

  finalizeStep();

  return {
    steps,
    startTimes: steps.map((step) => step.startTime),
    maxNoteDurationSeconds,
    epsilonSeconds,
  };
}

export function getExpectedPitchesAtTime(index: PracticeStepIndex, currentTime: number): number[] {
  if (!Number.isFinite(currentTime)) {
    return [];
  }

  const steps = index.steps;

  if (steps.length === 0) {
    return [];
  }

  const startTimeMin = currentTime - index.maxNoteDurationSeconds - index.epsilonSeconds;
  const startIndex = lowerBound(index.startTimes, startTimeMin);
  const endExclusive = upperBound(index.startTimes, currentTime);
  const expected = new Set<number>();

  for (let i = startIndex; i < endExclusive; i += 1) {
    const step = steps[i];

    if (!step || step.maxEndTime <= currentTime) {
      continue;
    }

    for (const note of step.notes) {
      if (isNoteActive(note, currentTime)) {
        expected.add(note.pitch);
      }
    }
  }

  return Array.from(expected).sort((left, right) => left - right);
}

export function getPracticeStepIndexAtTime(
  index: PracticeStepIndex,
  currentTime: number,
  {
    toleranceSeconds = DEFAULT_PRACTICE_STEP_TIME_TOLERANCE_SECONDS,
  }: { toleranceSeconds?: number } = {},
): number | null {
  if (!Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) {
    throw new Error('Practice step toleranceSeconds must be a number greater than or equal to 0.');
  }

  const steps = index.steps;

  if (steps.length === 0) {
    return null;
  }

  if (!Number.isFinite(currentTime)) {
    return 0;
  }

  const lastStep = steps.at(-1);

  if (lastStep && currentTime > lastStep.maxEndTime + toleranceSeconds) {
    return null;
  }

  const candidateIndex = upperBound(index.startTimes, currentTime) - 1;

  if (candidateIndex < 0) {
    return 0;
  }

  const candidateStep = steps[candidateIndex];

  if (!candidateStep) {
    return 0;
  }

  if (currentTime <= candidateStep.maxEndTime + toleranceSeconds) {
    return candidateIndex;
  }

  const nextIndex = candidateIndex + 1;

  return nextIndex < steps.length ? nextIndex : null;
}

function isValidPracticeNote(note: NoteEvent): boolean {
  if (!Number.isFinite(note.startTime)) {
    return false;
  }

  if (!Number.isFinite(note.duration) || note.duration <= 0) {
    return false;
  }

  if (!Number.isInteger(note.pitch) || note.pitch < 0 || note.pitch > 127) {
    return false;
  }

  return true;
}

function isNoteActive(note: NoteEvent, currentTime: number): boolean {
  const noteEnd = note.startTime + note.duration;

  return currentTime >= note.startTime && currentTime < noteEnd;
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
