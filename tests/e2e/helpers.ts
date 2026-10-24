import { expect, type Page } from '@playwright/test';
export async function ready(page: Page) {
  await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
}
export async function defend(page: Page) {
  await page.evaluate(() => {
    let held = '';
    const send = (key: string, type: 'keydown' | 'keyup') =>
      document.body.dispatchEvent(
        new KeyboardEvent(type, { key, bubbles: true, cancelable: true }),
      );
    window.setInterval(() => {
      const walking = document.querySelector<HTMLButtonElement>('button[aria-label="Move left"]');
      const next =
        walking && !walking.disabled
          ? ['w', 'd', 's', 'a'][Math.floor(performance.now() / 1000) % 4]
          : '';
      if (next !== held) {
        if (held) send(held, 'keyup');
        if (next) send(next, 'keydown');
        held = next;
      }
      const stage = document.querySelector<HTMLElement>('[data-testid="game-stage"]');
      if (Number(stage?.dataset.impactIn ?? 99999) > 500) return;
      for (const [name, key] of [
        ['Evade', 'l'],
        ['Guard', 'k'],
        ['Jump', 'e'],
      ]) {
        const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
        if (!button || button.disabled) continue;
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
        document.body.dispatchEvent(
          new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }),
        );
        break;
      }
    }, 100);
  });
}
export async function start(page: Page) {
  await ready(page);
  await page.getByRole('button', { name: 'Begin raid', exact: true }).click();
  await expect(page.locator('canvas[data-renderer="three"]')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: 'Strike', exact: true })).toBeEnabled();
}

type PilotWindow = typeof window & { raidPilotStop?: () => void; raidPilotAttack?: boolean };
async function pilot(page: Page, index: number) {
  // Drive the same DOM keyboard handlers inside each test page. This avoids
  // cross-process key round trips starving two simultaneous software renderers.
  await page.evaluate((index) => {
    const win = window as PilotWindow;
    win.raidPilotStop?.();
    win.raidPilotAttack = true;
    const held = new Set<string>();
    let direction = index % 2 ? -1 : 1;
    const event = (key: string, type: 'keydown' | 'keyup') =>
      document.body.dispatchEvent(
        new KeyboardEvent(type, { key, bubbles: true, cancelable: true }),
      );
    const press = (key: string) => {
      event(key, 'keydown');
      event(key, 'keyup');
    };
    const release = () => {
      for (const key of held) event(key, 'keyup');
      held.clear();
    };
    const timer = window.setInterval(() => {
      const ready = (name: string) => {
        const b = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
        return !!b && !b.disabled;
      };
      const own = document.querySelector<HTMLElement>('.squad-member[data-self="true"]');
      const down = document.querySelector<HTMLElement>(
        '.squad-member[data-downed="true"][data-self="false"]',
      );
      const stage = document.querySelector<HTMLElement>('[data-testid="game-stage"]');
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-renderer="three"]');
      if (
        !own ||
        Number(own.dataset.hp) <= 0 ||
        !ready('Move left') ||
        document.querySelector('.result-card')
      ) {
        release();
        return;
      }
      const reality = canvas?.dataset.phase === 'REALITY',
        reviving = !!document.querySelector('.revive-progress');
      const h = ((down && reality ? own.dataset.screen : own.dataset.world) ?? '0,0')
        .split(',')
        .map(Number);
      const b = (
        (down ? (reality ? down.dataset.screen : down.dataset.world) : canvas?.dataset.bossWorld) ??
        '0,0'
      )
        .split(',')
        .map(Number);
      let dx = b[0] - h[0],
        dz = b[1] - h[1];
      let walk =
        !reviving &&
        (down ? Math.hypot(dx, dz) > (reality ? 0.1 : 2.2) : !reality && Math.hypot(dx, dz) > 2.7);
      if (reality && !down && !reviving) {
        const x = Number(own.dataset.screen?.split(',')[0] ?? 0.5);
        if (x > 0.8) direction = -1;
        else if (x < 0.15) direction = 1;
        dx = direction;
        dz = 0;
        walk = true;
      }
      for (const [key, wanted] of [
        ['a', walk && dx < -0.015],
        ['d', walk && dx > 0.015],
        ['w', walk && dz < -0.015],
        ['s', walk && dz > 0.015],
        ['Shift', walk],
      ] as const) {
        if (wanted && !held.has(key)) {
          event(key, 'keydown');
          held.add(key);
        } else if (!wanted && held.has(key)) {
          event(key, 'keyup');
          held.delete(key);
        }
      }
      if (reviving) return;
      if (down) {
        if (!walk) press('f');
        return;
      }
      if (Number(stage?.dataset.impactIn ?? 99999) < 500) {
        if (ready('Evade')) press('l');
        else if (ready('Jump')) press('e');
        else if (ready('Guard')) {
          press('k');
          return;
        }
      }
      if (win.raidPilotAttack) {
        if (ready('Overdrive')) press(' ');
        else if (ready('Strike')) press('j');
      }
    }, 100);
    win.raidPilotStop = () => {
      clearInterval(timer);
      release();
    };
  }, index);
}
export async function fight(pages: Page[], untilBreach = false) {
  await Promise.all(pages.map((p, i) => pilot(p, i)));
  let breached = false;
  const deadline = Date.now() + 100000;
  while (Date.now() < deadline) {
    const states = await Promise.all(
      pages.map((page) =>
        page.evaluate(() => ({
          done: !!document.querySelector('.result-card'),
          phase: document.querySelector<HTMLCanvasElement>('canvas[data-renderer="three"]')?.dataset
            .phase,
        })),
      ),
    );
    if (states.some((s) => s.phase === 'REALITY')) breached = true;
    if (untilBreach && states.every((s) => s.phase === 'REALITY')) {
      await Promise.all(
        pages.map((p) =>
          p.evaluate(() => {
            (window as PilotWindow).raidPilotAttack = false;
          }),
        ),
      );
      return true;
    }
    if (states.every((s) => s.done)) break;
    await pages[0].waitForTimeout(200);
  }
  await Promise.all(pages.map((p) => p.evaluate(() => (window as PilotWindow).raidPilotStop?.())));
  return breached;
}
