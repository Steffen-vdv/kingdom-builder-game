import { test, expect } from '@playwright/test';

test('renders initial screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'testlab' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'next phase' })).toBeVisible();
  await expect(page.getByText('ap: 30')).toBeVisible();
});
