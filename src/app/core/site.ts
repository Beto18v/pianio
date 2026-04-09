export const siteContent = {
  appName: 'PianoFlow',
  heading: 'Carga un archivo MIDI y conviertelo en datos utilizables.',
  description:
    'Valida el flujo base de la app leyendo un archivo local, parseandolo en el navegador y mostrandolo con un modelo simple.',
  scopeItems: [
    'Seleccion local de archivos .mid y .midi',
    'Parsing en frontend con @tonejs/midi',
    'Resumen simple para verificacion rapida',
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
    emptyNotes: 'El archivo no contiene notas utilizables para esta fase.',
    fields: {
      fileName: 'Archivo',
      duration: 'Duracion',
      trackCount: 'Tracks',
      noteCount: 'Notas',
      tempo: 'Tempo',
      ppq: 'PPQ',
    },
  },
} as const;

export type SiteContent = typeof siteContent;
