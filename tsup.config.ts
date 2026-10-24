import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['apps/server/src/index.ts'],
  format: ['esm'],
  outDir: 'dist/server',
  platform: 'node',
  target: 'node22',
  splitting: false,
  noExternal: ['@ghostwire/shared'],
  clean: true,
});
