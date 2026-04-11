import { expect, test, type Page } from '@playwright/test';

async function enterMainScene(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('#calibration-screen-title')).toBeVisible();

  await page.locator('#calibration-fallback-button').click();
  await expect(page.locator('#calibration-confirm-button')).toBeVisible();

  await page.locator('#calibration-confirm-button').click();
  await expect(page.locator('.immersive-shell')).toBeVisible();
}

async function uploadMidiFixture(
  page: Page,
  fixturePath = 'public/pianosongs/alla-turca.mid',
): Promise<void> {
  await page.locator('#midi-file-input').setInputFiles(fixturePath);

  await expect
    .poll(async () => {
      const maxAttr = await page.locator('#playback-position-input').getAttribute('max');

      return Number(maxAttr ?? '0');
    })
    .toBeGreaterThan(0);
}

async function readNumericValue(page: Page, selector: string): Promise<number> {
  const valueText = (await page.locator(selector).textContent()) ?? '';
  const normalized = valueText.replace(',', '.').replace(/[^\d.+-]/g, '');

  return Number(normalized);
}

test.describe('PianoFlow E2E smoke', () => {
  test('boot flow reaches immersive scene', async ({ page }) => {
    await enterMainScene(page);

    await expect(page.locator('.practice-hud')).toBeVisible();
    await expect(page.locator('.stage-keyboard')).toBeVisible();
  });

  test('midi upload renders notes and updates transport bounds', async ({ page }) => {
    await enterMainScene(page);
    await uploadMidiFixture(page);

    await expect.poll(async () => page.locator('.note-rain__note').count()).toBeGreaterThan(0);
  });

  test('playback controls update transport status', async ({ page }) => {
    await enterMainScene(page);
    await uploadMidiFixture(page);

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByText('Reproduciendo')).toBeVisible();

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByText('En pausa')).toBeVisible();
  });

  test('practice toggle reveals practice details', async ({ page }) => {
    await enterMainScene(page);
    await uploadMidiFixture(page);

    await page.locator('label[for="practice-mode-toggle-input"]').click();

    await expect(page.getByText('Esperadas')).toBeVisible();
    await expect(page.getByText('Input activo')).toBeVisible();
  });

  test('dense-song smoke profile keeps transport and guardrails observable', async ({ page }) => {
    await enterMainScene(page);
    await uploadMidiFixture(page, 'public/pianosongs/Rush E Original + Midi Download.mid');

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByText('Reproduciendo')).toBeVisible();

    const slider = page.locator('#playback-position-input');
    await expect
      .poll(async () => {
        const maxAttr = await slider.getAttribute('max');

        return Number(maxAttr ?? '0');
      })
      .toBeGreaterThan(0);

    const maxSeconds = Number((await slider.getAttribute('max')) ?? '0');
    const seekFractions = [0.12, 0.58, 0.2, 0.76, 0.34, 0.88];

    for (const fraction of seekFractions) {
      const nextValue = Math.max(0.01, Number((maxSeconds * fraction).toFixed(2)));

      await slider.evaluate((input, value) => {
        const element = input as HTMLInputElement;

        element.value = String(value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }, nextValue);
    }

    await expect
      .poll(async () => readNumericValue(page, '#performance-frame-budget-value'))
      .toBeGreaterThan(0);
    await expect
      .poll(async () => readNumericValue(page, '#performance-average-frame-value'))
      .toBeGreaterThan(0);

    const longFramePercent = await readNumericValue(page, '#performance-long-frames-value');
    const visibleCap = await readNumericValue(page, '#performance-visible-note-cap-value');
    const polyphonyCap = await readNumericValue(page, '#performance-polyphony-cap-value');
    const guardrailMode = (
      (await page.locator('#performance-guardrail-mode-value').textContent()) ?? ''
    ).trim();

    expect(longFramePercent).toBeGreaterThanOrEqual(0);
    expect(longFramePercent).toBeLessThanOrEqual(100);
    expect(visibleCap).toBeGreaterThan(0);
    expect(visibleCap).toBeLessThanOrEqual(220);
    expect(polyphonyCap).toBeGreaterThan(0);
    expect(polyphonyCap).toBeLessThanOrEqual(10);
    expect(guardrailMode.length).toBeGreaterThan(0);
  });
});
