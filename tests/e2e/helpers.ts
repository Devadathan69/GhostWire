import { expect, type Page } from '@playwright/test';
export async function ready(page: Page) {
  await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
}
export async function start(page: Page) {
  await ready(page);
  await page.getByRole('button', { name: 'Begin raid', exact: true }).click();
  await expect(page.locator('canvas[data-renderer="three"]')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
}
export async function fight(pages: Page[], untilBreach = false) {
  let breached = false;
  const held = pages.map(() => new Set<string>());
  const deadline = Date.now() + 100000;
  while (Date.now() < deadline) {
    const states = await Promise.all(
      pages.map((page) =>
        page.evaluate(() => {
          const ready = (name: string) => {
            const b = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
            return !!b && !b.disabled;
          };
          const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-renderer="three"]');
          return {
            done: !!document.querySelector('.result-card'),
            phase: canvas?.dataset.phase,
            hero: canvas?.dataset.heroWorld,
            boss: canvas?.dataset.bossWorld,
            impact: Number(canvas?.dataset.impactIn ?? 99999),
            strike: ready('Strike'),
            special: ready('Overdrive'),
            evade: ready('Evade'),
            jump: ready('Jump'),
            guard: ready('Guard'),
          };
        }),
      ),
    );
    if (states.some((s) => s.phase === 'REALITY')) breached = true;
    if (states.every((s) => s.done) || (untilBreach && states.every((s) => s.phase === 'REALITY')))
      break;
    await Promise.all(
      pages.map(async (page, i) => {
        const ui = states[i];
        if (ui.done) return;
        const h = (ui.hero ?? '0,0').split(',').map(Number),
          b = (ui.boss ?? '0,0').split(',').map(Number);
        const dx = b[0] - h[0],
          dz = b[1] - h[1],
          walk = ui.phase === 'ARENA' && Math.hypot(dx, dz) > 2.7;
        const keys = held[i];
        for (const [key, held] of [
          ['a', walk && dx < -0.25],
          ['d', walk && dx > 0.25],
          ['w', walk && dz < -0.25],
          ['s', walk && dz > 0.25],
        ] as const)
          if (held && !keys.has(key)) {
            await page.keyboard.down(key);
            keys.add(key);
          } else if (!held && keys.has(key)) {
            await page.keyboard.up(key);
            keys.delete(key);
          }
        if (ui.impact < 550) {
          if (ui.evade) await page.keyboard.press('l');
          else if (ui.jump) await page.keyboard.press('e');
          else if (ui.guard) await page.keyboard.press('k');
        }
        if (ui.special) await page.keyboard.press('Space');
        else if (ui.strike) await page.keyboard.press('j');
      }),
    );
    await pages[0].waitForTimeout(130);
  }
  for (const page of pages) for (const key of ['a', 'd', 'w', 's']) await page.keyboard.up(key);
  return breached;
}
