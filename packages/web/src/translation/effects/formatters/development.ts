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
	params: Record<string, unknown> | undefined,
	ctx: TranslationContext,
	verbs: DevelopmentChangeVerbs,
): DevelopmentChangeCopy {
	const rawParamId = params?.['id'];
	const rawDevelopmentId = params?.['developmentId'];
	const paramId =
		typeof rawParamId === 'string' && rawParamId.length > 0
			? rawParamId
			: undefined;
	const developmentId =
		typeof rawDevelopmentId === 'string' && rawDevelopmentId.length > 0
			? rawDevelopmentId
			: undefined;
	const safeId = paramId ?? developmentId ?? 'development';
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
		return renderDevelopmentChange(eff.params, ctx, {
			describe: 'Add',
			log: 'Developed',
		}).summary;
	},
	describe: (eff, ctx) => {
		return renderDevelopmentChange(eff.params, ctx, {
			describe: 'Add',
			log: 'Developed',
		}).description;
	},
	log: (eff, ctx) => {
		return (
			renderDevelopmentChange(eff.params, ctx, {
				describe: 'Add',
				log: 'Developed',
			}).log || ''
		);
	},
});

registerEffectFormatter('development', 'remove', {
	summarize: (eff, ctx) => {
		return renderDevelopmentChange(eff.params, ctx, {
			describe: 'Remove',
			log: 'Removed',
		}).summary;
	},
	describe: (eff, ctx) => {
		return renderDevelopmentChange(eff.params, ctx, {
			describe: 'Remove',
			log: 'Removed',
		}).description;
	},
	log: (eff, ctx) => {
		return (
			renderDevelopmentChange(eff.params, ctx, {
				describe: 'Remove',
				log: 'Removed',
			}).log || ''
		);
	},
});

export { renderDevelopmentChange };
