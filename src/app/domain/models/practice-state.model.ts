import { UserPlayedNote } from './user-played-note.model';

export interface PracticeState {
  currentTime: number;
  expectedPitches: ReadonlyArray<number>;
  activeInputPitches: ReadonlyArray<number>;
  isMatch: boolean;
  lastPlayedNote: UserPlayedNote | null;
}
