import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.getByRole('button', { name: /^I.m ready$/ }).click();
}

test('manual motion choice survives the lobby transition and camera restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Train with AI ally', exact: true }).click();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByText('CAMERA ON', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Motion controls', exact: true }).uncheck();
  await ready(page);
  await page.getByRole('button', { name: 'Begin raid', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
  await expect(
    page.getByRole('checkbox', { name: 'Motion controls', exact: true }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByText('CAMERA ON', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Motion controls', exact: true }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: 'Leave raid', exact: true }).click();
});

test('cancel and leave discard a camera permission result that arrives late', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      releaseCamera?: () => void;
      pendingCamera?: MediaStream;
    };
    navigator.mediaDevices.getUserMedia = () =>
      new Promise<MediaStream>((resolve) => {
        state.releaseCamera = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
          state.pendingCamera = canvas.captureStream(1);
          resolve(state.pendingCamera);
        };
      });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Train with AI ally', exact: true }).click();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel camera request', exact: true }).click();
  await page.evaluate(() =>
    (window as typeof window & { releaseCamera: () => void }).releaseCamera(),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as typeof window & { pendingCamera: MediaStream }).pendingCamera
          .getTracks()
          .every((track) => track.readyState === 'ended'),
      ),
    )
    .toBe(true);
  await expect(page.getByText('CAMERA ON', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await page.getByRole('button', { name: 'Leave raid', exact: true }).click();
  await page.evaluate(() =>
    (window as typeof window & { releaseCamera: () => void }).releaseCamera(),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as typeof window & { pendingCamera: MediaStream }).pendingCamera
          .getTracks()
          .every((track) => track.readyState === 'ended'),
      ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Train with AI ally', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toBeVisible();
  await expect(page.getByText('CAMERA ON', { exact: true })).toHaveCount(0);
});

test('camera denial can be retried with a synthetic device', async ({ page }) => {
  await page.addInitScript(() => {
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let denied = false;
    navigator.mediaDevices.getUserMedia = (constraints) => {
      if (!denied) {
        denied = true;
        return Promise.reject(new DOMException('Denied', 'NotAllowedError'));
      }
      return capture(constraints);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Train with AI ally', exact: true }).click();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByText(/Camera permission was declined/)).toBeVisible();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByText('CAMERA ON', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toBeVisible();
});
