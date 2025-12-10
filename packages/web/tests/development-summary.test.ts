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
		let effectResourceId = '';
		const { translationContext, session } = buildSyntheticTranslationContext(
			({ registries, session }) => {
				const development = factory.development({
					name: 'Test Development',
					icon: '🧪',
				});
				developmentId = development.id;
				registries.developments.add(development.id, development);
				const triggerEntries = Object.keys(session.metadata.triggers ?? {});
				// Use existing trigger or create synthetic one with metadata
				if (triggerEntries.length > 0) {
					triggerId = triggerEntries[0]!;
				} else {
					triggerId = 'trigger.synthetic';
					session.metadata.triggers = {
						...session.metadata.triggers,
						[triggerId]: {
							label: 'Synthetic Trigger',
							icon: '🧪',
							text: 'On synthetic event',
						},
					};
				}
				// Use resource keys
				const resourceId =
					Object.keys(session.metadata.resources ?? {})[0] ??
					'resource:core:gold';
				effectResourceId = resourceId;
				// format: resourceId and change.amount
				const nestedEffect: EffectDef<Record<string, unknown>> = {
					type: 'resource',
					method: 'add',
					params: { resourceId, change: { type: 'amount', amount: 3 } },
				};
				const phaseEffect: EffectDef<Record<string, unknown>> = {
					evaluator: {
						type: 'development',
						params: { id: development.id },
					},
					effects: [nestedEffect],
				};
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
		const targetPhase = session.phases[0];
		const phaseKey = targetPhase?.id?.split('.').pop();
		const fallbackPhaseLabel = phaseKey
			? `onPhase.${phaseKey}Phase`
			: undefined;
		// The translator generates "On each {phase label}" so we look for that
		// pattern or variations thereof
		const incomeGroup = findGroup(summary, (entry) => {
			// Match "On each {phaseLabel}" - the translator already includes
			// "Phase" in the label so we don't add it again
			if (entry.title.includes(`On each ${phaseLabel}`)) {
				return true;
			}
			// Also check for raw phase label in case format varies
			if (entry.title.includes(phaseLabel)) {
				return true;
			}
			if (fallbackPhaseLabel) {
				return entry.title.includes(fallbackPhaseLabel);
			}
			return false;
		});
		expect(incomeGroup).toBeDefined();
		if (!incomeGroup) {
			return;
		}
		const nestedLines = flatten(incomeGroup.items);
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
		// formatter outputs resource icons from metadata
		const resourceMetadata =
			translationContext.resourceMetadata.get(effectResourceId);
		const resourceIcon = resourceMetadata.icon ?? '';
		const iconCandidates = [
			...(triggerDisplay.icon ? [triggerDisplay.icon] : []),
			...fallbackIcons,
			...(resourceIcon ? [resourceIcon] : []),
		].filter(
			(icon): icon is string => typeof icon === 'string' && icon.length > 0,
		);
		if (iconCandidates.length > 0) {
			const titleHasIcon = iconCandidates.some((icon) =>
				incomeGroup.title.includes(icon),
			);
			if (!titleHasIcon) {
				const nestedHasIcon = nestedLines.some((line) =>
					iconCandidates.some((icon) => line.includes(icon)),
				);
				expect(nestedHasIcon).toBe(true);
			}
		}
		const labelCandidates = [
			triggerDisplay.text,
			triggerDisplay.label,
			phaseLabel,
			fallbackPhaseLabel,
			triggerId,
		].filter(
			(label): label is string => typeof label === 'string' && label.length > 0,
		);
		const titleHasLabel = labelCandidates.some((label) =>
			incomeGroup.title.includes(label),
		);
		const nestedHasLabel = nestedLines.some((line) =>
			labelCandidates.some((label) => line.includes(label)),
		);
		expect(titleHasLabel || nestedHasLabel).toBe(true);
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
