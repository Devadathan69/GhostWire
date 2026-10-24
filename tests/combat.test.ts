import { describe, it, expect } from 'vitest';
import { PRESETS, BattleSpecSchema, cameraToStage, heroPosition } from '@ghostwire/shared';
import { applyIntent, createState, startBattle, tickBattle } from '../apps/server/src/combatEngine';
const arena = () => {
  const s = createState('ABCDEF', PRESETS.ember, true);
  s.players.hero.ready = true;
  startBattle(s);
  advance(s, 2800);
  return s;
};
function advance(s: ReturnType<typeof createState>, ms: number) {
  for (let t = 0; t < ms; t += 50) tickBattle(s, Math.min(50, ms - t));
}
describe('authoritative combat', () => {
  it('requires both players ready and transitions after intro', () => {
    const s = createState('ABCDEF', PRESETS.ember);
    expect(startBattle(s)).toBeTruthy();
    s.players.hero.ready = s.players.boss.ready = s.players.boss.connected = true;
    expect(startBattle(s)).toBeNull();
    advance(s, 2800);
    expect(s.phase).toBe('ARENA');
  });
  it('rejects wrong-role actions, duplicate cooldown and damage before telegraph resolves', () => {
    const s = arena();
    expect(applyIntent(s, 'boss', 'special')).toBeTruthy();
    expect(applyIntent(s, 'hero', 'punch')).toBeNull();
    expect(applyIntent(s, 'hero', 'punch')).toBeTruthy();
    expect(s.bossHp).toBe(120);
    advance(s, 200);
    expect(s.bossHp).toBe(114);
  });
  it('reduces guarded damage and rewards a well-timed dodge', () => {
    const s = arena();
    applyIntent(s, 'boss', 'swipe');
    advance(s, 300);
    applyIntent(s, 'hero', 'guard');
    advance(s, 500);
    expect(s.heroHp).toBe(98);
    advance(s, 1100);
    applyIntent(s, 'boss', 'swipe');
    advance(s, 300);
    applyIntent(s, 'hero', 'dodge');
    advance(s, 500);
    expect(s.heroHp).toBe(98);
    expect(s.stats.dodged).toBe(1);
  });
  it('breaches exactly once, clears queued attacks and can win', () => {
    const s = arena();
    s.bossHp = 63;
    applyIntent(s, 'hero', 'punch');
    advance(s, 200);
    expect(s.phase).toBe('BREACH_TRANSITION');
    expect(s.pending).toHaveLength(0);
    expect(applyIntent(s, 'hero', 'special')).toBeTruthy();
    advance(s, 2600);
    expect(s.phase).toBe('REALITY');
    s.bossHp = 4;
    applyIntent(s, 'hero', 'punch');
    advance(s, 200);
    expect(s.phase).toBe('VICTORY');
    const hp = s.heroHp;
    advance(s, 4000);
    expect(s.heroHp).toBe(hp);
  });
  it('ends with defeat on fatal damage', () => {
    const s = arena();
    s.heroHp = 5;
    applyIntent(s, 'boss', 'swipe');
    advance(s, 800);
    expect(s.heroHp).toBe(0);
    expect(s.phase).toBe('DEFEAT');
  });
  it('freezes clock, pending telegraphs and cooldowns while disconnected', () => {
    const s = arena();
    applyIntent(s, 'boss', 'swipe');
    s.resumePhase = s.phase;
    s.phase = 'DISCONNECTED';
    const clock = s.clock;
    advance(s, 10000);
    expect(s.clock).toBe(clock);
    expect(s.heroHp).toBe(100);
    s.phase = s.resumePhase!;
    advance(s, 800);
    expect(s.heroHp).toBe(90);
  });
  it('hand targets affect collision in reality and misses do no damage', () => {
    const s = arena();
    s.phase = 'REALITY';
    applyIntent(s, 'boss', 'swipe', { x: 0, y: 0 });
    advance(s, 800);
    expect(s.heroHp).toBe(100);
    advance(s, 1100);
    applyIntent(s, 'boss', 'swipe', heroPosition(s));
    advance(s, 800);
    expect(s.heroHp).toBe(90);
  });
  it('boss guard reduces hero damage and cannot overlap an attack', () => {
    const s = arena();
    applyIntent(s, 'boss', 'guard');
    applyIntent(s, 'hero', 'punch');
    advance(s, 200);
    expect(s.bossHp).toBe(119);
    advance(s, 1500);
    applyIntent(s, 'boss', 'swipe');
    expect(applyIntent(s, 'boss', 'guard')).toBeTruthy();
  });
});
describe('safe contracts and camera coordinates', () => {
  it('validates presets and rejects unknown mechanics, URLs and invalid stats', () => {
    Object.values(PRESETS).forEach((p) => expect(BattleSpecSchema.safeParse(p).success).toBe(true));
    expect(BattleSpecSchema.safeParse({ ...PRESETS.ember, bossMaxHp: 999 }).success).toBe(false);
    expect(
      BattleSpecSchema.safeParse({ ...PRESETS.ember, arena: 'https://example.com' }).success,
    ).toBe(false);
  });
  it('mirrors widescreen corners and preserves center', () => {
    expect(cameraToStage({ x: 0, y: 0 }, 1280, 720)).toEqual({ x: 1, y: 0 });
    expect(cameraToStage({ x: 1, y: 1 }, 1280, 720)).toEqual({ x: 0, y: 1 });
    expect(cameraToStage({ x: 0.5, y: 0.5 }, 640, 480)).toEqual({ x: 0.5, y: 0.5 });
  });
  it('accounts for cover crop of a portrait camera', () => {
    expect(cameraToStage({ x: 0.5, y: 0 }, 480, 640)).toEqual({ x: 0.5, y: 0 });
    expect(cameraToStage({ x: 0.5, y: 1 }, 480, 640)).toEqual({ x: 0.5, y: 1 });
    expect(cameraToStage({ x: 0.25, y: 0.5 }, 480, 640, false).x).toBeCloseTo(0.25);
  });
  it('maps interior points through vertical and horizontal cover cropping, with and without a mirror', () => {
    const unmirrored = cameraToStage({ x: 0.25, y: 0.25 }, 640, 480, false);
    expect(unmirrored.x).toBeCloseTo(0.25);
    expect(unmirrored.y).toBeCloseTo(1 / 6);
    expect(cameraToStage({ x: 0.25, y: 0.25 }, 640, 480).x).toBeCloseTo(0.75);
    expect(cameraToStage({ x: 0.25, y: 0.5 }, 1920, 720, false).x).toBeCloseTo(0.125);
    expect(cameraToStage({ x: 0.25, y: 0.5 }, 1920, 720).x).toBeCloseTo(0.875);
    expect(cameraToStage({ x: 0.5, y: 0.4 }, 480, 640).y).toBeCloseTo(0.26296296);
  });
});
