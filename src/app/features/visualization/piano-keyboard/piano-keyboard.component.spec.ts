import { TestBed } from '@angular/core/testing';

import { PianoKeyboardComponent } from './piano-keyboard.component';
import { createKeyboardLayout } from '../utils/keyboard-layout.util';

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
    const whiteKeys = compiled.querySelectorAll('.stage-keyboard__key--white');
    const blackKeys = compiled.querySelectorAll('.stage-keyboard__key--black');
    const keyboard = compiled.querySelector('.stage-keyboard');

    expect(compiled.textContent).toContain('A0 - C8');
    expect(whiteKeys).toHaveLength(52);
    expect(blackKeys).toHaveLength(36);
    expect(keyboard?.getAttribute('aria-label')).toContain('88 teclas');
  });

  it('renders the calibrated range label when the layout starts on a black key', async () => {
    const fixture = TestBed.createComponent(PianoKeyboardComponent);
    fixture.componentRef.setInput('layout', createKeyboardLayout(61, 72));
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('C#4 - C5');
  });

  it('highlights active white and black keys from live MIDI input state', async () => {
    const fixture = TestBed.createComponent(PianoKeyboardComponent);
    fixture.componentRef.setInput('activePitches', new Set([60, 61]));
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const c4 = compiled.querySelector('.stage-keyboard__key--white[data-pitch="60"]');
    const cSharp4 = compiled.querySelector('.stage-keyboard__key--black[data-pitch="61"]');

    expect(c4?.classList.contains('stage-keyboard__key--active-white')).toBe(true);
    expect(cSharp4?.classList.contains('stage-keyboard__key--active-black')).toBe(true);
  });
});
