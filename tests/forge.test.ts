import { describe, it, expect, vi, afterEach } from 'vitest';
import { CreativeEncounterSchema, validateCreation, ForgeBriefSchema } from '@ghostwire/shared';
const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    static APIError = class extends Error {};
    responses = { parse };
  },
}));
import { localBlueprint, generateCreation } from '../apps/server/src/creativeDirector';
const brief = {
  story: 'Thor and Strange defend a frozen city from the titan',
  heroes: 'Thor, Doctor Strange',
  boss: 'The Titan',
  environment: 'Frozen city with towers',
  powers: 'Lightning hammer and magic portals',
  controls: 'Both hands overhead for thunder',
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe('creative encounter director', () => {
  it('passes cancellation to the API and reports an aborted generation honestly', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only');
    const controller = new AbortController();
    controller.abort();
    parse.mockRejectedValue(new Error('aborted'));
    await expect(generateCreation(brief, controller.signal)).rejects.toThrow('Generation canceled');
    expect(parse.mock.calls[0][1].signal).toBe(controller.signal);
  });
  it('builds an honest editable local blueprint with playable bounded controls', () => {
    const s = localBlueprint(brief);
    expect(CreativeEncounterSchema.safeParse(s).success).toBe(true);
    expect(validateCreation(s.creation!)).toBeNull();
    expect(s.creation!.heroes.map((h) => h.name)).toEqual(['Thor', 'Doctor Strange']);
    expect(s.creation!.heroes[0].appearance.weapon).toBe('hammer');
    expect(s.creation!.explanation).toContain('No AI');
    expect(parse).not.toHaveBeenCalled();
  });
  it('rejects duplicate keys and physically ambiguous gestures', () => {
    const c = localBlueprint(brief).creation!;
    c.heroes[0].abilities[0].key = c.heroes[0].abilities[1].key;
    expect(validateCreation(c)).toContain('keyboard');
    c.heroes[0].abilities[0].key = 'j';
    c.heroes[0].abilities[0].gesture = 'kick';
    expect(validateCreation(c)).toContain('gesture');
  });
  it('rejects unsafe overpowered abilities and invalid data', () => {
    const c = localBlueprint(brief).creation!;
    c.heroes[0].abilities[0].damage = 40;
    expect(validateCreation(c)).toContain('balanced');
    expect(ForgeBriefSchema.safeParse({ ...brief, story: 'x'.repeat(1300) }).success).toBe(false);
  });
  it('requires a configured key without silently inventing AI success', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    await expect(generateCreation(brief)).rejects.toThrow('OPENAI_API_KEY');
    expect(parse).not.toHaveBeenCalled();
  });
  it('uses the requested server model, strict structured output, and no response storage', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only');
    vi.stubEnv('OPENAI_MODEL', 'gpt-6.1-sol');
    parse.mockResolvedValue({ status: 'completed', output_parsed: localBlueprint(brief) });
    const s = await generateCreation(brief);
    expect(s.creation!.heroes[0].name).toBe('Thor');
    expect(parse.mock.calls[0][0]).toMatchObject({
      model: 'gpt-6.1-sol',
      store: false,
      reasoning: { effort: 'medium' },
    });
    expect(parse.mock.calls[0][0].text.format.strict).toBe(true);
  });
  it('rejects incomplete and invalid AI results with a visible error', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only');
    parse.mockResolvedValue({ status: 'incomplete', output_parsed: localBlueprint(brief) });
    await expect(generateCreation(brief)).rejects.toThrow('did not finish');
    parse.mockResolvedValue({ status: 'completed', output_parsed: { script: 'execute' } });
    await expect(generateCreation(brief)).rejects.toThrow('valid playable');
  });
  it('sanitizes upstream failures instead of leaking credentials', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-secret');
    parse.mockRejectedValue(new Error('request failed test-secret'));
    await expect(generateCreation(brief)).rejects.toThrow('AI generation could not complete');
  });
});
