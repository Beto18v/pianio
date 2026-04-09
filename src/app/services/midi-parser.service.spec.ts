import { TestBed } from '@angular/core/testing';
import { Midi } from '@tonejs/midi';

import { MidiParserService } from './midi-parser.service';

describe('MidiParserService', () => {
  let service: MidiParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MidiParserService);
  });

  it('maps MIDI data into the app domain and sorts notes by time and pitch', () => {
    const midi = new Midi();
    midi.header.setTempo(96);

    const leadTrack = midi.addTrack();
    leadTrack.addNote({ midi: 72, time: 1, duration: 0.25, velocity: 0.4 });
    leadTrack.addNote({ midi: 60, time: 0, duration: 0.5, velocity: 0.8 });

    const harmonyTrack = midi.addTrack();
    harmonyTrack.addNote({ midi: 64, time: 1, duration: 0.5, velocity: 0.6 });
    harmonyTrack.addNote({ midi: 67, time: 1, duration: 0.125, velocity: 0.7 });

    const song = service.parse(toArrayBuffer(midi), 'exercise.mid');

    expect(song.fileName).toBe('exercise.mid');
    expect(song.trackCount).toBe(2);
    expect(song.ppq).toBe(480);
    expect(song.tempoBpm).toBe(96);
    expect(
      song.notes.map(({ pitch, startTime, duration, track }) => ({
        pitch,
        startTime,
        duration,
        track,
      })),
    ).toEqual([
      { pitch: 60, startTime: 0, duration: 0.5, track: 0 },
      { pitch: 64, startTime: 1, duration: 0.5, track: 1 },
      { pitch: 67, startTime: 1, duration: 0.125, track: 1 },
      { pitch: 72, startTime: 1, duration: 0.25, track: 0 },
    ]);
    expect(song.notes[0]?.velocity).toBeCloseTo(0.8, 1);
    expect(song.notes[1]?.velocity).toBeCloseTo(0.6, 1);
    expect(song.notes[2]?.velocity).toBeCloseTo(0.7, 1);
    expect(song.notes[3]?.velocity).toBeCloseTo(0.4, 1);
  });

  it('returns a null tempo when the MIDI file has no explicit tempo event', () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 60, time: 0, duration: 0.5, velocity: 0.8 });

    const song = service.parse(toArrayBuffer(midi), 'free-time.mid');

    expect(song.tempoBpm).toBeNull();
    expect(song.notes).toHaveLength(1);
  });

  it('throws a controlled error for invalid MIDI content', () => {
    const invalidBuffer = new Uint8Array([1, 2, 3, 4]).buffer;

    expect(() => service.parse(invalidBuffer, 'broken.mid')).toThrow(
      'Could not parse the selected MIDI file.',
    );
  });
});

function toArrayBuffer(midi: Midi): ArrayBuffer {
  const bytes = midi.toArray();

  return Uint8Array.from(bytes).buffer;
}
