import { Injectable, effect, inject } from '@angular/core';

import { MidiSong } from '../domain/models/midi-song.model';
import { NoteEvent } from '../domain/models/note-event.model';
import { BASE_POLYPHONY_CAP, FrameBudgetService } from './frame-budget.service';
import { MAX_PLAYBACK_RATE, MIN_PLAYBACK_RATE, PlaybackService } from './playback.service';

const LOOKAHEAD_SECONDS = 0.12;
const SCHEDULE_LEAD_SECONDS = 0.003;
const FORWARD_RESET_THRESHOLD_SECONDS = 0.55;
const BACKWARD_RESET_THRESHOLD_SECONDS = -0.03;
const ATTACK_SECONDS = 0.008;
const DECAY_SECONDS = 0.038;
const SUSTAIN_LEVEL = 0.66;
const RELEASE_SECONDS = 0.05;

interface ActiveVoice {
  oscillator: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  startTime: number;
}

interface ScheduledWindowVoice {
  endTime: number;
}

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

@Injectable({
  providedIn: 'root',
})
export class PlaybackAudioService {
  private readonly playbackService = inject(PlaybackService);
  private readonly frameBudgetService = inject(FrameBudgetService);

  private readonly activeVoices = new Map<number, ActiveVoice>();
  private scheduledWindowVoices: ScheduledWindowVoice[] = [];
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private masterCompressorNode: DynamicsCompressorNode | null = null;
  private pianoWave: PeriodicWave | null = null;
  private scheduledSong: MidiSong | null = null;
  private songCursor = 0;
  private scheduledThroughTime = 0;
  private wasPlaying = false;
  private lastTransportTime = 0;
  private songTimeAnchor = 0;
  private audioTimeAnchor = 0;
  private transportPlaybackRate = 1;

  constructor() {
    effect(() => {
      const song = this.playbackService.song();
      const playbackState = this.playbackService.playbackState();

      this.syncWithTransport(
        song,
        playbackState.currentTime,
        playbackState.isPlaying,
        playbackState.playbackRate,
      );
    });
  }

  async prepareForPlayback(): Promise<void> {
    const audioContext = this.ensureAudioContext();

    if (!audioContext || audioContext.state !== 'suspended') {
      return;
    }

    await audioContext.resume();
  }

  private syncWithTransport(
    song: MidiSong | null,
    currentTime: number,
    isPlaying: boolean,
    playbackRate: number,
  ): void {
    const safePlaybackRate = clampPlaybackRate(playbackRate);

    if (!song) {
      this.stopAllVoices();
      this.resetSchedulerState(null, 0, false, safePlaybackRate);
      return;
    }

    const safeCurrentTime = clampSongTime(currentTime, song.duration);
    const songChanged = song !== this.scheduledSong;
    const playbackRateChanged = Math.abs(safePlaybackRate - this.transportPlaybackRate) > 0.0001;

    if (!isPlaying) {
      if (this.wasPlaying || songChanged) {
        this.stopAllVoices();
      }

      this.resetSchedulerState(song, safeCurrentTime, false, safePlaybackRate);
      return;
    }

    const audioContext = this.ensureAudioContext();

    if (!audioContext) {
      return;
    }

    this.updateAudioAnchor(safeCurrentTime, audioContext.currentTime, safePlaybackRate);

    const needsRehydrate =
      songChanged ||
      playbackRateChanged ||
      !this.wasPlaying ||
      hasTransportJump(this.lastTransportTime, safeCurrentTime);

    if (needsRehydrate) {
      this.stopAllVoices();
      this.resetSchedulerState(song, safeCurrentTime, true, safePlaybackRate);
      this.rehydrateActiveNotes(song, safeCurrentTime, audioContext);
    }

    this.scheduleLookahead(song, safeCurrentTime, audioContext);
    this.wasPlaying = true;
    this.lastTransportTime = safeCurrentTime;
    this.scheduledSong = song;
  }

  private resetSchedulerState(
    song: MidiSong | null,
    currentTime: number,
    isPlaying: boolean,
    playbackRate: number,
  ): void {
    this.scheduledSong = song;
    this.songCursor = song ? findFirstNoteStartingAtOrAfter(song.notes, currentTime) : 0;
    this.scheduledThroughTime = currentTime;
    this.scheduledWindowVoices = [];
    this.wasPlaying = isPlaying;
    this.lastTransportTime = currentTime;
    this.songTimeAnchor = currentTime;
    this.transportPlaybackRate = clampPlaybackRate(playbackRate);

    if (this.audioContext) {
      this.audioTimeAnchor = this.audioContext.currentTime;
    }
  }

  private updateAudioAnchor(songTime: number, audioTime: number, playbackRate: number): void {
    this.songTimeAnchor = songTime;
    this.audioTimeAnchor = audioTime;
    this.transportPlaybackRate = clampPlaybackRate(playbackRate);
  }

  private rehydrateActiveNotes(
    song: MidiSong,
    currentTime: number,
    audioContext: AudioContext,
  ): void {
    const polyphonyCap = this.resolvePolyphonyCap();
    const activeNotes = song.notes
      .map((note, index) => ({ index, note }))
      .filter(({ note }) => note.startTime < currentTime && isNoteActive(note, currentTime))
      .sort(
        (left, right) =>
          normalizeVelocity(right.note.velocity) - normalizeVelocity(left.note.velocity),
      )
      .slice(0, polyphonyCap);

    for (const { note } of activeNotes) {
      this.pruneWindowVoices(note.startTime);
      this.scheduledWindowVoices.push({
        endTime: note.startTime + note.duration,
      });
    }

    for (const { index, note } of activeNotes) {
      this.scheduleVoice(index, note, currentTime, audioContext, activeNotes.length);
    }
  }

  private scheduleLookahead(song: MidiSong, currentTime: number, audioContext: AudioContext): void {
    const polyphonyCap = this.resolvePolyphonyCap();

    if (polyphonyCap < 1) {
      return;
    }

    const windowEndTime = Math.min(song.duration, currentTime + LOOKAHEAD_SECONDS);

    if (windowEndTime <= this.scheduledThroughTime) {
      return;
    }

    while (this.songCursor < song.notes.length) {
      const noteId = this.songCursor;
      const note = song.notes[noteId];

      if (!isSchedulableNote(note)) {
        this.songCursor += 1;
        continue;
      }

      if (note.startTime > windowEndTime) {
        break;
      }

      this.songCursor += 1;

      if (note.startTime + note.duration <= currentTime) {
        continue;
      }

      this.pruneWindowVoices(note.startTime);

      if (this.scheduledWindowVoices.length >= polyphonyCap) {
        continue;
      }

      this.scheduledWindowVoices.push({
        endTime: note.startTime + note.duration,
      });
      this.scheduleVoice(
        noteId,
        note,
        currentTime,
        audioContext,
        Math.min(this.scheduledWindowVoices.length, polyphonyCap),
      );
    }

    this.scheduledThroughTime = windowEndTime;
  }

  private resolvePolyphonyCap(): number {
    const adaptiveCap = this.frameBudgetService.guardrails().polyphonyCap;

    if (!Number.isFinite(adaptiveCap) || adaptiveCap <= 0) {
      return BASE_POLYPHONY_CAP;
    }

    return Math.max(1, Math.floor(adaptiveCap));
  }

  private pruneWindowVoices(songTime: number): void {
    this.scheduledWindowVoices = this.scheduledWindowVoices.filter(
      (voice) => voice.endTime > songTime,
    );
  }

  private mapSongTimeToAudioTime(songTime: number): number {
    return this.audioTimeAnchor + (songTime - this.songTimeAnchor) / this.transportPlaybackRate;
  }

  private scheduleVoice(
    noteId: number,
    note: NoteEvent,
    currentSongTime: number,
    audioContext: AudioContext,
    activeNoteCount: number,
  ): void {
    if (this.activeVoices.has(noteId)) {
      return;
    }

    const noteEndTime = note.startTime + note.duration;

    if (noteEndTime <= currentSongTime) {
      return;
    }

    const noteOnSongTime = Math.max(note.startTime, currentSongTime);
    const noteOnAudioTime = Math.max(
      audioContext.currentTime + SCHEDULE_LEAD_SECONDS,
      this.mapSongTimeToAudioTime(noteOnSongTime),
    );
    const noteOffAudioTime = Math.max(
      noteOnAudioTime + 0.01,
      this.mapSongTimeToAudioTime(noteEndTime),
    );

    this.startVoice(noteId, note, audioContext, noteOnAudioTime, noteOffAudioTime, activeNoteCount);
  }

  private startVoice(
    noteId: number,
    note: NoteEvent,
    audioContext: AudioContext,
    startTime: number,
    noteOffTime: number,
    activeNoteCount: number,
  ): void {
    const masterGainNode = this.masterGainNode;
    const frequency = midiToFrequency(note.pitch);

    if (!masterGainNode || !Number.isFinite(frequency) || frequency <= 0) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const velocityGain = velocityToGain(note.velocity);
    const polyphonyCompensation = 1 / Math.sqrt(Math.max(activeNoteCount, 1));
    const voicePeakGain = velocityGain * 0.14 * polyphonyCompensation;
    const voiceSustainGain = voicePeakGain * SUSTAIN_LEVEL;
    const filterCutoff = clamp(850 + velocityGain * 3200 + frequency * 1.2, 650, 6800);

    if (this.pianoWave) {
      oscillator.setPeriodicWave(this.pianoWave);
    } else {
      oscillator.type = 'triangle';
    }

    oscillator.frequency.setValueAtTime(frequency, startTime);
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(0.9, startTime);
    filter.frequency.setValueAtTime(filterCutoff, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(voicePeakGain, startTime + ATTACK_SECONDS);
    gain.gain.linearRampToValueAtTime(voiceSustainGain, startTime + ATTACK_SECONDS + DECAY_SECONDS);
    gain.gain.setValueAtTime(voiceSustainGain, noteOffTime);
    gain.gain.linearRampToValueAtTime(0.0001, noteOffTime + RELEASE_SECONDS);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.activeVoices.delete(noteId);
    };
    oscillator.start(startTime);
    oscillator.stop(noteOffTime + RELEASE_SECONDS + 0.005);

    this.activeVoices.set(noteId, { oscillator, filter, gain, startTime });
  }

  private stopVoice(noteId: number, audioContext: AudioContext): void {
    const voice = this.activeVoices.get(noteId);

    if (!voice) {
      return;
    }

    const now = audioContext.currentTime;
    const releaseStartTime = Math.max(now, voice.startTime);
    const currentGain = Math.max(voice.gain.gain.value, 0.0001);

    voice.gain.gain.cancelScheduledValues(releaseStartTime);
    voice.gain.gain.setValueAtTime(currentGain, releaseStartTime);
    voice.gain.gain.linearRampToValueAtTime(0.0001, releaseStartTime + RELEASE_SECONDS);

    voice.oscillator.stop(releaseStartTime + RELEASE_SECONDS + 0.005);
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

    this.scheduledWindowVoices = [];
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
      this.masterCompressorNode = this.audioContext.createDynamicsCompressor();
      this.pianoWave = createPianoWave(this.audioContext);

      this.masterGainNode.gain.setValueAtTime(0.68, this.audioContext.currentTime);
      this.masterCompressorNode.threshold.setValueAtTime(-18, this.audioContext.currentTime);
      this.masterCompressorNode.knee.setValueAtTime(12, this.audioContext.currentTime);
      this.masterCompressorNode.ratio.setValueAtTime(8, this.audioContext.currentTime);
      this.masterCompressorNode.attack.setValueAtTime(0.002, this.audioContext.currentTime);
      this.masterCompressorNode.release.setValueAtTime(0.09, this.audioContext.currentTime);

      this.masterGainNode.connect(this.masterCompressorNode);
      this.masterCompressorNode.connect(this.audioContext.destination);
    }

    return this.audioContext;
  }
}

function isSchedulableNote(note: NoteEvent): boolean {
  return Number.isFinite(note.startTime) && Number.isFinite(note.duration) && note.duration > 0;
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

function findFirstNoteStartingAtOrAfter(notes: ReadonlyArray<NoteEvent>, time: number): number {
  let low = 0;
  let high = notes.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (notes[middle].startTime < time) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function hasTransportJump(previousTime: number, currentTime: number): boolean {
  const delta = currentTime - previousTime;

  return delta < BACKWARD_RESET_THRESHOLD_SECONDS || delta > FORWARD_RESET_THRESHOLD_SECONDS;
}

function clampSongTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) {
    return 0;
  }

  return clamp(time, 0, duration);
}

function velocityToGain(velocity: number): number {
  const normalizedVelocity = normalizeVelocity(velocity);

  return Math.pow(normalizedVelocity, 1.45);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampPlaybackRate(playbackRate: number): number {
  return clamp(playbackRate, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);
}

function midiToFrequency(pitch: number): number {
  if (!Number.isFinite(pitch)) {
    return 0;
  }

  return 440 * 2 ** ((pitch - 69) / 12);
}

function createPianoWave(audioContext: AudioContext): PeriodicWave {
  const real = new Float32Array([0, 0.75, 0.3, 0.16, 0.09, 0.06, 0.04, 0.028, 0.02, 0.014, 0.01]);
  const imag = new Float32Array(real.length);

  return audioContext.createPeriodicWave(real, imag, { disableNormalization: false });
}
