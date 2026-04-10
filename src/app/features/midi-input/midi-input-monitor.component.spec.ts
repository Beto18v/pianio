import { TestBed } from '@angular/core/testing';

import { MidiInputMonitorComponent } from './midi-input-monitor.component';

describe('MidiInputMonitorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MidiInputMonitorComponent],
    }).compileComponents();
  });

  it('shows mock mode by default and allows simulating note events', async () => {
    const fixture = TestBed.createComponent(MidiInputMonitorComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const simulateButton = compiled.querySelector(
      '#midi-input-simulate-button',
    ) as HTMLButtonElement | null;

    expect(compiled.textContent).toContain('Entrada MIDI en vivo');
    expect(compiled.textContent).toContain('Modo simulado');
    expect(simulateButton).not.toBeNull();

    simulateButton?.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Note On');
  });
});
