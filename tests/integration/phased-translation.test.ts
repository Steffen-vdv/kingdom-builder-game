import { describe, it, expect } from 'vitest';

import {
	summarizeContent,
	describeContent,
} from '@kingdom-builder/web/translation/content';
// prettier-ignore
import type {
        PhasedDef,
} from '@kingdom-builder/web/translation/content/phased';
import { PHASES, GAME_START, RULES } from '@kingdom-builder/contents';
import type { DevelopmentConfig } from '@kingdom-builder/protocol';
import { formatDetailText } from '../../packages/web/src/utils/stats/format';
import type { TranslationContext } from '@kingdom-builder/web/translation/context';
import { createEngineTranslationContext } from '../../packages/web/tests/helpers/createEngineTranslationContext';
import { createSessionRegistries } from '../../packages/web/tests/helpers/sessionRegistries';

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
	ctx: Pick<TranslationContext, 'phases'>,
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

	it('renders dynamic step metadata from trigger registry metadata', () => {
		const registries = createSessionRegistries();
		const developmentId = 'development.integration.trigger';
		const development: DevelopmentConfig = {
			id: developmentId,
			name: developmentId,
			icon: undefined,
			onBuild: [],
			onGrowthPhase: [],
			onBeforeAttacked: [],
			onAttackResolved: [],
			onPayUpkeepStep: [],
			onGainIncomeStep: [],
			onGainAPStep: [],
			system: undefined,
			populationCap: undefined,
			upkeep: undefined,
		};
		registries.developments.add(developmentId, development);

		const { translationContext, registries: sessionRegistries } =
			createEngineTranslationContext({
				phases: PHASES,
				start: GAME_START,
				rules: RULES,
				registries,
				configureMetadata(metadata) {
					const triggers = {
						...(metadata.triggers ?? {}),
						onTestStep: {
							icon: addedStep.icon,
							future: addedStep.future,
							past: addedStep.past,
							label: addedStep.past,
						},
					};
					return {
						...metadata,
						triggers,
					};
				},
			});

		const stored = sessionRegistries.developments.get(
			developmentId,
		) as unknown as PhasedDef;

		const [resourceKey] = Object.keys(translationContext.assets.resources);
		const makeEffect = (amount: number) => ({
			type: 'resource',
			method: 'add',
			params: { key: resourceKey, amount },
		});

		const stepKeys = Object.keys(translationContext.assets.triggers).filter(
			(key) => key.endsWith('Step'),
		);

		expect(stepKeys).toContain('onTestStep');
		expect(stepKeys.some((key) => key !== 'onTestStep')).toBe(true);

		stepKeys.forEach((key, index) => {
			stored[key as keyof PhasedDef] = [makeEffect(index + 1)];
		});

		const summary = summarizeContent(
			'development',
			developmentId,
			translationContext,
		) as unknown as Entry[];
		const details = describeContent(
			'development',
			developmentId,
			translationContext,
		) as unknown as Entry[];

		for (const key of stepKeys) {
			const info = translationContext.assets.triggers[key];
			const expectedTitle = [info?.icon, info?.future ?? info?.label]
				.filter(
					(value): value is string =>
						typeof value === 'string' && value.trim().length > 0,
				)
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(translationContext, key);
			const resolvedTitle = stepLabel
				? [info?.icon, `During ${stepLabel}`]
						.filter(
							(value): value is string =>
								typeof value === 'string' && value.trim().length > 0,
						)
						.join(' ')
						.trim()
				: expectedTitle;

			const summaryEntry =
				findEntry(summary, resolvedTitle) ?? findEntry(summary, expectedTitle);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();

			const describeEntry =
				findEntry(details, resolvedTitle) ?? findEntry(details, expectedTitle);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();
		}
	});
});
