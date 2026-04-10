import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { siteContent } from '../../../core/site';
import { MidiSong } from '../../../domain/models/midi-song.model';
import { NoteRollLayout } from '../models/note-roll-layout.model';
import { KeyboardKey } from '../models/keyboard-key.model';
import { MVP_KEYBOARD_LAYOUT } from '../utils/keyboard-layout.util';
import { createNoteRollLayout } from '../utils/note-position.util';

@Component({
  selector: 'app-note-roll',
  imports: [DecimalPipe],
  templateUrl: './note-roll.component.html',
  styleUrl: './note-roll.component.scss',
})
export class NoteRollComponent {
  readonly song = input<MidiSong | null>(null);

  protected readonly site = siteContent;
  protected readonly keyboardLayout = MVP_KEYBOARD_LAYOUT;
  protected readonly laneKeys = this.keyboardLayout.keys;
  protected readonly noteRollLayout = computed<NoteRollLayout | null>(() => {
    const song = this.song();

    return song ? createNoteRollLayout(song, undefined, this.keyboardLayout) : null;
  });
  protected readonly visibleNotes = computed(() => this.noteRollLayout()?.notes ?? []);
  protected readonly rollAriaLabel = computed(() => {
    const song = this.song();
    const layout = this.noteRollLayout();

    if (!song || !layout) {
      return null;
    }

    return `Mapa de notas para ${song.fileName} con ${layout.notes.length} bloques visibles.`;
  });

  protected getHorizontalStyle(key: KeyboardKey): { left: string; width: string } {
    return {
      left: `${(key.leftOffsetUnits / this.keyboardLayout.totalWidthUnits) * 100}%`,
      width: `${(key.widthUnits / this.keyboardLayout.totalWidthUnits) * 100}%`,
    };
  }
}
