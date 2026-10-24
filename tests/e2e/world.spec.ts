import { test, expect } from '@playwright/test';
import { ready, start } from './helpers';

test('device realms support watching, travel, boss invasions and late world expansion', async ({
  browser,
}) => {
  test.setTimeout(150000);
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
  ]);
  const [host, peer, late] = await Promise.all(contexts.map((c) => c.newPage()));
  const errors: string[] = [];
  [host, peer, late].forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  try {
    await host.goto('/');
    await host.getByRole('textbox', { name: 'Your hero name' }).fill('Nova');
    await host.getByRole('button', { name: 'Create a raid', exact: true }).click();
    const invite = await host
      .getByRole('textbox', { name: 'Invite URL', exact: true })
      .inputValue();
    await peer.goto(invite);
    await peer.getByRole('textbox', { name: 'Your hero name' }).fill('Atlas');
    await peer.getByRole('button', { name: 'Join the squad', exact: true }).click();
    await ready(peer);
    await start(host);
    await host.getByText('World map · travel & invites', { exact: true }).click();
    await expect(host.locator('canvas[data-renderer=three]')).toHaveAttribute(
      'data-visible-heroes',
      '1',
    );
    const mine = host.locator('.squad-member[data-self=true]'),
      other = host.locator('.squad-member[data-self=false]');
    const home = await mine.getAttribute('data-region'),
      destination = await other.getAttribute('data-region');
    expect(home).not.toBe(destination);
    const card = host.locator(`.realm-card[data-region-id="${destination}"]`);
    await card.getByRole('button', { name: 'Watch', exact: true }).click();
    await expect(host.getByRole('button', { name: 'Strike', exact: true })).toBeDisabled();
    await expect(host.locator('canvas[data-renderer=three]')).toHaveAttribute(
      'data-region',
      destination!,
    );
    await host.getByRole('button', { name: /Return view to my hero/ }).click();
    await expect(host.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
    await card.getByRole('button', { name: 'Travel here', exact: true }).click();
    await expect(mine).toHaveAttribute('data-region', destination!);
    await expect(host.locator('canvas[data-renderer=three]')).toHaveAttribute(
      'data-visible-heroes',
      '2',
    );
    await expect(host.locator('canvas[data-renderer=three]')).toHaveAttribute(
      'data-region',
      destination!,
    );
    await host.screenshot({ path: 'docs/screenshots/connected-realms.png', fullPage: true });
    await expect(host.locator('.region-stage-label')).toContainText('BOSS IN THIS REALM');
    await late.goto(invite);
    await late.getByRole('textbox', { name: 'Your hero name' }).fill('Luma');
    await late.getByRole('button', { name: 'Join the squad', exact: true }).click();
    await expect(host.locator('.realm-card')).toHaveCount(3);
    await expect(late.locator('canvas[data-renderer=three]')).toHaveAttribute('data-ready', 'true');
    await expect(late.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
    await expect(host.locator('canvas[data-renderer=three]')).toHaveAttribute('data-heroes', '3');
    await expect(host.getByTestId('boss-hp')).toHaveText('510 / 510');
    await late.screenshot({ path: 'docs/screenshots/expanded-mobile-realm.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    for (const c of contexts) await c.close();
  }
});

test('creator previews editable 3D characters, rejects duplicate controls and plays a saved custom raid', async ({
  browser,
}) => {
  test.setTimeout(150000);
  const c1 = await browser.newContext(),
    c2 = await browser.newContext();
  const host = await c1.newPage(),
    peer = await c2.newPage();
  const errors: string[] = [];
  [host, peer].forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  try {
    await host.goto('/');
    await host.getByRole('button', { name: 'Create a world', exact: true }).click();
    await host
      .getByRole('textbox', { name: 'HERO NAMES · COMMA SEPARATED (2–4)', exact: true })
      .fill('Astra, Luma');
    await host.getByRole('button', { name: 'Build local blueprint', exact: true }).click();
    await expect(host.locator('.forge-preview canvas')).toBeVisible();
    await expect(
      host.getByText('Local editable blueprint. No AI called.', { exact: true }),
    ).toBeVisible();
    await host.getByLabel('punch key', { exact: true }).selectOption('i');
    await host.getByRole('button', { name: 'Create lobby with this world', exact: true }).click();
    await expect(host.getByRole('alert')).toContainText('keyboard key');
    await host.getByLabel('punch key', { exact: true }).selectOption('u');
    await host.getByLabel('Power name', { exact: true }).first().fill('Stellar Jab');
    await host.screenshot({ path: 'docs/screenshots/creative-forge.png', fullPage: true });
    await host.getByRole('button', { name: 'Create lobby with this world', exact: true }).click();
    const invite = await host
      .getByRole('textbox', { name: 'Invite URL', exact: true })
      .inputValue();
    await peer.goto(invite);
    await peer.getByRole('button', { name: 'Join the squad', exact: true }).click();
    await peer.getByLabel('Choose your hero', { exact: true }).selectOption('1');
    await ready(peer);
    await ready(host);
    await host.getByRole('button', { name: 'Begin raid', exact: true }).click();
    await expect(host.locator('canvas[data-renderer=three]')).toHaveAttribute('data-ready', 'true');
    await expect(host.getByRole('button', { name: 'Stellar Jab', exact: true })).toBeEnabled();
    await host.locator('body').press('u');
    await expect(host.getByRole('button', { name: 'Stellar Jab', exact: true })).toBeDisabled();
    await host.getByText('Your power and motion guide', { exact: true }).click();
    await expect(host.locator('.custom-control-guide')).toContainText('Stellar Jab');
    await expect(host.locator('.custom-control-guide')).toContainText('Quick arm extension');
    await host.screenshot({ path: 'docs/screenshots/custom-raid.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await c1.close();
    await c2.close();
  }
});
