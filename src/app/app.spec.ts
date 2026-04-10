import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { App } from './app';
import { MidiSong } from './domain/models/midi-song.model';
import { MidiParserService } from './services/midi-parser.service';

describe('App', () => {
  const parserService = {
    parse: vi.fn(),
  };

  beforeEach(async () => {
    parserService.parse.mockReset();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'table').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: MidiParserService, useValue: parserService }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render the app heading and visualization components', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('PianoFlow');
    expect(compiled.textContent).toContain(
      'Carga un archivo MIDI y revisa su estructura en pantalla.',
    );
    expect(compiled.querySelector('app-midi-upload')).not.toBeNull();
    expect(compiled.querySelector('app-playback-controls')).not.toBeNull();
    expect(compiled.querySelector('app-midi-input-monitor')).not.toBeNull();
    expect(compiled.querySelector('app-piano-keyboard')).not.toBeNull();
    expect(compiled.querySelector('app-note-roll')).not.toBeNull();
  });

  it('feeds the parsed MidiSong from upload into the note roll', async () => {
    const parsedSong: MidiSong = {
      fileName: 'scale.mid',
      notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 }],
      duration: 0.5,
      tempoBpm: 120,
      ppq: 480,
      trackCount: 1,
    };

    parserService.parse.mockReturnValue(parsedSong);

    const fixture = TestBed.createComponent(App);
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

    const noteRollNotes = compiled.querySelectorAll('.note-roll-panel__note');
    const playbackPosition = compiled.querySelector(
      '#playback-position-input',
    ) as HTMLInputElement | null;

    expect(compiled.textContent).toContain('Mapa de notas');
    expect(compiled.textContent).toContain('Bloques visibles');
    expect(compiled.textContent).toContain('Controles de reproduccion');
    expect(playbackPosition?.max).toBe('0.5');
    expect(noteRollNotes).toHaveLength(1);
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
