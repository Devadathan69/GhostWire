import { describe, expect, it } from 'vitest';
import { PRESETS, heroView, type RaidState } from '@ghostwire/shared';
import {
  addHero,
  createRaid,
  heroIntent,
  moveHero,
  reviveHero,
  startRaid,
  tickRaid,
} from '../apps/server/src/raidEngine';

function advance(s: RaidState, ms: number) {
  for (let t = 0; t < ms; t += 50) tickRaid(s, Math.min(50, ms - t));
}
function raid(count = 2) {
  const s = createRaid('ABC234', PRESETS.ember, 'one', 'One');
  for (let n = 2; n <= count; n++) addHero(s, String(n), `Hero ${n}`);
  for (const h of Object.values(s.raid.heroes)) h.ready = true;
  expect(startRaid(s)).toBeNull();
  advance(s, 2800);
  s.raid.nextAttackAt = 1e9;
  s.raid.nextRoamAt = 1e9;
  for (const h of Object.values(s.raid.heroes)) {
    h.regionId = s.raid.bossRegionId;
    h.fighter.position = { x: h.id === 'one' ? -2 : 2, z: 0 };
  }
  return s;
}
function hit(s: RaidState, id: string, action: 'punch' | 'special' = 'punch') {
  expect(heroIntent(s, id, action)).toBeNull();
  advance(s, action === 'special' ? 1100 : 200);
}
function zone(s: RaidState, damage = 200) {
  s.pending.push({
    id: s.tick * 100 + 70,
    role: 'boss',
    action: 'power',
    attackId: 'fire_orb',
    startedAt: s.clock,
    resolvesAt: s.clock + 50,
    damage,
    target: { x: 0.5, y: 0.75 },
    worldTarget: { x: -2, z: 0 },
    radius: 0.1,
  });
  advance(s, 50);
}
describe('cooperative raid rules', () => {
  it('gives a two-hero squad a safe rescue opportunity when one hero falls', () => {
    const s = raid();
    s.raid.nextAttackAt = s.clock + 200;
    zone(s);
    expect(s.raid.nextAttackAt - s.clock).toBeGreaterThanOrEqual(4500);
    s.raid.heroes['2'].fighter.position = { x: -2, z: 1 };
    expect(reviveHero(s, '2', 'one')).toBeNull();
    advance(s, 3000);
    expect(s.raid.heroes.one.hp).toBe(40);
  });
  it('does not stack damage where warning circles from one Cataclysm overlap', () => {
    const s = raid();
    for (const id of [999, 1000])
      s.pending.push({
        id,
        volley: 7,
        role: 'boss',
        action: 'power',
        attackId: 'fire_orb',
        startedAt: s.clock,
        resolvesAt: s.clock + 50,
        damage: 18,
        target: { x: 0.5, y: 0.75 },
        worldTarget: { x: -2, z: 0 },
        radius: 0.2,
      });
    advance(s, 50);
    expect(s.raid.heroes.one.hp).toBe(82);
  });
  it('damage on the final channel tick cancels revival before it completes', () => {
    const s = raid();
    zone(s);
    const h = s.raid.heroes['2'];
    h.fighter.position = { x: -2, z: 0 };
    reviveHero(s, '2', 'one');
    advance(s, 2950);
    zone(s, 10);
    expect(h.reviving).toBeNull();
    expect(s.raid.heroes.one.hp).toBe(0);
    expect(s.raid.revives).toBe(0);
  });
  it('requires a team and all heroes ready; scales boss health with the locked roster', () => {
    const s = createRaid('ABC234', PRESETS.ember, 'one', 'One');
    s.raid.heroes.one.ready = true;
    expect(startRaid(s)).toContain('teammate');
    addHero(s, 'two', 'Two');
    expect(startRaid(s)).toContain('ready');
    s.raid.heroes.two.ready = true;
    expect(startRaid(s)).toBeNull();
    expect(s.bossHp).toBe(360);
    expect(raid(4).bossHp).toBe(660);
  });
  it('blocks repeated solo hits completely, then opens Aegis only for distinct heroes in two seconds', () => {
    const s = raid();
    hit(s, 'one');
    advance(s, 250);
    hit(s, 'one');
    expect(s.bossHp).toBe(360);
    hit(s, '2');
    expect(s.bossHp).toBe(352);
    expect(s.raid.vulnerableUntil).toBeGreaterThan(s.clock);
    expect(s.events.some((e) => e.label === 'AEGIS BROKEN')).toBe(true);
  });
  it('expires unmatched hits and closes the vulnerability window', () => {
    const s = raid();
    hit(s, 'one');
    advance(s, 2100);
    hit(s, '2');
    expect(s.bossHp).toBe(360);
    hit(s, 'one');
    expect(s.bossHp).toBe(352);
    advance(s, 6100);
    hit(s, 'one');
    expect(s.bossHp).toBe(352);
  });
  it('allows independent simultaneous attacks and a paired Unity Burst without friendly fire', () => {
    const s = raid();
    expect(heroIntent(s, 'one', 'special')).toBeNull();
    expect(heroIntent(s, '2', 'special')).toBeNull();
    expect(s.pending.filter((a) => a.role === 'hero')).toHaveLength(2);
    advance(s, 1100);
    expect(s.raid.bursts).toBe(1);
    expect(s.bossHp).toBe(288);
    expect(s.raid.heroes.one.hp).toBe(100);
    expect(s.raid.heroes['2'].hp).toBe(100);
  });
  it('does not award Unity Burst to the same hero or outside the pairing window', () => {
    const s = raid();
    hit(s, 'one');
    hit(s, '2');
    hit(s, 'one', 'special');
    advance(s, 1900);
    hit(s, '2', 'special');
    expect(s.raid.bursts).toBe(0);
  });
  it('only moves the authenticated hero; normalizes speed, bounds movement and stops stale input', () => {
    const s = raid(),
      other = { ...s.raid.heroes['2'].fighter.position };
    expect(moveHero(s, 'one', { x: 1, z: 1, sprint: true })).toBeNull();
    advance(s, 300);
    expect(
      Math.hypot(s.raid.heroes.one.fighter.movement.x, s.raid.heroes.one.fighter.movement.z),
    ).toBeCloseTo(1);
    expect(s.raid.heroes['2'].fighter.position).toEqual(other);
    advance(s, 500);
    const stopped = { ...s.raid.heroes.one.fighter.position };
    advance(s, 500);
    expect(s.raid.heroes.one.fighter.position).toEqual(stopped);
    for (let n = 0; n < 100; n++) {
      moveHero(s, 'one', { x: 1, z: 0, sprint: true });
      advance(s, 100);
    }
    expect(
      Math.hypot(s.raid.heroes.one.fighter.position.x, s.raid.heroes.one.fighter.position.z),
    ).toBeLessThanOrEqual(6.25001);
  });
  it('checks melee range and rejects human boss actions', () => {
    const s = raid();
    s.raid.heroes.one.fighter.position = { x: 6, z: 0 };
    hit(s, 'one');
    expect(s.raid.recentHits.one).toBeUndefined();
    expect(s.events.at(-1)?.label).toBe('MOVE CLOSER');
    expect(heroIntent(s, 'one', 'power')).toContain('AI');
  });
  it('damages all heroes in a locked zone and lets distant heroes avoid it', () => {
    const s = raid(3);
    s.raid.heroes['2'].fighter.position = { x: -2, z: 0 };
    zone(s, 20);
    expect(s.raid.heroes.one.hp).toBe(80);
    expect(s.raid.heroes['2'].hp).toBe(80);
    expect(s.raid.heroes['3'].hp).toBe(100);
  });
  it('keeps guard, jump, and evade personal rather than protecting the whole squad', () => {
    const s = raid();
    s.raid.heroes['2'].fighter.position = { x: -2, z: 0 };
    heroIntent(s, 'one', 'guard');
    zone(s, 20);
    expect(s.raid.heroes.one.hp).toBe(96);
    expect(s.raid.heroes['2'].hp).toBe(80);
    heroIntent(s, 'one', 'jump');
    advance(s, 200);
    zone(s, 20);
    expect(s.raid.heroes.one.hp).toBe(96);
  });
  it('downs heroes without ending a standing teammate’s match and disables downed input', () => {
    const s = raid();
    zone(s);
    expect(s.phase).toBe('ARENA');
    expect(s.raid.heroes.one.downedUntil).toBe(s.clock + 20000);
    expect(heroIntent(s, 'one', 'punch')).toContain('down');
    expect(moveHero(s, 'one', { x: 1, z: 0, sprint: false })).toContain('down');
  });
  it('requires proximity and three uninterrupted seconds to revive at 40% health', () => {
    const s = raid();
    zone(s);
    expect(reviveHero(s, '2', 'one')).toContain('closer');
    s.raid.heroes['2'].fighter.position = { x: -2, z: 1 };
    expect(reviveHero(s, '2', 'one')).toBeNull();
    advance(s, 2950);
    expect(s.raid.heroes.one.hp).toBe(0);
    advance(s, 50);
    expect(s.raid.heroes.one.hp).toBe(40);
    expect(s.raid.heroes.one.downedUntil).toBeNull();
    expect(s.raid.revives).toBe(1);
    zone(s, 20);
    expect(s.raid.heroes.one.hp).toBe(40);
  });
  it('interrupts reviving on movement, damage, or another action', () => {
    const s = raid();
    zone(s);
    const h = s.raid.heroes['2'];
    h.fighter.position = { x: -2, z: 1 };
    reviveHero(s, '2', 'one');
    moveHero(s, '2', { x: 1, z: 0, sprint: true });
    advance(s, 100);
    expect(h.reviving).toBeNull();
    h.fighter.position = { x: -2, z: 0 };
    h.fighter.movement = { x: 0, z: 0, sprint: false };
    reviveHero(s, '2', 'one');
    zone(s, 10);
    expect(h.reviving).toBeNull();
    reviveHero(s, '2', 'one');
    heroIntent(s, '2', 'guard');
    expect(h.reviving).toBeNull();
  });
  it('eliminates after the rescue timer and ends on a genuine squad wipe', () => {
    const s = raid();
    zone(s);
    advance(s, 20000);
    expect(s.raid.heroes.one.eliminated).toBe(true);
    expect(reviveHero(s, '2', 'one')).toBeTruthy();
    s.raid.heroes['2'].fighter.position = { x: -2, z: 0 };
    zone(s);
    expect(s.phase).toBe('DEFEAT');
  });
  it('runs boss AI, locks attack marks, rotates threat and announces multi-target cataclysm', () => {
    const s = raid(4);
    s.raid.nextAttackAt = 0;
    s.raid.aiTurn = 3;
    advance(s, 50);
    expect(s.pending.filter((a) => a.role === 'boss')).toHaveLength(4);
    expect(s.events.at(-1)?.label).toContain('SPREAD OUT');
    const mark = { ...s.pending[0].worldTarget };
    moveHero(s, 'one', { x: 1, z: 0, sprint: true });
    advance(s, 100);
    expect(s.pending[0].worldTarget).toEqual(mark);
  });
  it('crosses half of scaled health exactly once and preserves all heroes in Reality Breach', () => {
    const s = raid();
    s.bossHp = 181;
    hit(s, 'one');
    hit(s, '2');
    expect(s.phase).toBe('BREACH_TRANSITION');
    expect(s.pending).toEqual([]);
    advance(s, 2600);
    expect(s.phase).toBe('REALITY');
    moveHero(s, '2', { x: 1, z: -1, sprint: true });
    const before = { ...s.raid.heroes['2'].screen };
    advance(s, 100);
    expect(s.raid.heroes['2'].screen.x).toBeGreaterThan(before.x);
    expect(s.raid.heroes['2'].screen.y).toBeLessThan(before.y);
  });
  it('matches Reality screen-space targets for every hero and supports revival there', () => {
    const s = raid();
    s.phase = 'REALITY';
    s.raid.heroes.one.screen = { x: 0.2, y: 0.8 };
    s.raid.heroes['2'].screen = { x: 0.8, y: 0.8 };
    s.pending.push({
      id: 999,
      role: 'boss',
      action: 'power',
      attackId: 'fire_orb',
      startedAt: s.clock,
      resolvesAt: s.clock + 50,
      damage: 200,
      target: { x: 0.2, y: 0.8 },
      radius: 0.1,
    });
    advance(s, 50);
    expect(s.raid.heroes.one.hp).toBe(0);
    expect(s.raid.heroes['2'].hp).toBe(100);
    s.raid.heroes['2'].screen = { x: 0.25, y: 0.8 };
    expect(reviveHero(s, '2', 'one')).toBeNull();
    advance(s, 3000);
    expect(s.raid.heroes.one.hp).toBe(40);
  });
  it('freezes cooldowns, bleedout, attacks and the raid clock during a disconnect', () => {
    const s = raid();
    zone(s);
    s.phase = 'DISCONNECTED';
    const clock = s.clock,
      health = s.bossHp;
    advance(s, 30000);
    expect(s.clock).toBe(clock);
    expect(s.bossHp).toBe(health);
    expect(s.raid.heroes.one.eliminated).toBe(false);
  });
  it('wins and loses as a team; terminal states stop simulation', () => {
    const s = raid();
    hit(s, 'one');
    s.phase = 'REALITY';
    s.bossHp = 1;
    hit(s, '2');
    expect(s.phase).toBe('VICTORY');
    const clock = s.clock;
    advance(s, 10000);
    expect(s.clock).toBe(clock);
    const timeout = raid();
    timeout.elapsed = 179950;
    advance(timeout, 50);
    expect(timeout.phase).toBe('DEFEAT');
    expect(timeout.raid.endReason).toContain('Cataclysm');
  });
  it('projects personal health/cooldowns/world position without losing the shared roster', () => {
    const s = raid();
    s.raid.heroes['2'].hp = 37;
    heroIntent(s, '2', 'jump');
    const view = heroView(s, '2');
    expect(view.heroHp).toBe(37);
    expect(view.jumpUntil).toBe(s.raid.heroes['2'].jumpUntil);
    expect(view.raid).toBe(s.raid);
    expect(view.spec.bossMaxHp).toBe(360);
  });
  it('training uses a clearly labeled AI teammate and cannot win without player cooperation', () => {
    const s = createRaid('ABC234', PRESETS.ember, 'one', 'One', true);
    s.raid.heroes.one.ready = true;
    startRaid(s);
    advance(s, 2800);
    s.raid.nextAttackAt = 1e9;
    advance(s, 10000);
    expect(s.bossHp).toBe(360);
    expect(s.raid.heroes['training-ally'].bot).toBe(true);
    expect(Object.values(s.raid.heroes).some((h) => h.id === 'training-ally' && h.damage > 0)).toBe(
      false,
    );
  });
});
