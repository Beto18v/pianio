export const siteContent = {
  appName: 'PianoFlow',
  seo: {
    title: 'PianoFlow | Practica piano con archivos MIDI en el navegador',
    description:
      'PianoFlow te permite cargar archivos MIDI, calibrar tu teclado y practicar con una escena visual en tiempo real.',
    keywords: ['piano midi', 'practicar piano', 'teclado midi', 'visualizador midi', 'pianoflow'],
  },
  welcome: {
    eyebrow: 'Bienvenido',
    title: 'PianoFlow en dos pasos.',
    summary: 'Carga un MIDI, calibra tu teclado y practica en tiempo real.',
    description: 'Todo corre local en tu navegador, sin subir archivos a servidores externos.',
    highlights: [
      'Carga archivos .mid o .midi desde tu equipo',
      'Mapea primera y ultima tecla de tu teclado',
      'Practica con HUD, piano y lluvia de notas',
    ],
  },
  flow: {
    actions: {
      continue: 'Continuar',
      back: 'Volver',
      enterMainScene: 'Entrar a la escena principal',
    },
  },
  heading: 'Escena inmersiva para cargar, escuchar y practicar un MIDI en tiempo real.',
  description:
    'Calibra el rango de tu teclado, ajusta la escena al instrumento real y sigue la lluvia de notas sobre el piano.',
  scopeItems: [
    'Seleccion local de archivos .mid y .midi',
    'Parsing en frontend con @tonejs/midi',
    'Playback con audio minimo y transporte local',
    'Deteccion de dispositivos MIDI con fallback simulado',
    'Modo practica con wait mode y feedback granular',
    'Escena fullscreen con rango calibrado y lluvia de notas',
  ],
  stage: {
    idleTitle: 'Carga un archivo MIDI para iniciar la escena.',
    idleDescription:
      'El piano queda listo en pantalla completa y la lluvia de notas aparece cuando haya una cancion cargada.',
  },
  calibration: {
    heading: 'Calibracion del teclado',
    description: 'Revisa tu conexion, mapea notas y confirma antes de entrar a la escena.',
    idleTitle: 'Ajusta el rango visible antes de practicar.',
    idleDescription:
      'Si tienes un teclado MIDI conectado, toca primero la tecla mas grave y luego la mas aguda.',
    noHardwareTitle: 'No se detecto un teclado MIDI real.',
    noHardwareDescription:
      'Puedes continuar con el rango completo mientras conectas un teclado o usar el modo simulado.',
    waitingFirstKey: 'Toca la primera tecla.',
    waitingLastKey: 'Ahora toca la ultima tecla.',
    readyTitle: 'Calibracion lista.',
    readyDescription:
      'Aqui puedes validar tu teclado, mapear notas y entrar a la escena principal cuando quieras.',
    connectionStates: {
      idle: 'Inicializando deteccion MIDI...',
      ready: 'Teclado MIDI detectado. Puedes calibrar con dos notas.',
      mock: 'Modo simulado activo. Puedes usar rango completo para continuar.',
    },
    mapping: {
      heading: 'Mapeo de notas',
      states: {
        idle: 'Listo para mapear',
        waitingFirstKey: 'Esperando primera tecla',
        waitingLastKey: 'Esperando ultima tecla',
        readyCalibrated: 'Mapeo completado',
        readyFallback: 'Rango completo activo',
      },
      hints: {
        idle: 'Presiona "Mapear notas" para capturar el rango real de tu teclado.',
        waitingFirstKey: 'Toca la tecla mas grave de tu teclado para iniciar el rango.',
        waitingLastKey: 'Toca la tecla mas aguda para completar el mapeo.',
        readyCalibrated: 'Tu teclado quedo calibrado y listo para practica.',
        readyFallback: 'Puedes continuar con rango completo o mapear notas para mayor precision.',
      },
    },
    fields: {
      firstKey: 'Primera tecla',
      lastKey: 'Ultima tecla',
      range: 'Rango visible',
      source: 'Origen',
      mappingStatus: 'Estado de mapeo',
    },
    states: {
      default: 'Pendiente',
      fallback: 'Rango completo',
      calibrated: 'Calibrado',
    },
    actions: {
      start: 'Mapear notas',
      retry: 'Reiniciar calibracion',
      useFallback: 'Usar rango completo',
      confirm: 'Confirmar calibracion',
    },
  },
  upload: {
    eyebrow: 'MIDI',
    heading: 'Archivo MIDI',
    description:
      'Todo el procesamiento ocurre en el navegador. La escena se actualiza apenas se parsea el archivo.',
    inputLabel: 'Cargar MIDI',
    helperText:
      'Sube un archivo .mid o .midi para habilitar transporte, lluvia de notas y modo practica.',
    idleState: 'Aun no hay un archivo cargado.',
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
    heading: 'Piano calibrado',
    description:
      'El teclado se adapta al rango visible actual y refleja las notas activas del input en tiempo real.',
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
    noteRain: {
      heading: 'Lluvia de notas',
    },
  },
  playback: {
    eyebrow: 'Practica',
    heading: 'HUD de practica',
    description:
      'Controla el transporte, sigue el estado del wait mode y revisa el match contra tu teclado actual.',
    idleState: 'Carga un archivo MIDI para habilitar el transporte y la practica.',
    actions: {
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      recalibrate: 'Recalibrar',
      simulate: 'Simular nota',
    },
    states: {
      playing: 'Reproduciendo',
      paused: 'En pausa',
    },
    practice: {
      toggle: 'Modo practica',
      emptyPitches: '-',
      blockedStatus: 'La reproduccion queda en pausa hasta que el input coincida.',
      inactiveHint: 'Activa el modo practica para ver notas esperadas, aciertos y faltantes.',
      states: {
        disabled: 'Libre',
        match: 'Match',
        matchWithExtra: 'Match con extras',
        blocked: 'Esperando match',
      },
      waitModeStates: {
        disabled: 'No activo',
        idle: 'Listo',
        waiting: 'En espera',
        advancing: 'Avanzando',
      },
      fields: {
        matchStatus: 'Estado',
        waitMode: 'Wait mode',
        expected: 'Esperadas',
        activeInput: 'Input activo',
        matched: 'Aciertos',
        missing: 'Faltantes',
        extra: 'Extras',
      },
    },
    calibration: {
      title: 'Teclado',
      fields: {
        connection: 'Conexion',
        range: 'Rango',
        source: 'Calibracion',
      },
    },
    fields: {
      currentTime: 'Tiempo',
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
      ready: 'Teclado conectado',
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
