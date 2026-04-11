import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MidiSong } from '../domain/models/midi-song.model';
import { MidiParserService } from './midi-parser.service';
import { MusicXmlParserService } from './musicxml-parser.service';
import { SongParserService, detectSongFileFormat } from './song-parser.service';

describe('song-parser.service', () => {
  it('detects MIDI by extension and MusicXML by content signature', () => {
    const midiBytes = new Uint8Array([0x4d, 0x54, 0x68, 0x64]).buffer;
    const xmlBytes = new TextEncoder().encode(
      '<score-partwise version="4.0"></score-partwise>',
    ).buffer;

    expect(detectSongFileFormat('demo.mid', '', midiBytes)).toBe('midi');
    expect(detectSongFileFormat('unknown.bin', '', xmlBytes)).toBe('musicxml');
    expect(detectSongFileFormat('score.mxl', '', xmlBytes)).toBe('mxl');
  });

  it('delegates MIDI files to MidiParserService', async () => {
    const midiParserService = {
      parse: vi.fn(),
    };
    const musicXmlParserService = {
      parse: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        SongParserService,
        { provide: MidiParserService, useValue: midiParserService },
        { provide: MusicXmlParserService, useValue: musicXmlParserService },
      ],
    }).compileComponents();

    const service = TestBed.inject(SongParserService);
    const file = new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64])], 'demo.mid', {
      type: 'audio/midi',
    });
    const arrayBuffer = await file.arrayBuffer();
    const parsedSong: MidiSong = {
      fileName: 'demo.mid',
      notes: [],
      duration: 0,
      tempoBpm: null,
      ppq: 480,
      trackCount: 0,
      sourceFormat: 'midi',
      fileNoteAnnotations: {},
    };

    midiParserService.parse.mockReturnValue(parsedSong);

    const result = service.parseFile(file, arrayBuffer);

    expect(result).toBe(parsedSong);
    expect(midiParserService.parse).toHaveBeenCalledWith(arrayBuffer, 'demo.mid');
    expect(musicXmlParserService.parse).not.toHaveBeenCalled();
  });

  it('delegates MusicXML files to MusicXmlParserService', async () => {
    const midiParserService = {
      parse: vi.fn(),
    };
    const musicXmlParserService = {
      parse: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        SongParserService,
        { provide: MidiParserService, useValue: midiParserService },
        { provide: MusicXmlParserService, useValue: musicXmlParserService },
      ],
    }).compileComponents();

    const service = TestBed.inject(SongParserService);
    const xmlContent = '<score-partwise version="4.0"></score-partwise>';
    const file = new File([xmlContent], 'demo.musicxml', { type: 'application/xml' });
    const arrayBuffer = await file.arrayBuffer();
    const parsedSong: MidiSong = {
      fileName: 'demo.musicxml',
      notes: [],
      duration: 0,
      tempoBpm: null,
      ppq: null,
      trackCount: 0,
      sourceFormat: 'musicxml',
      fileNoteAnnotations: {},
    };

    musicXmlParserService.parse.mockReturnValue(parsedSong);

    const result = service.parseFile(file, arrayBuffer);

    expect(result).toBe(parsedSong);
    expect(musicXmlParserService.parse).toHaveBeenCalledWith(xmlContent, 'demo.musicxml');
    expect(midiParserService.parse).not.toHaveBeenCalled();
  });

  it('throws a controlled error for .mxl files in this first iteration', async () => {
    const midiParserService = {
      parse: vi.fn(),
    };
    const musicXmlParserService = {
      parse: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        SongParserService,
        { provide: MidiParserService, useValue: midiParserService },
        { provide: MusicXmlParserService, useValue: musicXmlParserService },
      ],
    }).compileComponents();

    const service = TestBed.inject(SongParserService);
    const file = new File([new Uint8Array([1, 2, 3])], 'score.mxl', {
      type: 'application/vnd.recordare.musicxml',
    });
    const arrayBuffer = await file.arrayBuffer();

    expect(() => service.parseFile(file, arrayBuffer)).toThrow(
      'Compressed MusicXML (.mxl) is not supported yet.',
    );
    expect(midiParserService.parse).not.toHaveBeenCalled();
    expect(musicXmlParserService.parse).not.toHaveBeenCalled();
  });
});
