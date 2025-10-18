import { expect, test } from '@playwright/test';
import { Resource, RESOURCES } from '@kingdom-builder/contents';
import { DEFAULT_REGISTRY_METADATA } from '../../packages/web/src/contexts/defaultRegistryMetadata';

test.describe('Game metadata', () => {
	test('renders phases, population roles, and effect log icons', async ({
		page,
	}) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Start Dev/Debug Game' }).click();

		const nextTurnButton = page.getByRole('button', {
			name: 'Next Turn',
		});
		await expect(nextTurnButton).toBeVisible();

		const phasePanel = page.locator('section').filter({ has: nextTurnButton });

		const phasesMetadata = DEFAULT_REGISTRY_METADATA.phases ?? {};
		const expectedPhases = Object.entries(phasesMetadata).map(
			([phaseId, metadata]) => ({
				id: phaseId,
				label: metadata.label ?? phaseId,
				icon: metadata.icon?.trim() ?? '',
			}),
		);
		await expect(phasePanel.getByRole('listitem')).toHaveCount(
			expectedPhases.length,
		);

		for (const phase of expectedPhases) {
			const phaseItem = phasePanel
				.getByRole('listitem')
				.filter({ hasText: phase.label });
			await expect(phaseItem).toHaveCount(1);
			const expectedIcon = phase.icon !== '' ? phase.icon : '•';
			await expect(phaseItem.first().locator('span').first()).toHaveText(
				expectedIcon,
			);
		}

		const actionsPanel = page.locator('section').filter({
			has: page.getByRole('heading', {
				level: 2,
				name: /^Actions/,
			}),
		});
		const hireContainer = actionsPanel.locator(
			'css=div:has(>header:has-text("Hire"))',
		);
		await expect(hireContainer).toBeVisible();

		const populationMetadata = DEFAULT_REGISTRY_METADATA.populations ?? {};
		const expectedRoles = Object.entries(populationMetadata).map(
			([roleId, descriptor]) => ({
				id: roleId,
				label: descriptor.label ?? roleId,
				icon: descriptor.icon?.trim() ?? '',
			}),
		);
		const roleButtons = hireContainer.getByRole('button');
		await expect(roleButtons).toHaveCount(expectedRoles.length);

		for (const role of expectedRoles) {
			const card = roleButtons.filter({ hasText: role.label }).first();
			await expect(card).toBeVisible();
			const firstLine = normalizeFirstLine(await card.innerText());
			expect(firstLine).toBe(buildExpectedHireLabel(role.label, role.icon));
		}

		await nextTurnButton.click();
		await expect(nextTurnButton).toBeEnabled();

		const logButton = page.getByRole('button', {
			name: 'Log',
			exact: true,
		});
		await logButton.click();
		const logDialog = page.getByRole('dialog', { name: 'Log' });
		await expect(logDialog).toBeVisible();
		await expect(logDialog.getByRole('listitem').first()).toBeVisible();

		const goldIcon = RESOURCES[Resource.gold].icon ?? '';
		const goldLabel =
			DEFAULT_REGISTRY_METADATA.resources?.gold?.label ?? 'Gold';
		const logFragment = `${goldIcon} ${goldLabel}`;
		await expect(
			logDialog.getByText(logFragment, { exact: false }),
		).toBeVisible();
	});
});

function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/gu, ' ').trim();
}

function normalizeFirstLine(value: string): string {
	const [firstLine] = value.split('\n');
	return normalizeWhitespace(firstLine ?? '');
}

function buildExpectedHireLabel(label: string, icon: string): string {
	const parts = ['👶', 'Hire', ':'];
	if (icon) {
		parts.push(icon);
	}
	parts.push(label);
	return normalizeWhitespace(parts.join(' '));
}
