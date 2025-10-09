import { registerEffectFormatter } from '../factory';
import type { TranslationContext } from '../../context';

interface DevelopmentChangeVerbs {
	describe: string;
	log?: string;
}

interface DevelopmentChangeCopy {
	summary: string;
	description: string;
	log?: string;
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
