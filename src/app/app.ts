import { Component, signal } from '@angular/core';

import { MidiSong } from './domain/models/midi-song.model';
import { MidiUploadComponent } from './features/midi-upload/midi-upload.component';
import { NoteRollComponent } from './features/visualization/note-roll/note-roll.component';
import { PianoKeyboardComponent } from './features/visualization/piano-keyboard/piano-keyboard.component';
import { siteContent } from './core/site';

@Component({
  selector: 'app-root',
  imports: [MidiUploadComponent, PianoKeyboardComponent, NoteRollComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly site = siteContent;
  protected readonly currentSong = signal<MidiSong | null>(null);

  protected onSongParsed(song: MidiSong | null): void {
    this.currentSong.set(song);
  }
}
