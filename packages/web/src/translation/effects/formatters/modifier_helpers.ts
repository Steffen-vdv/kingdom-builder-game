import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import { POPULATION_INFO, RESOURCES } from '@kingdom-builder/contents';
import type {
	ActionDef,
	DevelopmentDef,
	ResourceKey,
} from '@kingdom-builder/contents';
import { signed } from '../helpers';
import type { SummaryEntry } from '../../content/types';

const TRANSFER_DEFAULT_ID = 'percent';

const isResourceTransferEffect = (effect: EffectDef): boolean => {
	if (effect.type === 'resource' && effect.method === 'transfer') {
		return true;
	}
	return (effect.effects ?? []).some(isResourceTransferEffect);
};

const findUniqueTransferActionId = (ctx: EngineContext): string | undefined => {
	const matches: string[] = [];
	for (const [id, action] of ctx.actions.entries()) {
		if ((action.effects || []).some(isResourceTransferEffect)) {
			matches.push(id);
			if (matches.length > 1) {
				return undefined;
			}
		}
	}
	return matches[0];
};

export const resolveTransferTarget = (
	eff: EffectDef,
	evaluation: { type: string; id?: string; actionId?: string } | undefined,
	ctx: EngineContext,
) => {
	const candidates = [
		eff.params?.['actionId'],
		evaluation?.actionId,
		evaluation?.id,
	].filter(
		(id): id is string => typeof id === 'string' && id.trim().length > 0,
	);

	for (const candidate of candidates) {
		if (ctx.actions.has(candidate)) {
			const info = getActionInfo(ctx, candidate);
			return { actionId: candidate, ...info };
		}
	}

	const transferActionId = findUniqueTransferActionId(ctx);
	if (transferActionId) {
		const info = getActionInfo(ctx, transferActionId);
		return { actionId: transferActionId, ...info };
	}

	const fallbackName =
		candidates.find((id) => id !== TRANSFER_DEFAULT_ID) ||
		(evaluation?.id && evaluation.id !== TRANSFER_DEFAULT_ID
			? evaluation.id
			: 'resource transfers');

	return { icon: '', name: fallbackName };
};

const GENERIC_RESOURCE_ICON = '🧺';

const joinParts = (...parts: Array<string | undefined>) =>
	parts.filter(Boolean).join(' ').trim();

export const RESULT_EVENT_GRANT_RESOURCES = 'Whenever it grants resources';
export const RESULT_EVENT_RESOLVE = 'Whenever it resolves';
export const RESULT_EVENT_TRANSFER = 'Whenever it transfers resources';

export const formatTargetLabel = (icon: string, name: string) =>
	joinParts(icon, name || '');

export function formatResultModifierClause(
	label: string,
	target: string,
	event: string,
	effect: string,
): string {
	const prefix = `${label} on ${target}: ${event}`;
	return `${prefix}, ${effect}`;
}

interface ResultModifierWrapTarget {
	icon?: string;
	name: string;
}

interface ResultModifierWrapOptions {
	mode: 'summary' | 'describe';
	contextIcon?: string;
}

export function wrapResultModifierEntries(
	label: ResultModifierLabel,
	entries: SummaryEntry[],
	target: ResultModifierWrapTarget,
	event: string,
	options: ResultModifierWrapOptions,
): SummaryEntry[] {
	if (!entries.length) {
		return [];
	}
	if (options.mode === 'summary') {
		const targetIcon =
			target.icon && target.icon.trim() ? target.icon : target.name;
		const prefix = `${label.icon}${targetIcon}${
			options.contextIcon ? `(${options.contextIcon})` : ''
		}:`;
		return entries.map((entry) =>
			typeof entry === 'string'
				? `${prefix} ${entry}`
				: {
						...entry,
						title: `${prefix} ${entry.title}`,
					},
		);
	}
	const labelText = `${label.icon} ${label.label}`;
	const targetLabel = formatTargetLabel(target.icon ?? '', target.name);
	const prefix = `${labelText} on ${targetLabel}: ${event}`;
	return entries.map((entry) =>
		typeof entry === 'string'
			? `${prefix}, ${entry}`
			: {
					...entry,
					title: `${prefix}, ${entry.title}`,
				},
	);
}

interface ResultModifierLabel {
	icon: string;
	label: string;
}

interface ResultModifierSource {
	summaryTargetIcon: string;
	summaryContextIcon?: string;
	description: string;
}

const resolveIcon = (icon?: string) =>
	icon && icon.trim() ? icon : GENERIC_RESOURCE_ICON;

export function formatGainFrom(
	label: ResultModifierLabel,
	source: ResultModifierSource,
	amount: number,
	options: { key?: string; detailed?: boolean } = {},
) {
	const { key, detailed } = options;
	const resourceInfo = key ? RESOURCES[key as ResourceKey] : undefined;
	const resIcon = resourceInfo?.icon || key;
	const amountText = `${signed(amount)}${amount}`;

	if (!detailed) {
		const context = source.summaryContextIcon
			? `(${source.summaryContextIcon})`
			: '';
		const prefix = `${label.icon}${source.summaryTargetIcon}${context}:`;
		const icon = resolveIcon(resIcon);
		return `${prefix} ${icon}${amountText}`;
	}

	const moreIcon = resolveIcon(resIcon);
	const more = `${moreIcon}${amountText} more${detailed ? ' of that resource' : ''}`;
	return formatResultModifierClause(
		`${label.icon} ${label.label}`,
		source.description,
		RESULT_EVENT_GRANT_RESOURCES,
		`gain ${more}`,
	);
}

export function formatDevelopment(
	label: ResultModifierLabel,
	eff: EffectDef,
	evaluation: { id: string },
	ctx: EngineContext,
	detailed: boolean,
) {
	const { icon, name } = getDevelopmentInfo(ctx, evaluation.id);
	const target = formatTargetLabel(icon, name);
	const source = {
		summaryTargetIcon: icon || name,
		description: target,
	};
	const resource = eff.effects?.find(
		(e): e is EffectDef<{ key: string; amount: number }> =>
			e.type === 'resource' && (e.method === 'add' || e.method === 'remove'),
	);
	if (resource) {
		const key = resource.params?.['key'] as string;
		const rawAmount = Number(resource.params?.['amount']);
		const amount = resource.method === 'remove' ? -rawAmount : rawAmount;
		return formatGainFrom(label, source, amount, { key, detailed });
	}
	const amount = Number(eff.params?.['amount'] ?? 0);
	return formatGainFrom(label, source, amount);
}

export function formatPopulation(
	label: ResultModifierLabel,
	eff: EffectDef,
	evaluation: { id: string },
	ctx: EngineContext,
) {
	const { icon, name } = getActionInfo(ctx, evaluation.id);
	const amount = Number(eff.params?.['amount'] ?? 0);
	return formatGainFrom(
		label,
		{
			summaryTargetIcon: POPULATION_INFO.icon,
			summaryContextIcon: icon,
			description: `${POPULATION_INFO.icon} ${POPULATION_INFO.label} through ${icon} ${name}`,
		},
		amount,
	);
}

export function getActionInfo(ctx: EngineContext, id: string) {
	try {
		const action: ActionDef = ctx.actions.get(id);
		return { icon: action.icon ?? id, name: action.name ?? id };
	} catch {
		return { icon: id, name: id };
	}
}

export function getDevelopmentInfo(ctx: EngineContext, id: string) {
	try {
		const dev: DevelopmentDef = ctx.developments.get(id);
		return { icon: dev.icon ?? '', name: dev.name ?? id };
	} catch {
		return { icon: '', name: id };
	}
}
