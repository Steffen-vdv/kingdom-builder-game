import type { SummaryEntry } from '../content';
import { registerContentTranslator } from '../content/factory';
import type { ContentTranslator } from '../content/types';
import {
	buildGlobalActionCostSummary,
	buildResourceValueDescriptions,
	buildResourceValueLogEntries,
	buildResourceValueSummaries,
} from './format';
import type { ResourceValuesTranslationTarget } from './types';

class ResourceValuesTranslator
	implements ContentTranslator<ResourceValuesTranslationTarget, void>
{
	summarize(target: ResourceValuesTranslationTarget): SummaryEntry[] {
		const entries: SummaryEntry[] = [];
		const cost = buildGlobalActionCostSummary(target);
		if (cost) {
			entries.push(cost);
		}
		entries.push(...buildResourceValueSummaries(target));
		return entries;
	}

	describe(target: ResourceValuesTranslationTarget): SummaryEntry[] {
		const entries: SummaryEntry[] = [];
		const cost = buildGlobalActionCostSummary(target);
		if (cost) {
			entries.push(cost);
		}
		entries.push(...buildResourceValueSummaries(target));
		entries.push(...buildResourceValueDescriptions(target));
		return entries;
	}

	log(target: ResourceValuesTranslationTarget): string[] {
		return buildResourceValueLogEntries(target);
	}
}

registerContentTranslator('resource-values', new ResourceValuesTranslator());

export type { ResourceValuesTranslationTarget } from './types';
