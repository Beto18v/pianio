import { TestBed } from '@angular/core/testing';

import { PianoKeyboardComponent } from './piano-keyboard.component';

describe('PianoKeyboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PianoKeyboardComponent],
    }).compileComponents();
  });

  it('renders the fixed MVP keyboard layout', () => {
    const fixture = TestBed.createComponent(PianoKeyboardComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const whiteKeys = compiled.querySelectorAll('.keyboard-panel__key--white');
    const blackKeys = compiled.querySelectorAll('.keyboard-panel__key--black');
    const keyboard = compiled.querySelector('.keyboard-panel__keyboard');

    expect(compiled.textContent).toContain('Teclado de referencia');
    expect(compiled.textContent).toContain('A0 - C8');
    expect(compiled.textContent).toContain('88');
    expect(whiteKeys).toHaveLength(52);
    expect(blackKeys).toHaveLength(36);
    expect(keyboard?.getAttribute('aria-label')).toContain('88 teclas');
  });

  it('highlights active white and black keys from live MIDI input state', async () => {
    const fixture = TestBed.createComponent(PianoKeyboardComponent);
    fixture.componentRef.setInput('activePitches', new Set([60, 61]));
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const c4 = compiled.querySelector('.keyboard-panel__key--white[data-pitch="60"]');
    const cSharp4 = compiled.querySelector('.keyboard-panel__key--black[data-pitch="61"]');

    expect(c4?.classList.contains('keyboard-panel__key--active-white')).toBe(true);
    expect(cSharp4?.classList.contains('keyboard-panel__key--active-black')).toBe(true);
  });
});
