import { resolveActionEffects } from '@kingdom-builder/protocol';
import { describeContent } from '../../content';
import { registerEffectFormatter, logEffects } from '../factory';
import type { TranslationContext } from '../../context';

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

function getActionPresentation(id: string, context: TranslationContext) {
	let name = id;
	let icon = '';
	let system = false;
	try {
		const actionDefinition = context.actions.get(id);
		name = actionDefinition.name;
		icon = actionDefinition.icon || '';
		system = !!actionDefinition.system;
	} catch {
		// ignore missing action
	}
	const label = formatActionLabel(icon, name) || id;
	return { icon, name, system, label };
}

registerEffectFormatter('action', 'add', {
	summarize: (effect, context) => {
		const id = effect.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, context);
		return label;
	},
	describe: (effect, context) => {
		const id = effect.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label, system } = getActionPresentation(id, context);
		const card = describeContent('action', id, context);
		return [
			`Unlock Action: ${label}`,
			{
				title: label,
				items: card,
				_hoist: true,
				...(system && { _desc: true }),
			},
		];
	},
	log: (effect, context) => {
		const id = effect.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, context);
		return `Unlock Action: ${label}`;
	},
});

registerEffectFormatter('action', 'remove', {
	summarize: (effect, context) => {
		const id = effect.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, context);
		return label;
	},
	describe: (effect, context) => {
		const id = effect.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, context);
		return [label, formatActionChangeSentence('lose', label, 'describe')];
	},
	log: (effect, context) => {
		const id = effect.params?.['id'] as string;
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, context);
		return formatActionChangeSentence('lose', label, 'log');
	},
});

registerEffectFormatter('action', 'perform', {
	summarize: (effect, context) => {
		const id = extractActionId(effect.params);
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, context);
		return label;
	},
	describe: (effect, context) => {
		const id = extractActionId(effect.params);
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, context);
		const summary = describeContent('action', id, context);
		return [
			{
				title: label,
				items: summary,
			},
		];
	},
	log: (effect, context) => {
		const id = extractActionId(effect.params);
		if (!id) {
			return null;
		}
		const { label } = getActionPresentation(id, context);
		const actionDefinition = context.actions.get(id);
		const resolved = resolveActionEffects(
			actionDefinition,
			effect.params as Record<string, unknown>,
		);
		const subLogs = logEffects(resolved.effects, context);
		if (subLogs.length === 0) {
			return [
				{ title: label, items: [], timelineKind: 'subaction', actionId: id },
			];
		}
		const [firstSubLog, ...remainingSubLogs] = subLogs;
		if (typeof firstSubLog === 'string') {
			const combined = `${label} - ${firstSubLog}`;
			const items =
				remainingSubLogs.length > 0
					? [combined, ...remainingSubLogs]
					: [combined];
			return [
				{
					title: label,
					items,
					timelineKind: 'subaction',
					actionId: id,
				},
			];
		}
		return [
			{
				title: label,
				items: subLogs,
				timelineKind: 'subaction',
				actionId: id,
			},
		];
	},
});
