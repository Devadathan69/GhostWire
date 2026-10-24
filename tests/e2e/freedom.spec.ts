import { test, expect } from '@playwright/test';
test('free walking, sprint, jumping, kicking, powers and exact instructions remain playable', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /THREE|shader/i.test(m.text())) errors.push(m.text());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a raid', exact: true }).click();
  const bossContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    boss = await bossContext.newPage();
  await boss.goto(
    await page.getByRole('textbox', { name: 'Invite URL', exact: true }).inputValue(),
  );
  await boss.getByRole('button', { name: 'Join the squad', exact: true }).click();
  await boss.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await page.getByRole('button', { name: 'Begin raid', exact: true }).click();
  const canvas = page.locator('canvas[data-renderer="three"]');
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: 'Jump', exact: true })).toBeEnabled();
  await Promise.all([
    page.getByRole('button', { name: 'Overdrive', exact: true }).click(),
    boss.getByRole('button', { name: 'Overdrive', exact: true }).click(),
  ]);
  await expect(canvas).toHaveAttribute('data-active-effect', /thunder_strike/);
  await expect(page.getByTestId('boss-hp')).not.toHaveText('360 / 360');
  const origin = await canvas.getAttribute('data-hero-world');
  await page.keyboard.down('w');
  await page.waitForTimeout(550);
  await page.keyboard.up('w');
  await page.waitForTimeout(200);
  const moved = await canvas.getAttribute('data-hero-world');
  expect(Number(moved!.split(',')[1])).toBeLessThan(Number(origin!.split(',')[1]) - 0.7);
  await page.waitForTimeout(400);
  expect(await canvas.getAttribute('data-hero-world')).toBe(moved);
  await page.keyboard.down('Shift');
  await page.keyboard.down('a');
  await page.waitForTimeout(400);
  await page.keyboard.up('a');
  await page.keyboard.up('Shift');
  await page.keyboard.press('e');
  if (!(await page.getByRole('button', { name: 'Kick', exact: true }).isEnabled())) {
    await page.getByText('World map · travel & invites', { exact: true }).click();
    const bossRealm = page
      .locator('.realm-card')
      .filter({ has: page.locator('.eyebrow').filter({ hasText: ' · BOSS' }) });
    await bossRealm.getByRole('button', { name: 'Travel here', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Kick', exact: true })).toBeEnabled();
  }
  await page.getByRole('button', { name: 'Kick', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kick', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Hero controls');
  await expect(page.getByRole('dialog')).toContainText('Revive');
  await expect(page.getByRole('dialog')).toContainText('Hold Shift');
  await page.getByRole('button', { name: 'Close instructions', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/coop-movement.png', fullPage: true });
  await page.getByRole('button', { name: 'Leave raid', exact: true }).click();
  expect(errors).toEqual([]);
  await bossContext.close();
});
