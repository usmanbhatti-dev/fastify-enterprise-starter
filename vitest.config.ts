import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/**/*.d.ts'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@common': path.resolve(__dirname, './src/common'),
      '@database': path.resolve(__dirname, './src/database'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@jobs': path.resolve(__dirname, './src/jobs'),
      '@cache': path.resolve(__dirname, './src/cache'),
      '@queue': path.resolve(__dirname, './src/queue'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@types': path.resolve(__dirname, './src/types'),
      '@interfaces': path.resolve(__dirname, './src/interfaces'),
      '@exceptions': path.resolve(__dirname, './src/exceptions'),
    },
  },
});
