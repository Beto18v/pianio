import { DecimalPipe } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroQuestionMarkCircle } from '@ng-icons/heroicons/outline';

import { siteContent } from '../../core/site';
import { MidiSong } from '../../domain/models/midi-song.model';
import { MidiParserService } from '../../services/midi-parser.service';

@Component({
  selector: 'app-midi-upload',
  imports: [DecimalPipe, NgIconComponent],
  viewProviders: [provideIcons({ heroQuestionMarkCircle })],
  templateUrl: './midi-upload.component.html',
  styleUrl: './midi-upload.component.scss',
})
export class MidiUploadComponent {
  readonly songParsed = output<MidiSong | null>();

  protected readonly site = siteContent;
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly song = signal<MidiSong | null>(null);
  protected readonly selectedFileName = signal<string | null>(null);

  private readonly midiParserService = inject(MidiParserService);

  protected openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);

    if (!file) {
      return;
    }

    this.selectedFileName.set(file.name);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.song.set(null);
    this.songParsed.emit(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const song = this.midiParserService.parse(arrayBuffer, file.name);

      this.song.set(song);
      this.songParsed.emit(song);
      console.info('Parsed MIDI song', song);
      console.table(song.notes.slice(0, 10));
    } catch (error) {
      console.error('MIDI upload failed', error);
      this.errorMessage.set(this.site.upload.errorState);
    } finally {
      this.isLoading.set(false);

      if (input) {
        input.value = '';
      }
    }
  }
}
