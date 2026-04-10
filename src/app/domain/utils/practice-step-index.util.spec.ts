import { describe, expect, it } from 'vitest';

import { NoteEvent } from '../models/note-event.model';
import { createPracticeStepIndex, getExpectedPitchesAtTime } from './practice-step-index.util';

describe('practice-step-index.util', () => {
  it('groups notes into steps and computes max duration', () => {
    const notes: NoteEvent[] = [
      { pitch: 60, velocity: 0.7, startTime: 0, duration: 0.5, track: 0 },
      { pitch: 64, velocity: 0.7, startTime: 0.02, duration: 0.25, track: 0 },
      { pitch: 67, velocity: 0.7, startTime: 1, duration: 0.1, track: 0 },
    ];

    const index = createPracticeStepIndex(notes, { epsilonSeconds: 0.04 });

    expect(index.startTimes).toEqual([0, 1]);
    expect(index.maxNoteDurationSeconds).toBe(0.5);

    expect(index.steps[0]?.pitches).toEqual([60, 64]);
    expect(index.steps[0]?.maxEndTime).toBe(0.5);

    expect(index.steps[1]?.pitches).toEqual([67]);
  });

  it('returns expected pitches for active notes at current time', () => {
    const notes: NoteEvent[] = [
      { pitch: 60, velocity: 0.7, startTime: 0, duration: 0.5, track: 0 },
      { pitch: 64, velocity: 0.7, startTime: 0.5, duration: 0.5, track: 0 },
      { pitch: 200, velocity: 0.7, startTime: 0.1, duration: 1, track: 0 },
      { pitch: 62, velocity: 0.7, startTime: 0.2, duration: 0, track: 0 },
    ];

    const index = createPracticeStepIndex(notes);

    expect(getExpectedPitchesAtTime(index, 0.1)).toEqual([60]);
    expect(getExpectedPitchesAtTime(index, 0.75)).toEqual([64]);
    expect(getExpectedPitchesAtTime(index, 1.5)).toEqual([]);
  });

  it('does not miss active notes that are grouped into an earlier step', () => {
    const notes: NoteEvent[] = [
      { pitch: 60, velocity: 0.7, startTime: 0, duration: 0.02, track: 0 },
      { pitch: 62, velocity: 0.7, startTime: 0.03, duration: 0.05, track: 0 },
    ];

    const index = createPracticeStepIndex(notes, { epsilonSeconds: 0.04 });

    expect(getExpectedPitchesAtTime(index, 0.06)).toEqual([62]);
  });

  it('returns empty results on invalid input', () => {
    const notes: NoteEvent[] = [
      { pitch: 60, velocity: 0.7, startTime: 0, duration: 0.25, track: 0 },
    ];

    const index = createPracticeStepIndex(notes);

    expect(getExpectedPitchesAtTime(index, Number.NaN)).toEqual([]);
  });

  it('throws on invalid epsilonSeconds', () => {
    expect(() => createPracticeStepIndex([], { epsilonSeconds: Number.NaN })).toThrow();
    expect(() => createPracticeStepIndex([], { epsilonSeconds: -1 })).toThrow();
  });
});
