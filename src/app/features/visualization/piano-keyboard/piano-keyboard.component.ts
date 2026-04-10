import { Component, computed, input } from '@angular/core';

import { KeyboardLayout } from '../models/keyboard-layout.model';
import { MVP_KEYBOARD_LAYOUT } from '../utils/keyboard-layout.util';

@Component({
  selector: 'app-piano-keyboard',
  templateUrl: './piano-keyboard.component.html',
  styleUrl: './piano-keyboard.component.scss',
})
export class PianoKeyboardComponent {
  readonly layout = input<KeyboardLayout>(MVP_KEYBOARD_LAYOUT);
  readonly activePitches = input<ReadonlySet<number>>(new Set<number>());

  protected readonly whiteKeys = computed(() => this.layout().keys.filter((key) => !key.isBlack));
  protected readonly blackKeys = computed(() => this.layout().keys.filter((key) => key.isBlack));
  protected readonly rangeLabel = computed(() => {
    const layout = this.layout();
    const firstKey = layout.keys[0];
    const lastKey = layout.keys.at(-1);

    return `${firstKey?.label ?? ''} - ${lastKey?.label ?? ''}`;
  });
  protected readonly keyboardAriaLabel = computed(() => {
    const layout = this.layout();
    const firstKey = layout.keys[0];
    const lastKey = layout.keys.at(-1);

    return `Teclado de piano de ${layout.keyCount} teclas, desde ${firstKey?.label} hasta ${lastKey?.label}.`;
  });
  protected readonly labeledWhiteKeyPitches = computed(
    () =>
      new Set(
        this.whiteKeys()
          .filter((key) => {
            const layout = this.layout();

            return (
              key.pitch === layout.startPitch ||
              key.pitch === layout.endPitch ||
              key.pitchClass === 0
            );
          })
          .map((key) => key.pitch),
      ),
  );

  protected getKeyStyle(key: { leftOffsetUnits: number; widthUnits: number }): {
    left: string;
    width: string;
  } {
    const layout = this.layout();

    return {
      left: `${(key.leftOffsetUnits / layout.totalWidthUnits) * 100}%`,
      width: `${(key.widthUnits / layout.totalWidthUnits) * 100}%`,
    };
  }
}
