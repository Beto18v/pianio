import { Injectable } from '@angular/core';

import { MidiSong } from '../domain/models/midi-song.model';
import { NoteAnnotation, NoteFinger, NoteHand } from '../domain/models/note-annotation.model';
import { NoteEvent } from '../domain/models/note-event.model';
import { createNoteKey } from '../domain/utils/note-key.util';

const DEFAULT_TEMPO_BPM = 120;
const DEFAULT_VELOCITY = 0.75;

interface VoiceTimeline {
  cursorSeconds: number;
  lastChordStartSeconds: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class MusicXmlParserService {
  parse(xmlContent: string, fileName: string): MidiSong {
    try {
      const xmlDocument = parseMusicXmlDocument(xmlContent);
      const scorePartwise = resolveScorePartwiseRoot(xmlDocument);
      const notes: NoteEvent[] = [];
      const fileNoteAnnotations: Record<string, NoteAnnotation> = {};
      const trackByIdentity = new Map<string, number>();
      let nextTrack = 0;
      let firstTempoBpm: number | null = null;

      const parts = getDirectChildrenByTagName(scorePartwise, 'part');

      parts.forEach((partElement, partIndex) => {
        let divisions = 1;
        let tempoBpm = DEFAULT_TEMPO_BPM;
        const voiceTimelines = new Map<string, VoiceTimeline>();
        const measures = getDirectChildrenByTagName(partElement, 'measure');

        for (const measure of measures) {
          const measureChildren = getDirectChildElements(measure);

          for (const child of measureChildren) {
            const childTagName = child.tagName.toLowerCase();

            if (childTagName === 'attributes') {
              const nextDivisions = readNumericValueFromDirectChild(child, 'divisions');

              if (nextDivisions !== null && nextDivisions > 0) {
                divisions = nextDivisions;
              }

              continue;
            }

            if (childTagName === 'direction') {
              const directionTempo = readTempoFromDirection(child);

              if (directionTempo !== null) {
                tempoBpm = directionTempo;
                firstTempoBpm ??= directionTempo;
              }

              continue;
            }

            if (childTagName === 'sound') {
              const soundTempo = readTempoFromSoundElement(child);

              if (soundTempo !== null) {
                tempoBpm = soundTempo;
                firstTempoBpm ??= soundTempo;
              }

              continue;
            }

            if (childTagName !== 'note') {
              continue;
            }

            const hasGrace = hasDirectChild(child, 'grace');
            const durationDivisions = readNumericValueFromDirectChild(child, 'duration');
            const durationSeconds =
              !hasGrace && durationDivisions !== null && durationDivisions > 0
                ? durationDivisions * resolveSecondsPerDivision(tempoBpm, divisions)
                : 0;

            if (!hasGrace && durationSeconds <= 0) {
              continue;
            }

            const staffNumber = readIntegerValueFromDirectChild(child, 'staff');
            const voiceId =
              readTextFromDirectChild(child, 'voice') ??
              (staffNumber !== null ? `staff-${staffNumber}` : 'voice-1');
            const timeline = getOrCreateVoiceTimeline(voiceTimelines, voiceId);
            const isChord = hasDirectChild(child, 'chord');
            const startTime = isChord
              ? (timeline.lastChordStartSeconds ?? timeline.cursorSeconds)
              : timeline.cursorSeconds;

            if (!isChord) {
              timeline.lastChordStartSeconds = startTime;
              timeline.cursorSeconds = startTime + durationSeconds;
            }

            if (hasDirectChild(child, 'rest') || durationSeconds <= 0) {
              continue;
            }

            const pitch = readMidiPitch(child);

            if (pitch === null) {
              continue;
            }

            const trackIdentity = createTrackIdentity(partIndex, staffNumber, voiceId);
            const track = resolveTrack(trackByIdentity, trackIdentity, () => {
              const resolvedTrack = nextTrack;
              nextTrack += 1;
              return resolvedTrack;
            });
            const note: NoteEvent = {
              pitch,
              velocity: DEFAULT_VELOCITY,
              startTime,
              duration: durationSeconds,
              track,
            };

            notes.push(note);

            const fileHand = resolveFileHand(staffNumber);
            const fileFinger = readFingering(child);

            if (fileHand !== 'unknown' || fileFinger !== null) {
              fileNoteAnnotations[createNoteKey(note)] = {
                hand: fileHand,
                finger: fileFinger,
                handSource: fileHand === 'unknown' ? 'unavailable' : 'file',
                fingerSource: fileFinger === null ? 'unavailable' : 'file',
              };
            }
          }
        }
      });

      notes.sort((left, right) => left.startTime - right.startTime || left.pitch - right.pitch);

      const duration = notes.reduce(
        (maxDuration, note) => Math.max(maxDuration, note.startTime + note.duration),
        0,
      );
      const trackCount = new Set(notes.map((note) => note.track)).size;

      return {
        fileName,
        notes,
        duration,
        tempoBpm: firstTempoBpm,
        ppq: null,
        trackCount,
        sourceFormat: 'musicxml',
        fileNoteAnnotations,
      };
    } catch (error) {
      throw new Error('Could not parse the selected MusicXML file.', { cause: error });
    }
  }
}

function parseMusicXmlDocument(xmlContent: string): XMLDocument {
  if (xmlContent.trim().length === 0) {
    throw new Error('MusicXML content is empty.');
  }

  const parser = new DOMParser();
  const xmlDocument = parser.parseFromString(xmlContent, 'application/xml');

  if (xmlDocument.querySelector('parsererror')) {
    throw new Error('The selected MusicXML file is not valid XML.');
  }

  return xmlDocument;
}

function resolveScorePartwiseRoot(xmlDocument: XMLDocument): Element {
  const root = xmlDocument.documentElement;

  if (root.tagName.toLowerCase() === 'score-partwise') {
    return root;
  }

  if (root.tagName.toLowerCase() === 'score-timewise') {
    throw new Error('MusicXML score-timewise is not supported yet.');
  }

  const scorePartwise = xmlDocument.querySelector('score-partwise');

  if (!scorePartwise) {
    throw new Error('The selected XML file is not a MusicXML score-partwise document.');
  }

  return scorePartwise;
}

function getOrCreateVoiceTimeline(
  timelines: Map<string, VoiceTimeline>,
  voiceId: string,
): VoiceTimeline {
  const existing = timelines.get(voiceId);

  if (existing) {
    return existing;
  }

  const created: VoiceTimeline = {
    cursorSeconds: 0,
    lastChordStartSeconds: null,
  };

  timelines.set(voiceId, created);

  return created;
}

function resolveSecondsPerDivision(tempoBpm: number, divisions: number): number {
  const safeTempo = Number.isFinite(tempoBpm) && tempoBpm > 0 ? tempoBpm : DEFAULT_TEMPO_BPM;
  const safeDivisions = Number.isFinite(divisions) && divisions > 0 ? divisions : 1;

  return 60 / (safeTempo * safeDivisions);
}

function readMidiPitch(noteElement: Element): number | null {
  const pitchElement = getDirectChildByTagName(noteElement, 'pitch');

  if (!pitchElement) {
    return null;
  }

  const step = readTextFromDirectChild(pitchElement, 'step');
  const octave = readIntegerValueFromDirectChild(pitchElement, 'octave');

  if (!step || octave === null) {
    return null;
  }

  const stepSemitone = STEP_TO_SEMITONE[step.toUpperCase()];

  if (stepSemitone === undefined) {
    return null;
  }

  const alter = readNumericValueFromDirectChild(pitchElement, 'alter') ?? 0;
  const midi = Math.round((octave + 1) * 12 + stepSemitone + alter);

  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    return null;
  }

  return midi;
}

function resolveFileHand(staffNumber: number | null): NoteHand {
  if (staffNumber === 1) {
    return 'right';
  }

  if (staffNumber === 2) {
    return 'left';
  }

  return 'unknown';
}

function readFingering(noteElement: Element): Exclude<NoteFinger, null> | null {
  const notations = getDirectChildByTagName(noteElement, 'notations');
  const technical = notations ? getDirectChildByTagName(notations, 'technical') : null;
  const fingering = technical ? getDirectChildByTagName(technical, 'fingering') : null;

  if (!fingering) {
    return null;
  }

  const text = (fingering.textContent ?? '').trim();
  const match = text.match(/[1-5]/);

  if (!match) {
    return null;
  }

  return Number(match[0]) as Exclude<NoteFinger, null>;
}

function readTempoFromDirection(directionElement: Element): number | null {
  const soundElement = getDirectChildByTagName(directionElement, 'sound');
  const tempoFromSound = soundElement ? readTempoFromSoundElement(soundElement) : null;

  if (tempoFromSound !== null) {
    return tempoFromSound;
  }

  const directionType = getDirectChildByTagName(directionElement, 'direction-type');
  const metronome = directionType ? getDirectChildByTagName(directionType, 'metronome') : null;

  return metronome ? readNumericValueFromDirectChild(metronome, 'per-minute') : null;
}

function readTempoFromSoundElement(soundElement: Element): number | null {
  const tempoValue = Number(soundElement.getAttribute('tempo'));

  if (!Number.isFinite(tempoValue) || tempoValue <= 0) {
    return null;
  }

  return tempoValue;
}

function resolveTrack(
  trackByIdentity: Map<string, number>,
  identity: string,
  createTrack: () => number,
): number {
  const existingTrack = trackByIdentity.get(identity);

  if (existingTrack !== undefined) {
    return existingTrack;
  }

  const nextTrack = createTrack();
  trackByIdentity.set(identity, nextTrack);

  return nextTrack;
}

function createTrackIdentity(
  partIndex: number,
  staffNumber: number | null,
  voiceId: string,
): string {
  return `${partIndex}::${staffNumber ?? 'na'}::${voiceId}`;
}

function readTextFromDirectChild(element: Element, tagName: string): string | null {
  const child = getDirectChildByTagName(element, tagName);

  if (!child) {
    return null;
  }

  const text = (child.textContent ?? '').trim();

  return text.length > 0 ? text : null;
}

function readNumericValueFromDirectChild(element: Element, tagName: string): number | null {
  const raw = readTextFromDirectChild(element, tagName);

  if (!raw) {
    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function readIntegerValueFromDirectChild(element: Element, tagName: string): number | null {
  const value = readNumericValueFromDirectChild(element, tagName);

  if (value === null || !Number.isInteger(value)) {
    return null;
  }

  return value;
}

function getDirectChildByTagName(element: Element, tagName: string): Element | null {
  return getDirectChildrenByTagName(element, tagName)[0] ?? null;
}

function hasDirectChild(element: Element, tagName: string): boolean {
  return getDirectChildByTagName(element, tagName) !== null;
}

function getDirectChildrenByTagName(element: Element, tagName: string): Element[] {
  const normalizedTag = tagName.toLowerCase();

  return getDirectChildElements(element).filter(
    (child) => child.tagName.toLowerCase() === normalizedTag,
  );
}

function getDirectChildElements(element: Element): Element[] {
  return Array.from(element.children);
}

const STEP_TO_SEMITONE: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
