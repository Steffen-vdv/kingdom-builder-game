import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function clickAllContinue(page: Page) {
	const continueButton = page.getByRole('button', { name: 'Continue' });
	for (let attempt = 0; attempt < 10; attempt += 1) {
		if (!(await continueButton.isVisible())) {
			return;
		}
		await continueButton.click();
	}
}

test.describe('AI turn progression', () => {
	test('awaits acknowledgement during opponent main phase actions', async ({
		page,
	}) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Start New Game' }).click();
		await expect(
			page.getByRole('heading', { name: 'Kingdom Builder' }),
		).toBeVisible();

		await clickAllContinue(page);

		const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
		await nextTurnButton.waitFor({ state: 'visible' });
		await expect(nextTurnButton).toBeEnabled();
		await nextTurnButton.click();

		await expect(page.getByText('Opponent Turn')).toBeVisible();

		const taxHeading = page.getByRole('heading', { name: 'Action - Tax' });
		for (let attempt = 0; attempt < 10; attempt += 1) {
			if (await taxHeading.isVisible()) {
				break;
			}
			const continueButton = page.getByRole('button', { name: 'Continue' });
			if (await continueButton.isVisible()) {
				await continueButton.click();
				continue;
			}
			await page.waitForTimeout(200);
		}
		await expect(taxHeading).toBeVisible();
		const continueButton = page.getByRole('button', { name: 'Continue' });
		await expect(continueButton).toBeVisible();
		await expect(continueButton).toBeEnabled();
		await page.waitForTimeout(500);
		await expect(taxHeading).toBeVisible();

		await continueButton.click();

		await clickAllContinue(page);

		await expect(page.getByText('Opponent Turn')).toBeHidden();
		await expect(page.getByRole('button', { name: 'Continue' })).toBeHidden();
	});
});
