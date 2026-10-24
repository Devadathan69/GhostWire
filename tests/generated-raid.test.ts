import { describe, it, expect } from 'vitest';
import fixture from './fixtures/ai-avengers.json';
import {
  CreativeEncounterSchema,
  validateCreation,
  HERO_ACTIONS,
  type HeroAction,
  type RaidState,
} from '@ghostwire/shared';
import {
  createRaid,
  addHero,
  startRaid,
  tickRaid,
  heroIntent,
} from '../apps/server/src/raidEngine';
import { GestureClassifier, type Landmark } from '../apps/client/src/cv/gestures';
const spec = CreativeEncounterSchema.parse(fixture.spec);
const advance = (s: RaidState, ms: number) => {
  for (let t = 0; t < ms; t += 50) tickRaid(s, Math.min(50, ms - t));
};
function raid() {
  const s = createRaid('ABC234', spec, 'thor', 'Thor');
  addHero(s, 'strange', 'Strange');
  addHero(s, 'iron', 'Iron');
  Object.values(s.raid.heroes).forEach((h) => (h.ready = true));
  startRaid(s);
  advance(s, 2800);
  s.raid.nextAttackAt = 1e9;
  s.raid.nextRoamAt = 1e9;
  return s;
}
function neutral(): Landmark[] {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.8, visibility: 1 }));
  p[0] = { x: 0.5, y: 0.2, visibility: 1 };
  p[11] = { x: 0.4, y: 0.4, visibility: 1 };
  p[12] = { x: 0.6, y: 0.4, visibility: 1 };
  p[13] = { x: 0.37, y: 0.55, visibility: 1 };
  p[14] = { x: 0.63, y: 0.55, visibility: 1 };
  p[15] = { x: 0.4, y: 0.6, visibility: 1 };
  p[16] = { x: 0.6, y: 0.6, visibility: 1 };
  return p;
}
function pose(action: HeroAction) {
  const p = neutral();
  if (action === 'punch') p[16] = { x: 0.99, y: 0.4, visibility: 1 };
  if (action === 'kick') {
    p[23].y = 0.72;
    p[25].y = 0.58;
  }
  if (action === 'guard') {
    p[15] = { x: 0.56, y: 0.42, visibility: 1 };
    p[16] = { x: 0.44, y: 0.42, visibility: 1 };
  }
  if (action === 'dodge') p.forEach((v) => (v.y += 0.13));
  if (action === 'jump') p[15].y = 0.03;
  if (action === 'special') {
    p[15].y = 0.1;
    p[16].y = 0.1;
  }
  return p;
}
describe('actual gpt-6.1-sol encounter regression', () => {
  it('preserves the real model output with supported characters, boss and environment', () => {
    expect(fixture.source).toBe('ai');
    expect(fixture.model).toBe('gpt-6.1-sol');
    expect(validateCreation(spec.creation)).toBeNull();
    expect(spec.creation.heroes.map((h) => h.name)).toEqual(['Thor', 'Doctor Strange', 'Iron Man']);
    expect(spec.creation.boss.name).toBe('Thanos');
    expect(spec.creation.environment.weather).toBe('rain');
    expect(spec.creation.environment.props.every((p) => Math.hypot(p.x, p.z) >= 8)).toBe(true);
  });
  for (const [index, hero] of spec.creation.heroes.entries())
    for (const action of HERO_ACTIONS) {
      it(`${hero.name}: applies generated ${action} damage, recharge and effect`, () => {
        const s = raid(),
          h = Object.values(s.raid.heroes)[index],
          ability = hero.abilities.find((a) => a.action === action)!;
        h.regionId = s.raid.bossRegionId;
        h.fighter.position = { x: 2, z: 0 };
        s.raid.vulnerableUntil = s.clock + 6000;
        const now = s.clock;
        expect(heroIntent(s, h.id, action)).toBeNull();
        expect(h.cooldowns[action]).toBe(now + ability.cooldownMs);
        if (['punch', 'kick', 'special'].includes(action)) {
          const a = s.pending.find((a) => a.playerId === h.id)!;
          expect(a.effect).toBe(ability.effect);
          expect(a.damage).toBe(ability.damage);
          advance(s, a.resolvesAt - s.clock);
          expect(h.damage).toBe(ability.damage);
          if (ability.effect === 'moon_shield' && action === 'special')
            expect(h.guardUntil).toBeGreaterThan(s.clock);
        } else
          expect(
            (
              { guard: h.guardUntil, dodge: h.dodgeUntil, jump: h.jumpUntil } as Record<
                string,
                number
              >
            )[action],
          ).toBeGreaterThan(now);
      });
      it(`${hero.name}: maps the generated ${action} physical gesture`, () => {
        const ability = hero.abilities.find((a) => a.action === action)!,
          c = new GestureClassifier();
        for (let i = 0; i < 25; i++) c.read(neutral(), i * 70, 'hero', 'pose', hero);
        const found = [];
        for (let i = 0; i < 20; i++) {
          const a = c.read(pose(ability.gesture), 1800 + i * 70, 'hero', 'pose', hero).action;
          if (a) found.push(a);
        }
        expect(found).toContain(action);
      });
    }
  it('reaches a genuine defeat from the generated boss without forcing an outcome', () => {
    const s = raid();
    s.raid.nextAttackAt = s.clock;
    s.raid.nextRoamAt = s.clock + 10000;
    advance(s, 180000);
    expect(s.phase).toBe('DEFEAT');
    expect(s.bossHp).toBe(s.raid.maxBossHp);
  });
});
