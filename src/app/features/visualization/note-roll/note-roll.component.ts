import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { siteContent } from '../../../core/site';
import { MidiSong } from '../../../domain/models/midi-song.model';
import { NoteRollLayout } from '../models/note-roll-layout.model';
import { PositionedNote } from '../models/positioned-note.model';
import { KeyboardKey } from '../models/keyboard-key.model';
import { MVP_KEYBOARD_LAYOUT } from '../utils/keyboard-layout.util';
import {
  DEFAULT_NOTE_ROLL_LAYOUT_CONFIG,
  createNoteRollLayout,
} from '../utils/note-position.util';

@Component({
  selector: 'app-note-roll',
  imports: [DecimalPipe],
  templateUrl: './note-roll.component.html',
  styleUrl: './note-roll.component.scss',
})
export class NoteRollComponent {
  readonly song = input<MidiSong | null>(null);
  readonly currentTime = input(0);

  protected readonly site = siteContent;
  protected readonly keyboardLayout = MVP_KEYBOARD_LAYOUT;
  protected readonly noteRollLayoutConfig = DEFAULT_NOTE_ROLL_LAYOUT_CONFIG;
  protected readonly laneKeys = this.keyboardLayout.keys;
  protected readonly noteRollLayout = computed<NoteRollLayout | null>(() => {
    const song = this.song();

    return song ? createNoteRollLayout(song, this.noteRollLayoutConfig, this.keyboardLayout) : null;
  });
  protected readonly clampedCurrentTime = computed(() => {
    const song = this.song();

    if (!song) {
      return 0;
    }

    return clampTime(this.currentTime(), song.duration);
  });
  protected readonly playheadTopPx = computed(() => {
    const layout = this.noteRollLayout();

    if (!layout) {
      return 0;
    }

    const topPx = this.clampedCurrentTime() * this.noteRollLayoutConfig.pixelsPerSecond;

    return Math.min(topPx, layout.totalHeightPx);
  });
  protected readonly visibleNotes = computed(() => this.noteRollLayout()?.notes ?? []);
  protected readonly activeNoteKeys = computed(() => {
    const layout = this.noteRollLayout();

    if (!layout) {
      return new Set<string>();
    }

    const currentTime = this.clampedCurrentTime();
    const activeNotes = layout.notes.filter((note) => {
      const noteEnd = note.startTime + note.duration;

      return currentTime >= note.startTime && currentTime <= noteEnd;
    });

    return new Set(activeNotes.map((note) => this.getNoteKey(note)));
  });
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

  protected isNoteActive(note: PositionedNote): boolean {
    return this.activeNoteKeys().has(this.getNoteKey(note));
  }

  protected getNoteKey(note: Pick<PositionedNote, 'track' | 'startTime' | 'pitch'>): string {
    return `${note.track}-${note.startTime}-${note.pitch}`;
  }
}

function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) {
    return 0;
  }

  return Math.min(Math.max(time, 0), duration);
}
