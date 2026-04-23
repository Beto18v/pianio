import { TestBed } from '@angular/core/testing';

import { siteContent } from '../../core/site';
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

    expect(compiled.textContent).not.toContain(siteContent.midiInput.fields.connectedDevices);
    expect(compiled.textContent).toContain(siteContent.midiInput.states.mock);
    expect(compiled.textContent).toContain(siteContent.midiInput.errors.webMidiNotAvailable);
    expect(compiled.querySelector('button')).toBeNull();
  });
});
