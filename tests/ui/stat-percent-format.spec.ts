import { expect, test } from '@playwright/test';

test.describe('Stat percent display', () => {
	test('player stat bar and hover card show percent-formatted stats', async ({
		page,
	}) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Start New Game' }).click();

		const growthButton = page.getByRole('button', { name: 'Growth: 25%' });
		await expect(growthButton).toBeVisible();
		await expect(growthButton).toContainText('%');

		await growthButton.hover();

		const hoverCard = page.locator('.hover-card-transition').last();
		await expect(hoverCard).toBeVisible();
		await expect(hoverCard).toContainText('25%');
		await expect(hoverCard).not.toContainText('0.25');
	});
});
