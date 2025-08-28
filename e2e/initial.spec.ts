import { test, expect } from '@playwright/test';

test('renders initial screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'testlab' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'next phase' })).toBeVisible();
  await expect(page.getByText('ap: 30')).toBeVisible();
});

test('develop action builds and then disables', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'perform develop' }).click();
  await expect(page.getByText(/Action develop.*succeeded/)).toBeVisible();
  const developBtn = page.getByRole('button', { name: 'perform develop' });
  await expect(developBtn).toBeDisabled();
  await expect(developBtn).toHaveAttribute(
    'title',
    /no land with open development slot available/,
  );
});
