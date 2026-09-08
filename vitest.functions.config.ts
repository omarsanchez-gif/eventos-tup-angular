import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['functions/src/**/*.spec.ts'],
    coverage: { enabled: false },
  },
});
