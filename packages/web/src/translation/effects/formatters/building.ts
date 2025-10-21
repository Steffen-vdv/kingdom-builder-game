import { registerEffectFormatter } from '../factory';
import {
	describeContent,
	summarizeContent,
	type Summary,
	type SummaryEntry,
} from '../../content';
import type { TranslationContext } from '../../context';
import { resolveBuildingDisplay } from '../../content/buildingIcons';

function resolveBuildingLabel(
	id: string | undefined,
	context: TranslationContext,
): { label: string; summary: Summary; description: Summary } {
	const safeId = typeof id === 'string' && id.length > 0 ? id : undefined;
	const lookupId = safeId ?? 'building';
	const { name, icon } = resolveBuildingDisplay(lookupId, context);
	const label = [icon, name].filter(Boolean).join(' ').trim() || lookupId;
	const summarize = (): Summary => {
		if (!safeId) {
			return [];
		}
		try {
			return summarizeContent('building', safeId, context);
		} catch {
			return [];
		}
	};
	const describe = (): Summary => {
		if (!safeId) {
			return [];
		}
		try {
			return describeContent('building', safeId, context);
		} catch {
			return [];
		}
	};
	return {
		label,
		summary: summarize(),
		description: describe(),
	};
}

function buildEntry(
	label: string,
	items: Summary,
	options?: { markDescription?: boolean },
): SummaryEntry {
	if (items.length === 0) {
		return label;
	}
	const entry: Record<string, unknown> = {
		title: label,
		items,
	};
	if (options?.markDescription) {
		entry._desc = true;
	}
	return entry as SummaryEntry;
}

registerEffectFormatter('building', 'add', {
	summarize: (effect, context) => {
		const { label, summary } = resolveBuildingLabel(
			effect.params?.['id'] as string,
			context,
		);
		return buildEntry(`Construct ${label}`, summary);
	},
	describe: (effect, context) => {
		const { label, description } = resolveBuildingLabel(
			effect.params?.['id'] as string,
			context,
		);
		return buildEntry(`Construct ${label}`, description, {
			markDescription: true,
		});
	},
});
