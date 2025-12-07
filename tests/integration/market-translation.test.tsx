/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { summarizeContent } from '@kingdom-builder/web/translation/content';
import type { TranslationContext } from '@kingdom-builder/web/translation/context';
import { createContentFactory } from '@kingdom-builder/testing';
import { RegistryMetadataProvider } from '../../packages/web/src/contexts/RegistryMetadataContext';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

type SummaryEntry = string | { items?: SummaryEntry[] };

function flattenSummary(entry: SummaryEntry): string[] {
	if (typeof entry === 'string') {
		return [entry];
	}
	if (!entry || !Array.isArray(entry.items)) {
		return [];
	}
	return entry.items.flatMap((item) => flattenSummary(item));
}

interface BuildingSummaryHarnessProps {
	buildingId: string;
	translation: TranslationContext;
}

function BuildingSummaryHarness({
	buildingId,
	translation,
}: BuildingSummaryHarnessProps) {
	const summary = summarizeContent('building', buildingId, translation);
	const text = summary
		.flatMap((entry) => flattenSummary(entry as SummaryEntry))
		.join('\n');
	return <div data-testid="summary-output">{text}</div>;
}

afterEach(() => {
	cleanup();
});

describe('Building translation with development modifier', () => {
	it('renders modifier summary using registry metadata icons', () => {
		const factory = createContentFactory();
		const harvestDevelopment = factory.development({
			name: 'Harvest Field',
			icon: '🌾',
		});
		const building = factory.building({
			name: 'Guild Hall',
			icon: '🏰',
			onBuild: [
				{
					type: 'result_mod',
					method: 'add',
					params: {
						id: 'modifier:guild-hall-bonus',
						evaluation: { type: 'development', id: harvestDevelopment.id },
					},
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: {
								resourceId: 'resource:synthetic:gold',
								change: { type: 'amount', amount: 1 },
							},
						},
					],
				},
			],
		});
		const { translationContext, registries, session } =
			buildSyntheticTranslationContext(({ registries, session }) => {
				registries.developments.add(harvestDevelopment.id, harvestDevelopment);
				registries.buildings.add(building.id, building);
				session.metadata = {
					...session.metadata,
					resources: {
						...session.metadata.resources,
						gold: { label: 'Refined Gold', icon: '🪙' },
						'resource:synthetic:gold': {
							label: 'Synthetic Gold',
							icon: '🪙',
						},
					},
					developments: {
						...session.metadata.developments,
						[harvestDevelopment.id]: {
							label: harvestDevelopment.name,
							icon: harvestDevelopment.icon,
						},
					},
				};
			});
		const modifierInfo = translationContext.assets.modifiers.result ?? {
			icon: '✨',
			label: 'Outcome Adjustment',
		};
		render(
			<RegistryMetadataProvider
				registries={registries}
				metadata={session.metadata}
			>
				<BuildingSummaryHarness
					buildingId={building.id}
					translation={translationContext}
				/>
			</RegistryMetadataProvider>,
		);
		const summaryText = screen.getByTestId('summary-output').textContent ?? '';
		expect(summaryText).toContain(modifierInfo.icon ?? '');
		expect(summaryText).toContain(harvestDevelopment.icon);
		expect(summaryText).toMatch(/\+1/);
	});

	it('falls back to default modifier icons when metadata omits them', () => {
		const factory = createContentFactory();
		const farmDevelopment = factory.development({
			icon: '🚜',
			name: 'Farm Plot',
		});
		const guild = factory.building({
			name: 'Guild Outpost',
			onBuild: [
				{
					type: 'result_mod',
					method: 'add',
					params: {
						id: 'modifier:guild-outpost-bonus',
						evaluation: { type: 'development', id: farmDevelopment.id },
					},
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: {
								resourceId: 'resource:synthetic:gold',
								change: { type: 'amount', amount: 2 },
							},
						},
					],
				},
			],
		});
		const { translationContext, registries, session } =
			buildSyntheticTranslationContext(({ registries, session }) => {
				registries.developments.add(farmDevelopment.id, farmDevelopment);
				registries.buildings.add(guild.id, guild);
				session.metadata = {
					...session.metadata,
					resources: {
						...session.metadata.resources,
						gold: { label: 'City Gold' },
						'resource:synthetic:gold': { label: 'Synthetic Gold' },
					},
				};
			});
		render(
			<RegistryMetadataProvider
				registries={registries}
				metadata={session.metadata}
			>
				<BuildingSummaryHarness
					buildingId={guild.id}
					translation={translationContext}
				/>
			</RegistryMetadataProvider>,
		);
		const fallbackIcon =
			translationContext.assets.modifiers.result?.icon ?? '✨';
		const summaryText = screen.getByTestId('summary-output').textContent ?? '';
		expect(summaryText).toContain(fallbackIcon);
		expect(summaryText).toMatch(/\+2/);
	});
});
