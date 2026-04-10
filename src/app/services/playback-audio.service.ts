import { Injectable, effect, inject } from '@angular/core';

import { MidiSong } from '../domain/models/midi-song.model';
import { NoteEvent } from '../domain/models/note-event.model';
import { PlaybackService } from './playback.service';

const MAX_POLYPHONY = 12;
const ATTACK_SECONDS = 0.005;
const RELEASE_SECONDS = 0.03;

interface ActiveVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

interface IndexedNote {
  index: number;
  note: NoteEvent;
}

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

@Injectable({
  providedIn: 'root',
})
export class PlaybackAudioService {
  private readonly playbackService = inject(PlaybackService);

  private readonly activeVoices = new Map<number, ActiveVoice>();
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;

  constructor() {
    effect(() => {
      const song = this.playbackService.song();
      const playbackState = this.playbackService.playbackState();

      this.syncWithTransport(song, playbackState.currentTime, playbackState.isPlaying);
    });
  }

  async prepareForPlayback(): Promise<void> {
    const audioContext = this.ensureAudioContext();

    if (!audioContext || audioContext.state !== 'suspended') {
      return;
    }

    await audioContext.resume();
  }

  private syncWithTransport(song: MidiSong | null, currentTime: number, isPlaying: boolean): void {
    if (!song || !isPlaying) {
      this.stopAllVoices();
      return;
    }

    const audioContext = this.ensureAudioContext();

    if (!audioContext) {
      return;
    }

    const nextActiveNotes = getActiveNotes(song.notes, currentTime);
    const nextActiveIds = new Set(nextActiveNotes.map(({ index }) => index));

    for (const activeId of Array.from(this.activeVoices.keys())) {
      if (!nextActiveIds.has(activeId)) {
        this.stopVoice(activeId, audioContext);
      }
    }

    for (const { index, note } of nextActiveNotes) {
      if (this.activeVoices.has(index)) {
        continue;
      }

      this.startVoice(index, note, audioContext, nextActiveNotes.length);
    }
  }

  private startVoice(
    noteId: number,
    note: NoteEvent,
    audioContext: AudioContext,
    activeNoteCount: number,
  ): void {
    const masterGainNode = this.masterGainNode;
    const frequency = midiToFrequency(note.pitch);

    if (!masterGainNode || !Number.isFinite(frequency) || frequency <= 0) {
      return;
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const voiceGain = (normalizeVelocity(note.velocity) * 0.14) / Math.max(activeNoteCount, 1);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(voiceGain, now + ATTACK_SECONDS);

    oscillator.connect(gain);
    gain.connect(masterGainNode);
    oscillator.start(now);

    this.activeVoices.set(noteId, { oscillator, gain });
  }

  private stopVoice(noteId: number, audioContext: AudioContext): void {
    const voice = this.activeVoices.get(noteId);

    if (!voice) {
      return;
    }

    const now = audioContext.currentTime;
    const currentGain = voice.gain.gain.value;

    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(currentGain, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS);

    voice.oscillator.onended = () => {
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    };

    voice.oscillator.stop(now + RELEASE_SECONDS + 0.005);
    this.activeVoices.delete(noteId);
  }

  private stopAllVoices(): void {
    const audioContext = this.audioContext;

    if (!audioContext) {
      this.activeVoices.clear();
      return;
    }

    for (const noteId of Array.from(this.activeVoices.keys())) {
      this.stopVoice(noteId, audioContext);
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!this.audioContext) {
      const audioContextConstructor =
        window.AudioContext ??
        globalThis.AudioContext ??
        (window as WindowWithWebkitAudioContext).webkitAudioContext;

      if (!audioContextConstructor) {
        return null;
      }

      this.audioContext = new audioContextConstructor();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.setValueAtTime(0.22, this.audioContext.currentTime);
      this.masterGainNode.connect(this.audioContext.destination);
    }

    return this.audioContext;
  }
}

function getActiveNotes(notes: ReadonlyArray<NoteEvent>, currentTime: number): IndexedNote[] {
  if (!Number.isFinite(currentTime)) {
    return [];
  }

  return notes
    .map((note, index) => ({ index, note }))
    .filter(({ note }) => isNoteActive(note, currentTime))
    .sort((left, right) => normalizeVelocity(right.note.velocity) - normalizeVelocity(left.note.velocity))
    .slice(0, MAX_POLYPHONY);
}

function isNoteActive(note: NoteEvent, currentTime: number): boolean {
  if (!Number.isFinite(note.startTime) || !Number.isFinite(note.duration) || note.duration <= 0) {
    return false;
  }

  const noteEnd = note.startTime + note.duration;

  return currentTime >= note.startTime && currentTime < noteEnd;
}

function normalizeVelocity(velocity: number): number {
  if (!Number.isFinite(velocity)) {
    return 0.5;
  }

  const normalized = velocity > 1 ? velocity / 127 : velocity;

  return clamp(normalized, 0.05, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function midiToFrequency(pitch: number): number {
  if (!Number.isFinite(pitch)) {
    return 0;
  }

  return 440 * 2 ** ((pitch - 69) / 12);
}