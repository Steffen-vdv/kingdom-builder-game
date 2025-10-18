import type { Locator } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { Resource, RESOURCES } from '@kingdom-builder/contents';
import { DEFAULT_REGISTRY_METADATA } from '../../packages/web/src/contexts/defaultRegistryMetadata';

function normalizeIcon(value: string | null | undefined): string {
	return value?.trim() ?? '';
}

async function readIcon(locator: Locator): Promise<string> {
	const content = (await locator.textContent()) ?? '';
	return normalizeIcon(content);
}

async function readLabel(locator: Locator): Promise<string> {
	const content = (await locator.textContent()) ?? '';
	return content.trim();
}

const phaseMetadataByLabel = new Map<string, string>(
	Object.values(DEFAULT_REGISTRY_METADATA.phases ?? {}).map((entry) => {
		const label = entry.label ?? entry.id;
		return [label, normalizeIcon(entry.icon)] as const;
	}),
);

const populationMetadataByLabel = new Map<string, string>(
	Object.values(DEFAULT_REGISTRY_METADATA.populations ?? {}).map((entry) => {
		const label = entry.label ?? entry.id;
		return [label, normalizeIcon(entry.icon)] as const;
	}),
);

test.describe('Game metadata', () => {
	test('aligns UI with registry metadata', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Start Dev/Debug Game' }).click();

		const nextTurnButton = page.getByRole('button', {
			name: 'Next Turn',
		});
		await expect(nextTurnButton).toBeVisible();

		const phasePanel = nextTurnButton.locator('xpath=ancestor::section[1]');
		const phaseItems = phasePanel.locator('ul li');
		await expect(phaseItems.first()).toBeVisible();

		const observedPhaseLabels = new Set<string>();
		const phaseCount = await phaseItems.count();
		for (let index = 0; index < phaseCount; index += 1) {
			const item = phaseItems.nth(index);
			const icon = await readIcon(item.locator('span').first());
			const label = await readLabel(item.locator('span').nth(1));
			const expectedIcon = phaseMetadataByLabel.get(label);
			expect(
				expectedIcon,
				`Missing metadata for phase "${label}"`,
			).toBeDefined();
			expect(icon).toBe(expectedIcon ?? '');
			observedPhaseLabels.add(label);
		}

		for (const label of phaseMetadataByLabel.keys()) {
			expect(observedPhaseLabels.has(label)).toBe(true);
		}

		const hireHeading = page.getByRole('heading', {
			level: 3,
			name: /^Hire/,
		});
		await expect(hireHeading).toBeVisible();

		const hireSection = hireHeading.locator(
			'xpath=ancestor::div[contains(@class,"space-y-2")][1]',
		);
		const hireCards = hireSection.locator('button.action-card__face--front');
		await expect(hireCards.first()).toBeVisible();

		const observedRoleLabels = new Set<string>();
		const cardCount = await hireCards.count();
		for (let index = 0; index < cardCount; index += 1) {
			const card = hireCards.nth(index);
			const title = card.locator('span.text-base.font-medium');
			const spanCount = await title.locator('span').count();
			expect(spanCount).toBeGreaterThanOrEqual(2);
			const roleIcon = await readIcon(title.locator('span').nth(spanCount - 2));
			const roleLabel = await readLabel(
				title.locator('span').nth(spanCount - 1),
			);
			const expectedRoleIcon = populationMetadataByLabel.get(roleLabel);
			expect(
				expectedRoleIcon,
				`Missing metadata for role "${roleLabel}"`,
			).toBeDefined();
			expect(roleIcon).toBe(expectedRoleIcon ?? '');
			observedRoleLabels.add(roleLabel);
		}

		for (const label of populationMetadataByLabel.keys()) {
			expect(observedRoleLabels.has(label)).toBe(true);
		}

		await expect(nextTurnButton).toBeEnabled();
		await nextTurnButton.click();

		const logButton = page.getByRole('button', { name: 'Log' });
		await expect(logButton).toBeVisible();
		await logButton.click();

		const logPanel = page.locator('#game-log-panel');
		await expect(logPanel).toBeVisible();

		const logEntries = logPanel.locator('li');
		await expect(logEntries.first()).toBeVisible();

		const goldIcon = RESOURCES[Resource.gold].icon ?? '';
		await expect(logEntries.filter({ hasText: goldIcon })).not.toHaveCount(0);
	});
});
