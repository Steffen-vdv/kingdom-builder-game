import { expect, test } from '@playwright/test';

test.describe('Hiring after increasing population cap', () => {
	test('refreshes hire requirements after building a house', async ({
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

		const hireButton = page.getByRole('button', { name: 'Hire' });
		const capacityRequirement = page.getByText('Population is at capacity', {
			exact: false,
		});

		await expect(hireButton).toBeVisible();
		await expect(capacityRequirement).toBeVisible();

		await page.getByRole('button', { name: /House/ }).click();

		await page.getByRole('button', { name: 'Next Turn' }).click();

		await expect(hireButton).toBeEnabled();
		await expect(capacityRequirement).not.toBeVisible();

		expect(
			consoleErrors,
			`Console errors:\n${consoleErrors.join('\n')}`,
		).toEqual([]);
	});
});
