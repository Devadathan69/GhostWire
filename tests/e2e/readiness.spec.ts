import { test, expect } from '@playwright/test';
test('retries graphics readiness when the first confirmation is lost', async ({ page }) => {
  let dropped = false,
    confirmations = 0;
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const upstream = route.connectToServer();
    route.onMessage((message) => {
      if (typeof message === 'string' && message.includes('battle:render-ready')) {
        confirmations++;
        if (!dropped) {
          dropped = true;
          return;
        }
      }
      upstream.send(message);
    });
    upstream.onMessage((message) => route.send(message));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Train with AI ally', exact: true }).click();
  await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await page.getByRole('button', { name: 'Begin raid', exact: true }).click();
  await expect(page.locator('canvas[data-renderer=three]')).toHaveAttribute('data-ready', 'true', {
    timeout: 55000,
  });
  await expect(page.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled({
    timeout: 20000,
  });
  expect(dropped).toBe(true);
  expect(confirmations).toBeGreaterThanOrEqual(2);
});
