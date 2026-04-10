import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { MidiSong } from '../../../domain/models/midi-song.model';
import { createSongNoteIndex } from '../../../domain/utils/song-note-index.util';
import { KeyboardLayout } from '../models/keyboard-layout.model';
import { MVP_KEYBOARD_LAYOUT } from '../utils/keyboard-layout.util';
import { DEFAULT_NOTE_RAIN_LAYOUT_CONFIG, createNoteRainLayout } from '../utils/note-rain.util';

@Component({
  selector: 'app-note-rain',
  templateUrl: './note-rain.component.html',
  styleUrl: './note-rain.component.scss',
})
export class NoteRainComponent implements AfterViewInit {
  readonly song = input<MidiSong | null>(null);
  readonly currentTime = input(0);
  readonly keyboardLayout = input<KeyboardLayout>(MVP_KEYBOARD_LAYOUT);

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewportHeightState = signal(DEFAULT_NOTE_RAIN_LAYOUT_CONFIG.viewportHeightPx);
  private readonly songIndex = computed(() => {
    const song = this.song();

    return song ? createSongNoteIndex(song.notes) : null;
  });

  protected readonly layout = computed(() => {
    const song = this.song();

    if (!song) {
      return null;
    }

    return createNoteRainLayout(
      song,
      this.currentTime(),
      {
        ...DEFAULT_NOTE_RAIN_LAYOUT_CONFIG,
        viewportHeightPx: this.viewportHeightState(),
      },
      this.keyboardLayout(),
      this.songIndex(),
    );
  });
  protected readonly accessibleLabel = computed(() => {
    const song = this.song();
    const layout = this.layout();

    if (!song || !layout) {
      return null;
    }

    return `Lluvia de notas para ${song.fileName} con ${layout.notes.length} notas visibles.`;
  });

  ngAfterViewInit(): void {
    const element = this.hostElement.nativeElement;
    const updateViewportHeight = (): void => {
      this.viewportHeightState.set(Math.max(element.clientHeight, 240));
    };

    updateViewportHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateViewportHeight();
    });

    resizeObserver.observe(element);
    this.destroyRef.onDestroy(() => {
      resizeObserver.disconnect();
    });
  }
}
