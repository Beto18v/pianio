import { Component, inject } from '@angular/core';

import { MidiSong } from './domain/models/midi-song.model';
import { MidiInputMonitorComponent } from './features/midi-input/midi-input-monitor.component';
import { PlaybackControlsComponent } from './features/playback/playback-controls/playback-controls.component';
import { MidiUploadComponent } from './features/midi-upload/midi-upload.component';
import { NoteRollComponent } from './features/visualization/note-roll/note-roll.component';
import { PianoKeyboardComponent } from './features/visualization/piano-keyboard/piano-keyboard.component';
import { siteContent } from './core/site';
import { MidiInputService } from './services/midi-input.service';
import { PlaybackService } from './services/playback.service';

@Component({
  selector: 'app-root',
  imports: [
    MidiUploadComponent,
    PlaybackControlsComponent,
    MidiInputMonitorComponent,
    PianoKeyboardComponent,
    NoteRollComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly site = siteContent;
  private readonly playbackService = inject(PlaybackService);
  private readonly midiInputService = inject(MidiInputService);
  protected readonly currentSong = this.playbackService.song;
  protected readonly playbackState = this.playbackService.playbackState;
  protected readonly activeInputPitches = this.midiInputService.activePitches;

  protected onSongParsed(song: MidiSong | null): void {
    this.playbackService.setSong(song);
  }
}
