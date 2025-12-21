import { registerEffectFormatter } from '../factory';
import type { TranslationContext } from '../../context';
import { selectSlotDisplay } from '../../context/assetSelectors';

interface DevelopmentChangeVerbs {
	describe: string;
	log?: string;
}

interface DevelopmentChangeCopy {
	summary: string;
	description: string;
	log?: string;
}

function getDevelopmentDisplay(
	id: string | undefined,
	context: TranslationContext,
): { name: string; icon: string } {
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
	return { name, icon };
}

function renderDevelopmentChange(
	id: string | undefined,
	context: TranslationContext,
	verbs: DevelopmentChangeVerbs,
): DevelopmentChangeCopy {
	const { name, icon } = getDevelopmentDisplay(id, context);
	const safeId = typeof id === 'string' && id.length ? id : 'development';
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

/**
 * Renders slot transformation for development:add effect.
 * - Summarize: "🧩 → 🌾"
 * - Describe: "🧩 Empty Development Slot → 🌾 Farm"
 */
function renderSlotTransformation(
	id: string | undefined,
	context: TranslationContext,
	mode: 'summarize' | 'describe',
): string {
	const slot = selectSlotDisplay(context.assets);
	const slotIcon = slot.icon?.trim() || '🧩';
	const slotLabel = `Empty ${slot.label}`.trim();
	const { name, icon: devIcon } = getDevelopmentDisplay(id, context);

	if (mode === 'summarize') {
		// Concise: "🧩 → 🌾"
		const target = devIcon?.trim() || name;
		return `${slotIcon} → ${target}`;
	}
	// Describe: "🧩 Empty Development Slot → 🌾 Farm"
	const slotDisplay = `${slotIcon} ${slotLabel}`.trim();
	const devDisplay = devIcon ? `${devIcon} ${name}`.trim() : name;
	return `${slotDisplay} → ${devDisplay}`;
}

registerEffectFormatter('development', 'add', {
	summarize: (effect, context) => {
		return renderSlotTransformation(
			effect.params?.['id'] as string,
			context,
			'summarize',
		);
	},
	describe: (effect, context) => {
		return renderSlotTransformation(
			effect.params?.['id'] as string,
			context,
			'describe',
		);
	},
	log: () => {
		return '';
	},
});

registerEffectFormatter('development', 'remove', {
	summarize: (effect, context) => {
		const id = effect.params?.['id'] as string;
		const safeId = typeof id === 'string' && id.length ? id : 'development';
		let icon = '';
		try {
			const developmentDefinition = context.developments.get(safeId);
			if (developmentDefinition?.icon) {
				icon = developmentDefinition.icon;
			}
		} catch {
			/* ignore missing development definitions */
		}
		// Summary shows just -<icon> for conciseness
		return icon ? `-${icon}` : `-${safeId}`;
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
