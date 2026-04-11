import { Injectable } from '@angular/core';

import {
  NoteAnnotation,
  NoteAnnotationSourceCount,
  NoteAnnotationMap,
  NoteFinger,
  NoteHand,
  SongAnalysis,
} from '../domain/models/note-annotation.model';
import { MidiSong } from '../domain/models/midi-song.model';
import { NoteEvent } from '../domain/models/note-event.model';
import { createNoteKey } from '../domain/utils/note-key.util';

const GROUP_EPSILON_SECONDS = 0.035;
const HAND_PIVOT_PITCH = 60;

interface NoteGroup {
  startTime: number;
  notes: ReadonlyArray<NoteEvent>;
}

const INITIAL_SOURCE_COUNT: NoteAnnotationSourceCount = {
  file: 0,
  inferred: 0,
  unavailable: 0,
};

@Injectable({
  providedIn: 'root',
})
export class SongAnalysisService {
  private readonly analysisCache = new Map<string, SongAnalysis>();

  analyze(song: MidiSong): SongAnalysis {
    const cacheKey = createSongCacheKey(song);
    const cachedAnalysis = this.analysisCache.get(cacheKey);

    if (cachedAnalysis) {
      return cachedAnalysis;
    }

    const analysis = buildSongAnalysis(song);
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }
}

function buildSongAnalysis(song: MidiSong): SongAnalysis {
  const notes = song.notes.filter(isAnalyzableNote);
  const fileNoteAnnotations = song.fileNoteAnnotations ?? {};
  const groupedNotes = createNoteGroups(notes);
  const handByNoteKey = hasMultipleTracks(notes)
    ? assignHandsByTrack(song.notes)
    : assignHandsByPitchSplit(groupedNotes);
  const fingerByNoteKey = assignChordFingers(groupedNotes, handByNoteKey);
  const noteAnnotations: Record<string, NoteAnnotation> = {};
  const handSources: NoteAnnotationSourceCount = { ...INITIAL_SOURCE_COUNT };
  const fingerSources: NoteAnnotationSourceCount = { ...INITIAL_SOURCE_COUNT };

  for (const note of song.notes) {
    const noteKey = createNoteKey(note);
    const fileAnnotation = fileNoteAnnotations[noteKey];
    const inferredHand = handByNoteKey.get(noteKey) ?? 'unknown';
    const inferredFinger = fingerByNoteKey.get(noteKey) ?? null;
    const handSource = resolveHandSource(fileAnnotation, inferredHand);
    const fingerSource = resolveFingerSource(fileAnnotation, inferredFinger);

    handSources[handSource] += 1;
    fingerSources[fingerSource] += 1;

    noteAnnotations[noteKey] = {
      hand:
        handSource === 'file'
          ? (fileAnnotation?.hand ?? 'unknown')
          : handSource === 'inferred'
            ? inferredHand
            : 'unknown',
      finger:
        fingerSource === 'file'
          ? (fileAnnotation?.finger ?? null)
          : fingerSource === 'inferred'
            ? inferredFinger
            : null,
      handSource,
      fingerSource,
    };
  }

  return {
    noteAnnotations,
    noteCount: song.notes.length,
    annotatedCount: Object.values(noteAnnotations).filter(
      (annotation) => annotation.hand !== 'unknown' || annotation.finger !== null,
    ).length,
    handSources,
    fingerSources,
  };
}

function resolveHandSource(
  fileAnnotation: NoteAnnotation | undefined,
  inferredHand: NoteHand,
): NoteAnnotationSourceCountKey {
  if (fileAnnotation?.hand && fileAnnotation.hand !== 'unknown') {
    return 'file';
  }

  if (inferredHand !== 'unknown') {
    return 'inferred';
  }

  return 'unavailable';
}

function resolveFingerSource(
  fileAnnotation: NoteAnnotation | undefined,
  inferredFinger: NoteFinger,
): NoteAnnotationSourceCountKey {
  if (fileAnnotation?.finger !== undefined && fileAnnotation.finger !== null) {
    return 'file';
  }

  if (inferredFinger !== null) {
    return 'inferred';
  }

  return 'unavailable';
}

type NoteAnnotationSourceCountKey = keyof NoteAnnotationSourceCount;

function hasMultipleTracks(notes: ReadonlyArray<NoteEvent>): boolean {
  return new Set(notes.map((note) => note.track)).size > 1;
}

function assignHandsByTrack(notes: ReadonlyArray<NoteEvent>): Map<string, NoteHand> {
  const handByNoteKey = new Map<string, NoteHand>();
  const pitchesByTrack = new Map<number, number[]>();

  for (const note of notes) {
    if (!Number.isFinite(note.pitch) || !Number.isFinite(note.track)) {
      continue;
    }

    const currentTrackPitches = pitchesByTrack.get(note.track) ?? [];
    currentTrackPitches.push(note.pitch);
    pitchesByTrack.set(note.track, currentTrackPitches);
  }

  const trackStats = Array.from(pitchesByTrack.entries())
    .map(([track, pitches]) => ({
      track,
      medianPitch: getMedianPitch(pitches),
    }))
    .sort((left, right) => left.medianPitch - right.medianPitch);

  if (trackStats.length < 2) {
    return handByNoteKey;
  }

  const handByTrack = new Map<number, NoteHand>();

  trackStats.forEach((trackStat, index) => {
    const hand: NoteHand = index < trackStats.length / 2 ? 'left' : 'right';
    handByTrack.set(trackStat.track, hand);
  });

  for (const note of notes) {
    const noteKey = createNoteKey(note);
    handByNoteKey.set(noteKey, handByTrack.get(note.track) ?? 'unknown');
  }

  return handByNoteKey;
}

function assignHandsByPitchSplit(noteGroups: ReadonlyArray<NoteGroup>): Map<string, NoteHand> {
  const handByNoteKey = new Map<string, NoteHand>();

  for (const group of noteGroups) {
    const sortedNotes = [...group.notes].sort((left, right) => left.pitch - right.pitch);

    if (sortedNotes.length === 0) {
      continue;
    }

    if (sortedNotes.length === 1) {
      const note = sortedNotes[0];
      const hand: NoteHand = note.pitch < HAND_PIVOT_PITCH ? 'left' : 'right';
      handByNoteKey.set(createNoteKey(note), hand);
      continue;
    }

    for (const note of sortedNotes) {
      const hand: NoteHand = note.pitch < HAND_PIVOT_PITCH ? 'left' : 'right';
      handByNoteKey.set(createNoteKey(note), hand);
    }
  }

  return handByNoteKey;
}

function assignChordFingers(
  noteGroups: ReadonlyArray<NoteGroup>,
  handByNoteKey: ReadonlyMap<string, NoteHand>,
): Map<string, NoteFinger> {
  const fingerByNoteKey = new Map<string, NoteFinger>();

  for (const group of noteGroups) {
    assignGroupFingering(group.notes, 'left', handByNoteKey, fingerByNoteKey);
    assignGroupFingering(group.notes, 'right', handByNoteKey, fingerByNoteKey);
  }

  return fingerByNoteKey;
}

function assignGroupFingering(
  groupNotes: ReadonlyArray<NoteEvent>,
  hand: Exclude<NoteHand, 'unknown'>,
  handByNoteKey: ReadonlyMap<string, NoteHand>,
  fingerByNoteKey: Map<string, NoteFinger>,
): void {
  const handNotes = groupNotes
    .filter((note) => handByNoteKey.get(createNoteKey(note)) === hand)
    .sort((left, right) => left.pitch - right.pitch || left.track - right.track);

  if (handNotes.length < 2) {
    return;
  }

  const selectedNotes =
    handNotes.length <= 5
      ? handNotes
      : hand === 'right'
        ? handNotes.slice(-5)
        : handNotes.slice(0, 5);
  const fingeringPattern =
    hand === 'right'
      ? getRightHandFingeringPattern(selectedNotes.length)
      : getLeftHandFingeringPattern(selectedNotes.length);

  selectedNotes.forEach((note, index) => {
    fingerByNoteKey.set(createNoteKey(note), fingeringPattern[index] ?? null);
  });
}

function getRightHandFingeringPattern(noteCount: number): ReadonlyArray<Exclude<NoteFinger, null>> {
  switch (noteCount) {
    case 2:
      return [1, 3];
    case 3:
      return [1, 3, 5];
    case 4:
      return [1, 2, 4, 5];
    case 5:
    default:
      return [1, 2, 3, 4, 5];
  }
}

function getLeftHandFingeringPattern(noteCount: number): ReadonlyArray<Exclude<NoteFinger, null>> {
  switch (noteCount) {
    case 2:
      return [5, 3];
    case 3:
      return [5, 3, 1];
    case 4:
      return [5, 4, 2, 1];
    case 5:
    default:
      return [5, 4, 3, 2, 1];
  }
}

function createNoteGroups(notes: ReadonlyArray<NoteEvent>): ReadonlyArray<NoteGroup> {
  const sortedNotes = [...notes].sort(
    (left, right) => left.startTime - right.startTime || left.pitch - right.pitch,
  );

  if (sortedNotes.length === 0) {
    return [];
  }

  const noteGroups: NoteGroup[] = [];
  let currentGroupStart = sortedNotes[0].startTime;
  let currentGroupNotes: NoteEvent[] = [];

  for (const note of sortedNotes) {
    if (Math.abs(note.startTime - currentGroupStart) <= GROUP_EPSILON_SECONDS) {
      currentGroupNotes.push(note);
      continue;
    }

    noteGroups.push({
      startTime: currentGroupStart,
      notes: currentGroupNotes,
    });
    currentGroupStart = note.startTime;
    currentGroupNotes = [note];
  }

  noteGroups.push({
    startTime: currentGroupStart,
    notes: currentGroupNotes,
  });

  return noteGroups;
}

function getMedianPitch(pitches: ReadonlyArray<number>): number {
  const sortedPitches = [...pitches].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedPitches.length / 2);

  if (sortedPitches.length % 2 === 1) {
    return sortedPitches[middleIndex] ?? HAND_PIVOT_PITCH;
  }

  const left = sortedPitches[middleIndex - 1] ?? HAND_PIVOT_PITCH;
  const right = sortedPitches[middleIndex] ?? HAND_PIVOT_PITCH;

  return (left + right) / 2;
}

function isAnalyzableNote(note: NoteEvent): boolean {
  return (
    Number.isFinite(note.pitch) &&
    Number.isFinite(note.startTime) &&
    Number.isFinite(note.duration) &&
    note.duration > 0 &&
    Number.isFinite(note.track)
  );
}

function createSongCacheKey(song: MidiSong): string {
  return `${song.fileName}::${song.duration}::${song.notes.length}`;
}
