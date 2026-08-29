import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'https://retroachievements.org/' },
    },
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
  },
});
