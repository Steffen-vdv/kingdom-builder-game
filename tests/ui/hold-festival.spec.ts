import { expect, test } from '@playwright/test';

test.describe('Hold Festival action', () => {
	test('adds Festival Hangover without console errors', async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') {
				consoleErrors.push(message.text());
			}
		});

		await page.goto('/');
		await page.getByRole('button', { name: 'Start New Game' }).click();

		const holdFestivalButton = page.getByRole('button', {
			name: 'Hold Festival',
		});
		await expect(holdFestivalButton).toBeVisible();
		await expect(holdFestivalButton).toBeEnabled();
		await holdFestivalButton.click();

		await expect(
			page.getByText('Festival Hangover', { exact: false }).first(),
		).toBeVisible();

		expect(
			consoleErrors,
			`Console errors: \n${consoleErrors.join('\n')}`,
		).toEqual([]);
	});
});
