import { Injectable, effect, inject, signal } from '@angular/core';

import { siteContent } from '../core/site';
import { MidiSong } from '../domain/models/midi-song.model';
import { NoteAnnotationMap } from '../domain/models/note-annotation.model';
import { NoteEvent } from '../domain/models/note-event.model';
import { createNoteKey } from '../domain/utils/note-key.util';
import { BASE_POLYPHONY_CAP, FrameBudgetService } from './frame-budget.service';
import { MAX_PLAYBACK_RATE, MIN_PLAYBACK_RATE, PlaybackService } from './playback.service';
import { HandMode, PlayerSettingsService } from './player-settings.service';
import { SongAnalysisService } from './song-analysis.service';

const LOOKAHEAD_SECONDS = 0.12;
const SCHEDULE_LEAD_SECONDS = 0.003;
const FORWARD_RESET_THRESHOLD_SECONDS = 0.55;
const BACKWARD_RESET_THRESHOLD_SECONDS = -0.03;
const DEFAULT_RELEASE_SECONDS = 0.05;
const DEFAULT_MASTER_VOLUME = 0.68;
const playbackCopy = siteContent.playback;

export type InstrumentPresetId = 'acoustic-grand' | 'bright-grand' | 'electric-piano' | 'warm-pad';

export const INSTRUMENT_PRESET_OPTIONS: ReadonlyArray<{
  id: InstrumentPresetId;
  label: string;
}> = [
  { id: 'acoustic-grand', label: playbackCopy.settings.instrumentPresets.acousticGrand },
  { id: 'bright-grand', label: playbackCopy.settings.instrumentPresets.brightGrand },
  { id: 'electric-piano', label: playbackCopy.settings.instrumentPresets.electricPiano },
  { id: 'warm-pad', label: playbackCopy.settings.instrumentPresets.warmPad },
] as const;

interface InstrumentPreset {
  id: InstrumentPresetId;
  label: string;
  oscillatorType: OscillatorType;
  harmonics: ReadonlyArray<number> | null;
  voiceGain: number;
  attackSeconds: number;
  decaySeconds: number;
  sustainLevel: number;
  releaseSeconds: number;
  filterBaseHz: number;
  filterVelocityHz: number;
  filterFrequencyMultiplier: number;
  filterMinHz: number;
  filterMaxHz: number;
}

const DEFAULT_INSTRUMENT_PRESET_ID: InstrumentPresetId = 'acoustic-grand';

const INSTRUMENT_PRESETS: Readonly<Record<InstrumentPresetId, InstrumentPreset>> = {
  'acoustic-grand': {
    id: 'acoustic-grand',
    label: playbackCopy.settings.instrumentPresets.acousticGrand,
    oscillatorType: 'triangle',
    harmonics: [0.75, 0.3, 0.16, 0.09, 0.06, 0.04, 0.028, 0.02, 0.014, 0.01],
    voiceGain: 0.14,
    attackSeconds: 0.008,
    decaySeconds: 0.038,
    sustainLevel: 0.66,
    releaseSeconds: 0.05,
    filterBaseHz: 850,
    filterVelocityHz: 3200,
    filterFrequencyMultiplier: 1.2,
    filterMinHz: 650,
    filterMaxHz: 6800,
  },
  'bright-grand': {
    id: 'bright-grand',
    label: playbackCopy.settings.instrumentPresets.brightGrand,
    oscillatorType: 'triangle',
    harmonics: [0.92, 0.54, 0.28, 0.16, 0.11, 0.08, 0.05, 0.032, 0.018],
    voiceGain: 0.13,
    attackSeconds: 0.006,
    decaySeconds: 0.032,
    sustainLevel: 0.58,
    releaseSeconds: 0.045,
    filterBaseHz: 1180,
    filterVelocityHz: 3900,
    filterFrequencyMultiplier: 1.45,
    filterMinHz: 880,
    filterMaxHz: 9200,
  },
  'electric-piano': {
    id: 'electric-piano',
    label: playbackCopy.settings.instrumentPresets.electricPiano,
    oscillatorType: 'sine',
    harmonics: [0.76, 0.18, 0.08, 0.02],
    voiceGain: 0.16,
    attackSeconds: 0.01,
    decaySeconds: 0.07,
    sustainLevel: 0.72,
    releaseSeconds: 0.1,
    filterBaseHz: 1420,
    filterVelocityHz: 2100,
    filterFrequencyMultiplier: 0.88,
    filterMinHz: 900,
    filterMaxHz: 5200,
  },
  'warm-pad': {
    id: 'warm-pad',
    label: playbackCopy.settings.instrumentPresets.warmPad,
    oscillatorType: 'triangle',
    harmonics: [0.56, 0.24, 0.1, 0.05, 0.02],
    voiceGain: 0.12,
    attackSeconds: 0.03,
    decaySeconds: 0.12,
    sustainLevel: 0.8,
    releaseSeconds: 0.18,
    filterBaseHz: 980,
    filterVelocityHz: 1500,
    filterFrequencyMultiplier: 0.62,
    filterMinHz: 700,
    filterMaxHz: 4200,
  },
} as const;

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
  private readonly songAnalysisService = inject(SongAnalysisService);
  private readonly playerSettingsService = inject(PlayerSettingsService);
  private readonly selectedPresetIdState = signal<InstrumentPresetId>(DEFAULT_INSTRUMENT_PRESET_ID);
  private readonly masterVolumeState = signal(DEFAULT_MASTER_VOLUME);

  readonly instrumentPresetOptions = INSTRUMENT_PRESET_OPTIONS;
  readonly selectedPresetId = this.selectedPresetIdState.asReadonly();
  readonly masterVolume = this.masterVolumeState.asReadonly();

  private readonly activeVoices = new Map<number, ActiveVoice>();
  private scheduledWindowVoices: ScheduledWindowVoice[] = [];
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private masterCompressorNode: DynamicsCompressorNode | null = null;
  private readonly waveCache = new Map<InstrumentPresetId, PeriodicWave>();
  private scheduledSong: MidiSong | null = null;
  private songCursor = 0;
  private scheduledThroughTime = 0;
  private wasPlaying = false;
  private lastTransportTime = 0;
  private songTimeAnchor = 0;
  private audioTimeAnchor = 0;
  private transportPlaybackRate = 1;
  private lastHandMode = this.playerSettingsService.handMode();
  private lastInstrumentPresetId = this.selectedPresetId();
  private analyzedSong: MidiSong | null = null;
  private analyzedNoteAnnotations: NoteAnnotationMap = {};

  constructor() {
    effect(() => {
      const song = this.playbackService.song();
      const playbackState = this.playbackService.playbackState();
      const handMode = this.playerSettingsService.handMode();
      const selectedPresetId = this.selectedPresetId();

      this.syncWithTransport(
        song,
        playbackState.currentTime,
        playbackState.isPlaying,
        playbackState.playbackRate,
        handMode,
        selectedPresetId,
      );
    });
  }

  setSelectedPresetId(presetId: InstrumentPresetId): void {
    if (!INSTRUMENT_PRESET_OPTIONS.some((preset) => preset.id === presetId)) {
      return;
    }

    this.selectedPresetIdState.set(presetId);
  }

  setMasterVolume(nextMasterVolume: number): void {
    const clampedVolume = clamp(nextMasterVolume, 0, 1);

    this.masterVolumeState.set(clampedVolume);

    if (this.masterGainNode && this.audioContext) {
      this.masterGainNode.gain.setTargetAtTime(clampedVolume, this.audioContext.currentTime, 0.02);
    }
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
    handMode: HandMode,
    selectedPresetId: InstrumentPresetId,
  ): void {
    const safePlaybackRate = clampPlaybackRate(playbackRate);

    if (!song) {
      this.stopAllVoices();
      this.resetSchedulerState(null, 0, false, safePlaybackRate);
      this.lastHandMode = handMode;
      this.lastInstrumentPresetId = selectedPresetId;
      this.analyzedSong = null;
      this.analyzedNoteAnnotations = {};
      return;
    }

    const safeCurrentTime = clampSongTime(currentTime, song.duration);
    const songChanged = song !== this.scheduledSong;
    const playbackRateChanged = Math.abs(safePlaybackRate - this.transportPlaybackRate) > 0.0001;
    const handModeChanged = handMode !== this.lastHandMode;
    const presetChanged = selectedPresetId !== this.lastInstrumentPresetId;

    if (!isPlaying) {
      if (this.wasPlaying || songChanged) {
        this.stopAllVoices();
      }

      this.resetSchedulerState(song, safeCurrentTime, false, safePlaybackRate);
      this.lastHandMode = handMode;
      this.lastInstrumentPresetId = selectedPresetId;
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
      handModeChanged ||
      presetChanged ||
      !this.wasPlaying ||
      hasTransportJump(this.lastTransportTime, safeCurrentTime);

    if (needsRehydrate) {
      this.stopAllVoices();
      this.resetSchedulerState(song, safeCurrentTime, true, safePlaybackRate);
      this.rehydrateActiveNotes(song, safeCurrentTime, audioContext, handMode);
    }

    this.scheduleLookahead(song, safeCurrentTime, audioContext, handMode);
    this.wasPlaying = true;
    this.lastTransportTime = safeCurrentTime;
    this.scheduledSong = song;
    this.lastHandMode = handMode;
    this.lastInstrumentPresetId = selectedPresetId;
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
    handMode: HandMode,
  ): void {
    const polyphonyCap = this.resolvePolyphonyCap();
    const activeNotes = song.notes
      .map((note, index) => ({ index, note }))
      .filter(
        ({ note }) =>
          this.shouldPlayNote(song, note, handMode) &&
          note.startTime < currentTime &&
          isNoteActive(note, currentTime),
      )
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

  private scheduleLookahead(
    song: MidiSong,
    currentTime: number,
    audioContext: AudioContext,
    handMode: HandMode,
  ): void {
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

      if (!this.shouldPlayNote(song, note, handMode)) {
        continue;
      }

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

    const instrumentPreset = getInstrumentPreset(this.selectedPresetId());
    const oscillator = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const velocityGain = velocityToGain(note.velocity);
    const polyphonyCompensation = 1 / Math.sqrt(Math.max(activeNoteCount, 1));
    const voicePeakGain = velocityGain * instrumentPreset.voiceGain * polyphonyCompensation;
    const voiceSustainGain = voicePeakGain * instrumentPreset.sustainLevel;
    const filterCutoff = clamp(
      instrumentPreset.filterBaseHz +
        velocityGain * instrumentPreset.filterVelocityHz +
        frequency * instrumentPreset.filterFrequencyMultiplier,
      instrumentPreset.filterMinHz,
      instrumentPreset.filterMaxHz,
    );
    const presetWave = this.resolvePresetWave(audioContext, instrumentPreset);

    if (presetWave) {
      oscillator.setPeriodicWave(presetWave);
    } else {
      oscillator.type = instrumentPreset.oscillatorType;
    }

    oscillator.frequency.setValueAtTime(frequency, startTime);
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(0.9, startTime);
    filter.frequency.setValueAtTime(filterCutoff, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(voicePeakGain, startTime + instrumentPreset.attackSeconds);
    gain.gain.linearRampToValueAtTime(
      voiceSustainGain,
      startTime + instrumentPreset.attackSeconds + instrumentPreset.decaySeconds,
    );
    gain.gain.setValueAtTime(voiceSustainGain, noteOffTime);
    gain.gain.linearRampToValueAtTime(0.0001, noteOffTime + instrumentPreset.releaseSeconds);

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
    oscillator.stop(noteOffTime + instrumentPreset.releaseSeconds + 0.005);

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
    voice.gain.gain.linearRampToValueAtTime(0.0001, releaseStartTime + DEFAULT_RELEASE_SECONDS);

    voice.oscillator.stop(releaseStartTime + DEFAULT_RELEASE_SECONDS + 0.005);
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

      this.masterGainNode.gain.setValueAtTime(this.masterVolume(), this.audioContext.currentTime);
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

  private shouldPlayNote(song: MidiSong, note: NoteEvent, handMode: HandMode): boolean {
    if (handMode === 'both') {
      return true;
    }

    const noteAnnotation = this.getNoteAnnotations(song)[createNoteKey(note)];

    return noteAnnotation?.hand === handMode;
  }

  private getNoteAnnotations(song: MidiSong): NoteAnnotationMap {
    if (song !== this.analyzedSong) {
      this.analyzedSong = song;
      this.analyzedNoteAnnotations = this.songAnalysisService.analyze(song).noteAnnotations;
    }

    return this.analyzedNoteAnnotations;
  }

  private resolvePresetWave(
    audioContext: AudioContext,
    instrumentPreset: InstrumentPreset,
  ): PeriodicWave | null {
    if (!instrumentPreset.harmonics || instrumentPreset.harmonics.length === 0) {
      return null;
    }

    const cachedWave = this.waveCache.get(instrumentPreset.id);

    if (cachedWave) {
      return cachedWave;
    }

    const periodicWave = createWaveFromHarmonics(audioContext, instrumentPreset.harmonics);
    this.waveCache.set(instrumentPreset.id, periodicWave);
    return periodicWave;
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

function createWaveFromHarmonics(
  audioContext: AudioContext,
  harmonics: ReadonlyArray<number>,
): PeriodicWave {
  const real = new Float32Array([0, ...harmonics]);
  const imag = new Float32Array(real.length);

  return audioContext.createPeriodicWave(real, imag, { disableNormalization: false });
}

function getInstrumentPreset(presetId: InstrumentPresetId): InstrumentPreset {
  return INSTRUMENT_PRESETS[presetId] ?? INSTRUMENT_PRESETS[DEFAULT_INSTRUMENT_PRESET_ID];
}
