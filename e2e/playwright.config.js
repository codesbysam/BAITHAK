const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 60000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    permissions: ['camera', 'microphone'],
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--no-sandbox',
      ],
    },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--no-sandbox',
          ],
        },
      },
    },
  ],
});
