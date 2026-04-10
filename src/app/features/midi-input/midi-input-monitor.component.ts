import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { siteContent } from '../../core/site';
import { MidiInputService } from '../../services/midi-input.service';

@Component({
  selector: 'app-midi-input-monitor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './midi-input-monitor.component.html',
  styleUrl: './midi-input-monitor.component.scss',
})
export class MidiInputMonitorComponent {
  protected readonly site = siteContent;
  protected readonly midiInputService = inject(MidiInputService);
  protected readonly devices = this.midiInputService.devices;
  protected readonly connectionState = this.midiInputService.connectionState;
  protected readonly lastEvent = this.midiInputService.lastEvent;
  protected readonly errorMessage = this.midiInputService.errorMessage;
  protected readonly isMockMode = this.midiInputService.isMockMode;
  protected readonly statusLabel = computed(() => {
    const state = this.connectionState();

    if (state === 'ready') {
      return this.site.midiInput.states.ready;
    }

    if (state === 'mock') {
      return this.site.midiInput.states.mock;
    }

    return this.site.midiInput.states.idle;
  });
  protected readonly formattedEvent = computed(() => {
    const midiEvent = this.lastEvent();

    if (!midiEvent) {
      return null;
    }

    return {
      ...midiEvent,
      noteLabel: toNoteLabel(midiEvent.pitch),
      typeLabel:
        midiEvent.type === 'noteOn'
          ? this.site.midiInput.eventTypes.noteOn
          : this.site.midiInput.eventTypes.noteOff,
    };
  });

  constructor() {
    void this.midiInputService.initialize();
  }

  protected refreshDevices(): void {
    void this.midiInputService.refresh();
  }

  protected triggerMockNote(): void {
    this.midiInputService.triggerMockNote();
  }
}

function toNoteLabel(pitch: number): string {
  if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127) {
    return `${pitch}`;
  }

  const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(pitch / 12) - 1;
  const name = pitchNames[pitch % 12] ?? 'N';

  return `${name}${octave}`;
}
