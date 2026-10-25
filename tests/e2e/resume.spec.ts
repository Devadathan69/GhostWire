import { test, expect } from '@playwright/test';

test('a lost resume message preserves the same hero and retries without adding a realm', async ({
  page,
}) => {
  let dropped = 0,
    interceptedAt = 0;
  const dropResume = (message: string) => {
    if (dropped || !message.includes('"room:resume"')) return false;
    dropped++;
    interceptedAt = Date.now();
    return true;
  };
  // Socket.IO may resume over polling before upgrading to WebSocket. Drop
  // exactly one real request on either transport, replacing a polling packet
  // with an Engine.IO noop so the connection itself remains healthy.
  await page.route('**/socket.io/**', (route) => {
    const body = route.request().postData();
    if (route.request().method() !== 'POST' || !body) return route.continue();
    return route.continue({
      postData: body
        .split('\x1e')
        .map((p) => (dropResume(p) ? '6' : p))
        .join('\x1e'),
    });
  });
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const upstream = route.connectToServer();
    route.onMessage((message) => {
      if (typeof message === 'string' && dropResume(message)) return;
      upstream.send(message);
    });
    upstream.onMessage((message) => route.send(message));
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Your hero name' }).fill('Recovery hero');
  await page.getByRole('button', { name: 'Create a raid', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'The Ember Colossus', exact: true }),
  ).toBeVisible();
  const invite = await page.getByRole('textbox', { name: 'Invite URL', exact: true }).inputValue();
  await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ready · click to unready', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect.poll(() => dropped).toBe(1);
  await expect(page.getByRole('heading', { name: 'The Ember Colossus', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('textbox', { name: 'Invite URL', exact: true })).toHaveValue(invite);
  await expect(page.getByText('Recovery hero (you) · leader', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ready · click to unready', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('1/4 heroes joined.', { exact: false })).toBeVisible();
  expect(dropped).toBe(1);
  expect(Date.now() - interceptedAt).toBeGreaterThan(7000);
});
