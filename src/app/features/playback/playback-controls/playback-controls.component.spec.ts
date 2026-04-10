import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { PlaybackService } from '../../../services/playback.service';
import { PlaybackControlsComponent } from './playback-controls.component';

describe('PlaybackControlsComponent', () => {
  let playbackService: PlaybackService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaybackControlsComponent],
    }).compileComponents();

    playbackService = TestBed.inject(PlaybackService);
  });

  it('renders an idle state when there is no loaded song', () => {
    const fixture = TestBed.createComponent(PlaybackControlsComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain(
      'Carga un archivo MIDI para habilitar el transporte base.',
    );
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

    expect(compiled.textContent).toContain('Controles de reproduccion');
    expect(compiled.textContent).toContain('3 s');
    expect(seekSpy).toHaveBeenCalledWith(1.25);
  });
});
