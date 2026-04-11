import { Injectable, inject } from '@angular/core';

import { MidiSong } from '../domain/models/midi-song.model';
import { MidiParserService } from './midi-parser.service';
import { MusicXmlParserService } from './musicxml-parser.service';

type SongFileFormat = 'midi' | 'musicxml' | 'mxl' | 'unknown';

@Injectable({
  providedIn: 'root',
})
export class SongParserService {
  private readonly midiParserService = inject(MidiParserService);
  private readonly musicXmlParserService = inject(MusicXmlParserService);

  parseFile(file: File, arrayBuffer: ArrayBuffer): MidiSong {
    const fileFormat = detectSongFileFormat(file.name, file.type, arrayBuffer);

    if (fileFormat === 'midi') {
      return this.midiParserService.parse(arrayBuffer, file.name);
    }

    if (fileFormat === 'musicxml') {
      const xmlContent = decodeArrayBufferAsText(arrayBuffer);

      return this.musicXmlParserService.parse(xmlContent, file.name);
    }

    if (fileFormat === 'mxl') {
      throw new Error('Compressed MusicXML (.mxl) is not supported yet.');
    }

    throw new Error('Unsupported file format. Use MIDI (.mid/.midi) or MusicXML (.xml/.musicxml).');
  }
}

export function detectSongFileFormat(
  fileName: string,
  mimeType: string,
  arrayBuffer: ArrayBuffer,
): SongFileFormat {
  const extension = getFileExtension(fileName);

  if (extension === 'mid' || extension === 'midi') {
    return 'midi';
  }

  if (extension === 'musicxml' || extension === 'xml') {
    return 'musicxml';
  }

  if (extension === 'mxl') {
    return 'mxl';
  }

  const normalizedMimeType = mimeType.trim().toLowerCase();

  if (normalizedMimeType.includes('midi')) {
    return 'midi';
  }

  if (normalizedMimeType.includes('musicxml')) {
    return 'musicxml';
  }

  if (hasMidiHeader(arrayBuffer)) {
    return 'midi';
  }

  if (hasMusicXmlSignature(arrayBuffer)) {
    return 'musicxml';
  }

  return 'unknown';
}

function getFileExtension(fileName: string): string {
  const lowerCaseName = fileName.toLowerCase();
  const extensionStart = lowerCaseName.lastIndexOf('.');

  if (extensionStart < 0 || extensionStart === lowerCaseName.length - 1) {
    return '';
  }

  return lowerCaseName.slice(extensionStart + 1);
}

function hasMidiHeader(arrayBuffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(arrayBuffer);

  if (bytes.length < 4) {
    return false;
  }

  return bytes[0] === 0x4d && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64;
}

function hasMusicXmlSignature(arrayBuffer: ArrayBuffer): boolean {
  const sampleLength = Math.min(arrayBuffer.byteLength, 2048);
  const sampleBytes = new Uint8Array(arrayBuffer, 0, sampleLength);
  const sampleText = new TextDecoder().decode(sampleBytes).toLowerCase();

  return sampleText.includes('<score-partwise') || sampleText.includes('<score-timewise');
}

function decodeArrayBufferAsText(arrayBuffer: ArrayBuffer): string {
  return new TextDecoder().decode(new Uint8Array(arrayBuffer));
}
