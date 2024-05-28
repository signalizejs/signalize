import { defineConfig, devices } from '@playwright/test';
import { env } from 'process';

const isDev = env.DEV === 'true';
const devServerUrl = 'http://0.0.0.0:4000';
const packagesDir = 'packages';

let projects = [
	{
		name: 'chromium',
		use: { ...devices['Desktop Chrome'] }
	}
];

if (!isDev) {
	projects = [
		...projects,
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		}
	];
}

export default defineConfig({
	testDir: `./${packagesDir}/signalizejs/tests`,
	fullyParallel: true,
	forbidOnly: !isDev,
	retries: isDev ? 2 : 0,
	workers: isDev ? 1 : undefined,
	reporter: 'line',

	use: {
		trace: 'on-first-retry',
		baseURL: `${devServerUrl}/${packagesDir}/`
	},

	projects,
	webServer: {
		command: 'npm run http-server:start',
		url: devServerUrl,
		reuseExistingServer: !isDev,
	}
});
