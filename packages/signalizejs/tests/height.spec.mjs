import { test, expect } from '@playwright/test';

test('width', async ({ page }) => {
	await page.goto('/packages/signalizejs/tests/pages/height.html');
	const result = await (await page.locator('html')).first().getAttribute('result');

	await expect(result).toEqual('200');
});
