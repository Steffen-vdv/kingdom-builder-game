import { registerEffectFormatter } from '../factory';
import {
	describeContent,
	summarizeContent,
	type Summary,
	type SummaryEntry,
} from '../../content';
import type { TranslationContext } from '../../context';

interface DevelopmentChangeVerbs {
	describe: string;
	log?: string;
}

interface DevelopmentChangeCopy {
	label: string;
	summary: Summary;
	description: Summary;
	log?: string;
}

function buildLabel(
	id: string | undefined,
	context: TranslationContext,
): { safeId: string | undefined; label: string } {
	const safeId = typeof id === 'string' && id.length ? id : undefined;
	let name = safeId ?? 'development';
	let icon = '';
	if (safeId) {
		try {
			const definition = context.developments.get(safeId);
			if (definition?.name) {
				name = definition.name;
			}
			if (definition?.icon) {
				icon = definition.icon;
			}
		} catch {
			/* ignore missing development definitions */
		}
	}
	const decorated = [icon, name].filter(Boolean).join(' ').trim();
	return { safeId, label: decorated || name };
}

function resolveDevelopmentEntries(
	id: string | undefined,
	context: TranslationContext,
	verbs: DevelopmentChangeVerbs,
): DevelopmentChangeCopy {
	const { safeId, label } = buildLabel(id, context);
	const summarize = (): Summary => {
		if (!safeId) {
			return [];
		}
		try {
			return summarizeContent('development', safeId, context);
		} catch {
			return [];
		}
	};
	const describe = (): Summary => {
		if (!safeId) {
			return [];
		}
		try {
			return describeContent('development', safeId, context);
		} catch {
			return [];
		}
	};
	const copy: DevelopmentChangeCopy = {
		label,
		summary: summarize(),
		description: describe(),
	};
	if (verbs.log) {
		copy.log = `${verbs.log} ${label}`.trim();
	}
	return copy;
}

function buildEntry(
	title: string,
	items: Summary,
	options?: { markDescription?: boolean },
): SummaryEntry {
	if (items.length === 0) {
		return title;
	}
	const entry: Record<string, unknown> = {
		title,
		items,
	};
	if (options?.markDescription) {
		entry._desc = true;
	}
	return entry as SummaryEntry;
}

registerEffectFormatter('development', 'add', {
	summarize: (effect, context) => {
		const { label, summary } = resolveDevelopmentEntries(
			effect.params?.['id'] as string,
			context,
			{
				describe: 'Add',
				log: 'Developed',
			},
		);
		return buildEntry(label, summary);
	},
	describe: (effect, context) => {
		const { label, description } = resolveDevelopmentEntries(
			effect.params?.['id'] as string,
			context,
			{
				describe: 'Add',
				log: 'Developed',
			},
		);
		return buildEntry(`Add ${label}`, description, { markDescription: true });
	},
	log: (effect, context) => {
		return (
			resolveDevelopmentEntries(effect.params?.['id'] as string, context, {
				describe: 'Add',
				log: 'Developed',
			}).log || ''
		);
	},
});

registerEffectFormatter('development', 'remove', {
	summarize: (effect, context) => {
		const { label, summary } = resolveDevelopmentEntries(
			effect.params?.['id'] as string,
			context,
			{
				describe: 'Remove',
				log: 'Removed',
			},
		);
		return buildEntry(label, summary);
	},
	describe: (effect, context) => {
		const { label, description } = resolveDevelopmentEntries(
			effect.params?.['id'] as string,
			context,
			{
				describe: 'Remove',
				log: 'Removed',
			},
		);
		return buildEntry(`Remove ${label}`, description, {
			markDescription: true,
		});
	},
	log: (effect, context) => {
		return (
			resolveDevelopmentEntries(effect.params?.['id'] as string, context, {
				describe: 'Remove',
				log: 'Removed',
			}).log || ''
		);
	},
});
