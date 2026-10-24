import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { dirname } from 'node:path';

const { values } = parseArgs({
  options: {
    live: { type: 'boolean' },
    base: { type: 'string', default: 'http://localhost:3001' },
    out: { type: 'string', default: '.local/live-ai/latest.json' },
    help: { type: 'boolean' },
  },
});
if (!values.live || values.help) {
  console.log(
    'Explicit paid test: node scripts/verify-ai-generation.mjs --live --base http://localhost:3001\nSends the public fixture brief once to the server OpenAI integration. Credentials stay on the server; output is saved under ignored .local/.',
  );
  process.exit(values.help ? 0 : 2);
}
try {
  const base = values.base.replace(/\/$/, '');
  const config = await fetch(`${base}/api/config`, { signal: AbortSignal.timeout(15000) }).then(
    (r) => r.json(),
  );
  if (!config.aiConfigured || config.model !== 'gpt-6.1-sol')
    throw Error('Restart the server with OPENAI_API_KEY configured and OPENAI_MODEL=gpt-6.1-sol.');
  const { brief } = JSON.parse(
    await readFile(new URL('../tests/fixtures/ai-avengers.json', import.meta.url), 'utf8'),
  );
  const start = Date.now(),
    response = await fetch(`${base}/api/forge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'ai', brief }),
      signal: AbortSignal.timeout(90000),
    });
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error(`The server returned a non-JSON response (${response.status}).`);
  }
  if (!response.ok)
    throw Error(
      `Generation failed (${response.status}): ${result.error || 'No blueprint returned.'}`,
    );
  if (result.source !== 'ai' || !result.spec?.creation)
    throw Error('Expected an actual AI-created blueprint; template output is not accepted.');
  const record = {
    fixtureVersion: 1,
    generatedAt: new Date().toISOString(),
    model: config.model,
    elapsedMs: Date.now() - start,
    source: result.source,
    brief,
    spec: result.spec,
  };
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, JSON.stringify(record, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        ok: true,
        model: record.model,
        elapsedMs: record.elapsedMs,
        heroes: result.spec.creation.heroes.map((h) => h.name),
        boss: result.spec.bossName,
        environment: result.spec.creation.environment.name,
        output: values.out,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Generation verification failed.');
  process.exitCode = 1;
}
