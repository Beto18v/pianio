import { UserPlayedNote } from './user-played-note.model';

export type PracticeWaitModeStatus = 'disabled' | 'idle' | 'waiting' | 'advancing';

export interface PracticeState {
  currentTime: number;
  expectedPitches: ReadonlyArray<number>;
  activeInputPitches: ReadonlyArray<number>;
  matchedPitches: ReadonlyArray<number>;
  missingPitches: ReadonlyArray<number>;
  extraInputPitches: ReadonlyArray<number>;
  isMatch: boolean;
  isPracticeModeEnabled: boolean;
  waitModeStatus: PracticeWaitModeStatus;
  isWaitingForMatch: boolean;
  lastPlayedNote: UserPlayedNote | null;
}
