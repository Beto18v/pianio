import { Injectable, computed, signal } from '@angular/core';

export type GuardrailMode = 'stable' | 'adaptive' | 'constrained';

export interface AdaptiveGuardrails {
  mode: GuardrailMode;
  visibleNoteCap: number;
  polyphonyCap: number;
}

export interface FrameBudgetSnapshot {
  targetFrameMs: number;
  averageFrameMs: number;
  lastFrameMs: number;
  longFrameRatio: number;
  sampledFrameCount: number;
  overload: number;
  guardrails: AdaptiveGuardrails;
}

export const BASE_VISIBLE_NOTE_CAP = 200;
export const MIN_VISIBLE_NOTE_CAP = 80;
export const BASE_POLYPHONY_CAP = 9;
export const MIN_POLYPHONY_CAP = 4;

const TARGET_FRAME_MS = 1000 / 60;
const LONG_FRAME_THRESHOLD_MS = 22;
const MAX_FRAME_SAMPLE_MS = 120;
const SAMPLE_WINDOW_SIZE = 72;
const MIN_SAMPLE_COUNT_FOR_FULL_PRESSURE = 8;
const OVERLOAD_SMOOTHING = 0.82;

const INITIAL_FRAME_BUDGET_SNAPSHOT: FrameBudgetSnapshot = {
  targetFrameMs: TARGET_FRAME_MS,
  averageFrameMs: TARGET_FRAME_MS,
  lastFrameMs: TARGET_FRAME_MS,
  longFrameRatio: 0,
  sampledFrameCount: 0,
  overload: 0,
  guardrails: {
    mode: 'stable',
    visibleNoteCap: BASE_VISIBLE_NOTE_CAP,
    polyphonyCap: BASE_POLYPHONY_CAP,
  },
};

@Injectable({
  providedIn: 'root',
})
export class FrameBudgetService {
  private readonly snapshotState = signal<FrameBudgetSnapshot>(INITIAL_FRAME_BUDGET_SNAPSHOT);
  readonly snapshot = this.snapshotState.asReadonly();
  readonly guardrails = computed(() => this.snapshot().guardrails);

  private frameSamples: number[] = [];
  private lastFrameTimestampMs: number | null = null;
  private overloadEma = 0;

  clearSamples(): void {
    this.frameSamples = [];
    this.lastFrameTimestampMs = null;
    this.overloadEma = 0;
    this.snapshotState.set(INITIAL_FRAME_BUDGET_SNAPSHOT);
  }

  resetFrameClock(): void {
    this.lastFrameTimestampMs = null;
  }

  recordFrame(timestampMs: number): void {
    if (!Number.isFinite(timestampMs)) {
      return;
    }

    if (this.lastFrameTimestampMs === null) {
      this.lastFrameTimestampMs = timestampMs;
      return;
    }

    const rawFrameMs = timestampMs - this.lastFrameTimestampMs;
    this.lastFrameTimestampMs = timestampMs;

    if (!Number.isFinite(rawFrameMs) || rawFrameMs <= 0) {
      return;
    }

    const frameMs = clamp(rawFrameMs, 1, MAX_FRAME_SAMPLE_MS);

    this.frameSamples.push(frameMs);

    if (this.frameSamples.length > SAMPLE_WINDOW_SIZE) {
      this.frameSamples = this.frameSamples.slice(this.frameSamples.length - SAMPLE_WINDOW_SIZE);
    }

    const sampledFrameCount = this.frameSamples.length;
    const averageFrameMs =
      this.frameSamples.reduce((accumulator, sample) => accumulator + sample, 0) /
      sampledFrameCount;
    const longFrameCount = this.frameSamples.filter(
      (sample) => sample >= LONG_FRAME_THRESHOLD_MS,
    ).length;
    const longFrameRatio = longFrameCount / sampledFrameCount;
    const overload = this.updateOverload(averageFrameMs, longFrameRatio, sampledFrameCount);

    this.snapshotState.set({
      targetFrameMs: TARGET_FRAME_MS,
      averageFrameMs,
      lastFrameMs: frameMs,
      longFrameRatio,
      sampledFrameCount,
      overload,
      guardrails: buildGuardrails(overload),
    });
  }

  private updateOverload(
    averageFrameMs: number,
    longFrameRatio: number,
    sampledFrameCount: number,
  ): number {
    const averagePressure = normalizeRange(averageFrameMs, TARGET_FRAME_MS, TARGET_FRAME_MS * 2.1);
    const longFramePressure = normalizeRange(longFrameRatio, 0.08, 0.38);
    const rawOverload = Math.max(averagePressure, longFramePressure);

    this.overloadEma =
      this.overloadEma * OVERLOAD_SMOOTHING + rawOverload * (1 - OVERLOAD_SMOOTHING);

    const sampleReadiness = clamp(sampledFrameCount / MIN_SAMPLE_COUNT_FOR_FULL_PRESSURE, 0, 1);

    return clamp(this.overloadEma * sampleReadiness, 0, 1);
  }
}

function buildGuardrails(overload: number): AdaptiveGuardrails {
  return {
    mode: resolveMode(overload),
    visibleNoteCap: toDynamicCap(BASE_VISIBLE_NOTE_CAP, MIN_VISIBLE_NOTE_CAP, overload),
    polyphonyCap: toDynamicCap(BASE_POLYPHONY_CAP, MIN_POLYPHONY_CAP, overload),
  };
}

function toDynamicCap(baseCap: number, minCap: number, overload: number): number {
  const safeOverload = clamp(overload, 0, 1);

  return Math.round(baseCap - (baseCap - minCap) * safeOverload);
}

function resolveMode(overload: number): GuardrailMode {
  if (overload >= 0.66) {
    return 'constrained';
  }

  if (overload >= 0.3) {
    return 'adaptive';
  }

  return 'stable';
}

function normalizeRange(value: number, start: number, end: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  if (value <= start) {
    return 0;
  }

  if (value >= end) {
    return 1;
  }

  return (value - start) / (end - start);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
