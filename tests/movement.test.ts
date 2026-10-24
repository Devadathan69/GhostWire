import { describe, it, expect } from 'vitest';
import { ARENA_RADIUS, MovementSchema, PRESETS } from '@ghostwire/shared';
import {
  applyIntent,
  applyMovement,
  createState,
  startBattle,
  tickBattle,
} from '../apps/server/src/combatEngine';
const match = () => {
  const s = createState('ABCDEF', PRESETS.ember, true);
  s.players.hero.ready = true;
  startBattle(s);
  for (let i = 0; i < 56; i++) tickBattle(s, 50);
  return s;
};
const advance = (s: ReturnType<typeof match>, ms: number) => {
  for (let i = 0; i < ms; i += 50) tickBattle(s, 50);
};
describe('free movement authority', () => {
  it('normalizes diagonal speed, stops stale input, and bounds the arena', () => {
    const s = match(),
      origin = { ...s.fighters.hero.position };
    applyMovement(s, 'hero', { x: -1, z: 1, sprint: false });
    advance(s, 200);
    expect(
      Math.hypot(s.fighters.hero.position.x - origin.x, s.fighters.hero.position.z - origin.z),
    ).toBeCloseTo(0.68, 4);
    advance(s, 300);
    const stopped = { ...s.fighters.hero.position };
    advance(s, 500);
    expect(s.fighters.hero.position).toEqual(stopped);
    for (let i = 0; i < 60; i++) {
      applyMovement(s, 'hero', { x: -1, z: 0, sprint: true });
      advance(s, 100);
    }
    expect(Math.hypot(s.fighters.hero.position.x, s.fighters.hero.position.z)).toBeLessThanOrEqual(
      ARENA_RADIUS + 0.0001,
    );
    expect(MovementSchema.safeParse({ x: 100, z: 0, sprint: true }).success).toBe(false);
    expect(MovementSchema.safeParse({ x: NaN, z: 0, sprint: true }).success).toBe(false);
  });
  it('allows both roles to move and freezes movement during pauses and results', () => {
    const s = match();
    applyMovement(s, 'boss', { x: 1, z: -1, sprint: false });
    advance(s, 200);
    expect(s.fighters.boss.position.x).toBeGreaterThan(1.3);
    s.resumePhase = 'ARENA';
    s.phase = 'DISCONNECTED';
    const point = { ...s.fighters.boss.position };
    advance(s, 2000);
    expect(s.fighters.boss.position).toEqual(point);
    expect(applyMovement(s, 'hero', { x: 1, z: 0, sprint: false })).toBeTruthy();
    s.phase = 'VICTORY';
    advance(s, 1000);
    expect(s.fighters.boss.position).toEqual(point);
  });
  it('uses actual positions for melee reach and locked attack zones', () => {
    const s = match();
    s.fighters.hero.position = { x: -5, z: 3 };
    applyIntent(s, 'hero', 'punch');
    advance(s, 200);
    expect(s.bossHp).toBe(120);
    expect(s.events.at(-1)?.label).toBe('MOVE CLOSER');
    s.fighters.hero.position = { x: 0, z: 0 };
    applyIntent(s, 'boss', 'swipe');
    const target = { ...s.pending[0].worldTarget! };
    s.fighters.hero.position = { x: 5, z: 3 };
    expect(s.pending[0].worldTarget).toEqual(target);
    advance(s, 800);
    expect(s.heroHp).toBe(100);
  });
  it('gives a timed jump a brief evasion window and resolves kick damage', () => {
    const s = match();
    applyIntent(s, 'boss', 'swipe');
    advance(s, 400);
    applyIntent(s, 'hero', 'jump');
    advance(s, 400);
    expect(s.heroHp).toBe(100);
    expect(s.events.at(-1)?.label).toBe('JUMP EVADE');
    advance(s, 1500);
    applyIntent(s, 'hero', 'kick');
    advance(s, 300);
    expect(s.bossHp).toBe(110);
  });
  it('moves freely over the reality feed and cannot walk the hidden boss', () => {
    const s = match();
    s.phase = 'REALITY';
    applyMovement(s, 'hero', { x: 1, z: -1, sprint: true });
    advance(s, 200);
    expect(s.heroScreen.x).toBeGreaterThan(0.5);
    expect(s.heroScreen.y).toBeLessThan(0.79);
    expect(applyMovement(s, 'boss', { x: 1, z: 1, sprint: true })).toBeTruthy();
    for (let i = 0; i < 80; i++) {
      applyMovement(s, 'hero', { x: 1, z: -1, sprint: true });
      advance(s, 100);
    }
    expect(s.heroScreen.x).toBe(0.92);
    expect(s.heroScreen.y).toBe(0.46);
  });
});
