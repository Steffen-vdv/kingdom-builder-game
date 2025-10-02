import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import { POPULATION_INFO, RESOURCES } from '@kingdom-builder/contents';
import type {
	ActionDef,
	DevelopmentDef,
	ResourceKey,
} from '@kingdom-builder/contents';
import { signed } from '../helpers';
import type { SummaryEntry } from '../../content/types';

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

export function wrapResultModifierEntries(
	label: string,
	entries: SummaryEntry[],
	target: string,
	event: string,
): SummaryEntry[] {
	if (!entries.length) {
		return [];
	}
	const prefix = `${label} on ${target}: ${event}`;
	return entries.map((entry) =>
		typeof entry === 'string'
			? `${prefix}, ${entry}`
			: {
					...entry,
					title: `${prefix}, ${entry.title}`,
				},
	);
}

export function formatGainFrom(
	label: string,
	source: string,
	amount: number,
	options: { key?: string; detailed?: boolean } = {},
) {
	const { key, detailed } = options;
	const resourceInfo = key ? RESOURCES[key as ResourceKey] : undefined;
	const resIcon = resourceInfo?.icon || key;
	const amountText = `${signed(amount)}${amount}`;
	const more = resIcon
		? `${resIcon}${amountText} more${detailed ? ' of that resource' : ''}`
		: `${amountText} more of that resource`;
	return formatResultModifierClause(
		label,
		source,
		RESULT_EVENT_GRANT_RESOURCES,
		`gain ${more}`,
	);
}

export function formatDevelopment(
	label: string,
	eff: EffectDef,
	evaluation: { id: string },
	ctx: EngineContext,
	detailed: boolean,
) {
	const { icon, name } = getDevelopmentInfo(ctx, evaluation.id);
	const target = formatTargetLabel(icon, name);
	const resource = eff.effects?.find(
		(e): e is EffectDef<{ key: string; amount: number }> =>
			e.type === 'resource' && (e.method === 'add' || e.method === 'remove'),
	);
	if (resource) {
		const key = resource.params?.['key'] as string;
		const rawAmount = Number(resource.params?.['amount']);
		const amount = resource.method === 'remove' ? -rawAmount : rawAmount;
		return formatGainFrom(label, target, amount, { key, detailed });
	}
	const amount = Number(eff.params?.['amount'] ?? 0);
	return formatGainFrom(label, target, amount);
}

export function formatPopulation(
	label: string,
	eff: EffectDef,
	evaluation: { id: string },
	ctx: EngineContext,
) {
	const { icon, name } = getActionInfo(ctx, evaluation.id);
	const amount = Number(eff.params?.['amount'] ?? 0);
	return formatGainFrom(
		label,
		`${POPULATION_INFO.icon} ${POPULATION_INFO.label} through ${icon} ${name}`,
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
