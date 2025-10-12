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

describe('Building translation with population bonus', () => {
	it('renders modifier summary using registry metadata icons', () => {
		const factory = createContentFactory();
		const workAction = factory.action({
			name: 'Work Detail',
			icon: '🛠️',
		});
		const councilRole = factory.population({
			name: 'Council',
			icon: '👑',
		});
		const building = factory.building({
			name: 'Guild Hall',
			icon: '🏰',
			onBuild: [
				{
					type: 'result_mod',
					method: 'add',
					params: {
						amount: 1,
						evaluation: { type: 'population', id: workAction.id },
					},
				},
			],
		});
		const { translationContext, registries, session } =
			buildSyntheticTranslationContext(({ registries, session }) => {
				registries.actions.add(workAction.id, workAction);
				registries.populations.add(councilRole.id, councilRole);
				registries.buildings.add(building.id, building);
				session.metadata = {
					...session.metadata,
					resources: {
						...session.metadata.resources,
						gold: { label: 'Refined Gold', icon: '🪙' },
					},
					populations: {
						...session.metadata.populations,
						[councilRole.id]: {
							label: 'Guiding Council',
							icon: councilRole.icon,
						},
					},
				};
			});
		const modifierInfo = translationContext.assets.modifiers.result ?? {
			icon: '✨',
			label: 'Outcome Adjustment',
		};
		const populationIcon = translationContext.assets.population?.icon ?? '👥';
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
		expect(summaryText).toContain(populationIcon);
		expect(summaryText).toContain(workAction.icon ?? workAction.name);
		expect(summaryText).toMatch(/\+1/);
	});

	it('falls back to default modifier icons when metadata omits them', () => {
		const factory = createContentFactory();
		const action = factory.action({ icon: '🚀', name: 'Expedition' });
		const guild = factory.building({
			name: 'Guild Outpost',
			onBuild: [
				{
					type: 'result_mod',
					method: 'add',
					params: {
						amount: 2,
						evaluation: { type: 'population', id: action.id },
					},
				},
			],
		});
		const { translationContext, registries, session } =
			buildSyntheticTranslationContext(({ registries, session }) => {
				registries.actions.add(action.id, action);
				registries.buildings.add(guild.id, guild);
				session.metadata = {
					...session.metadata,
					resources: {
						...session.metadata.resources,
						gold: { label: 'City Gold', icon: undefined },
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
