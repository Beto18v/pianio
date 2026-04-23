import { Injectable, computed, signal } from '@angular/core';

import { NoteHand } from '../domain/models/note-annotation.model';

export type HandMode = 'both' | 'left' | 'right';
export type NoteLabelFormat = 'letters' | 'solfege';

interface PlayerSettingsState {
  handMode: HandMode;
  showNoteLabels: boolean;
  noteLabelFormat: NoteLabelFormat;
}

const STORAGE_KEY = 'pianio-player-settings';

const DEFAULT_PLAYER_SETTINGS: PlayerSettingsState = {
  handMode: 'both',
  showNoteLabels: true,
  noteLabelFormat: 'letters',
};

@Injectable({
  providedIn: 'root',
})
export class PlayerSettingsService {
  private readonly stateState = signal<PlayerSettingsState>(loadInitialPlayerSettings());

  readonly state = this.stateState.asReadonly();
  readonly handMode = computed(() => this.state().handMode);
  readonly showNoteLabels = computed(() => this.state().showNoteLabels);
  readonly noteLabelFormat = computed(() => this.state().noteLabelFormat);

  setHandMode(handMode: HandMode): void {
    this.updateState({ handMode });
  }

  setShowNoteLabels(showNoteLabels: boolean): void {
    this.updateState({ showNoteLabels });
  }

  setNoteLabelFormat(noteLabelFormat: NoteLabelFormat): void {
    this.updateState({ noteLabelFormat });
  }

  matchesHandMode(hand: NoteHand): boolean {
    const handMode = this.handMode();

    if (handMode === 'both') {
      return true;
    }

    return hand === handMode;
  }

  private updateState(partialState: Partial<PlayerSettingsState>): void {
    this.stateState.update((currentState) => {
      const nextState = {
        ...currentState,
        ...partialState,
      };

      persistPlayerSettings(nextState);
      return nextState;
    });
  }
}

function loadInitialPlayerSettings(): PlayerSettingsState {
  if (typeof window === 'undefined') {
    return DEFAULT_PLAYER_SETTINGS;
  }

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return DEFAULT_PLAYER_SETTINGS;
    }

    const parsedState = JSON.parse(rawState) as Partial<PlayerSettingsState>;

    return {
      handMode:
        parsedState.handMode === 'left' ||
        parsedState.handMode === 'right' ||
        parsedState.handMode === 'both'
          ? parsedState.handMode
          : DEFAULT_PLAYER_SETTINGS.handMode,
      showNoteLabels:
        typeof parsedState.showNoteLabels === 'boolean'
          ? parsedState.showNoteLabels
          : DEFAULT_PLAYER_SETTINGS.showNoteLabels,
      noteLabelFormat:
        parsedState.noteLabelFormat === 'letters' || parsedState.noteLabelFormat === 'solfege'
          ? parsedState.noteLabelFormat
          : DEFAULT_PLAYER_SETTINGS.noteLabelFormat,
    };
  } catch {
    return DEFAULT_PLAYER_SETTINGS;
  }
}

function persistPlayerSettings(state: PlayerSettingsState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is optional; ignore storage failures.
  }
}
