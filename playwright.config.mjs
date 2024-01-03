import { defineConfig, devices } from '@playwright/test';


export default defineConfig({
	testDir: './packages/signalizejs/tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		trace: 'on-first-retry'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		}

		/* {
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		}, */
	],
	webServer: {
		command: 'npm run http-server:start',
		url: 'http://localhost:4000',
		reuseExistingServer: !process.env.CI,
	}
});
