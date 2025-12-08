import {
	describeContent,
	summarizeContent,
	registerContentTranslator,
} from './factory';
import type { Land, Summary, SummaryEntry } from './types';
import type { TranslationContext } from '../context';
import { selectSlotDisplay } from '../context/assetSelectors';

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
		const developmentId = land.developments[slotIndex];
		if (developmentId) {
			const development = context.developments.get(developmentId);
			items.push({
				title: `${development?.icon || ''} ${development?.name || developmentId}`,
				items: translateSummary('development', developmentId, context, {
					installed: true,
				}),
			});
		} else {
			const slot = selectSlotDisplay(context.assets);
			const label = slot.label ?? 'Development Slot';
			const prefix = slot.icon ? `${slot.icon} ` : '';
			const title = `${prefix}Empty ${label}`.trim();
			if (slot.description) {
				items.push({ title, items: [slot.description] });
			} else {
				items.push(title);
			}
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
