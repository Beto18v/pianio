import { Injectable } from '@angular/core';
import { Midi } from '@tonejs/midi';

import { MidiSong } from '../domain/models/midi-song.model';
import { NoteEvent } from '../domain/models/note-event.model';

@Injectable({
  providedIn: 'root',
})
export class MidiParserService {
  parse(arrayBuffer: ArrayBuffer, fileName: string): MidiSong {
    try {
      const midi = new Midi(arrayBuffer);
      const notes = midi.tracks
        .flatMap((track, trackIndex) =>
          track.notes.map<NoteEvent>((note) => ({
            pitch: note.midi,
            velocity: note.velocity,
            startTime: note.time,
            duration: note.duration,
            track: trackIndex,
          })),
        )
        .sort((left, right) => left.startTime - right.startTime || left.pitch - right.pitch);

      return {
        fileName,
        notes,
        duration: midi.duration,
        tempoBpm: midi.header.tempos[0]?.bpm ?? null,
        ppq: midi.header.ppq,
        trackCount: midi.tracks.length,
      };
    } catch (error) {
      throw new Error('Could not parse the selected MIDI file.', { cause: error });
    }
  }
}
