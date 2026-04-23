import { expect, test, type Page } from '@playwright/test';

async function enterMainScene(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();

  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('#calibration-screen-title')).toBeVisible();

  await page.locator('#calibration-fallback-button').click();
  await expect(page.locator('#calibration-confirm-button')).toBeVisible();

  await page.locator('#calibration-confirm-button').click();
  await expect(page.locator('.immersive-shell')).toBeVisible();
}

async function uploadMidiFixture(
  page: Page,
  fixturePath = 'public/pianosongs/Rondo Alla Turca.mid',
): Promise<void> {
  await page.locator('#midi-file-input').setInputFiles(fixturePath);

  await expect
    .poll(async () => {
      const maxAttr = await page.locator('#playback-position-input').getAttribute('max');

      return Number(maxAttr ?? '0');
    })
    .toBeGreaterThan(0);
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

    await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
    await expect(page.getByText('Reproduciendo')).toBeVisible();

    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByText('En pausa')).toBeVisible();
  });

  test('practice toggle reveals practice details', async ({ page }) => {
    await enterMainScene(page);
    await uploadMidiFixture(page);

    await page.getByRole('button', { name: 'Panel avanzado' }).click();
    await page.locator('label[for="practice-mode-toggle-input"]').click();

    await expect(page.getByText('Esperadas')).toBeVisible();
    await expect(page.getByText('Notas tocadas')).toBeVisible();
  });

  test('dense-song smoke profile keeps transport responsive under seeks', async ({ page }) => {
    await enterMainScene(page);
    await uploadMidiFixture(page, 'public/pianosongs/Rush E Original.mid');

    await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
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

    await expect(page.getByText('Reproduciendo')).toBeVisible();
    await expect.poll(async () => page.locator('.note-rain__note').count()).toBeGreaterThan(0);
  });
});
