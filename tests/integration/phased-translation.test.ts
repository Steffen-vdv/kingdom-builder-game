import { describe, it, expect } from 'vitest';

import {
	summarizeContent,
	describeContent,
} from '@kingdom-builder/web/translation/content';
// prettier-ignore
import type {
        PhasedDef,
} from '@kingdom-builder/web/translation/content/phased';
// prettier-ignore
import type {
        TranslationContext,
} from '@kingdom-builder/web/translation/context';
import { createContentFactory } from '@kingdom-builder/testing';
import { formatDetailText } from '../../packages/web/src/utils/stats/format';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

type Entry = string | { title: string; items: Entry[] };

function findEntry(
	entries: Entry[],
	title: string,
): { title: string; items: Entry[] } | undefined {
	for (const entry of entries) {
		if (typeof entry === 'string') {
			continue;
		}
		if (entry.title === title) {
			return entry;
		}
		const nested = findEntry(entry.items, title);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

function formatStepTriggerLabel(
	ctx: TranslationContext,
	triggerKey: string,
): string | undefined {
	for (const phase of ctx.phases) {
		const steps = phase.steps ?? [];
		for (const step of steps) {
			const triggers = step.triggers ?? [];
			if (!triggers.includes(triggerKey)) {
				continue;
			}
			const phaseLabelParts = [
				phase.icon,
				phase.label ?? formatDetailText(phase.id),
			]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			const stepLabelParts = (step.title ?? formatDetailText(step.id))
				?.trim()
				.replace(/\s+/gu, ' ');
			const sections: string[] = [];
			if (phaseLabelParts.length) {
				sections.push(`${phaseLabelParts} Phase`);
			}
			if (stepLabelParts && stepLabelParts.length) {
				sections.push(`${stepLabelParts} step`);
			}
			if (!sections.length) {
				return undefined;
			}
			return sections.join(' — ');
		}
	}
	return undefined;
}

describe('PhasedTranslator step triggers', () => {
	it('renders dynamic step metadata from trigger info', () => {
		const content = createContentFactory();
		const development = content.development({ name: 'Experimental Lab' });

		let resourceKey: string | undefined;
		const { translationContext, registries } = buildSyntheticTranslationContext(
			({ registries, session }) => {
				registries.developments.add(development.id, development);
				const resourceKeys = Object.keys(registries.resources);
				resourceKey = resourceKeys[0];

				const [firstPhaseId, firstPhaseMetadata] =
					Object.entries(session.metadata.phases ?? {})[0] ?? [];
				const experimentStepId = firstPhaseId
					? `${firstPhaseId}.experiment`
					: 'phase.experiment';
				const existingSteps = Array.isArray(firstPhaseMetadata?.steps)
					? [...firstPhaseMetadata.steps]
					: [];
				session.metadata = {
					...session.metadata,
					phases: firstPhaseId
						? {
								...session.metadata.phases,
								[firstPhaseId]: {
									...(firstPhaseMetadata ?? {}),
									steps: [
										...existingSteps,
										{
											id: experimentStepId,
											label: 'Experimentation',
											icon: '🧬',
											triggers: ['onTestStep'],
										},
									],
								},
							}
						: session.metadata.phases,
					triggers: {
						...session.metadata.triggers,
						onTestStep: {
							icon: '🧪',
							future: 'While conducting experiments',
							past: 'Experiment step',
							label: 'Experiment step',
						},
					},
				};
				if (firstPhaseId) {
					session.phases = session.phases.map((phase) => {
						if (phase.id === firstPhaseId) {
							const steps = [...(phase.steps ?? [])];
							steps.push({
								id: experimentStepId,
								title: 'Experimentation',
								icon: '🧬',
								triggers: ['onTestStep'],
							});
							return { ...phase, steps };
						}
						return phase;
					});
				}
			},
		);

		const stored = registries.developments.get(
			development.id,
		) as unknown as PhasedDef;
		const triggerAssets = translationContext.assets.triggers;
		const stepKeys = Object.keys(triggerAssets).filter((key) =>
			key.endsWith('Step'),
		);

		expect(stepKeys).toContain('onTestStep');
		expect(stepKeys.some((key) => key !== 'onTestStep')).toBe(true);

		if (!resourceKey) {
			throw new Error('Unable to resolve resource key for test triggers.');
		}
		const makeEffect = (amount: number) => ({
			type: 'resource',
			method: 'add',
			params: { key: resourceKey, amount },
		});

		stepKeys.forEach((key, index) => {
			stored[key as keyof PhasedDef] = [makeEffect(index + 1)];
		});

		const summary = summarizeContent(
			'development',
			development.id,
			translationContext,
		) as unknown as Entry[];
		const details = describeContent(
			'development',
			development.id,
			translationContext,
		) as unknown as Entry[];

		const info = triggerAssets as Record<
			string,
			{ icon?: string; future?: string }
		>;
		for (const key of stepKeys) {
			const expectedTitle = [info[key]?.icon, info[key]?.future]
				.filter(Boolean)
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(translationContext, key);
			const resolvedTitle = stepLabel
				? [info[key]?.icon, `During ${stepLabel}`]
						.filter(Boolean)
						.join(' ')
						.trim()
				: expectedTitle;

			const summaryEntry =
				findEntry(summary, resolvedTitle) ?? findEntry(summary, expectedTitle);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();
			expect(summaryEntry?.title ?? summaryEntry).toBeDefined();
			if (summaryEntry && typeof summaryEntry !== 'string') {
				expect(summaryEntry.title).toBe(resolvedTitle || expectedTitle);
			}

			const describeEntry =
				findEntry(details, resolvedTitle) ?? findEntry(details, expectedTitle);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();
			expect(describeEntry?.title ?? describeEntry).toBeDefined();
			if (describeEntry && typeof describeEntry !== 'string') {
				expect(describeEntry.title).toBe(resolvedTitle || expectedTitle);
			}
		}
	});
});
