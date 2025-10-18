import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
	test('displays hero copy for new players', async ({ page }) => {
		await page.goto('/');
		await expect(
			page.getByRole('heading', { name: 'Kingdom Builder' }),
		).toBeVisible();
		await expect(
			page.getByText('Craft a flourishing dynasty', { exact: false }),
		).toBeVisible();
	});

	test('opens the settings dialog from the menu', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Settings' }).click();
		const dialog = page.getByRole('dialog', { name: 'Settings' });
		await expect(dialog).toBeVisible();
		await expect(
			dialog.getByText('Realm Preferences', { exact: false }),
		).toBeVisible();
	});
});
