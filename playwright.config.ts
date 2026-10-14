import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/setup.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3197', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile-reduced-motion', use: { viewport: { width: 390, height: 844 }, contextOptions: { reducedMotion: 'reduce' } } },
  ],
});
