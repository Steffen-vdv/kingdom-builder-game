import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	summarizeContent,
	summarizeEffects,
	type SummaryEntry,
	type SummaryGroup,
} from '../src/translation';
import type { EffectDef } from '@kingdom-builder/protocol';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';
import { selectTriggerDisplay } from '../src/translation/context/assetSelectors';

function flatten(entries: SummaryEntry[]): string[] {
	const lines: string[] = [];
	for (const entry of entries) {
		if (typeof entry === 'string') {
			lines.push(entry);
			continue;
		}
		lines.push(entry.title);
		lines.push(...flatten(entry.items));
	}
	return lines;
}

function findGroup(
	entries: SummaryEntry[],
	predicate: (entry: SummaryGroup) => boolean,
): SummaryGroup | undefined {
	for (const entry of entries) {
		if (typeof entry === 'string') {
			continue;
		}
		if (predicate(entry)) {
			return entry;
		}
		const nested = findGroup(entry.items, predicate);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

describe('development summary', () => {
	it('merges phase-triggered effects referencing the development', () => {
		const factory = createContentFactory();
		let developmentId = '';
		let triggerId = '';
		let phaseLabel = '';
		const { translationContext, session } = buildSyntheticTranslationContext(
			({ registries, session }) => {
				const development = factory.development({
					name: 'Test Development',
					icon: '🧪',
				});
				developmentId = development.id;
				registries.developments.add(development.id, development);
				const triggerEntries = Object.keys(session.metadata.triggers ?? {});
				triggerId = triggerEntries[0] ?? 'trigger.synthetic';
				const resourceKeys = Object.keys(registries.resources);
				const resourceKey = resourceKeys[0] ?? 'gold';
				const nestedEffect: EffectDef<Record<string, unknown>> = {
					type: 'resource',
					method: 'add',
					params: { key: resourceKey, amount: 3 },
				};
				const phaseEffect: EffectDef<Record<string, unknown>> = {
					evaluator: {
						type: 'development',
						params: { id: development.id },
					},
					effects: [nestedEffect],
				};
				(
					development as unknown as Record<
						string,
						EffectDef<Record<string, unknown>>[] | undefined
					>
				)[triggerId] = [phaseEffect];
				const targetPhase = session.phases[0];
				phaseLabel = targetPhase?.label ?? targetPhase?.id ?? 'Growth';
				const syntheticStep = {
					id: 'phase.synthetic.summary',
					title: 'Synthetic Income',
					icon: '🧪',
					triggers: [triggerId],
					effects: [phaseEffect],
				};
				if (targetPhase) {
					const existingSteps = targetPhase.steps ?? [];
					targetPhase.steps = [...existingSteps, syntheticStep];
				}
				session.metadata.developments = {
					...(session.metadata.developments ?? {}),
					[development.id]: {
						label: development.name,
						icon: development.icon,
					},
				};
			},
		);
		const summary = summarizeContent(
			'development',
			developmentId,
			translationContext,
		);
		const summaryRepeat = summarizeContent(
			'development',
			developmentId,
			translationContext,
		);
		const expectedPhaseLabel = `On each ${phaseLabel} Phase`;
		const incomeGroup = findGroup(summary, (entry) => {
			return entry.title.includes(expectedPhaseLabel);
		});
		expect(incomeGroup).toBeDefined();
		if (!incomeGroup) {
			return;
		}
		const targetPhase = session.phases[0];
		const matchedStep = targetPhase?.steps?.find((step) => {
			return step.id === 'phase.synthetic.summary';
		});
		const triggerDisplay = selectTriggerDisplay(
			translationContext.assets,
			triggerId,
		);
		const fallbackIcons = [matchedStep?.icon, targetPhase?.icon].filter(
			(icon): icon is string => typeof icon === 'string' && icon.length > 0,
		);
		if (triggerDisplay.icon) {
			if (!incomeGroup.title.includes(triggerDisplay.icon)) {
				if (fallbackIcons.length > 0) {
					const hasFallbackIcon = fallbackIcons.some((icon) => {
						return incomeGroup.title.includes(icon);
					});
					expect(hasFallbackIcon).toBe(true);
				}
			} else {
				expect(incomeGroup.title).toContain(triggerDisplay.icon);
			}
		} else if (fallbackIcons.length > 0) {
			const hasFallbackIcon = fallbackIcons.some((icon) => {
				return incomeGroup.title.includes(icon);
			});
			expect(hasFallbackIcon).toBe(true);
		}
		if (triggerDisplay.past) {
			const hasTriggerLabel = incomeGroup.title.includes(triggerDisplay.past);
			expect(hasTriggerLabel || incomeGroup.title.includes(phaseLabel)).toBe(
				true,
			);
		}
		expect(incomeGroup.title).toContain(phaseLabel);
		const expectedLines = summarizeEffects(
			matchedStep?.effects,
			translationContext,
		);
		const flattened = flatten(incomeGroup.items);
		for (const expected of expectedLines) {
			if (typeof expected === 'string') {
				const [base] = expected.split(' per ');
				const matches = flattened.some((line) => {
					return (
						line.includes(expected) || (base ? line.includes(base) : false)
					);
				});
				expect(matches).toBe(true);
			} else {
				expect(incomeGroup.items).toContainEqual(expected);
			}
		}
		const flattenedRepeat = flatten(summaryRepeat);
		expect(flattenedRepeat).toEqual(flatten(summary));
	});
});
