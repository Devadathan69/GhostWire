import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRESETS } from '@ghostwire/shared';
const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    responses = { parse };
  },
}));
import { directBattle } from '../apps/server/src/battleDirector';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe('battle director resilience', () => {
  it('plays matching presets without a key and never claims AI generation', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const e = await directBattle('an ancient shadow forest');
    expect(e.source).toBe('preset');
    expect(e.spec.arena).toBe('shadow_forest');
    expect(parse).not.toHaveBeenCalled();
  });
  it('accepts a validated completed response and marks its source', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only');
    parse.mockResolvedValue({
      status: 'completed',
      output_parsed: { ...PRESETS.storm, title: 'The Electric Horizon' },
    });
    const e = await directBattle('a fire knight in the sky');
    expect(e.source).toBe('ai');
    expect(e.spec.title).toBe('The Electric Horizon');
    expect(parse.mock.calls[0][0].store).toBe(false);
  });
  it.each([
    { status: 'completed', output_parsed: null },
    { status: 'incomplete', output_parsed: PRESETS.ember },
    { status: 'completed', output_parsed: { ...PRESETS.ember, bossMaxHp: 10000 } },
    {
      status: 'completed',
      output_parsed: { ...PRESETS.ember, bossAttacks: ['execute_code', 'fire_orb'] },
    },
  ])('falls back for refusals, truncated responses and unsafe mechanics', async (response) => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only');
    parse.mockResolvedValue(response);
    expect((await directBattle('lava giant')).source).toBe('preset');
  });
  it('contains network failures without exposing secrets or blocking a match', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-secret');
    parse.mockRejectedValue(new Error('upstream failed: test-secret'));
    const e = await directBattle('moon forest');
    expect(e.source).toBe('preset');
    expect(e.sourceNote).not.toContain('test-secret');
    expect(e.spec.arena).toBe('shadow_forest');
  });
});
