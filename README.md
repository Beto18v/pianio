# PianoFlow (Frontend)

PianoFlow is a frontend-only Angular web app for practicing piano with MIDI files.
Everything runs locally in your browser: upload a `.mid/.midi`, visualize notes in a fullscreen stage, play back with a minimal synth, connect a MIDI keyboard (Web MIDI), and practice with a “wait mode” that pauses until you match the expected notes.

This repository is split into:

- `pianoflow-front`: this Angular application
- `pianoflow-planning`: roadmap, architecture notes, and phase checklists

---

## English

### What the app does

- **Local MIDI upload + parsing** using `@tonejs/midi`, mapped into small internal domain models (`MidiSong`, `NoteEvent`).
- **Immersive fullscreen stage** with:
  - an adaptive on-screen piano keyboard (range can be calibrated to your physical keyboard)
  - a falling **note rain** overlay aligned to the calibrated keys and transport time
  - a side **practice HUD** (transport + practice state)
- **Playback transport** (`play`, `pause`, `stop`, `seek`) owned by one service.
- **Minimal audio playback** via Web Audio (intentionally simple; useful for timing verification).
- **Web MIDI input** (`noteOn`/`noteOff`) with a defensive **mock mode** fallback when hardware or Web MIDI is unavailable.
- **Practice mode / wait mode**: when enabled, playback pauses on mismatch and resumes when the expected pitches are satisfied.
- **Hand/fingering baseline analysis** available in note layouts (`hand` + chord-level fingering suggestion).
- **Fluidity guardrails for dense songs**:
  - frame-budget tracking (target/average/long-frame ratio)
  - dynamic visible-note cap for note rain
  - dynamic polyphony cap for audio scheduler

### Tech stack

- Angular 21 (standalone components, signals, new template control flow `@if` / `@for`)
- TypeScript (strict + strict templates)
- SCSS
- `@tonejs/midi`
- Web MIDI API + Web Audio API
- Unit tests via Angular CLI + Vitest
- E2E smoke tests via Playwright

### Requirements

- Node.js + npm
- For **Web MIDI**: a Chromium-based browser (Chrome / Edge)
  - Web MIDI requires a **secure context** (`https://` or `http://localhost`).
  - If Web MIDI is not available, PianoFlow automatically switches to **mock mode**.

### Quick start

From `pianoflow-front`:

```bash
npm install
npm start
```

Open `http://localhost:4200/`.

### How to use (end-to-end flow)

1. **Welcome → Calibration**
   - Click **Continue**.
   - If a real MIDI keyboard is detected, you can **Map keys** and then press:
     - the **lowest** key on your keyboard
     - the **highest** key on your keyboard
   - Otherwise, click **Use full range** to proceed with the fallback range.
2. **Main stage**
   - Click **Load MIDI** and choose a `.mid/.midi` file.
   - Press **Play**.
     - Note: browsers often require a user gesture before audio starts; the first play click takes care of that.
   - Toggle **Practice mode** to enable wait mode:
     - playback pauses when your pressed notes do not match the expected notes at the current time
     - playback resumes when you match the expected pitches
   - Use **Recalibrate** anytime to re-map the visual keyboard range.
   - If you are in **mock mode**, use **Simulate note** to generate sample `noteOn/noteOff` events.

Tip: sample MIDI files live in `public/pianosongs/`.

### Architecture overview

The codebase follows a small layered structure:

- `src/app/domain/models`: framework-independent TypeScript contracts (`MidiSong`, `PlaybackState`, `PracticeState`, …).
- `src/app/services`: business logic + browser integrations (parser, transport, audio, Web MIDI, practice gating, calibration).
- `src/app/features`: standalone UI components (upload, MIDI input badge, HUD, keyboard visualization, note rain).
- `src/app/core/site.ts`: centralized user-facing copy.
- `src/app/features/visualization/utils`: deterministic mapping utilities (keyboard geometry + note placement).

High-level data flow:

- File input → `MidiParserService` → `MidiSong` → `PlaybackService` → HUD + visualization
- Web MIDI input → `MidiInputService` → active pitches → keyboard highlight + `PracticeService`
- `PracticeService` gates `PlaybackService` when practice mode is enabled

### Scripts

- `npm start` → `ng serve`
- `npm run build` → production build
- `npm test` → unit tests
- `npm run e2e` → Playwright smoke tests (headless)
- `npm run e2e:ui` → Playwright UI mode

### Planning docs

See `../pianoflow-planning/` for:

- overall product overview and constraints
- architecture notes and data models
- roadmap and phase checklists

---

## Español

### ¿Qué hace la app?

- **Carga y parseo local de MIDI** con `@tonejs/midi`, mapeando el resultado a modelos internos (`MidiSong`, `NoteEvent`).
- **Escena inmersiva fullscreen** con:
  - un piano visual adaptativo (el rango se puede calibrar a tu teclado físico)
  - una **lluvia de notas** alineada a las teclas visibles y al tiempo del transporte
  - un **HUD lateral** con transporte + estado de práctica
- **Transporte de reproducción** (`play`, `pause`, `stop`, `seek`) controlado por un único servicio.
- **Audio mínimo** con Web Audio (a propósito simple; útil para validar timing).
- **Entrada Web MIDI** (`noteOn`/`noteOff`) con **modo simulado** cuando no hay hardware o no existe Web MIDI.
- **Modo práctica / wait mode**: cuando está activo, la reproducción se pausa si falta match y se reanuda al coincidir.
- **Analisis baseline de mano/digitacion** disponible en layouts de notas (`hand` + sugerencia de digitacion de acordes).
- **Guardrails de fluidez para canciones densas**:
  - tracking de budget de frame (objetivo/promedio/frames largos)
  - cap dinamico de notas visibles en la lluvia
  - cap dinamico de polifonia en el scheduler de audio

### Stack

- Angular 21 (standalone, signals, control flow `@if` / `@for`)
- TypeScript (strict + strict templates)
- SCSS
- `@tonejs/midi`
- Web MIDI API + Web Audio API
- Unit tests con Angular CLI + Vitest
- E2E smoke tests con Playwright

### Requisitos

- Node.js + npm
- Para **Web MIDI**: navegador Chromium (Chrome / Edge)
  - Web MIDI requiere **contexto seguro** (`https://` o `http://localhost`).
  - Si Web MIDI no está disponible, PianoFlow activa **modo simulado** automáticamente.

### Correr en local

Desde `pianoflow-front`:

```bash
npm install
npm start
```

Abre `http://localhost:4200/`.

### Cómo usar (flujo completo)

1. **Bienvenida → Calibración**
   - Presiona **Continuar**.
   - Si se detecta un teclado real, puedes **Mapear notas** y luego tocar:
     - la tecla **más grave**
     - la tecla **más aguda**
   - Si no hay hardware, usa **Rango completo** para continuar con el fallback.
2. **Escena principal**
   - Presiona **Cargar MIDI** y selecciona un archivo `.mid/.midi`.
   - Presiona **Play**.
     - Nota: el navegador puede requerir interacción del usuario para iniciar audio; el primer click de play cubre eso.
   - Activa **Modo práctica** para habilitar el wait mode:
     - se pausa si tus teclas presionadas no coinciden con lo esperado en el tiempo actual
     - reanuda al recuperar el match
   - Usa **Recalibrar** cuando el rango visual no coincida con tu teclado.
   - En **modo simulado**, usa **Simular nota** para generar eventos `noteOn/noteOff`.

Tip: hay MIDIs de prueba en `public/pianosongs/`.

### Arquitectura (alto nivel)

El proyecto mantiene una estructura por capas:

- `src/app/domain/models`: contratos TypeScript independientes del framework.
- `src/app/services`: lógica y puntos de integración (parser, transporte, audio, Web MIDI, práctica, calibración).
- `src/app/features`: componentes standalone (upload, badge de MIDI, HUD, teclado, note rain).
- `src/app/core/site.ts`: copy visible centralizado.
- `src/app/features/visualization/utils`: utilidades deterministas para geometría del teclado y proyección de notas.

Flujo de datos principal:

- Archivo → `MidiParserService` → `MidiSong` → `PlaybackService` → HUD + visualización
- Entrada MIDI → `MidiInputService` → pitches activos → teclado + `PracticeService`
- `PracticeService` controla el `PlaybackService` cuando el modo práctica está activo

### Scripts

- `npm start` → `ng serve`
- `npm run build` → build de producción
- `npm test` → unit tests
- `npm run e2e` → smoke tests E2E con Playwright (headless)
- `npm run e2e:ui` → Playwright en modo UI

### Planning

La documentación de roadmap/arquitectura/modelos vive en `../pianoflow-planning/`.
