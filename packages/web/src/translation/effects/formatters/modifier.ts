import { increaseOrDecrease, signed } from '../helpers';
import {
	RESULT_EVENT_RESOLVE,
	RESULT_EVENT_TRANSFER,
	formatDevelopment,
	formatPercentMagnitude,
	formatPercentText,
	formatResultModifierClause,
	formatTargetLabel,
	parseNumericParam,
	wrapResultModifierEntries,
} from './modifier_helpers';
import { formatPopulation, getActionInfo } from './modifier_targets';
import { resolveTransferModifierTarget } from './transfer_helpers';
import { describeContent } from '../../content';
import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { Summary } from '../../content/types';
import type { TranslationContext } from '../../context';
import {
	selectModifierInfo,
	selectResourceDescriptor,
} from '../registrySelectors';

interface ModifierEvalHandler {
	summarize: (
		effect: EffectDef,
		evaluation: { type: string; id: string },
		context: TranslationContext,
	) => Summary;
	describe: (
		effect: EffectDef,
		evaluation: { type: string; id: string },
		context: TranslationContext,
	) => Summary;
}

export const MODIFIER_EVAL_HANDLERS: Record<string, ModifierEvalHandler> = {};

export function registerModifierEvalHandler(
	type: string,
	handler: ModifierEvalHandler,
) {
	MODIFIER_EVAL_HANDLERS[type] = handler;
}

const toArray = <T>(value: T): T[] => [value];

function getModifierDescriptor(
	context: TranslationContext,
	kind: 'cost' | 'result',
	fallbackLabel: string,
) {
	const descriptor = selectModifierInfo(context, kind);
	return {
		icon: descriptor.icon || '',
		label: descriptor.label || fallbackLabel,
	};
}

function buildModifierLabelText(descriptor: { icon: string; label: string }) {
	return [descriptor.icon, descriptor.label].filter(Boolean).join(' ').trim();
}

function getResultModifierLabel(context: TranslationContext) {
	return getModifierDescriptor(context, 'result', 'Outcome Adjustment');
}

function getCostModifierLabel(context: TranslationContext) {
	return getModifierDescriptor(context, 'cost', 'Cost Adjustment');
}

function formatCostEffect(
	effect: EffectDef,
	context: TranslationContext,
	mode: 'summary' | 'describe',
	method: 'add' | 'remove',
): string {
	const keyParam = effect.params?.['key'];
	const resourceKey = typeof keyParam === 'string' ? keyParam : '';
	const resourceDescriptor = resourceKey
		? selectResourceDescriptor(context, resourceKey)
		: undefined;
	const resourceIcon = resourceDescriptor?.icon || resourceKey;
	const actionId = effect.params?.['actionId'] as string | undefined;
	const actionInfo = actionId
		? getActionInfo(context, actionId)
		: { icon: '', name: 'all actions' };
	const costLabel = getCostModifierLabel(context);
	const prefixIcon = actionId ? `${actionInfo.icon}: ` : ': ';
	const summaryPrefix = `${costLabel.icon}${prefixIcon}${resourceIcon}`;
	const target = actionId
		? `${actionInfo.icon} ${actionInfo.name}`
		: actionInfo.name;
	const labelText = `${buildModifierLabelText(costLabel)} on ${target}:`;
	const percent = parseNumericParam(effect.params?.['percent']);
	if (typeof percent === 'number') {
		const resolvedPercent = method === 'remove' ? -percent : percent;
		if (mode === 'summary') {
			const percentText = formatPercentText(resolvedPercent);
			return `${summaryPrefix}${percentText}`;
		}
		const suffix = resourceIcon ? ` ${resourceIcon}` : '';
		const direction = increaseOrDecrease(resolvedPercent);
		const magnitude = formatPercentMagnitude(resolvedPercent);
		const base = `${labelText} ${direction} cost by`;
		return `${base} ${magnitude}%${suffix}`;
	}
	const rawAmount = parseNumericParam(effect.params?.['amount']) ?? 0;
	const amount = method === 'remove' ? -rawAmount : rawAmount;
	if (mode === 'summary') {
		const absolute = Math.abs(amount);
		if (method === 'add') {
			return `${summaryPrefix}${signed(amount)}${absolute}`;
		}
		const sign = amount >= 0 ? '+' : '-';
		return `${summaryPrefix}${sign}${absolute}`;
	}
	const direction = increaseOrDecrease(amount);
	const absolute = Math.abs(amount);
	const base = `${labelText} ${direction} cost by`;
	return `${base} ${resourceIcon}${absolute}`;
}

registerModifierEvalHandler('development', {
	summarize: (effect, evaluation, context) => {
		const label = getResultModifierLabel(context);
		const summary = formatDevelopment(
			label,
			effect,
			evaluation,
			context,
			false,
		);
		return toArray(summary);
	},
	describe: (effect, evaluation, context) => {
		const label = getResultModifierLabel(context);
		const description = formatDevelopment(
			label,
			effect,
			evaluation,
			context,
			true,
		);
		return toArray(description);
	},
});

registerModifierEvalHandler('population', {
	summarize: (effect, evaluation, context) => {
		const label = getResultModifierLabel(context);
		const summary = formatPopulation(label, effect, evaluation, context, false);
		return toArray(summary);
	},
	describe: (effect, evaluation, context) => {
		const label = getResultModifierLabel(context);
		const description = formatPopulation(
			label,
			effect,
			evaluation,
			context,
			true,
		);
		return toArray(description);
	},
});

registerModifierEvalHandler('transfer_pct', {
	summarize: (effect, evaluation, context) => {
		const target = resolveTransferModifierTarget(effect, evaluation, context);
		const amount = Number(effect.params?.['adjust'] ?? 0);
		const sign = amount >= 0 ? '+' : '';
		const descriptor = getResultModifierLabel(context);
		const transferDescriptor = selectModifierInfo(context, 'transfer');
		const transferIcon = transferDescriptor.icon || '';
		const targetSummaryLabel = `${descriptor.icon}${target.summaryLabel}`;
		const transferAdjustment = `${transferIcon}${sign}${Math.abs(amount)}%`;
		return [`${targetSummaryLabel}: ${transferAdjustment}`];
	},
	describe: (effect, evaluation, context) => {
		const target = resolveTransferModifierTarget(effect, evaluation, context);
		const amount = Number(effect.params?.['adjust'] ?? 0);
		const descriptor = getResultModifierLabel(context);
		const transferDescriptor = selectModifierInfo(context, 'transfer');
		const transferEffect = [
			transferDescriptor.icon,
			`${increaseOrDecrease(amount)} transfer by ${Math.abs(amount)}%`,
		]
			.filter(Boolean)
			.join(' ')
			.trim();
		const modifierDescription = formatResultModifierClause(
			buildModifierLabelText(descriptor),
			target.clauseTarget,
			RESULT_EVENT_TRANSFER,
			transferEffect,
		);
		const entries: Summary = [modifierDescription];
		if (target.actionId) {
			const card = describeContent('action', target.actionId, context);
			entries.push({
				title: formatTargetLabel(target.icon, target.name),
				items: card,
				_hoist: true,
				_desc: true,
			});
		}
		return entries;
	},
});

registerEffectFormatter('cost_mod', 'add', {
	summarize: (effect, context) =>
		formatCostEffect(effect, context, 'summary', 'add'),
	describe: (effect, context) =>
		formatCostEffect(effect, context, 'describe', 'add'),
});

registerEffectFormatter('cost_mod', 'remove', {
	summarize: (effect, context) =>
		formatCostEffect(effect, context, 'summary', 'remove'),
	describe: (effect, context) =>
		formatCostEffect(effect, context, 'describe', 'remove'),
});

registerEffectFormatter('result_mod', 'add', {
	summarize: (effect, context) => {
		const summaries = summarizeEffects(effect.effects || [], context);
		const evaluation = effect.params?.['evaluation'] as
			| { type: string; id: string }
			| undefined;
		if (evaluation) {
			const handler = MODIFIER_EVAL_HANDLERS[evaluation.type];
			return handler ? handler.summarize(effect, evaluation, context) : [];
		}
		const actionId = effect.params?.['actionId'] as string | undefined;
		const actionInfo = actionId
			? getActionInfo(context, actionId)
			: { icon: '', name: 'all actions' };
		const label = getResultModifierLabel(context);
		return wrapResultModifierEntries(
			label,
			summaries,
			{ icon: actionInfo.icon, name: actionInfo.name },
			RESULT_EVENT_RESOLVE,
			{ mode: 'summary' },
		);
	},
	describe: (effect, context) => {
		const descriptions = describeEffects(effect.effects || [], context);
		const evaluation = effect.params?.['evaluation'] as
			| { type: string; id: string }
			| undefined;
		if (evaluation) {
			const handler = MODIFIER_EVAL_HANDLERS[evaluation.type];
			return handler ? handler.describe(effect, evaluation, context) : [];
		}
		const actionId = effect.params?.['actionId'] as string | undefined;
		const actionInfo = actionId
			? getActionInfo(context, actionId)
			: { icon: '', name: 'all actions' };
		const label = getResultModifierLabel(context);
		return wrapResultModifierEntries(
			label,
			descriptions,
			actionInfo,
			RESULT_EVENT_RESOLVE,
			{ mode: 'describe' },
		);
	},
});
