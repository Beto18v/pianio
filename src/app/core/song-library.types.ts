export type SongDifficulty = 'Principiante' | 'Intermedio' | 'Avanzado';

export interface SongLibraryEntry {
  id: string;
  title: string;
  artist: string;
  assetPath: string;
  difficulty: SongDifficulty;
  featured?: boolean;
  tags: readonly string[];
}
