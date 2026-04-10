export const siteContent = {
  appName: 'PianoFlow',
  heading: 'Carga un archivo MIDI y revisa su estructura en pantalla.',
  description:
    'El archivo se procesa en el navegador y se presenta con un resumen tecnico y vistas base para inspeccionar su contenido.',
  scopeItems: [
    'Seleccion local de archivos .mid y .midi',
    'Parsing en frontend con @tonejs/midi',
    'Resumen tecnico para verificacion rapida',
    'Base visual para teclado y notas',
    'Transporte base de playback con estado de tiempo',
  ],
  upload: {
    eyebrow: 'Entrada local',
    heading: 'Archivo MIDI',
    description:
      'Todo el procesamiento se hace en el navegador. Selecciona un archivo para revisar su estructura base.',
    inputLabel: 'Seleccionar archivo MIDI',
    helperText: 'La salida muestra un resumen del archivo y las primeras 10 notas parseadas.',
    idleState: 'Todavia no hay ningun archivo cargado.',
    loadingState: 'Procesando archivo...',
    errorState: 'No fue posible leer o parsear el archivo seleccionado.',
    summaryHeading: 'Resumen parseado',
    notePreviewHeading: 'Primeras notas',
    emptyNotes: 'El archivo no contiene notas utilizables para esta vista.',
    fields: {
      fileName: 'Archivo',
      duration: 'Duracion',
      trackCount: 'Tracks',
      noteCount: 'Notas',
      tempo: 'Tempo',
      ppq: 'PPQ',
    },
  },
  visualization: {
    eyebrow: 'Visualizacion',
    heading: 'Teclado de referencia',
    description:
      'Rango visual fijo de 88 teclas para validar la disposicion horizontal antes de renderizar bloques de notas.',
    fields: {
      range: 'Rango visible',
      totalKeys: 'Teclas',
      whiteKeys: 'Blancas',
      blackKeys: 'Negras',
    },
    noteRoll: {
      eyebrow: 'Visualizacion',
      heading: 'Mapa de notas',
      description: 'Bloques estaticos alineados por pitch y tiempo a partir del modelo MidiSong.',
      idleState: 'Carga un archivo MIDI para ubicar sus notas en esta vista.',
      emptyVisibleNotes: 'No hay notas visibles dentro del rango actual del teclado.',
      fields: {
        duration: 'Duracion',
        visibleNotes: 'Bloques visibles',
        hiddenNotes: 'Fuera de rango',
      },
    },
  },
  playback: {
    eyebrow: 'Playback',
    heading: 'Controles de reproduccion',
    description:
      'Transporte base para validar estado, tiempo actual y acciones minimas antes de sumar audio o practica.',
    idleState: 'Carga un archivo MIDI para habilitar el transporte base.',
    actions: {
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
    },
    states: {
      playing: 'Reproduciendo',
      paused: 'En pausa',
    },
    fields: {
      currentTime: 'Tiempo actual',
      duration: 'Duracion',
      status: 'Estado',
      position: 'Posicion',
    },
  },
} as const;

export type SiteContent = typeof siteContent;
