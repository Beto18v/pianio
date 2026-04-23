import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { siteContent } from '../../core/site';
import { MidiSong } from '../../domain/models/midi-song.model';
import { SongParserService } from '../../services/song-parser.service';
import { MidiUploadComponent } from './midi-upload.component';

describe('MidiUploadComponent', () => {
  const parserService = {
    parseFile: vi.fn(),
  };

  beforeEach(async () => {
    parserService.parseFile.mockReset();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'table').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [MidiUploadComponent],
      providers: [{ provide: SongParserService, useValue: parserService }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the idle state before any file is selected', () => {
    const fixture = TestBed.createComponent(MidiUploadComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain(siteContent.upload.library.importAction);
    expect(compiled.textContent).toContain(siteContent.upload.helperText);
    expect(compiled.textContent).toContain(siteContent.upload.idleState);
    expect(compiled.querySelector('.upload-panel__helper')?.textContent).toContain(
      'Sube un archivo .mid, .midi, .xml o .musicxml',
    );
    expect(compiled.textContent).toContain(siteContent.upload.library.heading);
  });

  it('reads the selected file and renders the parsed summary', async () => {
    const parsedSong: MidiSong = {
      fileName: 'scale.mid',
      notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 }],
      duration: 0.5,
      tempoBpm: 120,
      ppq: 480,
      trackCount: 1,
    };

    parserService.parseFile.mockReturnValue(parsedSong);

    const fixture = TestBed.createComponent(MidiUploadComponent);
    const emissions: Array<MidiSong | null> = [];
    fixture.componentInstance.songParsed.subscribe((song) => emissions.push(song));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('#midi-file-input') as HTMLInputElement;
    const file = new File([new Uint8Array([77, 84, 104, 100])], 'scale.mid', {
      type: 'audio/midi',
    });

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: createFileList(file),
    });

    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(parserService.parseFile).toHaveBeenCalledOnce();
    expect(parserService.parseFile.mock.calls[0]?.[0]).toBe(file);
    expect(parserService.parseFile.mock.calls[0]?.[1]).toBeInstanceOf(ArrayBuffer);
    expect(compiled.textContent).toContain(siteContent.upload.summaryHeading);
    expect(compiled.textContent).toContain('scale.mid');
    expect(compiled.textContent).toContain('120');
    expect(compiled.textContent).not.toContain('Primeras notas');
    expect(compiled.querySelector('table')).toBeNull();
    expect(emissions).toEqual([null, parsedSong]);
  });

  it('shows an error message when parsing fails', async () => {
    parserService.parseFile.mockImplementation(() => {
      throw new Error('broken');
    });

    const fixture = TestBed.createComponent(MidiUploadComponent);
    const emissions: Array<MidiSong | null> = [];
    fixture.componentInstance.songParsed.subscribe((song) => emissions.push(song));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('#midi-file-input') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], 'broken.mid', { type: 'audio/midi' });

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: createFileList(file),
    });

    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.textContent).toContain(siteContent.upload.errorState);
    expect(emissions).toEqual([null]);
  });
});

function createFileList(file: File): FileList {
  return {
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null),
    [Symbol.iterator]: function* () {
      yield file;
    },
  } as unknown as FileList;
}
