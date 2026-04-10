import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
} from '@angular/core';

import { siteContent } from '../../core/site';
import { MidiInputService } from '../../services/midi-input.service';

@Component({
  selector: 'app-midi-input-monitor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './midi-input-monitor.component.html',
  styleUrl: './midi-input-monitor.component.scss',
})
export class MidiInputMonitorComponent {
  readonly compact = input(false);

  protected readonly site = siteContent;
  protected readonly midiInputService = inject(MidiInputService);
  protected readonly devices = this.midiInputService.devices;
  protected readonly realDevices = computed(() =>
    this.devices().filter((device) => !device.isMock),
  );
  protected readonly connectionState = this.midiInputService.connectionState;
  protected readonly errorMessage = this.midiInputService.errorMessage;
  protected readonly deviceNames = computed(() => this.realDevices().map((device) => device.name));
  protected readonly primaryDeviceName = computed(() => this.deviceNames()[0] ?? null);
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

  constructor() {
    void this.midiInputService.initialize();
  }

  @HostListener('window:focus')
  protected onWindowFocus(): void {
    void this.midiInputService.refresh();
  }
}
