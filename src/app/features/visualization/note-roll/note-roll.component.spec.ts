import { TestBed } from '@angular/core/testing';

import { MidiSong } from '../../../domain/models/midi-song.model';
import { NoteRollComponent } from './note-roll.component';

describe('NoteRollComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteRollComponent],
    }).compileComponents();
  });

  it('renders an idle state when no song is provided', () => {
    const fixture = TestBed.createComponent(NoteRollComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain(
      'Carga un archivo MIDI para ubicar sus notas en esta vista.',
    );
    expect(compiled.querySelectorAll('.note-roll-panel__note')).toHaveLength(0);
  });

  it('renders static note blocks from a MidiSong input', async () => {
    const song: MidiSong = {
      fileName: 'exercise.mid',
      duration: 2,
      tempoBpm: 100,
      ppq: 480,
      trackCount: 1,
      notes: [
        { pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 61, velocity: 0.6, startTime: 1, duration: 0.25, track: 0 },
        { pitch: 111, velocity: 0.4, startTime: 1.5, duration: 0.5, track: 0 },
      ],
    };

    const fixture = TestBed.createComponent(NoteRollComponent);
    fixture.componentRef.setInput('song', song);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const notes = compiled.querySelectorAll('.note-roll-panel__note');
    const c4 = compiled.querySelector(
      '.note-roll-panel__note[data-pitch="60"]',
    ) as HTMLElement | null;
    const cSharp4 = compiled.querySelector(
      '.note-roll-panel__note[data-pitch="61"]',
    ) as HTMLElement | null;

    expect(compiled.textContent).toContain('Mapa de notas');
    expect(compiled.textContent).toContain('2');
    expect(compiled.textContent).toContain('1');
    expect(notes).toHaveLength(2);
    expect(c4?.style.top).toBe('0px');
    expect(c4?.style.height).toBe('60px');
    expect(cSharp4?.style.top).toBe('120px');
    expect(cSharp4?.style.height).toBe('30px');
  });

  it('shows a playhead and highlights the notes active at currentTime', async () => {
    const song: MidiSong = {
      fileName: 'exercise.mid',
      duration: 2,
      tempoBpm: 100,
      ppq: 480,
      trackCount: 1,
      notes: [
        { pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 },
        { pitch: 61, velocity: 0.6, startTime: 1, duration: 0.25, track: 0 },
      ],
    };

    const fixture = TestBed.createComponent(NoteRollComponent);
    fixture.componentRef.setInput('song', song);
    fixture.componentRef.setInput('currentTime', 1.1);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const playhead = compiled.querySelector('.note-roll-panel__playhead') as HTMLElement | null;
    const c4 = compiled.querySelector('.note-roll-panel__note[data-pitch="60"]') as HTMLElement | null;
    const cSharp4 = compiled.querySelector(
      '.note-roll-panel__note[data-pitch="61"]',
    ) as HTMLElement | null;

    expect(playhead?.style.top).toBe('132px');
    expect(c4?.classList.contains('note-roll-panel__note--active')).toBe(false);
    expect(cSharp4?.classList.contains('note-roll-panel__note--active')).toBe(true);
  });
});
