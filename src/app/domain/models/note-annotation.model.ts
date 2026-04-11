export type NoteHand = 'left' | 'right' | 'unknown';

export type NoteFinger = 1 | 2 | 3 | 4 | 5 | null;

export interface NoteAnnotation {
  hand: NoteHand;
  finger: NoteFinger;
}

export type NoteAnnotationMap = Readonly<Record<string, NoteAnnotation>>;

export interface SongAnalysis {
  noteAnnotations: NoteAnnotationMap;
  noteCount: number;
  annotatedCount: number;
}
