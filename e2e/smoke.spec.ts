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

async function uploadMidiFixture(page: Page): Promise<void> {
  const fixturePath = 'public/pianosongs/alla-turca.mid';

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
});
