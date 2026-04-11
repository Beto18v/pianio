import { TestBed } from '@angular/core/testing';

import { MidiSong } from '../domain/models/midi-song.model';
import { createNoteKey } from '../domain/utils/note-key.util';
import { SongAnalysisService } from './song-analysis.service';

describe('SongAnalysisService', () => {
  let service: SongAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SongAnalysisService);
  });

  it('assigns hands using track median pitch split for multi-track songs', () => {
    const song: MidiSong = {
      fileName: 'two-hands.mid',
      duration: 2,
      tempoBpm: 120,
      ppq: 480,
      trackCount: 2,
      notes: [
        { pitch: 43, velocity: 0.7, startTime: 0, duration: 0.4, track: 0 },
        { pitch: 45, velocity: 0.7, startTime: 0.8, duration: 0.4, track: 0 },
        { pitch: 72, velocity: 0.8, startTime: 0, duration: 0.4, track: 1 },
        { pitch: 74, velocity: 0.8, startTime: 0.8, duration: 0.4, track: 1 },
      ],
    };

    const analysis = service.analyze(song);

    expect(analysis.noteAnnotations[createNoteKey(song.notes[0])]?.hand).toBe('left');
    expect(analysis.noteAnnotations[createNoteKey(song.notes[1])]?.hand).toBe('left');
    expect(analysis.noteAnnotations[createNoteKey(song.notes[2])]?.hand).toBe('right');
    expect(analysis.noteAnnotations[createNoteKey(song.notes[3])]?.hand).toBe('right');
  });

  it('assigns chord fingering suggestions for both hands in single-track fallback', () => {
    const song: MidiSong = {
      fileName: 'chord.mid',
      duration: 1,
      tempoBpm: 120,
      ppq: 480,
      trackCount: 1,
      notes: [
        { pitch: 48, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 52, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 64, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 67, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 },
      ],
    };

    const analysis = service.analyze(song);

    expect(analysis.noteAnnotations[createNoteKey(song.notes[0])]).toEqual({
      hand: 'left',
      finger: 5,
    });
    expect(analysis.noteAnnotations[createNoteKey(song.notes[1])]).toEqual({
      hand: 'left',
      finger: 3,
    });
    expect(analysis.noteAnnotations[createNoteKey(song.notes[2])]).toEqual({
      hand: 'right',
      finger: 1,
    });
    expect(analysis.noteAnnotations[createNoteKey(song.notes[3])]).toEqual({
      hand: 'right',
      finger: 3,
    });
  });

  it('caches analyses for repeated song requests', () => {
    const song: MidiSong = {
      fileName: 'cached.mid',
      duration: 1,
      tempoBpm: 120,
      ppq: 480,
      trackCount: 1,
      notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 }],
    };

    const firstAnalysis = service.analyze(song);
    const secondAnalysis = service.analyze(song);

    expect(secondAnalysis).toBe(firstAnalysis);
  });
});
