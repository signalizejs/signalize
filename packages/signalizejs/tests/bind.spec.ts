import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
	await page.goto('/tests.html');
	await expect(page).toHaveTitle('Test');
});
