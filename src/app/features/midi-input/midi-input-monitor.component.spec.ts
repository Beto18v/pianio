import { TestBed } from '@angular/core/testing';

import { MidiInputMonitorComponent } from './midi-input-monitor.component';

describe('MidiInputMonitorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MidiInputMonitorComponent],
    }).compileComponents();
  });

  it('shows a minimal connected-device badge and diagnostic hint when needed', async () => {
    const fixture = TestBed.createComponent(MidiInputMonitorComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Dispositivos');
    expect(compiled.textContent).toContain('Modo simulado');
    expect(compiled.textContent).toContain('Web MIDI API no esta disponible en este navegador.');
    expect(compiled.querySelector('button')).toBeNull();
  });
});
