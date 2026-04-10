import { TestBed } from '@angular/core/testing';

import { MidiInputMonitorComponent } from './midi-input-monitor.component';

describe('MidiInputMonitorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MidiInputMonitorComponent],
    }).compileComponents();
  });

  it('shows detected devices in compact mode without manual refresh controls', async () => {
    const fixture = TestBed.createComponent(MidiInputMonitorComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const refreshButton = compiled.querySelector('button');

    expect(compiled.textContent).toContain('Dispositivos');
    expect(compiled.textContent).toContain('Teclado virtual');
    expect(compiled.textContent).toContain('Web MIDI API no esta disponible en este navegador.');
    expect(refreshButton).toBeNull();
  });
});
