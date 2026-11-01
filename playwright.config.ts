import { defineConfig, devices } from '@playwright/test';
import { PROJETOS_RESPONSIVOS } from './tests/responsivo/aparelhos';

export default defineConfig({
  testDir: './tests',
  globalTimeout: process.env.CI ? 60 * 60_000 : 10 * 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /responsivo\//,
      use: { ...devices['Desktop Chrome'] },
    },
    ...PROJETOS_RESPONSIVOS,
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
