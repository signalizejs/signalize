import { defineConfig, devices } from '@playwright/test';

const httpServerAddress = 'http://0.0.0.0:3000';

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'line' : 'html',
	use: {
		baseURL: httpServerAddress,
		trace: 'on-first-retry'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},

		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},

		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
	],

	webServer: {
		command: 'npm run http-server:start',
		url: httpServerAddress,
		reuseExistingServer: !process.env.CI,
	},
});
