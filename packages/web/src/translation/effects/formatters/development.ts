import type { EngineContext } from '@kingdom-builder/engine';
import { registerEffectFormatter } from '../factory';

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
	ctx: EngineContext,
	verbs: DevelopmentChangeVerbs,
): DevelopmentChangeCopy {
	const safeId = typeof id === 'string' && id.length ? id : 'development';
	let name = safeId;
	let icon = '';
	try {
		const def = ctx.developments.get(safeId);
		if (def?.name) {
			name = def.name;
		}
		if (def?.icon) {
			icon = def.icon;
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
	summarize: (eff, ctx) => {
		return renderDevelopmentChange(eff.params?.['id'] as string, ctx, {
			describe: 'Add',
		}).summary;
	},
	describe: (eff, ctx) => {
		return renderDevelopmentChange(eff.params?.['id'] as string, ctx, {
			describe: 'Add',
		}).description;
	},
});

registerEffectFormatter('development', 'remove', {
	summarize: (eff, ctx) => {
		return renderDevelopmentChange(eff.params?.['id'] as string, ctx, {
			describe: 'Remove',
			log: 'Removed',
		}).summary;
	},
	describe: (eff, ctx) => {
		return renderDevelopmentChange(eff.params?.['id'] as string, ctx, {
			describe: 'Remove',
			log: 'Removed',
		}).description;
	},
	log: (eff, ctx) => {
		return (
			renderDevelopmentChange(eff.params?.['id'] as string, ctx, {
				describe: 'Remove',
				log: 'Removed',
			}).log || ''
		);
	},
});

export { renderDevelopmentChange };
