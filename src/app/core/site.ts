export const siteContent = {
  appName: 'Pianio',
  brand: {
    logoAlt: 'Logo de Pianio',
    stageTagline: 'Modo estudio en vivo',
  },
  seo: {
    title: 'Pianio | Practica piano de forma divertida',
    description:
      'Aprende tus canciones favoritas con lluvia de notas, tempo flexible y practica guiada por manos.',
    keywords: ['piano midi', 'practicar piano', 'teclado midi', 'visualizador midi', 'pianio'],
  },
  welcome: {
    eyebrow: 'Empieza en segundos',
    title: 'Tu estudio de piano, claro y divertido.',
    summary: 'Ajusta tu teclado, elige una cancion y empieza a tocar.',
    description:
      'Practica a tu ritmo, repite lo que necesites y sigue cada nota con una guia visual simple.',
    highlights: [
      'Canciones listas para empezar hoy mismo',
      'Guia por mano y velocidad ajustable',
      'Todo lo que necesitas para practicar en una sola pantalla',
    ],
  },
  flow: {
    actions: {
      continue: 'Empezar',
      back: 'Volver',
      enterMainScene: 'Ir al estudio',
    },
  },
  heading: 'Estudia tu cancion con una vista inmersiva y controles simples.',
  description: 'Calibra tu rango, ajusta el ritmo y sigue la lluvia de notas sobre el piano.',
  scopeItems: [
    'Biblioteca de canciones demo y carga de archivos .mid, .midi, .xml y .musicxml',
    'Varios sonidos para practicar con tu estilo',
    'Deteccion de teclado MIDI con modo simulado',
    'Practica guiada con filtro por mano y avance asistido',
    'Vista completa con rango calibrado y lluvia de notas',
  ],
  stage: {
    mainAriaLabel: 'Escena principal de estudio de Pianio',
    idleTitle: 'Elige una cancion o importa un archivo para comenzar.',
    idleDescription:
      'Al cargar una cancion se activa el piano, la lluvia de notas y el centro de practica.',
  },
  calibration: {
    heading: 'Calibracion del teclado',
    description: 'Ajusta el rango de tu teclado para una practica mas comoda.',
    waitingFirstKey: 'Toca la primera tecla.',
    waitingLastKey: 'Ahora toca la ultima tecla.',
    readyTitle: 'Calibracion lista',
    readyDescription: 'Confirma el rango de tu piano y entra al estudio cuando quieras.',
    connectionStates: {
      idle: 'Preparando conexion MIDI...',
      ready: 'Teclado MIDI listo para calibrar.',
      mock: 'Modo simulado activo. Conecta tu teclado para poder calibrarlo.',
    },
    mapping: {
      heading: 'Mapeo de notas',
      states: {
        idle: 'Listo para comenzar',
        waitingFirstKey: 'Esperando primera tecla',
        waitingLastKey: 'Esperando ultima tecla',
        readyCalibrated: 'Mapeo completado',
        readyFallback: 'Rango completo activo',
      },
      hints: {
        idle: 'Presiona "Mapear notas" para capturar el rango real de tu teclado.',
        waitingFirstKey: 'Toca la tecla mas grave de tu teclado para iniciar el rango.',
        waitingLastKey: 'Toca la tecla mas aguda para completar el mapeo.',
        readyCalibrated: 'Tu teclado quedo calibrado y listo para practicar.',
        readyFallback: 'Puedes continuar con rango completo o mapear para mas precision.',
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
      confirm: 'Confirmar',
    },
    errors: {
      lastKeyMustBeGreaterOrEqual: (firstKeyLabel: string) =>
        `La ultima tecla debe ser igual o mayor que ${firstKeyLabel}.`,
    },
  },
  upload: {
    eyebrow: 'Canciones',
    heading: 'Canciones y archivos',
    description: 'Usa canciones incluidas o importa tus propios archivos para practicar.',
    inputLabel: 'Importar archivo',
    helperText:
      'Sube un archivo .mid, .midi, .xml o .musicxml, o elige una cancion de la biblioteca.',
    idleState: 'Todavia no hay una cancion cargada.',
    currentFilePrefix: 'Cancion actual:',
    loadingState: 'Cargando cancion...',
    errorState: 'No pudimos leer ese archivo. Prueba con un .mid, .midi, .xml o .musicxml valido.',
    notAvailable: 'No disponible',
    summaryHeading: 'Resumen de la cancion',
    notePreviewHeading: 'Primeras notas',
    emptyNotes: 'El archivo no contiene notas utilizables para esta vista.',
    library: {
      heading: 'Biblioteca incluida',
      description: 'Elige una cancion y empieza a practicar al instante.',
      label: 'Cancion para practicar',
      playAction: 'Cargar y reproducir',
      loadingAction: 'Cargando...',
      importAction: 'Importar archivo',
    },
    sourceFormats: {
      midi: 'MIDI',
      musicxml: 'MusicXML',
    },
    compactSummary: {
      noSong: 'Carga un archivo para ver la guia de mano y digitacion.',
      annotationCoverage: (
        sourceFormatLabel: string,
        handFromFile: number,
        fingerFromFile: number,
      ) =>
        `Formato ${sourceFormatLabel}. Mano desde archivo: ${handFromFile}. Digitacion desde archivo: ${fingerFromFile}.`,
    },
    fields: {
      fileName: 'Archivo',
      duration: 'Duracion',
      trackCount: 'Pistas',
      noteCount: 'Notas',
      tempo: 'Pulso',
      ppq: 'Resolucion',
      sourceFormat: 'Formato',
      handFromFile: 'Mano (archivo)',
      handInferred: 'Mano (estimada)',
      handUnavailable: 'Mano (sin dato)',
      fingerFromFile: 'Digitacion (archivo)',
      fingerInferred: 'Digitacion (estimada)',
      fingerUnavailable: 'Digitacion (sin dato)',
    },
  },
  visualization: {
    eyebrow: 'Visualizacion',
    heading: 'Piano calibrado',
    description: 'El teclado se adapta a tu rango y refleja lo que tocas en tiempo real.',
    fields: {
      range: 'Rango visible',
      totalKeys: 'Teclas',
      whiteKeys: 'Blancas',
      blackKeys: 'Negras',
    },
    keyboard: {
      rangeLabel: (firstKeyLabel: string, lastKeyLabel: string) =>
        `${firstKeyLabel} - ${lastKeyLabel}`,
      ariaLabel: (keyCount: number, firstKeyLabel: string, lastKeyLabel: string) =>
        `Teclado de piano de ${keyCount} teclas, desde ${firstKeyLabel} hasta ${lastKeyLabel}.`,
    },
    noteRoll: {
      eyebrow: 'Visualizacion',
      heading: 'Mapa de notas',
      description: 'Vista general de la cancion ordenada por altura y tiempo.',
      idleState: 'Carga un archivo MIDI para ubicar sus notas en esta vista.',
      emptyVisibleNotes: 'No hay notas visibles dentro del rango actual del teclado.',
      ariaLabel: (songName: string, visibleBlocks: number) =>
        `Mapa de notas para ${songName} con ${visibleBlocks} bloques visibles.`,
      fields: {
        duration: 'Duracion',
        visibleNotes: 'Bloques visibles',
        hiddenNotes: 'Fuera de rango',
      },
    },
    noteRain: {
      heading: 'Lluvia de notas',
      ariaLabel: (songName: string, visibleNotes: number) =>
        `Lluvia de notas para ${songName} con ${visibleNotes} notas visibles.`,
    },
  },
  playback: {
    eyebrow: 'Estudio',
    heading: 'Centro de practica',
    description: 'Controla reproduccion, manos, sonido y guia de practica sin salir de la escena.',
    advancedTitle: 'Panel avanzado',
    advancedDescription: 'Ajusta manos, sonido, practica y teclado.',
    idleState: 'Carga una cancion para habilitar el transporte y la practica.',
    tempo: {
      title: 'Velocidad',
      hint: 'Controla la velocidad en el HUD y compara BPM original con el actual.',
      fields: {
        scale: 'Ritmo',
        midiBpm: 'BPM original',
        effectiveBpm: 'BPM actual',
      },
      unknownBpm: 'No disponible',
    },
    settings: {
      title: 'Ajustes de estudio',
      hint: 'Elige mano activa, sonido y ayuda visual para practicar con foco.',
      handModes: {
        both: 'Ambas manos',
        left: 'Solo mano izquierda',
        right: 'Solo mano derecha',
      },
      instrumentPresets: {
        acousticGrand: 'Piano clasico',
        brightGrand: 'Piano brillante',
        electricPiano: 'Piano electrico',
        warmPad: 'Pad suave',
      },
      fields: {
        hands: 'Manos',
        sound: 'Sonido',
        volume: 'Volumen',
        noteLabels: 'Mostrar notas',
        noteLabelFormat: 'Formato de notas',
      },
      noteLabelFormats: {
        letters: 'Letras (C, D, E)',
        solfege: 'Solfeo (DO, RE, MI)',
      },
    },
    performance: {
      title: 'Fluidez',
      fields: {
        frameBudget: 'Meta por cuadro',
        averageFrame: 'Promedio actual',
        longFrames: 'Momentos pesados',
        guardrailMode: 'Modo de suavizado',
        visibleNoteCap: 'Notas en pantalla',
        polyphonyCap: 'Notas simultaneas',
      },
      modes: {
        stable: 'Suave',
        adaptive: 'Autoajuste',
        constrained: 'Maxima estabilidad',
      },
    },
    actions: {
      play: 'Reproducir',
      pause: 'Pausar',
      stop: 'Detener',
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
      blockedStatus: 'La reproduccion se pausa hasta que coincidas con la guia.',
      inactiveHint: 'Activa el modo practica para ver esperadas, aciertos y faltantes.',
      states: {
        disabled: 'Libre',
        match: 'Correcto',
        matchWithExtra: 'Correcto con extras',
        blocked: 'Esperando coincidencia',
      },
      waitModeStates: {
        disabled: 'No activo',
        idle: 'Listo',
        waiting: 'En espera',
        advancing: 'Avanzando',
      },
      fields: {
        matchStatus: 'Estado',
        waitMode: 'Avance asistido',
        expected: 'Esperadas',
        activeInput: 'Notas tocadas',
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
    eyebrow: 'Teclado',
    heading: 'Entrada MIDI en vivo',
    badgeAriaLabel: 'Dispositivos MIDI detectados',
    description:
      'Conecta tu teclado MIDI y toca en tiempo real. Si no tienes uno, puedes usar modo simulado.',
    unknownManufacturer: 'Fabricante no disponible',
    defaultDeviceName: 'Dispositivo MIDI',
    mockDeviceName: 'Teclado virtual',
    mockManufacturer: 'Pianio',
    noEventState: 'Aun no se recibieron notas.',
    errors: {
      webMidiNotAvailable: 'No fue posible activar la conexion MIDI en este dispositivo.',
      noActiveAccess: 'No hay una conexion MIDI activa en este momento.',
      noInputsDetected: 'No detectamos entradas MIDI. Enciende el teclado y vuelve a intentar.',
      noAccessWithPermissionHint:
        'No fue posible acceder a tus dispositivos MIDI. Revisa permisos e intenta nuevamente.',
      blockedAccess: (errorName: string) =>
        `Se bloqueo el acceso MIDI (${errorName}). Revisa permisos e intenta nuevamente.`,
      accessWithDetail: (errorName: string, errorMessage: string) =>
        `No fue posible acceder a dispositivos MIDI (${errorName}: ${errorMessage}). Intenta nuevamente.`,
      noErrorDetail: 'Sin detalle adicional.',
    },
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
      connectedDevices: 'Dispositivos conectados',
      event: 'Evento',
      note: 'Nota',
      velocity: 'Velocidad',
      source: 'Fuente',
    },
  },
} as const;

export type SiteContent = typeof siteContent;
