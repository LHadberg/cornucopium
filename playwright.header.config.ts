import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'header-layout.spec.ts',
  use: { browserName: 'chromium' },
});
