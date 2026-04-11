import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MidiInputService } from '../../../services/midi-input.service';
import { PlaybackService } from '../../../services/playback.service';
import { PlaybackControlsComponent } from './playback-controls.component';

describe('PlaybackControlsComponent', () => {
  let playbackService: PlaybackService;
  let midiInputService: MidiInputService;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn(() => undefined),
    );

    await TestBed.configureTestingModule({
      imports: [PlaybackControlsComponent],
    }).compileComponents();

    playbackService = TestBed.inject(PlaybackService);
    midiInputService = TestBed.inject(MidiInputService);
    await midiInputService.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders an idle state when there is no loaded song', () => {
    const fixture = TestBed.createComponent(PlaybackControlsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Carga un archivo MIDI para habilitar el transporte');
  });

  it('renders the transport state and forwards seek actions to the service', async () => {
    playbackService.setSong({
      fileName: 'exercise.mid',
      duration: 3,
      tempoBpm: 110,
      ppq: 480,
      trackCount: 1,
      notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5, track: 0 }],
    });

    const seekSpy = vi.spyOn(playbackService, 'seek');
    const fixture = TestBed.createComponent(PlaybackControlsComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const slider = compiled.querySelector('#playback-position-input') as HTMLInputElement;

    slider.value = '1.25';
    slider.dispatchEvent(new Event('input'));

    expect(compiled.textContent).toContain('HUD de practica');
    expect(compiled.textContent).toContain('3 s');
    expect(seekSpy).toHaveBeenCalledWith(1.25);
  });

  it('toggles practice mode and gates transport progression until there is a match', async () => {
    playbackService.setSong({
      fileName: 'practice.mid',
      duration: 3,
      tempoBpm: 110,
      ppq: 480,
      trackCount: 1,
      notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 1, track: 0 }],
    });

    const playSpy = vi.spyOn(playbackService, 'play');
    const pauseSpy = vi.spyOn(playbackService, 'pause');
    const fixture = TestBed.createComponent(PlaybackControlsComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const practiceToggle = compiled.querySelector(
      '#practice-mode-toggle-input',
    ) as HTMLInputElement | null;
    const playButton = Array.from(compiled.querySelectorAll('.practice-hud__button')).find(
      (button) => button.textContent?.trim() === 'Play',
    ) as HTMLButtonElement | undefined;

    if (!practiceToggle || !playButton) {
      throw new Error('Expected practice controls were not rendered.');
    }

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    playButton.click();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(playbackService.playbackState().isPlaying).toBe(false);
    expect(compiled.textContent).toContain('Esperando match');
    expect(compiled.textContent).toContain('En espera');
    expect(compiled.textContent).toContain('Faltantes');
    expect(compiled.textContent).toContain('Aciertos');
    expect(compiled.textContent).toContain('Extras');

    midiInputService.triggerMockNote();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(playSpy).toHaveBeenCalled();
    expect(playbackService.playbackState().isPlaying).toBe(true);
    expect(compiled.textContent).toContain('Match');
    expect(compiled.textContent).toContain('Avanzando');
    expect(compiled.textContent).toContain('Aciertos');

    midiInputService.triggerMockNote();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(pauseSpy).not.toHaveBeenCalled();
    expect(playbackService.playbackState().isPlaying).toBe(true);
    expect(compiled.textContent).toContain('Avanzando');
  });

  it('forwards tempo slider changes to playback rate', async () => {
    playbackService.setSong({
      fileName: 'tempo.mid',
      duration: 3,
      tempoBpm: 120,
      ppq: 480,
      trackCount: 1,
      notes: [{ pitch: 60, velocity: 0.8, startTime: 0, duration: 1, track: 0 }],
    });

    const setPlaybackRateSpy = vi.spyOn(playbackService, 'setPlaybackRate');
    const fixture = TestBed.createComponent(PlaybackControlsComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tempoSlider = compiled.querySelector('#playback-tempo-input') as HTMLInputElement;

    tempoSlider.value = '80';
    tempoSlider.dispatchEvent(new Event('input'));

    expect(setPlaybackRateSpy).toHaveBeenCalledWith(0.8);
  });
});
