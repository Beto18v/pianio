import { Injectable, computed, inject, signal } from '@angular/core';

import { BUILT_IN_SONG_LIBRARY, SongLibraryEntry } from '../core/song-library';
import { MidiSong } from '../domain/models/midi-song.model';
import { SongParserService } from './song-parser.service';

const STORAGE_KEY = 'pianio-song-library-selection';

@Injectable({
  providedIn: 'root',
})
export class SongLibraryService {
  private readonly songParserService = inject(SongParserService);
  private readonly selectedSongIdState = signal<string>(loadInitialSelection());
  private readonly isLoadingState = signal(false);
  private readonly errorMessageState = signal<string | null>(null);

  readonly entries = BUILT_IN_SONG_LIBRARY;
  readonly selectedSongId = this.selectedSongIdState.asReadonly();
  readonly isLoading = this.isLoadingState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();
  readonly selectedEntry = computed(
    () =>
      this.entries.find((entry) => entry.id === this.selectedSongId()) ??
      this.entries[0] ??
      null,
  );
  readonly featuredEntries = computed(() => this.entries.filter((entry) => entry.featured));

  setSelectedSongId(songId: string): void {
    if (!this.entries.some((entry) => entry.id === songId)) {
      return;
    }

    this.selectedSongIdState.set(songId);
    persistSelection(songId);
  }

  clearError(): void {
    this.errorMessageState.set(null);
  }

  async loadSelectedSong(): Promise<MidiSong | null> {
    const selectedEntry = this.selectedEntry();

    if (!selectedEntry) {
      return null;
    }

    return this.loadSongEntry(selectedEntry);
  }

  async loadSongEntry(entry: SongLibraryEntry): Promise<MidiSong | null> {
    this.isLoadingState.set(true);
    this.errorMessageState.set(null);
    this.setSelectedSongId(entry.id);

    try {
      const response = await fetch(encodeURI(entry.assetPath));

      if (!response.ok) {
        throw new Error(`Asset request failed with status ${response.status}.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileName = getFileNameFromAssetPath(entry.assetPath);
      const file = new File([arrayBuffer], fileName, {
        type: 'audio/midi',
      });

      return this.songParserService.parseFile(file, arrayBuffer);
    } catch (error) {
      console.error('Song library load failed', error);
      this.errorMessageState.set(
        'No fue posible cargar la cancion seleccionada. Intenta otra demo o sube un archivo propio.',
      );
      return null;
    } finally {
      this.isLoadingState.set(false);
    }
  }
}

function loadInitialSelection(): string {
  const defaultSelection = BUILT_IN_SONG_LIBRARY[0]?.id ?? '';

  if (typeof window === 'undefined') {
    return defaultSelection;
  }

  try {
    const storedSelection = window.localStorage.getItem(STORAGE_KEY);

    if (!storedSelection) {
      return defaultSelection;
    }

    return BUILT_IN_SONG_LIBRARY.some((entry) => entry.id === storedSelection)
      ? storedSelection
      : defaultSelection;
  } catch {
    return defaultSelection;
  }
}

function persistSelection(songId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, songId);
  } catch {
    // Persistence is optional; ignore storage failures.
  }
}

function getFileNameFromAssetPath(assetPath: string): string {
  const pathSegments = assetPath.split('/');

  return pathSegments[pathSegments.length - 1] || 'demo.mid';
}
