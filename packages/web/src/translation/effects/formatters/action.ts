import {
	resolveActionEffects,
	type EngineContext,
} from '@kingdom-builder/engine';
import { describeContent } from '../../content';
import { registerEffectFormatter, logEffects } from '../factory';

function extractActionId(
	params: Record<string, unknown> | undefined,
): string | undefined {
	if (!params) {
		return undefined;
	}
	const possible =
		typeof params['actionId'] === 'string'
			? params['actionId']
			: typeof params['__actionId'] === 'string'
				? params['__actionId']
				: typeof params['id'] === 'string'
					? params['id']
					: undefined;
	return typeof possible === 'string' && possible.length > 0
		? possible
		: undefined;
}

function formatActionLabel(icon: string, name: string) {
	return [icon, name].filter(Boolean).join(' ').trim();
}

function formatActionChangeSentence(
	change: 'gain' | 'lose',
	label: string,
	mode: 'describe' | 'log',
) {
	const verbs = {
		gain: { describe: 'Gain', log: 'Unlocked' },
		lose: { describe: 'Lose', log: 'Lost' },
	} as const;
	return `${verbs[change][mode]} the ${label} action`;
}

function getActionPresentation(id: string, ctx: EngineContext) {
	let name = id;
	let icon = '';
	let system = false;
	try {
		const def = ctx.actions.get(id);
		name = def.name;
		icon = def.icon || '';
		system = !!def.system;
	} catch {
		// ignore missing action
	}
	const label = formatActionLabel(icon, name) || id;
	return { icon, name, system, label };
}

registerEffectFormatter('action', 'add', {
	summarize: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, ctx);
		return label;
	},
	describe: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label, system } = getActionPresentation(id, ctx);
		const card = describeContent('action', id, ctx);
		return [
			label,
			formatActionChangeSentence('gain', label, 'describe'),
			{
				title: label,
				items: card,
				_hoist: true,
				...(system && { _desc: true }),
			},
		];
	},
	log: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, ctx);
		return formatActionChangeSentence('gain', label, 'log');
	},
});

registerEffectFormatter('action', 'remove', {
	summarize: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, ctx);
		return label;
	},
	describe: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, ctx);
		return [label, formatActionChangeSentence('lose', label, 'describe')];
	},
	log: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, ctx);
		return formatActionChangeSentence('lose', label, 'log');
	},
});

registerEffectFormatter('action', 'perform', {
	summarize: (eff, ctx) => {
		const id = extractActionId(eff.params);
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, ctx);
		return label;
	},
	describe: (eff, ctx) => {
		const id = extractActionId(eff.params);
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, ctx);
		const summary = describeContent('action', id, ctx);
		return [
			{
				title: label,
				items: summary,
			},
		];
	},
	log: (eff, ctx) => {
		const id = extractActionId(eff.params);
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, ctx);
		const def = ctx.actions.get(id);
		const resolved = resolveActionEffects(
			def,
			eff.params as Record<string, unknown>,
		);
		const sub = logEffects(resolved.effects, ctx);
		if (sub.length === 0) {
			return label;
		}
		const [first, ...rest] = sub;
		if (typeof first === 'string') {
			const combined = `${label} - ${first}`;
			if (rest.length === 0) {
				return combined;
			}
			return [combined, ...rest];
		}
		return [{ title: label, items: sub }];
	},
});
