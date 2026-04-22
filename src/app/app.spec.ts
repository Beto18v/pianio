import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { App } from './app';
import { siteContent } from './core/site';
import { MidiSong } from './domain/models/midi-song.model';
import { SongParserService } from './services/song-parser.service';

describe('App', () => {
  const parserService = {
    parseFile: vi.fn(),
  };

  beforeEach(async () => {
    parserService.parseFile.mockReset();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'table').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: SongParserService, useValue: parserService }],
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

  it('shows the welcome screen first', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain(siteContent.appName);
    expect(compiled.textContent).toContain(siteContent.welcome.title);
    expect(compiled.querySelector('#welcome-continue-button')).not.toBeNull();
    expect(compiled.querySelector('app-midi-upload')).toBeNull();
  });

  it('transitions from welcome to calibration and then to main scene', async () => {
    const fixture = TestBed.createComponent(App);

    await moveToCalibration(fixture);

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain(siteContent.calibration.readyTitle);
    expect(compiled.querySelector('#calibration-back-button')).not.toBeNull();

    const confirmButton = compiled.querySelector(
      '#calibration-confirm-button',
    ) as HTMLButtonElement | null;

    expect(confirmButton).not.toBeNull();
    confirmButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('app-midi-upload')).not.toBeNull();
    expect(compiled.querySelector('app-playback-controls')).not.toBeNull();
    expect(compiled.querySelector('app-midi-input-monitor')).not.toBeNull();
    expect(compiled.querySelector('app-piano-keyboard')).not.toBeNull();
  });

  it('returns from calibration to welcome when pressing back', async () => {
    const fixture = TestBed.createComponent(App);

    await moveToCalibration(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    const backButton = compiled.querySelector(
      '#calibration-back-button',
    ) as HTMLButtonElement | null;

    backButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('#welcome-continue-button')).not.toBeNull();
    expect(compiled.querySelector('app-midi-upload')).toBeNull();
  });

  it('feeds the parsed MidiSong from upload after onboarding', async () => {
    const parsedSong: MidiSong = {
      fileName: 'scale.mid',
      notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 }],
      duration: 0.5,
      tempoBpm: 120,
      ppq: 480,
      trackCount: 1,
    };

    parserService.parseFile.mockReturnValue(parsedSong);

    const fixture = TestBed.createComponent(App);

    await moveToCalibration(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    const confirmButton = compiled.querySelector(
      '#calibration-confirm-button',
    ) as HTMLButtonElement | null;

    confirmButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

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

    const noteRainNotes = compiled.querySelectorAll('.note-rain__note');
    const guidedWhiteKey = compiled.querySelector(
      '.stage-keyboard__key--white[data-pitch="60"]',
    ) as HTMLElement | null;
    const playbackPosition = compiled.querySelector(
      '#playback-position-input',
    ) as HTMLInputElement | null;

    expect(compiled.textContent).toContain(siteContent.playback.heading);
    expect(compiled.textContent).toContain(siteContent.upload.library.importAction);
    expect(playbackPosition?.max).toBe('0.5');
    expect(noteRainNotes).toHaveLength(1);
    expect(guidedWhiteKey?.classList.contains('stage-keyboard__key--guide-white')).toBe(true);
  });

  it('keeps a black guide key highlighted while a sustained note is active', async () => {
    const parsedSong: MidiSong = {
      fileName: 'sharp-sustain.mid',
      notes: [{ pitch: 61, velocity: 0.8, startTime: 0, duration: 1, track: 0 }],
      duration: 1,
      tempoBpm: 120,
      ppq: 480,
      trackCount: 1,
    };

    parserService.parseFile.mockReturnValue(parsedSong);

    const fixture = TestBed.createComponent(App);

    await moveToCalibration(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    const confirmButton = compiled.querySelector(
      '#calibration-confirm-button',
    ) as HTMLButtonElement | null;

    confirmButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const input = compiled.querySelector('#midi-file-input') as HTMLInputElement;
    const file = new File([new Uint8Array([77, 84, 104, 100])], 'sharp-sustain.mid', {
      type: 'audio/midi',
    });

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: createFileList(file),
    });

    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    const playbackPosition = compiled.querySelector(
      '#playback-position-input',
    ) as HTMLInputElement | null;

    if (!playbackPosition) {
      throw new Error('Expected playback position slider to be rendered.');
    }

    playbackPosition.value = '0.5';
    playbackPosition.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();

    const guidedBlackKey = compiled.querySelector(
      '.stage-keyboard__key--black[data-pitch="61"]',
    ) as HTMLElement | null;

    expect(guidedBlackKey?.classList.contains('stage-keyboard__key--guide-black')).toBe(true);
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

async function moveToCalibration(fixture: {
  nativeElement: unknown;
  detectChanges: () => void;
  whenStable: () => Promise<unknown>;
}): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  const compiled = fixture.nativeElement as HTMLElement;
  const continueButton = compiled.querySelector(
    '#welcome-continue-button',
  ) as HTMLButtonElement | null;

  continueButton?.click();
  await fixture.whenStable();
  fixture.detectChanges();
}
