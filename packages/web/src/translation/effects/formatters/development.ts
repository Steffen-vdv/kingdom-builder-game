import { registerEffectFormatter } from '../factory';
import type { TranslationContext } from '../../context';

interface DevelopmentChangeVerbs {
	describe: string;
	log?: string;
	locationPreposition?: string;
}

interface DevelopmentChangeCopy {
	summary: string;
	description: string;
	log?: string;
}

const DEFAULT_SLOT_ICON = '🧩';
const DEFAULT_SLOT_LABEL = 'Development Slot';

function describeEmptySlot(context: TranslationContext): string {
	const slotAsset = context.assets?.slot ?? {};
	const rawIcon =
		typeof slotAsset.icon === 'string' ? slotAsset.icon.trim() : '';
	const rawLabel =
		typeof slotAsset.label === 'string' ? slotAsset.label.trim() : '';
	const icon = rawIcon || DEFAULT_SLOT_ICON;
	const baseLabel = (rawLabel || DEFAULT_SLOT_LABEL)
		.replace(/\s+/g, ' ')
		.trim();
	const hasEmptyPrefix = /\bempty\b/i.test(baseLabel);
	const emptyLabel = hasEmptyPrefix ? baseLabel : `Empty ${baseLabel}`.trim();
	const parts = [icon, emptyLabel].filter(Boolean);
	return parts.join(' ').trim();
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
		const locationPreposition = verbs.locationPreposition?.trim();
		const slotLabel = locationPreposition ? describeEmptySlot(context) : '';
		const locationSuffix =
			slotLabel && locationPreposition
				? ` ${locationPreposition} ${slotLabel}`
				: '';
		copy.log = `${verbs.log} ${label}${locationSuffix}`.trim();
	}
	return copy;
}

registerEffectFormatter('development', 'add', {
	summarize: (effect, context) => {
		return renderDevelopmentChange(effect.params?.['id'] as string, context, {
			describe: 'Add',
			log: 'Developed',
			locationPreposition: 'on',
		}).summary;
	},
	describe: (effect, context) => {
		return renderDevelopmentChange(effect.params?.['id'] as string, context, {
			describe: 'Add',
			log: 'Developed',
			locationPreposition: 'on',
		}).description;
	},
	log: (effect, context) => {
		return (
			renderDevelopmentChange(effect.params?.['id'] as string, context, {
				describe: 'Add',
				log: 'Developed',
				locationPreposition: 'on',
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
