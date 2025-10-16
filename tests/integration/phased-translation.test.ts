import { describe, it, expect } from 'vitest';

import { createEngine } from '@kingdom-builder/engine';
import {
	summarizeContent,
	describeContent,
} from '@kingdom-builder/web/translation/content';
import type { TranslationContext } from '@kingdom-builder/web/translation/context';
// prettier-ignore
import type {
        PhasedDef,
} from '@kingdom-builder/web/translation/content/phased';
import {
	RESOURCES,
	PHASES,
	POPULATIONS,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
// prettier-ignore
import {
        createContentFactory,
} from '@kingdom-builder/testing';
import { formatDetailText } from '../../packages/web/src/utils/stats/format';
import { createTranslationContextForEngine } from '../../packages/web/tests/helpers/createTranslationContextForEngine';

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
	const addedStep = {
		icon: '🧪',
		future: 'During test step',
		past: 'Test step',
	} as const;

	it('renders dynamic step metadata from translation assets', () => {
		const content = createContentFactory();
		const development = content.development();
		const stored = content.developments.get(
			development.id,
		) as unknown as PhasedDef;

		const [resourceKey] = Object.keys(RESOURCES) as ResourceKey[];
		const makeEffect = (amount: number) => ({
			type: 'resource',
			method: 'add',
			params: { key: resourceKey, amount },
		});

		const stepKeySet = new Set<string>();
		for (const phase of PHASES) {
			const steps = phase.steps ?? [];
			for (const step of steps) {
				const triggers = step.triggers ?? [];
				for (const trigger of triggers) {
					if (trigger.endsWith('Step')) {
						stepKeySet.add(trigger);
					}
				}
			}
		}
		stepKeySet.add('onTestStep');

		const stepKeys = Array.from(stepKeySet);

		expect(stepKeys).toContain('onTestStep');
		expect(stepKeys.some((key) => key !== 'onTestStep')).toBe(true);

		const targetDefinition = development as unknown as PhasedDef;
		stepKeys.forEach((key, index) => {
			const effects = [makeEffect(index + 1)];
			stored[key as keyof PhasedDef] = effects;
			targetDefinition[key as keyof PhasedDef] = effects;
		});
		const engineContext = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		const translationContext = createTranslationContextForEngine(
			engineContext,
			(registries) => {
				registries.developments.add(development.id, development);
			},
			(metadata) => ({
				...metadata,
				triggers: {
					...(metadata.triggers ?? {}),
					onTestStep: {
						icon: addedStep.icon,
						future: addedStep.future,
						past: addedStep.past,
						label: addedStep.past,
					},
				},
			}),
		);
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

		for (const key of stepKeys) {
			const registryDefinition = translationContext.developments.get(
				development.id,
			) as unknown as PhasedDef;
			const hasDefinitionEffects = Array.isArray(
				registryDefinition?.[key as keyof PhasedDef],
			);
			const asset = translationContext.assets.triggers?.[key] ?? {};
			const futureLabel = asset.future ?? asset.label ?? asset.past ?? key;
			const expectedTitle = [asset.icon, futureLabel]
				.filter(Boolean)
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(translationContext, key);
			const resolvedTitle = stepLabel
				? [asset.icon, `During ${stepLabel}`].filter(Boolean).join(' ').trim()
				: expectedTitle;

			if (!hasDefinitionEffects) {
				if (key === 'onTestStep') {
					expect(asset).toBeDefined();
				}
				continue;
			}

			const summaryMatch = findEntry(summary, resolvedTitle);
			const summaryEntry = summaryMatch ?? findEntry(summary, expectedTitle);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();
			const expectedSummaryTitle = summaryMatch ? resolvedTitle : expectedTitle;
			expect(summaryEntry?.title).toBe(expectedSummaryTitle);

			const describeMatch = findEntry(details, resolvedTitle);
			const describeEntry = describeMatch ?? findEntry(details, expectedTitle);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();
			const expectedDescribeTitle = describeMatch
				? resolvedTitle
				: expectedTitle;
			expect(describeEntry?.title).toBe(expectedDescribeTitle);
		}
	});
});
