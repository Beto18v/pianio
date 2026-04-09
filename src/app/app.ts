import { Component } from '@angular/core';

import { MidiUploadComponent } from './features/midi-upload/midi-upload.component';
import { siteContent } from './core/site';

@Component({
  selector: 'app-root',
  imports: [MidiUploadComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly site = siteContent;
}
