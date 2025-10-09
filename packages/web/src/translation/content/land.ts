import { SLOT_INFO } from '@kingdom-builder/contents';
import {
	describeContent,
	summarizeContent,
	registerContentTranslator,
} from './factory';
import type { Land, Summary, SummaryEntry } from './types';
import type { TranslationContext } from '../context';

function translate(
	land: Land,
	context: TranslationContext,
	translateSummary: (
		type: string,
		target: unknown,
		translationContext: TranslationContext,
		options?: Record<string, unknown>,
	) => Summary,
): Summary {
	const items: SummaryEntry[] = [];
	for (let slotIndex = 0; slotIndex < land.slotsMax; slotIndex += 1) {
		const devId = land.developments[slotIndex];
		if (devId) {
			const development = context.developments.get(devId);
			items.push({
				title: `${development?.icon || ''} ${development?.name || devId}`,
				items: translateSummary('development', devId, context, {
					installed: true,
				}),
			});
		} else {
			items.push(`${SLOT_INFO.icon} Empty ${SLOT_INFO.label}`);
		}
	}
	return items;
}

class LandTranslator {
	summarize(land: Land, context: TranslationContext): Summary {
		return translate(land, context, summarizeContent);
	}
	describe(land: Land, context: TranslationContext): Summary {
		return translate(land, context, describeContent);
	}
}

registerContentTranslator('land', new LandTranslator());
