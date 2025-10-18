import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import type { DefaultRegistryMetadata } from '../../packages/web/src/contexts/defaultRegistryMetadata';

const require = createRequire(import.meta.url);
const defaultRegistrySnapshot =
	require('../../packages/web/src/contexts/defaultRegistryMetadata.json') as {
		metadata: DefaultRegistryMetadata;
	};
const registryMetadata = defaultRegistrySnapshot.metadata;

test.describe('Game metadata integration', () => {
	test('renders phase and population metadata with effect log icons', async ({
		page,
	}) => {
		const phaseExpectations = Object.entries(registryMetadata.phases ?? {}).map(
			([id, descriptor]) => ({
				id,
				label: descriptor.label ?? id,
				icon: descriptor.icon?.trim() ?? '',
			}),
		);
		const populationExpectations = Object.entries(
			registryMetadata.populations ?? {},
		).map(([id, descriptor]) => ({
			id,
			label: descriptor.label ?? id,
			icon: descriptor.icon?.trim() ?? '',
		}));
		const goldIcon = registryMetadata.resources?.gold?.icon ?? '🪙';

		await page.goto('/');
		await page.getByRole('button', { name: 'Start Dev/Debug Game' }).click();

		const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
		await nextTurnButton.waitFor({ state: 'visible' });

		const phasePanel = page.locator('section').filter({ has: nextTurnButton });
		const phaseItems = phasePanel.locator('li');
		await expect(phaseItems).toHaveCount(phaseExpectations.length);

		const remainingPhases = new Map(
			phaseExpectations.map((expectation) => [expectation.label, expectation]),
		);

		for (let index = 0; index < phaseExpectations.length; index += 1) {
			const item = phaseItems.nth(index);
			const itemData = await item.evaluate((element) => {
				const iconSpan = element.querySelector('span > span:first-child');
				const labelSpan = element.querySelector('span > span:last-child');
				return {
					icon: iconSpan?.textContent?.trim() ?? '',
					label: labelSpan?.textContent?.trim() ?? '',
				};
			});
			const expectation = remainingPhases.get(itemData.label);
			expect(
				expectation,
				`Unexpected phase label: ${itemData.label}`,
			).toBeDefined();
			if (!expectation) {
				continue;
			}
			const expectedIcon = expectation.icon.length > 0 ? expectation.icon : '•';
			expect(itemData.icon).toBe(expectedIcon);
			remainingPhases.delete(itemData.label);
		}

		expect(Array.from(remainingPhases.keys())).toHaveLength(0);

		const hireCards = page
			.locator('.action-card__face--front')
			.filter({ hasText: 'Hire:' });
		await hireCards.first().waitFor({ state: 'visible' });

		for (const population of populationExpectations) {
			const roleText = population.icon
				? `${population.icon} ${population.label}`
				: population.label;
			const card = hireCards.filter({ hasText: roleText });
			await expect(
				card,
				`Missing Hire card for ${population.label}`,
			).toHaveCount(1);
		}

		await page.getByRole('button', { name: 'Log' }).click();

		const logPanel = page.locator('div:has(#game-log-title)');
		const logEntries = logPanel.locator('ul li');
		await expect(logEntries.first()).toBeVisible();

		const goldDiffMatcher = `${goldIcon} Gold`;
		await expect
			.poll(async () => logEntries.filter({ hasText: goldDiffMatcher }).count())
			.toBeGreaterThan(0);
	});
});
