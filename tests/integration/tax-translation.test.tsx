/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { summarizeContent } from '@kingdom-builder/web/translation/content';
import type { TranslationContext } from '@kingdom-builder/web/translation/context';
import { createContentFactory } from '@kingdom-builder/testing';
import { Stat } from '@kingdom-builder/contents';
import { RegistryMetadataProvider } from '../../packages/web/src/contexts/RegistryMetadataContext';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

type ActionSummaryEntry = string | { items?: ActionSummaryEntry[] };

function flattenActionSummary(entry: ActionSummaryEntry): string[] {
	if (typeof entry === 'string') {
		return [entry];
	}
	if (!entry || !Array.isArray(entry.items)) {
		return [];
	}
	return entry.items.flatMap((item) => flattenActionSummary(item));
}

interface ActionSummaryHarnessProps {
	actionId: string;
	translation: TranslationContext;
}

function ActionSummaryHarness({
	actionId,
	translation,
}: ActionSummaryHarnessProps) {
	const summary = summarizeContent('action', actionId, translation);
	const content = summary
		.flatMap((entry) => flattenActionSummary(entry as ActionSummaryEntry))
		.join('\n');
	return <div data-testid="summary-output">{content}</div>;
}

afterEach(() => {
	cleanup();
});

describe('Action translation with population scaling', () => {
	it('mentions population scaling with metadata supplied by provider', () => {
		const factory = createContentFactory();
		const resourceKey = 'resource.tax.gold';
		const action = factory.action({
			name: 'Population Tax',
			effects: [
				{
					// Use resource evaluator with populationTotal to evaluate population
					evaluator: {
						type: 'resource',
						params: { resourceId: Stat.populationTotal },
					},
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: { key: resourceKey, amount: 1 },
						},
					],
				},
			],
		});
		const { translationContext, registries, session } =
			buildSyntheticTranslationContext(({ registries, session }) => {
				registries.actions.add(action.id, action);
				registries.resources[resourceKey] = {
					key: resourceKey,
					label: 'Tax Gold',
					icon: '🪙',
				};
				session.metadata = {
					...session.metadata,
					resources: {
						...session.metadata.resources,
						[resourceKey]: { label: 'Civic Gold', icon: '🪙' },
					},
				};
			});
		render(
			<RegistryMetadataProvider
				registries={registries}
				metadata={session.metadata}
			>
				<ActionSummaryHarness
					actionId={action.id}
					translation={translationContext}
				/>
			</RegistryMetadataProvider>,
		);
		const populationIcon = translationContext.assets.population?.icon ?? '👥';
		const summaryText = screen.getByTestId('summary-output').textContent ?? '';
		expect(summaryText).toContain(populationIcon);
		expect(summaryText).toMatch(/per/);
	});

	it('falls back to generic population labels when metadata icons are missing', () => {
		const factory = createContentFactory();
		const resourceKey = 'resource.levy.gold';
		const action = factory.action({
			name: 'Population Levy',
			effects: [
				{
					// Use resource evaluator with populationTotal to evaluate population
					evaluator: {
						type: 'resource',
						params: { resourceId: Stat.populationTotal },
					},
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: { key: resourceKey, amount: 1 },
						},
					],
				},
			],
		});
		const { translationContext, registries, session } =
			buildSyntheticTranslationContext(({ registries, session }) => {
				registries.actions.add(action.id, action);
				registries.resources[resourceKey] = {
					key: resourceKey,
					label: 'Levy Gold',
				};
				session.metadata = {
					...session.metadata,
					assets: {
						...session.metadata.assets,
						population: { label: 'Population' },
					},
					resources: {
						...session.metadata.resources,
						[resourceKey]: { label: 'Levy Gold' },
					},
				};
			});
		render(
			<RegistryMetadataProvider
				registries={registries}
				metadata={session.metadata}
			>
				<ActionSummaryHarness
					actionId={action.id}
					translation={translationContext}
				/>
			</RegistryMetadataProvider>,
		);
		const summaryText = screen.getByTestId('summary-output').textContent ?? '';
		const populationIcon = translationContext.assets.population.icon ?? '';
		expect(summaryText).toMatch(/per/i);
		if (populationIcon) {
			expect(summaryText).toContain(populationIcon);
		}
		expect(summaryText).not.toMatch(/Population/i);
	});
});
