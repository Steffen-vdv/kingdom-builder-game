import { describe, it, expect, vi } from 'vitest';

import type { EffectDef } from '@kingdom-builder/protocol';
vi.mock('../../packages/web/src/translation/content/factory', () => ({
	registerContentTranslator: () => undefined,
}));
vi.mock('../../packages/web/src/translation/content/development', () => ({}));
vi.mock('../../packages/web/src/translation/content/building', () => ({}));

import {
	PhasedTranslator,
	type PhasedDef,
} from '../../packages/web/src/translation/content/phased';
import type { TranslationContext } from '@kingdom-builder/web/translation/context';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';
import { formatDetailText } from '../../packages/web/src/utils/stats/format';

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
	context: TranslationContext,
	triggerKey: string,
): string | undefined {
	for (const phase of context.phases) {
		const steps = phase.steps ?? [];
		for (const step of steps) {
			const triggers = step.triggers ?? [];
			if (!triggers.includes(triggerKey)) {
				continue;
			}
			const phaseParts = [phase.icon, phase.label ?? formatDetailText(phase.id)]
				.filter(
					(value): value is string =>
						typeof value === 'string' && value.trim().length > 0,
				)
				.map((value) => value.trim());
			const phaseLabel = phaseParts.join(' ');
			const stepLabel = (step.title ?? formatDetailText(step.id))
				?.trim()
				.replace(/\s+/gu, ' ');
			const sections: string[] = [];
			if (phaseLabel.length) {
				sections.push(`${phaseLabel} Phase`);
			}
			if (stepLabel && stepLabel.length) {
				sections.push(`${stepLabel} step`);
			}
			if (sections.length === 0) {
				return undefined;
			}
			return sections.join(' — ');
		}
	}
	return undefined;
}

describe('PhasedTranslator step triggers', () => {
	it('renders dynamic step metadata from translation assets', () => {
		const { translationContext, registries } = buildSyntheticTranslationContext(
			({ session }) => {
				const updatedPhases = session.phases.map((phase, index) => {
					if (index !== 0) {
						return phase;
					}
					const steps = [...(phase.steps ?? [])];
					steps.push({
						id: 'phase.test.step',
						title: 'Test Step',
						icon: '🧪',
						triggers: ['onTestStep'],
					});
					return {
						...phase,
						steps,
					};
				});
				session.phases = updatedPhases;
				session.metadata.triggers = {
					...session.metadata.triggers,
					onTestStep: {
						icon: '🧪',
						future: 'During test step',
						past: 'Test step',
						label: 'Test step',
					},
				};
			},
		);

		// Ensure the translator class resolves to a callable constructor
		// during tests.
		if (typeof PhasedTranslator !== 'function') {
			throw new TypeError('PhasedTranslator export is not a constructor');
		}
		const translator = new PhasedTranslator();
		const phasedDefinition: PhasedDef = {};
		const [resourceKey] = Object.keys(registries.resources);
		const makeEffect = (
			amount: number,
		): EffectDef<Record<string, unknown>> => ({
			type: 'resource',
			method: 'add',
			params: { key: resourceKey ?? 'resource.0', amount },
		});

		const stepKeys = Object.keys(
			translationContext.assets.triggers ?? {},
		).filter((key) => key.endsWith('Step'));

		expect(stepKeys).toContain('onTestStep');
		expect(stepKeys.some((key) => key !== 'onTestStep')).toBe(true);

		stepKeys.forEach((key, index) => {
			phasedDefinition[key as keyof PhasedDef] = [makeEffect(index + 1)];
		});

		const summaryEntries = translator.summarize(
			phasedDefinition,
			translationContext,
		) as unknown as Entry[];
		const detailEntries = translator.describe(
			phasedDefinition,
			translationContext,
		) as unknown as Entry[];

		for (const key of stepKeys) {
			const trigger = translationContext.assets.triggers?.[key];
			const expectedTitle = [trigger?.icon, trigger?.future ?? trigger?.label]
				.filter(
					(value): value is string =>
						typeof value === 'string' && value.trim().length > 0,
				)
				.map((value) => value.trim())
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(translationContext, key);
			const resolvedTitle = stepLabel
				? [trigger?.icon, `During ${stepLabel}`]
						.filter(
							(value): value is string =>
								typeof value === 'string' && value.trim().length > 0,
						)
						.map((value) => value.trim())
						.join(' ')
						.trim()
				: expectedTitle;

			const summaryEntry =
				findEntry(summaryEntries, resolvedTitle) ??
				findEntry(summaryEntries, expectedTitle) ??
				findEntry(summaryEntries, key);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();

			const describeEntry =
				findEntry(detailEntries, resolvedTitle) ??
				findEntry(detailEntries, expectedTitle) ??
				findEntry(detailEntries, key);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();

			const headingCandidates = [resolvedTitle, expectedTitle, key].filter(
				(value): value is string =>
					typeof value === 'string' && value.trim().length > 0,
			);
			const expectedHeading = headingCandidates[0];
			if (!expectedHeading) {
				throw new TypeError(`Unable to derive heading for trigger ${key}`);
			}

			expect(typeof summaryEntry !== 'string').toBe(true);
			expect(typeof describeEntry !== 'string').toBe(true);
			if (
				typeof summaryEntry !== 'string' &&
				typeof describeEntry !== 'string'
			) {
				expect(summaryEntry.title).toBe(expectedHeading);
				expect(describeEntry.title).toBe(expectedHeading);
				expect(summaryEntry.items.length).toBe(describeEntry.items.length);
				summaryEntry.items.forEach((item, index) => {
					const describeItem = describeEntry.items[index];
					if (typeof item === 'string' && typeof describeItem === 'string') {
						expect(describeItem).toContain(item);
						return;
					}
					expect(describeItem).toEqual(item);
				});
			}
		}
	});
});
