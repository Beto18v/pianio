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
    'Transporte base de playback con tiempo y audio minimo',
    'Deteccion de dispositivos MIDI con fallback simulado',
    'Modo practica con wait mode y feedback granular de notas',
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
      'Transporte base con tiempo en segundos y una capa minima de audio sintetizada para validar flujo end-to-end.',
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
    practice: {
      toggle: 'Activar modo practica',
      emptyPitches: '-',
      blockedStatus:
        'El transporte queda en pausa hasta que el input coincida con las notas esperadas.',
      states: {
        disabled: 'Desactivado',
        match: 'Match',
        matchWithExtra: 'Match con extras',
        blocked: 'Esperando match',
      },
      waitModeStates: {
        disabled: 'No activo',
        idle: 'Listo',
        waiting: 'En espera (wait mode)',
        advancing: 'Avanzando',
      },
      fields: {
        matchStatus: 'Estado practica',
        waitMode: 'Wait mode',
        expected: 'Esperadas',
        activeInput: 'Input activo',
        matched: 'Aciertos',
        missing: 'Faltantes',
        extra: 'Input extra',
      },
    },
    fields: {
      currentTime: 'Tiempo actual',
      duration: 'Duracion',
      status: 'Estado',
      position: 'Posicion',
    },
  },
  midiInput: {
    eyebrow: 'MIDI Input',
    heading: 'Entrada MIDI en vivo',
    description:
      'Detecta teclados reales con Web MIDI API y permite simulacion defensiva cuando no hay hardware disponible.',
    unknownManufacturer: 'Fabricante no disponible',
    noEventState: 'Aun no se recibieron eventos noteOn/noteOff.',
    actions: {
      refresh: 'Buscar dispositivos',
      simulate: 'Simular nota',
    },
    states: {
      idle: 'Pendiente de inicializacion',
      ready: 'Dispositivos detectados',
      mock: 'Modo simulado',
    },
    eventTypes: {
      noteOn: 'Note On',
      noteOff: 'Note Off',
    },
    fields: {
      state: 'Estado',
      devices: 'Dispositivos',
      event: 'Evento',
      note: 'Nota',
      velocity: 'Velocidad',
      source: 'Fuente',
    },
  },
} as const;

export type SiteContent = typeof siteContent;
