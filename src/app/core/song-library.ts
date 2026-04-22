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

export const BUILT_IN_SONG_LIBRARY: ReadonlyArray<SongLibraryEntry> = [
  {
    id: 'the-entertainer',
    title: 'The Entertainer',
    artist: 'Scott Joplin',
    assetPath: '/pianosongs/The Entertainer.mid',
    difficulty: 'Intermedio',
    featured: true,
    tags: ['ragtime', 'ritmo', 'clasico'],
  },
  {
    id: 'rivers-flow-in-you',
    title: 'Rivers Flow In You',
    artist: 'Yiruma',
    assetPath: '/pianosongs/Rivers Flow In You.mid',
    difficulty: 'Intermedio',
    featured: true,
    tags: ['melodico', 'moderno', 'romantico'],
  },
  {
    id: 'hallelujah',
    title: 'Hallelujah',
    artist: 'Leonard Cohen',
    assetPath: '/pianosongs/Hallelujah.mid',
    difficulty: 'Principiante',
    featured: true,
    tags: ['balada', 'acompanamiento', 'popular'],
  },
  {
    id: 'pirates-of-the-caribbean',
    title: 'Pirates of the Caribbean',
    artist: 'Klaus Badelt',
    assetPath: '/pianosongs/Pirates of the Caribbean.mid',
    difficulty: 'Intermedio',
    tags: ['cine', 'energia', 'ritmo'],
  },
  {
    id: 'rondo-alla-turca',
    title: 'Rondo Alla Turca',
    artist: 'W. A. Mozart',
    assetPath: '/pianosongs/Rondo Alla Turca.mid',
    difficulty: 'Avanzado',
    tags: ['clasico', 'velocidad', 'articulacion'],
  },
  {
    id: 'hungarian-dance-no-5',
    title: 'Hungarian Dance No. 5',
    artist: 'Johannes Brahms',
    assetPath: '/pianosongs/Hungarian Dance No.5.mid',
    difficulty: 'Avanzado',
    tags: ['clasico', 'dinamica', 'tecnica'],
  },
  {
    id: 'la-campanella',
    title: 'La Campanella',
    artist: 'Franz Liszt',
    assetPath: '/pianosongs/La Campanella.mid',
    difficulty: 'Avanzado',
    tags: ['virtuosismo', 'saltos', 'tecnica'],
  },
  {
    id: 'rush-e-original',
    title: 'Rush E Original',
    artist: 'Sheet Music Boss',
    assetPath: '/pianosongs/Rush E Original.mid',
    difficulty: 'Avanzado',
    tags: ['reto', 'denso', 'rapido'],
  },
] as const;
