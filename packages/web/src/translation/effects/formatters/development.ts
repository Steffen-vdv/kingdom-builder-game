import { registerEffectFormatter } from '../factory';
import type { TranslationContext } from '../../context';
import { describeContent, summarizeContent } from '../../content';
import type { SummaryEntry } from '../../content';

interface DevelopmentChangeVerbs {
	describe: string;
	log?: string;
}

interface DevelopmentChangeCopy {
	summary: SummaryEntry | SummaryEntry[];
	description: SummaryEntry | SummaryEntry[];
	log?: string;
}

function resolveDevelopmentLabel(
	id: string | undefined,
	context: TranslationContext,
): string {
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
	return decorated || safeId;
}

function summarizeDevelopment(
	id: string | undefined,
	context: TranslationContext,
): SummaryEntry[] {
	if (!id) {
		return [];
	}
	try {
		return summarizeContent('development', id, context);
	} catch {
		return [];
	}
}

function describeDevelopment(
	id: string | undefined,
	context: TranslationContext,
): SummaryEntry[] {
	if (!id) {
		return [];
	}
	try {
		return describeContent('development', id, context);
	} catch {
		return [];
	}
}

function renderDevelopmentChange(
	id: string | undefined,
	context: TranslationContext,
	verbs: DevelopmentChangeVerbs,
): DevelopmentChangeCopy {
	const label = resolveDevelopmentLabel(id, context);
	const summaryEntries = summarizeDevelopment(id, context);
	const descriptionEntries = describeDevelopment(id, context);
	const summary: SummaryEntry | SummaryEntry[] =
		summaryEntries.length > 0
			? [
					{
						title: label,
						items: summaryEntries,
						_hoist: true,
					},
				]
			: label;
	const descriptionLabel = `${verbs.describe} ${label}`.trim();
	const description: SummaryEntry | SummaryEntry[] =
		descriptionEntries.length > 0
			? [
					{
						title: descriptionLabel,
						items: descriptionEntries,
						_desc: true,
					},
				]
			: descriptionLabel;
	const copy: DevelopmentChangeCopy = { summary, description };
	if (verbs.log) {
		copy.log = `${verbs.log} ${label}`.trim();
	}
	return copy;
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
		return (
			renderDevelopmentChange(effect.params?.['id'] as string, context, {
				describe: 'Add',
				log: 'Developed',
			}).log || ''
		);
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
