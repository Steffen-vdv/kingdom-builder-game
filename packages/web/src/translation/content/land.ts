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
		const developmentId = land.developments[slotIndex];
		if (developmentId) {
			const development = context.developments.get(developmentId);
			const icon = (development?.icon ?? '').trim();
			const label = (development?.name ?? developmentId).trim();
			const prefix = icon.length ? `${icon} ` : '';
			const title = `${prefix}${label}`.trim();
			items.push({
				title,
				items: translateSummary('development', developmentId, context, {
					installed: true,
				}),
			});
		} else {
			const slotIcon = context.assets.slot.icon ?? '🧩';
			const slotLabel = context.assets.slot.label ?? 'Development Slot';
			items.push(`${slotIcon} Empty ${slotLabel}`);
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
