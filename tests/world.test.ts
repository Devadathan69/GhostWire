import { describe, it, expect } from 'vitest';
import { PRESETS, type RaidState } from '@ghostwire/shared';
import {
  addHero,
  createRaid,
  startRaid,
  tickRaid,
  travelHero,
  moveHero,
  heroIntent,
  reviveHero,
  scaleForLateJoin,
} from '../apps/server/src/raidEngine';
const advance = (s: RaidState, ms: number) => {
  for (let t = 0; t < ms; t += 50) tickRaid(s, Math.min(50, ms - t));
};
function world() {
  const s = createRaid('ABC234', PRESETS.ember, 'one', 'One');
  addHero(s, 'two', 'Two');
  Object.values(s.raid.heroes).forEach((h) => (h.ready = true));
  startRaid(s);
  advance(s, 2800);
  s.raid.nextAttackAt = 1e9;
  s.raid.nextRoamAt = 1e9;
  return s;
}
describe('connected device realms', () => {
  it('waits for a living reinforcement instead of declaring a wipe while graphics load', () => {
    const s = world();
    addHero(s, 'late', 'Late');
    for (const id of ['one', 'two']) {
      s.raid.heroes[id].hp = 0;
      s.raid.heroes[id].downedUntil = s.clock + 20000;
    }
    advance(s, 50);
    expect(s.phase).toBe('ARENA');
    s.raid.heroes.late.hp = 0;
    advance(s, 50);
    expect(s.phase).toBe('DEFEAT');
  });
  it('starts the roaming timer from the raid opening even after a long lobby wait', () => {
    const s = createRaid('ABC234', PRESETS.ember, 'one', 'One');
    addHero(s, 'two', 'Two');
    advance(s, 60000);
    Object.values(s.raid.heroes).forEach((h) => (h.ready = true));
    startRaid(s);
    advance(s, 3000);
    expect(s.raid.bossTransit).toBeNull();
    expect(s.raid.nextRoamAt).toBeGreaterThan(s.clock);
  });
  it('creates a new owned realm per device, while the training bot shares its device', () => {
    const s = world();
    expect(Object.keys(s.raid.regions)).toHaveLength(2);
    expect(s.raid.heroes.one.regionId).not.toBe(s.raid.heroes.two.regionId);
    const training = createRaid('ABC234', PRESETS.ember, 'one', 'One', true);
    expect(Object.keys(training.raid.regions)).toHaveLength(1);
    expect(training.raid.heroes['training-ally'].regionId).toBe(training.raid.bossRegionId);
  });
  it('channels travel, repositions safely, and enforces a gate cooldown', () => {
    const s = world(),
      h = s.raid.heroes.one,
      to = s.raid.heroes.two.regionId;
    expect(travelHero(s, 'one', to)).toBeNull();
    expect(heroIntent(s, 'one', 'punch')).toContain('crossing');
    advance(s, 1150);
    expect(h.regionId).not.toBe(to);
    advance(s, 50);
    expect(h.regionId).toBe(to);
    expect(h.immuneUntil).toBeGreaterThan(s.clock);
    expect(travelHero(s, 'one', s.raid.bossRegionId)).toContain('recharging');
  });
  it('cancels travel on movement and rejects invented destinations', () => {
    const s = world(),
      h = s.raid.heroes.one;
    expect(travelHero(s, 'one', 'invented')).toContain('connected');
    travelHero(s, 'one', s.raid.heroes.two.regionId);
    moveHero(s, 'one', { x: 1, z: 0, sprint: false });
    advance(s, 1500);
    expect(h.travel).toBeNull();
    expect(h.regionId).toBe(s.raid.bossRegionId);
  });
  it('allows ranged rift support to break Aegis across realms, with lower basic damage', () => {
    const s = world();
    s.raid.heroes.one.fighter.position = { x: 2, z: 0 };
    heroIntent(s, 'one', 'punch');
    heroIntent(s, 'two', 'punch');
    advance(s, 600);
    expect(s.raid.vulnerableUntil).toBeGreaterThan(s.clock);
    expect(s.bossHp).toBe(s.raid.maxBossHp - 4);
    expect(heroIntent(s, 'two', 'kick')).toContain('Travel');
  });
  it('keeps boss attacks and rescue interactions inside their realm', () => {
    const s = world();
    for (const h of Object.values(s.raid.heroes)) h.fighter.position = { x: 0, z: 0 };
    s.pending.push({
      id: 555,
      role: 'boss',
      action: 'power',
      startedAt: s.clock,
      resolvesAt: s.clock + 50,
      regionId: s.raid.bossRegionId,
      damage: 20,
      target: { x: 0.5, y: 0.7 },
      worldTarget: { x: 0, z: 0 },
      radius: 0.3,
    });
    advance(s, 50);
    expect(s.raid.heroes.one.hp).toBe(80);
    expect(s.raid.heroes.two.hp).toBe(100);
    s.raid.heroes.one.hp = 0;
    s.raid.heroes.one.downedUntil = s.clock + 20000;
    expect(reviveHero(s, 'two', 'one')).toContain('closer');
  });
  it('telegraphs an invasion and resumes attacks only in the destination', () => {
    const s = world();
    s.raid.nextRoamAt = s.clock;
    advance(s, 50);
    expect(s.raid.bossTransit?.to).toBe(s.raid.heroes.two.regionId);
    expect(s.pending.filter((a) => a.role === 'boss')).toHaveLength(0);
    advance(s, 2200);
    expect(s.raid.bossRegionId).toBe(s.raid.heroes.two.regionId);
    expect(s.raid.nextAttackAt).toBeGreaterThan(s.clock);
    advance(s, 1850);
    expect(
      s.pending
        .filter((a) => a.role === 'boss')
        .every((a) => a.regionId === s.raid.heroes.two.regionId),
    ).toBe(true);
  });
  it('preserves boss health percentage when a reinforcement expands the world', () => {
    const s = world();
    s.bossHp = 180;
    addHero(s, 'three', 'Three');
    scaleForLateJoin(s);
    expect(s.raid.maxBossHp).toBe(510);
    expect(s.bossHp).toBe(255);
    expect(s.raid.heroes.three.renderReady).toBe(false);
    expect(heroIntent(s, 'three', 'punch')).toContain('paused');
    expect(Object.keys(s.raid.regions)).toHaveLength(3);
  });
  it('cancels a crossing when its hero is hit', () => {
    const s = world();
    travelHero(s, 'one', s.raid.heroes.two.regionId);
    s.pending.push({
      id: 1,
      role: 'boss',
      action: 'power',
      regionId: s.raid.bossRegionId,
      startedAt: s.clock,
      resolvesAt: s.clock + 50,
      damage: 10,
      target: { x: 0.5, y: 0.7 },
      worldTarget: { ...s.raid.heroes.one.fighter.position },
      radius: 0.3,
    });
    advance(s, 50);
    expect(s.raid.heroes.one.travel).toBeNull();
  });
});
