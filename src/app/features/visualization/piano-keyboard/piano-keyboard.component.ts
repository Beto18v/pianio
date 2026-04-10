import { Component, input } from '@angular/core';

import { siteContent } from '../../../core/site';
import { MVP_KEYBOARD_LAYOUT } from '../utils/keyboard-layout.util';

@Component({
  selector: 'app-piano-keyboard',
  templateUrl: './piano-keyboard.component.html',
  styleUrl: './piano-keyboard.component.scss',
})
export class PianoKeyboardComponent {
  readonly activePitches = input<ReadonlySet<number>>(new Set<number>());

  protected readonly site = siteContent;
  protected readonly layout = MVP_KEYBOARD_LAYOUT;
  protected readonly whiteKeys = this.layout.keys.filter((key) => !key.isBlack);
  protected readonly blackKeys = this.layout.keys.filter((key) => key.isBlack);
  protected readonly rangeLabel = `${this.whiteKeys[0]?.label} - ${this.whiteKeys.at(-1)?.label}`;
  protected readonly blackKeyCount = this.blackKeys.length;
  protected readonly keyboardAriaLabel = `Teclado de piano de ${this.layout.keyCount} teclas, desde ${this.whiteKeys[0]?.label} hasta ${this.whiteKeys.at(-1)?.label}.`;
  protected readonly labeledWhiteKeyPitches = new Set(
    this.whiteKeys
      .filter(
        (key) =>
          key.pitch === this.layout.startPitch ||
          key.pitch === this.layout.endPitch ||
          key.pitchClass === 0,
      )
      .map((key) => key.pitch),
  );
}
