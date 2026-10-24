import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import fixture from '../fixtures/ai-avengers.json' with { type: 'json' };
import { CreativeEncounterSchema } from '@ghostwire/shared';
import { ready, fight, startPilots } from './helpers';
const spec = CreativeEncounterSchema.parse(fixture.spec);
type EvidenceWindow = typeof window & {
  aiRaidEvidence: { effects: string[]; warnings: string[]; phases: string[] };
};
async function observe(page: Page) {
  await page.evaluate(() => {
    const w = window as EvidenceWindow;
    w.aiRaidEvidence = { effects: [], warnings: [], phases: [] };
    setInterval(() => {
      const c = document.querySelector<HTMLCanvasElement>('canvas[data-renderer=three]');
      for (const effect of (c?.dataset.activeEffect ?? '').split(','))
        if (effect && !w.aiRaidEvidence.effects.includes(effect))
          w.aiRaidEvidence.effects.push(effect);
      const warning = document.querySelector('.attack-warning')?.textContent ?? '';
      if (warning && !w.aiRaidEvidence.warnings.includes(warning))
        w.aiRaidEvidence.warnings.push(warning);
      const phase = c?.dataset.phase;
      if (phase && !w.aiRaidEvidence.phases.includes(phase)) w.aiRaidEvidence.phases.push(phase);
    }, 100);
  });
}
async function exerciseKeys(page: Page) {
  return page.evaluate(async () => {
    const send = (key: string, type: 'keydown' | 'keyup') =>
      document.body.dispatchEvent(
        new KeyboardEvent(type, { key, bubbles: true, cancelable: true }),
      );
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let held = '';
    const walk = setInterval(() => {
      const next = ['w', 'd', 's', 'a'][Math.floor(performance.now() / 750) % 4];
      if (next !== held) {
        if (held) send(held, 'keyup');
        send(next, 'keydown');
        held = next;
      }
    }, 100);
    const used: string[] = [];
    try {
      for (const action of ['dodge', 'jump', 'guard', 'punch', 'kick', 'special']) {
        const button = document.querySelector<HTMLButtonElement>(
          `.action-button[data-action="${action}"]`,
        )!;
        const before = Number(button.dataset.readyAt),
          deadline = performance.now() + 6000;
        while (Number(button.dataset.readyAt) <= before) {
          if (performance.now() > deadline)
            throw Error(`Generated ${action} key did not reach combat.`);
          if (!button.disabled) {
            send(button.dataset.key!, 'keydown');
            send(button.dataset.key!, 'keyup');
          }
          await wait(80);
        }
        used.push(action);
        await wait(
          action === 'special' ? 1200 : action === 'kick' ? 400 : action === 'punch' ? 250 : 100,
        );
      }
      return used;
    } finally {
      clearInterval(walk);
      if (held) send(held, 'keyup');
    }
  });
}

test('actual gpt-6.1-sol heroes, powers and world complete a three-device cooperative raid', async ({
  browser,
}) => {
  test.setTimeout(300000);
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 1366, height: 950 }, permissions: ['camera'] }),
    browser.newContext({ viewport: { width: 393, height: 852 } }),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
  ]);
  const [host, peer, late] = await Promise.all(contexts.map((c) => c.newPage())),
    pages = [host, peer, late],
    errors: string[] = [];
  pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  try {
    await host.goto('/');
    await host.getByRole('textbox', { name: 'Your hero name' }).fill('Live AI host');
    await host.getByRole('button', { name: 'Create a world', exact: true }).click();
    // Reuse the unmodified response from the real paid API check. This test
    // exercises import/preview/save and combat without buying another generation.
    await host.getByRole('button', { name: 'Build local blueprint', exact: true }).click();
    await host.getByText('Advanced full blueprint editor', { exact: true }).click();
    await host
      .getByRole('textbox', { name: 'Full blueprint JSON', exact: true })
      .fill(JSON.stringify(spec));
    await host.getByRole('button', { name: 'Apply validated blueprint', exact: true }).click();
    await expect(
      host.getByText('Imported blueprint · validated and ready for review.', { exact: true }),
    ).toBeVisible();
    await host.screenshot({ path: 'docs/screenshots/live-ai-preview.png', fullPage: true });
    await host.getByRole('button', { name: 'Create lobby with this world', exact: true }).click();
    await expect(host.getByRole('heading', { name: 'Thanos', exact: true })).toBeVisible();
    const invite = await host
      .getByRole('textbox', { name: 'Invite URL', exact: true })
      .inputValue();
    await peer.goto(invite);
    await peer.getByRole('textbox', { name: 'Your hero name' }).fill('Live AI phone');
    await peer.getByRole('button', { name: 'Join the squad', exact: true }).click();
    await peer.getByLabel('Choose your hero', { exact: true }).selectOption('1');
    await host.getByRole('button', { name: 'Enable camera', exact: true }).click();
    await expect(host.getByText('CAMERA ON', { exact: true })).toBeVisible();
    await host.getByRole('checkbox', { name: 'Motion controls', exact: true }).uncheck();
    await ready(peer);
    await ready(host);
    await host.getByRole('button', { name: 'Begin raid', exact: true }).click();
    for (const p of [host, peer]) {
      await expect(p.locator('canvas[data-renderer=three]')).toHaveAttribute('data-ready', 'true', {
        timeout: 55000,
      });
      await observe(p);
    }
    await expect(host.locator('.stage-topline')).toContainText(spec.creation.environment.name);
    const home = await host.locator('.squad-member[data-self=true]').getAttribute('data-region');
    await peer.getByText('World map · travel & invites', { exact: true }).click();
    await peer
      .locator(`.realm-card[data-region-id="${home}"]`)
      .getByRole('button', { name: 'Travel here', exact: true })
      .click();
    await expect(peer.locator('.squad-member[data-self=true]')).toHaveAttribute(
      'data-region',
      home!,
    );
    const exercised = await Promise.all([host, peer].map(exerciseKeys));
    for (const actions of exercised)
      expect(actions).toEqual(['dodge', 'jump', 'guard', 'punch', 'kick', 'special']);
    // A real touch/click path for the phone's generated Mandala Fist.
    await peer.locator('.action-button[data-action=punch]').click();
    await startPilots([host, peer], false);
    await late.goto(invite);
    await late.getByRole('textbox', { name: 'Your hero name' }).fill('Live AI reinforcement');
    await late.getByRole('button', { name: 'Join the squad', exact: true }).click();
    await expect(late.locator('canvas[data-renderer=three]')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 55000 },
    );
    await expect(late.locator('.action-button[data-action=punch]')).toHaveAttribute(
      'data-key',
      '1',
    );
    await observe(late);
    await expect(host.locator('.realm-card')).toHaveCount(3);
    await expect(host.getByTestId('boss-hp')).toContainText('/ 553');
    expect(await fight(pages, true)).toBe(true);
    await expect(host.getByText('LIVE · YOUR CAMERA', { exact: true })).toBeVisible();
    await expect(peer.getByText('VIRTUAL ARENA · NO LIVE CAMERA', { exact: true })).toBeVisible();
    await host.screenshot({ path: 'docs/screenshots/live-ai-breach.png', fullPage: true });
    await late.screenshot({ path: 'docs/screenshots/live-ai-mobile.png', fullPage: true });
    await fight(pages);
    const evidence = [];
    for (const [index, p] of pages.entries()) {
      await expect(p.getByRole('status', { name: 'Mission passed', exact: true })).toBeVisible();
      await expect(p.getByTestId('boss-hp')).toHaveText('0 / 553');
      const damage = Number(
        await p.locator('.squad-member[data-self=true]').getAttribute('data-damage'),
      );
      expect(damage).toBeGreaterThan(0);
      const observed = await p.evaluate(() => (window as EvidenceWindow).aiRaidEvidence);
      expect(observed.phases).toContain('REALITY');
      evidence.push({ hero: spec.creation.heroes[index].name, damage, ...observed });
    }
    const effects = evidence.flatMap((e) => e.effects);
    for (const hero of spec.creation.heroes)
      expect(effects).toContain(hero.abilities.find((a) => a.action === 'special')!.effect);
    const warnings = evidence.flatMap((e) => e.warnings).join('\n');
    for (const attack of spec.creation.boss.attacks) expect(warnings).toContain(attack.name);
    await host.screenshot({ path: 'docs/screenshots/live-ai-victory.png', fullPage: true });
    await mkdir('.local/live-ai', { recursive: true });
    await writeFile(
      '.local/live-ai/multiplayer-result.json',
      JSON.stringify(
        {
          at: new Date().toISOString(),
          model: fixture.model,
          generatedAt: fixture.generatedAt,
          keysAndGestures: spec.creation.heroes.map((h) => ({
            name: h.name,
            controls: h.abilities.map((a) => ({
              action: a.action,
              key: a.key,
              gesture: a.gesture,
            })),
          })),
          evidence,
          errors,
        },
        null,
        2,
      ),
    );
    await host.getByRole('button', { name: 'Raid again', exact: true }).click();
    await expect(host.getByRole('button', { name: 'Begin raid', exact: true })).toBeDisabled();
    await expect(peer.getByLabel('Choose your hero', { exact: true })).toHaveValue('1');
    expect(errors).toEqual([]);
  } finally {
    const state = await Promise.allSettled(
      pages.map((p) =>
        p.evaluate(() => ({
          phase: document.querySelector<HTMLCanvasElement>('canvas[data-renderer=three]')?.dataset
            .phase,
          heroes: [...document.querySelectorAll<HTMLElement>('.squad-member')].map((h) => ({
            self: h.dataset.self,
            hp: h.dataset.hp,
            damage: h.dataset.damage,
            region: h.dataset.region,
          })),
          observed: (window as EvidenceWindow).aiRaidEvidence,
        })),
      ),
    );
    await mkdir('.local/live-ai', { recursive: true });
    await writeFile('.local/live-ai/browser-final-state.json', JSON.stringify(state, null, 2));
    for (const c of contexts) await c.close();
  }
});
