import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
	await page.goto('http://0.0.0.0:4000/packages/signalizejs/tests/pages/bind.html');

	// Expect a title "to contain" a substring.
	await expect(page).toHaveTitle(/Document/);
});
