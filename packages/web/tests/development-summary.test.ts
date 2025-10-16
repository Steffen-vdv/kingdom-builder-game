import { describe, expect, it } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import {
	summarizeContent,
	summarizeEffects,
	type SummaryEntry,
	type SummaryGroup,
} from '../src/translation';
import { selectTriggerDisplay } from '../src/translation/context/assetSelectors';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';
import type { TranslationContext } from '../src/translation/context';
import { formatDetailText } from '../src/utils/stats/format';

interface SelfReferentialDevelopment {
	id: string;
	steps: Array<{ key: string; effects: EffectDef<Record<string, unknown>>[] }>;
}

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

function hasSelfEvaluator(effects: EffectDef[] | undefined): boolean {
	if (!effects) {
		return false;
	}
	for (const effect of effects) {
		const params = effect.evaluator?.params as
			| Record<string, unknown>
			| undefined;
		if (effect.evaluator?.type === 'development' && params?.['id'] === '$id') {
			return true;
		}
		if (hasSelfEvaluator(effect.effects as EffectDef[] | undefined)) {
			return true;
		}
	}
	return false;
}

function findSelfReferentialDevelopment(
	registry: Iterable<readonly [string, Record<string, unknown>]>,
): SelfReferentialDevelopment {
	for (const [id, definition] of registry) {
		if (typeof definition !== 'object' || definition === null) {
			continue;
		}
		const steps: Array<{
			key: string;
			effects: EffectDef<Record<string, unknown>>[];
		}> = [];
		for (const [key, value] of Object.entries(definition)) {
			if (!Array.isArray(value) || !key.endsWith('Step')) {
				continue;
			}
			const effects = value as EffectDef<Record<string, unknown>>[];
			if (!hasSelfEvaluator(effects)) {
				continue;
			}
			steps.push({ key, effects });
		}
		if (steps.length > 0) {
			return { id, steps };
		}
	}
	throw new Error('Expected development with self-referential step effects');
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
				.filter((value) => typeof value === 'string' && value.trim().length > 0)
				.map((value) => value!.trim());
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

describe('development summary', () => {
	it('merges phase-triggered effects referencing the development', () => {
		const { translationContext, registries } =
			buildSyntheticTranslationContext();
		const { id, steps } = findSelfReferentialDevelopment(
			registries.developments.entries(),
		);
		const summary = summarizeContent('development', id, translationContext);
		const summaryRepeat = summarizeContent(
			'development',
			id,
			translationContext,
		);
		const flattenedRepeat = flatten(summaryRepeat);
		expect(flattenedRepeat).toEqual(flatten(summary));

		for (const { key, effects } of steps) {
			const triggerDisplay = selectTriggerDisplay(
				translationContext.assets,
				key,
			);
			const expectedEffects = summarizeEffects(effects, translationContext);
			const stepLabel = formatStepTriggerLabel(translationContext, key);
			const icon = triggerDisplay.icon?.trim() ?? '';
			const possibleTitles = new Set<string>();
			if (stepLabel) {
				const prefix = icon.length ? `${icon} ` : '';
				possibleTitles.add(`${prefix}During ${stepLabel}`.trim());
			}
			const future = triggerDisplay.future ?? triggerDisplay.label;
			if (future && future.trim().length) {
				const title = [icon, future]
					.filter((value) => value && value.length > 0)
					.join(' ')
					.trim();
				if (title.length) {
					possibleTitles.add(title);
				}
			}
			possibleTitles.add(key);
			const incomeGroup = findGroup(summary, (entry) => {
				for (const title of possibleTitles) {
					if (entry.title === title) {
						return true;
					}
				}
				return false;
			});
			expect(incomeGroup, `summary group for ${key}`).toBeDefined();
			if (!incomeGroup) {
				continue;
			}
			const flattened = flatten(incomeGroup.items);
			for (const expected of expectedEffects) {
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
		}
	});
});
