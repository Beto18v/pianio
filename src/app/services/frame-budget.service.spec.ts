import { TestBed } from '@angular/core/testing';

import {
  BASE_POLYPHONY_CAP,
  BASE_VISIBLE_NOTE_CAP,
  FrameBudgetService,
} from './frame-budget.service';

describe('FrameBudgetService', () => {
  let service: FrameBudgetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrameBudgetService);
  });

  it('starts with stable defaults', () => {
    const snapshot = service.snapshot();

    expect(snapshot.sampledFrameCount).toBe(0);
    expect(snapshot.overload).toBe(0);
    expect(snapshot.guardrails.mode).toBe('stable');
    expect(snapshot.guardrails.visibleNoteCap).toBe(BASE_VISIBLE_NOTE_CAP);
    expect(snapshot.guardrails.polyphonyCap).toBe(BASE_POLYPHONY_CAP);
  });

  it('reduces adaptive caps under sustained long frames', () => {
    let timestamp = 0;

    service.recordFrame(timestamp);

    for (let index = 0; index < 120; index += 1) {
      timestamp += 33;
      service.recordFrame(timestamp);
    }

    const snapshot = service.snapshot();

    expect(snapshot.averageFrameMs).toBeGreaterThan(30);
    expect(snapshot.longFrameRatio).toBeGreaterThan(0.9);
    expect(snapshot.guardrails.mode).toBe('constrained');
    expect(snapshot.guardrails.visibleNoteCap).toBeLessThan(BASE_VISIBLE_NOTE_CAP);
    expect(snapshot.guardrails.polyphonyCap).toBeLessThan(BASE_POLYPHONY_CAP);
  });

  it('recovers guardrails after stable frames', () => {
    let timestamp = 0;

    service.recordFrame(timestamp);

    for (let index = 0; index < 120; index += 1) {
      timestamp += 32;
      service.recordFrame(timestamp);
    }

    const overloadedSnapshot = service.snapshot();

    for (let index = 0; index < 220; index += 1) {
      timestamp += 16.7;
      service.recordFrame(timestamp);
    }

    const recoveredSnapshot = service.snapshot();

    expect(recoveredSnapshot.averageFrameMs).toBeLessThan(overloadedSnapshot.averageFrameMs);
    expect(recoveredSnapshot.guardrails.visibleNoteCap).toBeGreaterThan(
      overloadedSnapshot.guardrails.visibleNoteCap,
    );
    expect(recoveredSnapshot.guardrails.polyphonyCap).toBeGreaterThan(
      overloadedSnapshot.guardrails.polyphonyCap,
    );
  });
});
