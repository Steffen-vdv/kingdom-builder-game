import { registerEffectFormatter } from '../factory';
import {
	describeContent,
	splitSummary,
	type Summary,
	type SummaryEntry,
} from '../../content';
import { selectSlotDisplay } from '../../context/assetSelectors';
import type { TranslationContext } from '../../context';

interface DevelopmentChangeVerbs {
	describe: string;
	log?: string;
}

interface DevelopmentChangeCopy {
	summary: string;
	description: string;
	log?: string;
	label: string;
}

function renderDevelopmentChange(
	id: string | undefined,
	context: TranslationContext,
	verbs: DevelopmentChangeVerbs,
): DevelopmentChangeCopy {
	const safeId = typeof id === 'string' && id.length ? id : 'development';
	let name = safeId;
	let icon = '';
	try {
		const developmentDefinition = context.developments.get(safeId);
		if (developmentDefinition?.name) {
			name = developmentDefinition.name;
		}
		if (developmentDefinition?.icon) {
			icon = developmentDefinition.icon;
		}
	} catch {
		/* ignore missing development definitions */
	}
	const decorated = [icon, name].filter(Boolean).join(' ').trim();
	const label = decorated || safeId;
	const summary = label;
	const description = `${verbs.describe} ${label}`.trim();
	const copy: DevelopmentChangeCopy = { summary, description, label };
	if (verbs.log) {
		copy.log = `${verbs.log} ${label}`.trim();
	}
	return copy;
}

function cloneSummaryEntry(entry: SummaryEntry): SummaryEntry {
	if (typeof entry === 'string') {
		return entry.trim();
	}
	return {
		...entry,
		items: entry.items.map(cloneSummaryEntry),
	};
}

function stripInstallationWrapper(summary: Summary): Summary {
	if (summary.length === 1) {
		const firstEntry = summary[0];
		if (
			firstEntry &&
			typeof firstEntry !== 'string' &&
			Array.isArray(firstEntry.items)
		) {
			return firstEntry.items.map(cloneSummaryEntry);
		}
	}
	return summary.map(cloneSummaryEntry);
}

function buildDevelopmentLogSummary(
	id: string,
	context: TranslationContext,
): Summary | null {
	try {
		const description = describeContent('development', id, context);
		const { effects } = splitSummary(description);
		if (!effects.length) {
			return null;
		}
		return stripInstallationWrapper(effects);
	} catch {
		return null;
	}
}

function formatSlotLabel(context: TranslationContext): string {
	const slotDisplay = selectSlotDisplay(context.assets);
	const icon = slotDisplay.icon?.trim() || '🧩';
	const label = slotDisplay.label?.trim() || 'Development Slot';
	return [icon, label].filter(Boolean).join(' ').trim();
}

registerEffectFormatter('development', 'add', {
	summarize: (effect, context) => {
		return renderDevelopmentChange(effect.params?.['id'] as string, context, {
			describe: 'Add',
			log: 'Developed',
		}).summary;
	},
	describe: (effect, context) => {
		return renderDevelopmentChange(effect.params?.['id'] as string, context, {
			describe: 'Add',
			log: 'Developed',
		}).description;
	},
	log: (effect, context) => {
		const id = effect.params?.['id'] as string | undefined;
		if (!id) {
			return null;
		}
		const copy = renderDevelopmentChange(id, context, {
			describe: 'Add',
			log: 'Developed',
		});
		const slotLabel = formatSlotLabel(context);
		const headline =
			`${copy.log ?? `Developed ${copy.label}`} on ${slotLabel}`.trim();
		const nested = buildDevelopmentLogSummary(id, context);
		if (!nested || nested.length === 0) {
			return headline;
		}
		return [
			{
				title: headline,
				items: nested,
			},
		];
	},
});

registerEffectFormatter('development', 'remove', {
	summarize: (effect, context) => {
		return renderDevelopmentChange(effect.params?.['id'] as string, context, {
			describe: 'Remove',
			log: 'Removed',
		}).summary;
	},
	describe: (effect, context) => {
		return renderDevelopmentChange(effect.params?.['id'] as string, context, {
			describe: 'Remove',
			log: 'Removed',
		}).description;
	},
	log: (effect, context) => {
		return (
			renderDevelopmentChange(effect.params?.['id'] as string, context, {
				describe: 'Remove',
				log: 'Removed',
			}).log || ''
		);
	},
});

export { renderDevelopmentChange };
