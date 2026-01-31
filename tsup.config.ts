import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'composites/index': 'src/composites/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  // Don't bundle esbuild - it uses dynamic require internally
  external: ['esbuild'],
});
