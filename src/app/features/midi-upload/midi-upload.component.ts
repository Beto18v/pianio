import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';

import { siteContent } from '../../core/site';
import { MidiSong } from '../../domain/models/midi-song.model';
import { SongAnalysisService } from '../../services/song-analysis.service';
import { SongParserService } from '../../services/song-parser.service';

@Component({
  selector: 'app-midi-upload',
  imports: [DecimalPipe],
  templateUrl: './midi-upload.component.html',
  styleUrl: './midi-upload.component.scss',
})
export class MidiUploadComponent {
  readonly compact = input(false);
  readonly songParsed = output<MidiSong | null>();

  protected readonly site = siteContent;
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly song = signal<MidiSong | null>(null);
  protected readonly selectedFileName = signal<string | null>(null);
  protected readonly songAnalysis = computed(() => {
    const song = this.song();

    return song ? this.songAnalysisService.analyze(song) : null;
  });
  protected readonly sourceFormatLabel = computed(() => {
    const sourceFormat = this.song()?.sourceFormat ?? 'midi';

    return sourceFormat === 'musicxml'
      ? this.site.upload.sourceFormats.musicxml
      : this.site.upload.sourceFormats.midi;
  });
  protected readonly isMusicXmlSong = computed(() => this.song()?.sourceFormat === 'musicxml');
  protected readonly compactAnnotationCoverageLabel = computed(() => {
    if (!this.isMusicXmlSong()) {
      return null;
    }

    const analysis = this.songAnalysis();

    if (!analysis) {
      return this.site.upload.compactSummary.noSong;
    }

    return this.site.upload.compactSummary.annotationCoverage(
      this.sourceFormatLabel(),
      analysis.handSources.file,
      analysis.fingerSources.file,
    );
  });

  private readonly songParserService = inject(SongParserService);
  private readonly songAnalysisService = inject(SongAnalysisService);

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
      const song = this.songParserService.parseFile(file, arrayBuffer);

      this.song.set(song);
      this.songParsed.emit(song);
      console.info('Parsed song', song);
      console.table(song.notes.slice(0, 10));
    } catch (error) {
      console.error('File upload failed', error);
      this.errorMessage.set(this.site.upload.errorState);
    } finally {
      this.isLoading.set(false);

      if (input) {
        input.value = '';
      }
    }
  }
}
