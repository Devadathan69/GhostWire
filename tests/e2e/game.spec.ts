import { test, expect } from '@playwright/test';
import { ready, start, fight } from './helpers';

test('training with an AI ally completes the cooperative boss, breach, team outcome and recap', async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText('RAID SERVER ONLINE', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/coop-home.png', fullPage: true });
  await page.getByRole('button', { name: 'Train with AI ally', exact: true }).click();
  await expect(page.getByText('Echo · AI ally', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/coop-lobby.png', fullPage: true });
  await start(page);
  await expect(page.locator('canvas[data-renderer="three"]')).toHaveAttribute('data-heroes', '2');
  await page.screenshot({ path: 'docs/screenshots/coop-arena.png', fullPage: true });
  expect(await fight([page])).toBe(true);
  await expect(page.getByRole('status', { name: 'Mission passed', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/coop-victory.png', fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save recap', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('ghostwire-raid-recap.png');
  await page.getByRole('button', { name: 'Raid again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'I’m ready', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('two human heroes coordinate, share a camera-backed breach, reconnect and win two raids', async ({
  browser,
}) => {
  test.setTimeout(240000);
  const c1 = await browser.newContext({
      viewport: { width: 1200, height: 900 },
      permissions: ['camera'],
    }),
    c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await c1.newPage(),
    peer = await c2.newPage(),
    errors: string[] = [];
  for (const p of [host, peer]) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await host.goto('/');
    await host.getByRole('textbox', { name: 'Your hero name' }).fill('Nova');
    await host.getByRole('button', { name: 'Create a raid', exact: true }).click();
    await expect(host.getByRole('button', { name: 'Begin raid', exact: true })).toBeDisabled();
    const url = await host.getByRole('textbox', { name: 'Invite URL', exact: true }).inputValue();
    await host.reload();
    await expect(host.getByRole('textbox', { name: 'Invite URL', exact: true })).toHaveValue(url);
    await peer.goto(url);
    await peer.getByRole('textbox', { name: 'Your hero name' }).fill('Atlas');
    await peer.getByRole('button', { name: 'Join the squad', exact: true }).click();
    await expect(peer.getByText('Nova · leader', { exact: true })).toBeVisible();
    await host.getByRole('button', { name: 'Enable camera', exact: true }).click();
    await expect(host.getByText('CAMERA ON', { exact: true })).toBeVisible();
    await host.getByRole('checkbox', { name: 'Motion controls', exact: true }).uncheck();
    await peer.screenshot({ path: 'docs/screenshots/coop-mobile-lobby.png', fullPage: true });
    for (let n = 0; n < 2; n++) {
      await ready(peer);
      await start(host);
      await expect(peer.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
      await expect(host.locator('canvas[data-renderer="three"]')).toHaveAttribute(
        'data-heroes',
        '2',
      );
      if (n === 0) {
        await host.getByRole('button', { name: 'Strike', exact: true }).click();
        await host.waitForTimeout(250);
        await expect(host.getByTestId('boss-hp')).toHaveText('360 / 360');
        expect(await fight([host, peer], true)).toBe(true);
        await expect(host.getByText('LIVE · YOUR CAMERA', { exact: true })).toBeVisible();
        await expect(
          peer.getByText('VIRTUAL ARENA · NO LIVE CAMERA', { exact: true }),
        ).toBeVisible();
        await c2.setOffline(true);
        await expect(
          host.getByRole('heading', { name: 'Signal interrupted.', exact: true }),
        ).toBeVisible();
        await Promise.all([
          host.screenshot({ path: 'docs/screenshots/coop-reconnect.png', fullPage: true }),
          peer.screenshot({ path: 'docs/screenshots/coop-mobile-battle.png', fullPage: true }),
        ]);
        await host.getByRole('button', { name: 'Stop camera', exact: true }).click();
        await c2.setOffline(false);
        await peer.reload();
        await expect(peer.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
        await expect(
          host.getByText('VIRTUAL ARENA · NO LIVE CAMERA', { exact: true }),
        ).toBeVisible();
      }
      await fight([host, peer]);
      for (const p of [host, peer]) {
        await expect(p.getByRole('status', { name: 'Mission passed', exact: true })).toBeVisible();
        await expect(p.getByTestId('boss-hp')).toHaveText('0 / 360');
      }
      if (n === 0) {
        await host.getByRole('button', { name: 'Raid again', exact: true }).click();
        await expect(host.getByRole('button', { name: 'Begin raid', exact: true })).toBeDisabled();
        await expect(peer.getByRole('button', { name: 'I’m ready', exact: true })).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await c1.close();
    await c2.close();
  }
});

test('four hero lobby rejects a fifth and keeps everyone on the same team', async ({ browser }) => {
  const contexts = await Promise.all(
    Array.from({ length: 5 }, () => browser.newContext({ viewport: { width: 390, height: 844 } })),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  try {
    await pages[0].goto('/');
    await pages[0].getByRole('button', { name: 'Create a raid', exact: true }).click();
    const url = await pages[0].getByRole('textbox', { name: 'Invite URL' }).inputValue();
    for (const p of pages.slice(1)) {
      await p.goto(url);
      await p.getByRole('button', { name: 'Join the squad', exact: true }).click();
    }
    await expect(pages[0].getByText('4/4 heroes joined.', { exact: false })).toBeVisible();
    await expect(pages[4].getByRole('alert')).toContainText('squad is full');
    await expect(pages[0].getByRole('button', { name: 'Begin raid', exact: true })).toBeDisabled();
    await pages[0].screenshot({ path: 'docs/screenshots/coop-four-heroes.png', fullPage: true });
  } finally {
    for (const c of contexts) await c.close();
  }
});

test('mobile denial preserves manual co-op controls and a real boss-driven team defeat', async ({
  browser,
}) => {
  test.setTimeout(140000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    page = await context.newPage();
  const allyContext = await browser.newContext(),
    ally = await allyContext.newPage();
  try {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Denied', 'NotAllowedError'));
    });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'docs/screenshots/coop-home-mobile.png', fullPage: true });
    await page.getByRole('button', { name: /Hollow Moon/ }).click();
    await page.getByRole('button', { name: 'Create a raid', exact: true }).click();
    await ally.goto(await page.getByRole('textbox', { name: 'Invite URL' }).inputValue());
    await ally.getByRole('button', { name: 'Join the squad', exact: true }).click();
    await ready(ally);
    await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
    await expect(page.getByText(/Camera permission was declined/)).toBeVisible();
    await start(page);
    await page.getByRole('button', { name: 'Strike', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Mission failed', exact: true })).toBeVisible({
      timeout: 110000,
    });
    await expect(page.getByRole('button', { name: 'Strike', exact: true })).toHaveCount(0);
    await page.screenshot({ path: 'docs/screenshots/coop-defeat.png', fullPage: true });
  } finally {
    await context.close();
    await allyContext.close();
  }
});
