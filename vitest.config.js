import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/**/*.spec.js']
    },
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    setupFiles: ['./tests/setup.js']
  }
});
