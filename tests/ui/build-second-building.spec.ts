import { expect, test } from '@playwright/test';

test.describe('Building actions', () => {
	test('handles conflict errors and allows a successful retry', async ({
		page,
	}) => {
		const consoleErrors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') {
				consoleErrors.push(message.text());
			}
		});
		let shouldFail = true;
		await page.route('**/api/sessions/**/actions', async (route, request) => {
			if (shouldFail && request.method() === 'POST') {
				try {
					const payload = request.postDataJSON();
					if (payload?.params?.id === 'mill') {
						shouldFail = false;
						await route.fulfill({
							status: 409,
							contentType: 'application/json',
							body: JSON.stringify({
								status: 'error',
								error: 'Insufficient resource.gold: need 8, have 7',
							}),
						});
						return;
					}
				} catch (error) {
					void error;
				}
			}
			await route.continue();
		});
		await page.goto('/');
		await page.getByRole('button', { name: 'Start New Game' }).click();
		const townCharterCard = page.getByRole('button', { name: /Town Charter/ });
		await expect(townCharterCard).toBeVisible();
		await townCharterCard.click();
		await expect(
			page.getByRole('button', { name: /Town Charter/ }),
		).toHaveCount(0);
		const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
		await expect(nextTurnButton).toBeEnabled();
		await nextTurnButton.click();
		const millCard = page.getByRole('button', { name: /Mill/ });
		await expect(millCard).toBeEnabled();
		await millCard.click();
		await expect(
			page.getByText('Action failed', { exact: false }),
		).toBeVisible();
		await expect(page.getByText('We could not load your kingdom.')).toHaveCount(
			0,
		);
		await millCard.click();
		await expect(page.getByRole('button', { name: /Mill/ })).toHaveCount(0);
		expect(consoleErrors).toEqual([]);
	});
});
