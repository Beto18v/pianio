import { createNoteKey } from './note-key.util';

describe('note-key.util', () => {
  it('builds a stable key from track, startTime, and pitch', () => {
    const key = createNoteKey({ track: 2, startTime: 1.5, pitch: 64 });

    expect(key).toBe('2-1.5-64');
  });
});
