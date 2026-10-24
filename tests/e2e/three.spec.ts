import { test, expect } from '@playwright/test';

test('3D Tempest arena preserves lanes across perspective changes and recovers graphics', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /THREE|shader/i.test(m.text())) errors.push(m.text());
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Tempest SKY/ }).click();
  await page.getByRole('button', { name: 'Try solo training', exact: true }).click();
  await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await page.getByRole('button', { name: 'Begin raid', exact: true }).click();
  const canvas = page.locator('canvas[data-renderer="three"]');
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: 'Move left', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Move left', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-hero-anchor', '0.210,0.790');
  await page.getByRole('button', { name: 'Switch to overlook view', exact: true }).click();
  await page.getByRole('button', { name: 'Guard', exact: true }).click();
  await page.getByRole('button', { name: 'Move right', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-hero-anchor', '0.345,0.790');
  await page.screenshot({ path: 'docs/screenshots/arena-3d-overlook.png', fullPage: true });
  await canvas.evaluate((element) => {
    const extension = (element as HTMLCanvasElement)
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!;
    (window as typeof window & { restoreGraphics?: () => void }).restoreGraphics = () =>
      extension.restoreContext();
    extension.loseContext();
  });
  await expect(page.getByRole('alert')).toContainText('3D view unavailable');
  await expect(canvas).not.toHaveAttribute('data-ready', 'true');
  await page.evaluate(() =>
    (window as typeof window & { restoreGraphics: () => void }).restoreGraphics(),
  );
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  await expect(canvas).toHaveAttribute('data-hero-anchor', '0.345,0.790');
  await page.getByRole('button', { name: 'Leave raid', exact: true }).click();
  await expect(canvas).toHaveCount(0);
  expect(errors).toEqual([]);
});
