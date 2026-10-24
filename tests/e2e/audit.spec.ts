import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.getByRole('button', { name: /^I.m ready$/ }).click();
}

test('manual motion choice survives the lobby transition and camera restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try solo training', exact: true }).click();
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
  await page.getByRole('button', { name: 'Try solo training', exact: true }).click();
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
  await page.getByRole('button', { name: 'Try solo training', exact: true }).click();
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
  await page.getByRole('button', { name: 'Try solo training', exact: true }).click();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByText(/Camera permission was declined/)).toBeVisible();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByText('CAMERA ON', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toBeVisible();
});

test('two players finish two matches with synchronized results and fresh replay readiness', async ({
  browser,
}) => {
  test.setTimeout(150000);
  const heroContext = await browser.newContext(),
    bossContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const hero = await heroContext.newPage(),
    boss = await bossContext.newPage();
  const errors: string[] = [];
  hero.on('pageerror', (error) => errors.push(error.message));
  boss.on('pageerror', (error) => errors.push(error.message));
  try {
    await hero.goto('/');
    await hero.getByRole('button', { name: 'Create a raid', exact: true }).click();
    await boss.goto('/');
    await boss.goto(
      await hero.getByRole('textbox', { name: 'Invite URL', exact: true }).inputValue(),
    );
    await boss.getByRole('button', { name: 'Possess the boss', exact: true }).click();
    await boss.goBack();
    await expect(boss.getByRole('button', { name: /^I.m ready$/ })).toBeVisible();
    await boss.goForward();
    await expect(boss.getByRole('button', { name: /^I.m ready$/ })).toBeVisible();
    for (let match = 0; match < 2; match++) {
      await ready(hero);
      await expect(hero.getByRole('button', { name: 'Begin raid', exact: true })).toBeDisabled();
      await ready(boss);
      await hero.getByRole('button', { name: 'Begin raid', exact: true }).click();
      await expect(hero.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
      for (let i = 0; i < 220; i++) {
        const ui = await hero.evaluate(() => ({
          done: !!document.querySelector('.result-card'),
          strike: !document.querySelector<HTMLButtonElement>('button[aria-label="Strike"]')
            ?.disabled,
          special: !document.querySelector<HTMLButtonElement>('button[aria-label="Overdrive"]')
            ?.disabled,
        }));
        if (ui.done) break;
        if (ui.special) await hero.keyboard.press('Space');
        else if (ui.strike) await hero.keyboard.press('j');
        await hero.waitForTimeout(120);
      }
      await expect(
        hero.getByRole('heading', { name: 'Reality reclaimed.', exact: true }),
      ).toBeVisible();
      await expect(
        boss.getByRole('heading', { name: 'Your reign is over.', exact: true }),
      ).toBeVisible();
      await expect(hero.getByTestId('boss-hp')).toHaveText('0 / 120');
      await expect(boss.getByTestId('boss-hp')).toHaveText('0 / 120');
      if (match === 0) await hero.getByRole('button', { name: 'Raid again', exact: true }).click();
    }
    expect(errors).toEqual([]);
    await hero.getByRole('button', { name: 'Leave raid', exact: true }).click();
    await expect(boss.getByText('The hero left the raid.', { exact: true })).toBeVisible();
  } finally {
    await heroContext.close();
    await bossContext.close();
  }
});
