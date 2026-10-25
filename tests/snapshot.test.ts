import { describe, expect, it } from 'vitest';
import {
  battleSnapshot,
  restoreSnapshot,
  CreativeEncounterSchema,
  PRESETS,
} from '@ghostwire/shared';
import { addHero, createRaid } from '../apps/server/src/raidEngine';
import fixture from './fixtures/ai-avengers.json';

describe('compact battle updates', () => {
  it.each([2, 3, 4])('restores every generated design and live field for %i heroes', (count) => {
    const spec = CreativeEncounterSchema.parse(fixture.spec);
    const state = createRaid('ABC234', spec, 'host', 'Host');
    for (let i = 1; i < count; i++) addHero(state, `hero-${i}`, `Hero ${i}`);
    const before = JSON.stringify(state);
    const packet = battleSnapshot(state);
    expect(packet).not.toHaveProperty('spec');
    for (const hero of Object.values(packet.raid!.heroes))
      expect(hero).not.toHaveProperty('design');
    expect(JSON.stringify(packet).length).toBeLessThan(before.length * 0.45);
    expect(restoreSnapshot(JSON.parse(JSON.stringify(packet)), spec)).toEqual(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps standard presets working without generated designs', () => {
    const state = createRaid('ABC234', PRESETS.ember, 'host', 'Host', true);
    expect(restoreSnapshot(battleSnapshot(state), state.spec)).toEqual(state);
  });

  it('uses selection indexes even when two generated heroes share a name', () => {
    const spec = CreativeEncounterSchema.parse(fixture.spec);
    spec.creation.heroes[1].name = spec.creation.heroes[0].name;
    const state = createRaid('ABC234', spec, 'host', 'Host');
    state.raid.heroes.host.designIndex = 1;
    state.raid.heroes.host.design = structuredClone(spec.creation.heroes[1]);
    const restored = restoreSnapshot(battleSnapshot(state), spec);
    expect(restored.raid!.heroes.host.design?.abilities[0].key).toBe('u');
    expect(restored).toEqual(state);
  });
});
