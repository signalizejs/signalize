import { test, expect } from '@playwright/test';

test('width', async ({ page }) => {
	await page.goto('/signalizejs/tests/pages/height.html');
	const result = await (await page.locator('html')).first().getAttribute('result');

	// Expect a title "to contain" a substring.
	await expect(result).toEqual('200');
});
