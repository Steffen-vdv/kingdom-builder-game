import type { EngineContext } from '@kingdom-builder/engine';
import { SLOT_INFO } from '@kingdom-builder/contents';
import {
	describeContent,
	summarizeContent,
	registerContentTranslator,
} from './factory';
import type {
	Land,
	LegacyContentTranslator,
	Summary,
	SummaryEntry,
} from './types';

function translate(
	land: Land,
	engineContext: EngineContext,
	translateSummary: (
		type: string,
		target: unknown,
		engineContext: EngineContext,
		opts?: Record<string, unknown>,
	) => Summary,
): Summary {
	const items: SummaryEntry[] = [];
	for (let slotIndex = 0; slotIndex < land.slotsMax; slotIndex += 1) {
		const devId = land.developments[slotIndex];
		if (devId) {
			const development = engineContext.developments.get(devId);
			items.push({
				title: `${development?.icon || ''} ${development?.name || devId}`,
				items: translateSummary('development', devId, engineContext, {
					installed: true,
				}),
			});
		} else {
			items.push(`${SLOT_INFO.icon} Empty ${SLOT_INFO.label}`);
		}
	}
	return items;
}

class LandTranslator implements LegacyContentTranslator<Land> {
	summarize(land: Land, engineContext: EngineContext): Summary {
		return translate(land, engineContext, summarizeContent);
	}
	describe(land: Land, engineContext: EngineContext): Summary {
		return translate(land, engineContext, describeContent);
	}
}

registerContentTranslator('land', new LandTranslator());
