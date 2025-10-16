import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type { PhasedDef } from '../src/translation/content/phased';
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
		let triggerEffects: EffectDef<Record<string, unknown>>[] = [];
		const triggerMetadata = {
			icon: '🧪',
			label: 'Synthetic Trigger',
			future: 'During Synthetic Phase',
			past: 'Synthetic Phase',
		} as const;
		const { translationContext } = buildSyntheticTranslationContext(
			({ registries, session }) => {
				const development = factory.development({
					name: 'Test Development',
					icon: '🧪',
				});
				developmentId = development.id;
				triggerId = 'onGainIncomeStep';
				const resourceKeys = Object.keys(registries.resources);
				const resourceKey = resourceKeys[0] ?? 'gold';
				const nestedEffect: EffectDef<Record<string, unknown>> = {
					type: 'resource',
					method: 'add',
					params: { key: resourceKey, amount: 3 },
				};
				(development as PhasedDef)[triggerId as keyof PhasedDef] = [
					nestedEffect,
				];
				triggerEffects = [nestedEffect];
				registries.developments.add(development.id, development);
				session.metadata.developments = {
					...(session.metadata.developments ?? {}),
					[development.id]: {
						label: development.name,
						icon: development.icon,
					},
				};
				session.metadata.triggers = {
					...(session.metadata.triggers ?? {}),
					[triggerId]: triggerMetadata,
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
		const triggerDisplay = selectTriggerDisplay(
			translationContext.assets,
			triggerId,
		);
		expect(triggerDisplay.icon).toBe(triggerMetadata.icon);
		expect(triggerDisplay.future).toBe(triggerMetadata.future);
		const expectedTitleParts = [
			triggerDisplay.icon,
			triggerDisplay.future ?? triggerDisplay.past ?? triggerDisplay.label,
		]
			.filter((part): part is string => typeof part === 'string')
			.map((part) => part.trim())
			.filter((part) => part.length > 0);
		const flattenedSummary = flatten(summary);
		const matchingTitle = flattenedSummary.find((line) => {
			return expectedTitleParts.every((part) => line.includes(part));
		});
		expect(matchingTitle).toBeDefined();
		const incomeGroup = findGroup(
			summary,
			(entry) => entry.title === matchingTitle,
		);
		expect(incomeGroup).toBeDefined();
		if (!incomeGroup) {
			return;
		}
		const expectedLines = summarizeEffects(triggerEffects, translationContext);
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
