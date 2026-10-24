import { test, expect, type Page } from '@playwright/test';
async function ready(page: Page) {
  await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
}
async function start(page: Page) {
  await ready(page);
  await page.getByRole('button', { name: 'Begin raid', exact: true }).click();
  await expect(page.getByTestId('game-stage')).toBeVisible();
  await expect(page.locator('canvas[data-renderer="three"]')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
}
test('training match: real controls, breach, victory, recap and rematch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /THREE|WebGL|shader/i.test(m.text())) errors.push(m.text());
  });
  await page.goto('/');
  await expect(page.getByText('RAID SERVER ONLINE', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Try solo training', exact: true }).click();
  await expect(page.getByText('Your training room', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/lobby-desktop.png', fullPage: true });
  await start(page);
  await page.keyboard.press('k');
  await page.screenshot({ path: 'docs/screenshots/arena-3d-duel.png', fullPage: true });
  let breached = false;
  // Read visible controls once per decision and defend before attacking. Serial
  // screenshots/locator round trips can otherwise outlast an 800ms wind-up.
  for (let i = 0; i < 220; i++) {
    const ui = await page.evaluate(() => {
      const ready = (name: string) => {
        const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
        return !!button && !button.disabled;
      };
      return {
        done: !!document.querySelector('.result-card'),
        breached: !!document.querySelector('.is-reality'),
        warning: !!document.querySelector('.attack-warning'),
        strike: ready('Strike'),
        special: ready('Overdrive'),
        evade: ready('Evade'),
        guard: ready('Guard'),
      };
    });
    if (ui.breached) breached = true;
    if (ui.done) break;
    if (ui.warning && ui.evade) await page.keyboard.press('l');
    else if (ui.warning && ui.guard) await page.keyboard.press('k');
    if (ui.special) await page.keyboard.press('Space');
    else if (ui.strike) await page.keyboard.press('j');
    await page.waitForTimeout(120);
  }
  expect(breached).toBe(true);
  await expect(
    page.getByRole('heading', { name: 'Reality reclaimed.', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('status', { name: 'Mission passed', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/victory-desktop.png', fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save recap', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('ghostwire-raid-recap.png');
  await page.getByRole('button', { name: 'Raid again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'I’m ready', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('two independent players share combat, camera, breach, reload recovery and rematch', async ({
  browser,
}) => {
  const heroContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    bossContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['camera'],
    });
  const hero = await heroContext.newPage(),
    boss = await bossContext.newPage();
  const errors: string[] = [];
  hero.on('pageerror', (e) => errors.push(e.message));
  boss.on('pageerror', (e) => errors.push(e.message));
  await hero.goto('/');
  await hero.getByRole('button', { name: 'Create a raid', exact: true }).click();
  const url = await hero.getByRole('textbox', { name: 'Invite URL', exact: true }).inputValue();
  await hero.reload();
  await expect(hero.getByRole('textbox', { name: 'Invite URL', exact: true })).toHaveValue(url);
  await boss.goto(url);
  await boss.getByRole('button', { name: 'Possess the boss', exact: true }).click();
  await boss.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(boss.getByText('CAMERA ON', { exact: true })).toBeVisible();
  await expect(boss.getByText(/Tracking lost|Motion tracking active|Hold neutral/)).toBeVisible({
    timeout: 30000,
  });
  await boss.getByRole('checkbox', { name: 'Motion controls', exact: true }).uncheck();
  await boss.getByRole('combobox', { name: 'Tracking mode', exact: true }).selectOption('pose');
  await boss.screenshot({ path: 'docs/screenshots/boss-mobile-lobby.png', fullPage: true });
  await ready(boss);
  await start(hero);
  await expect(boss.getByRole('button', { name: 'Swipe', exact: true })).toBeEnabled();
  await expect(
    boss.getByRole('checkbox', { name: 'Motion controls', exact: true }),
  ).not.toBeChecked();
  await expect(boss.getByRole('combobox', { name: 'Tracking mode', exact: true })).toHaveValue(
    'pose',
  );
  await hero.getByRole('button', { name: 'Strike', exact: true }).click();
  await expect(boss.getByTestId('boss-hp')).toContainText('114');
  await expect(hero.getByTestId('boss-hp')).toHaveText(
    await boss.getByTestId('boss-hp').innerText(),
  );
  await boss.getByRole('button', { name: 'Swipe', exact: true }).click();
  await expect(hero.getByTestId('hero-hp')).toContainText('90');
  await boss.reload();
  await expect(boss.getByRole('button', { name: 'Swipe', exact: true })).toBeEnabled();
  await expect(hero.getByTestId('hero-hp')).toContainText('90');
  await boss.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(boss.getByText('CAMERA ON', { exact: true })).toBeVisible();
  if (await boss.getByRole('checkbox', { name: 'Motion controls' }).isChecked())
    await boss.getByRole('checkbox', { name: 'Motion controls' }).uncheck();
  for (let i = 0; i < 14; i++) {
    const strike = hero.getByRole('button', { name: 'Strike', exact: true });
    if (await strike.isEnabled()) await strike.click();
    await hero.waitForTimeout(480);
    if (await hero.getByText('02 / REALITY BREACH', { exact: true }).isVisible()) break;
  }
  await expect(hero.getByText('LIVE · BOSS CAMERA', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(hero.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
  await expect(hero.locator('canvas[data-renderer="three"]')).toHaveAttribute(
    'data-hero-anchor',
    '0.500,0.790',
  );
  await hero.screenshot({ path: 'docs/screenshots/breach-synthetic-camera.png', fullPage: true });
  await boss.screenshot({ path: 'docs/screenshots/boss-mobile-battle.png', fullPage: true });
  expect(await boss.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const stage = await boss.getByTestId('game-stage').boundingBox();
  await boss
    .getByTestId('game-stage')
    .click({ position: { x: stage!.width * 0.5, y: stage!.height * 0.79 } });
  await boss.getByRole('button', { name: 'Swipe', exact: true }).click();
  await expect(hero.getByTestId('hero-hp')).toContainText('80');
  // Keyboard input must work even after a touch button retained focus.
  await hero.getByRole('button', { name: 'Guard', exact: true }).click();
  await hero.keyboard.press('j');
  await expect(hero.getByTestId('boss-hp')).toContainText('52');
  await boss.getByRole('button', { name: 'Stop camera', exact: true }).click();
  await expect(hero.getByText('VIRTUAL ARENA · NO LIVE CAMERA', { exact: true })).toBeVisible();
  await hero.getByRole('button', { name: 'Leave raid', exact: true }).click();
  await expect(boss.getByText('The hero left the raid.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await heroContext.close();
  await bossContext.close();
});
test('mobile layout and denied camera preserve playable controls', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    page = await context.newPage();
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/screenshots/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page
      .locator('.hero-copy h1')
      .evaluate((e) => e.getBoundingClientRect().right <= innerWidth),
  ).toBe(true);
  await page.getByRole('button', { name: /Hollow Moon/ }).click();
  await page.getByRole('button', { name: 'Try solo training', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'The Hollow Monarch', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByText(/Camera permission was declined/)).toBeVisible();
  await start(page);
  await page.getByRole('button', { name: 'Strike', exact: true }).click();
  await expect(page.getByTestId('boss-hp')).not.toHaveText('110 / 110');
  await context.close();
});
test('a non-defending hero loses and combat stops at zero health', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try solo training', exact: true }).click();
  await start(page);
  await expect(page.getByRole('heading', { name: 'The rift remains.', exact: true })).toBeVisible({
    timeout: 50000,
  });
  await expect(page.getByTestId('hero-hp')).toHaveText('0 / 100');
  await expect(page.getByRole('status', { name: 'Mission failed', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/defeat-desktop.png', fullPage: true });
  await expect(page.getByRole('button', { name: 'Strike', exact: true })).toHaveCount(0);
});
