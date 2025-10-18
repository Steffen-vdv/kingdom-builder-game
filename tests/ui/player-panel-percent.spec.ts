import { expect, test } from '@playwright/test';

test.describe('Player panel stat formatting', () => {
	test('renders percent-based stats as percentages', async ({ page }) => {
		await page.goto('/');
		await page.getByLabel('Your Name').fill('Playwright Sovereign');
		await page.getByRole('button', { name: 'Confirm Name' }).click();
		await page.getByRole('button', { name: 'Start Dev/Debug Game' }).click();
		const growthButton = page.getByRole('button', { name: /Growth:/ }).first();
		await expect(growthButton).toBeVisible();
		await expect(growthButton).toHaveAccessibleName(/Growth: 25%/);
		await growthButton.hover();
		const hoverCard = page.locator('.hover-card-transition');
		await expect(hoverCard).toBeVisible();
		await expect(hoverCard).toContainText(/25%/);
	});
});
