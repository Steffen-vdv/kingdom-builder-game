import {
	formatDevelopment,
	formatPercentText,
	formatTargetLabel,
	parseNumericParam,
} from './modifier_helpers';
import { getActionInfo } from './modifier_targets';
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
	selectTransferDescriptor,
	selectActionDescriptor,
	selectKeywordLabels,
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
) {
	return selectModifierInfo(context, kind);
}

function getResultModifierLabel(context: TranslationContext) {
	return getModifierDescriptor(context, 'result');
}

function getCostModifierLabel(context: TranslationContext) {
	return getModifierDescriptor(context, 'cost');
}

/**
 * Formats cost modifiers with simplified output:
 * - Summary: `✨🚜: 🪙-20% Cost` or `✨🎯: 🪙-20% Cost` (all actions)
 * - Describe: `✨🚜 Plow: -20% 🪙 Cost` or `✨🎯 All Actions: -20% 🪙 Cost`
 */
function formatCostEffect(
	effect: EffectDef,
	context: TranslationContext,
	mode: 'summary' | 'describe',
	method: 'add' | 'remove',
): string {
	const resourceIdParam = effect.params?.['resourceId'];
	const resourceId = typeof resourceIdParam === 'string' ? resourceIdParam : '';
	const resourceDescriptor = resourceId
		? selectResourceDescriptor(context, resourceId)
		: undefined;
	const resourceIcon = resourceDescriptor?.icon || resourceId;
	const actionId = effect.params?.['actionId'] as string | undefined;
	const actionKeyword = selectActionDescriptor(context);
	const keywords = selectKeywordLabels(context);
	const actionInfo = actionId
		? getActionInfo(context, actionId)
		: { icon: actionKeyword.icon, name: `All ${actionKeyword.plural}` };
	const costLabel = getCostModifierLabel(context);

	const percent = parseNumericParam(effect.params?.['percent']);
	if (typeof percent === 'number') {
		const resolvedPercent = method === 'remove' ? -percent : percent;
		const percentText = formatPercentText(resolvedPercent);
		if (mode === 'summary') {
			return `${costLabel.icon}${actionInfo.icon}: ${resourceIcon}${percentText} ${keywords.cost}`;
		}
		const targetLabel = actionId
			? `${actionInfo.icon} ${actionInfo.name}`
			: `${actionInfo.icon} ${actionInfo.name}`;
		return `${costLabel.icon}${targetLabel}: ${percentText} ${resourceIcon} ${keywords.cost}`;
	}

	const rawAmount = parseNumericParam(effect.params?.['amount']) ?? 0;
	const amount = method === 'remove' ? -rawAmount : rawAmount;
	const absolute = Math.abs(amount);
	const signChar = amount >= 0 ? '+' : '-';

	if (mode === 'summary') {
		return `${costLabel.icon}${actionInfo.icon}: ${signChar}${resourceIcon}${absolute} ${keywords.cost}`;
	}
	const targetLabel = actionId
		? `${actionInfo.icon} ${actionInfo.name}`
		: `${actionInfo.icon} ${actionInfo.name}`;
	return `${costLabel.icon}${targetLabel}: ${signChar}${resourceIcon}${absolute} ${keywords.cost}`;
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

/**
 * Formats transfer percent modifiers with simplified output:
 * - Summary: `✨🏴‍☠️: 🧺🔁 +25% Resource Transfer`
 * - Describe: `✨🏴‍☠️ Plunder: 🧺🔁 +25% Resource Transfer`
 */
registerModifierEvalHandler('transfer_pct', {
	summarize: (effect, evaluation, context) => {
		const target = resolveTransferModifierTarget(effect, evaluation, context);
		const amount = Number(effect.params?.['adjust'] ?? 0);
		const sign = amount >= 0 ? '+' : '-';
		const descriptor = getResultModifierLabel(context);
		const transferDescriptor = selectTransferDescriptor(context);
		const transferAdjustment = `${transferDescriptor.icon} ${sign}${Math.abs(amount)}% ${transferDescriptor.label}`;
		return [`${descriptor.icon}${target.summaryLabel}: ${transferAdjustment}`];
	},
	describe: (effect, evaluation, context) => {
		const target = resolveTransferModifierTarget(effect, evaluation, context);
		const amount = Number(effect.params?.['adjust'] ?? 0);
		const sign = amount >= 0 ? '+' : '-';
		const descriptor = getResultModifierLabel(context);
		const transferDescriptor = selectTransferDescriptor(context);
		const targetLabel = formatTargetLabel(target.icon, target.name);
		const modifierDescription = `${descriptor.icon}${targetLabel}: ${transferDescriptor.icon} ${sign}${Math.abs(amount)}% ${transferDescriptor.label}`;
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

/**
 * Formats transfer amount modifiers with simplified output:
 * - Summary: `✨🗡️: 🧺🔁 +2 Resource Transfer`
 * - Describe: `✨🗡️ Raid: 🧺🔁 +2 Resource Transfer`
 */
registerModifierEvalHandler('transfer_amount', {
	summarize: (effect, evaluation, context) => {
		const target = resolveTransferModifierTarget(effect, evaluation, context);
		const amount = Number(effect.params?.['adjust'] ?? 0);
		const sign = amount >= 0 ? '+' : '-';
		const descriptor = getResultModifierLabel(context);
		const transferDescriptor = selectTransferDescriptor(context);
		const transferAdjustment = `${transferDescriptor.icon} ${sign}${Math.abs(amount)} ${transferDescriptor.label}`;
		return [`${descriptor.icon}${target.summaryLabel}: ${transferAdjustment}`];
	},
	describe: (effect, evaluation, context) => {
		const target = resolveTransferModifierTarget(effect, evaluation, context);
		const amount = Number(effect.params?.['adjust'] ?? 0);
		const sign = amount >= 0 ? '+' : '-';
		const descriptor = getResultModifierLabel(context);
		const transferDescriptor = selectTransferDescriptor(context);
		const targetLabel = formatTargetLabel(target.icon, target.name);
		const modifierDescription = `${descriptor.icon}${targetLabel}: ${transferDescriptor.icon} ${sign}${Math.abs(amount)} ${transferDescriptor.label}`;
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

/**
 * Result modifier formatter for resolve-type modifiers (nested effects).
 * Simplified format removes "Whenever it resolves" text:
 * - Summary: `✨🗡️: 😊-1`
 * - Describe: `✨🗡️ Raid: 😊-1`
 */
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
		const actionKeyword = selectActionDescriptor(context);
		const actionInfo = actionId
			? getActionInfo(context, actionId)
			: { icon: actionKeyword.icon, name: `All ${actionKeyword.plural}` };
		const label = getResultModifierLabel(context);
		// Simplified: just prefix with modifier icon and target icon
		const prefix = `${label.icon}${actionInfo.icon}:`;
		return summaries.map((entry) =>
			typeof entry === 'string'
				? `${prefix} ${entry}`
				: { ...entry, title: `${prefix} ${entry.title}` },
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
		const actionKeyword = selectActionDescriptor(context);
		const actionInfo = actionId
			? getActionInfo(context, actionId)
			: { icon: actionKeyword.icon, name: `All ${actionKeyword.plural}` };
		const label = getResultModifierLabel(context);
		// Simplified: modifier icon + target label, no "Whenever it resolves"
		const targetLabel = formatTargetLabel(actionInfo.icon, actionInfo.name);
		const prefix = `${label.icon}${targetLabel}:`;
		return descriptions.map((entry) =>
			typeof entry === 'string'
				? `${prefix} ${entry}`
				: { ...entry, title: `${prefix} ${entry.title}` },
		);
	},
});
