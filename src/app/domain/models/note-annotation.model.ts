export type NoteHand = 'left' | 'right' | 'unknown';

export type NoteFinger = 1 | 2 | 3 | 4 | 5 | null;

export type NoteAnnotationValueSource = 'file' | 'inferred' | 'unavailable';

export interface NoteAnnotation {
  hand: NoteHand;
  finger: NoteFinger;
  handSource?: NoteAnnotationValueSource;
  fingerSource?: NoteAnnotationValueSource;
}

export type NoteAnnotationMap = Readonly<Record<string, NoteAnnotation>>;

export interface NoteAnnotationSourceCount {
  file: number;
  inferred: number;
  unavailable: number;
}

export interface SongAnalysis {
  noteAnnotations: NoteAnnotationMap;
  noteCount: number;
  annotatedCount: number;
  handSources: NoteAnnotationSourceCount;
  fingerSources: NoteAnnotationSourceCount;
}
