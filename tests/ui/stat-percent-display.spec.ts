import { expect, test } from '@playwright/test';

test.describe('Percent stat displays', () => {
        test('shows percent stats as percentages in the panel and hover card', async ({
                page,
        }) => {
		const consoleErrors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') {
				consoleErrors.push(message.text());
			}
		});

		await page.goto('/');
		await page.getByRole('button', { name: 'Start New Game' }).click();

		const statBar = page.locator('.stat-bar');
		await expect(statBar).toBeVisible();

		const growthButton = statBar.getByRole('button', { name: /Growth: 25%/ });
		await expect(growthButton).toBeVisible();
		await expect(growthButton).toHaveText(/25%/);

		await growthButton.hover();

		const hoverCard = page
			.locator('.hover-card-transition')
			.filter({ hasText: 'Growth' })
			.last();
		await expect(hoverCard).toBeVisible();
		await expect(hoverCard).toContainText('25%');
		await expect(hoverCard).not.toContainText('0.25');

		expect(
			consoleErrors,
			`Console errors: \n${consoleErrors.join('\n')}`,
		).toEqual([]);
	});
});
