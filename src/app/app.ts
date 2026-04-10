import { Component, inject } from '@angular/core';

import { MidiSong } from './domain/models/midi-song.model';
import { PlaybackControlsComponent } from './features/playback/playback-controls/playback-controls.component';
import { MidiUploadComponent } from './features/midi-upload/midi-upload.component';
import { NoteRollComponent } from './features/visualization/note-roll/note-roll.component';
import { PianoKeyboardComponent } from './features/visualization/piano-keyboard/piano-keyboard.component';
import { siteContent } from './core/site';
import { PlaybackService } from './services/playback.service';

@Component({
  selector: 'app-root',
  imports: [MidiUploadComponent, PlaybackControlsComponent, PianoKeyboardComponent, NoteRollComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly site = siteContent;
  private readonly playbackService = inject(PlaybackService);
  protected readonly currentSong = this.playbackService.song;
  protected readonly playbackState = this.playbackService.playbackState;

  protected onSongParsed(song: MidiSong | null): void {
    this.playbackService.setSong(song);
  }
}
