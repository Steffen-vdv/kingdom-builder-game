import {
	increaseOrDecrease,
	signed,
	resolveModifierDisplay,
	resolveResourceDisplay,
	resolveResourceTransferIcon,
} from '../helpers';
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
	type ResultModifierLabel,
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
const COST_FALLBACK_LABEL = 'Cost Adjustment';
const RESULT_FALLBACK_LABEL = 'Outcome Adjustment';

const buildModifierLabel = (
	context: TranslationContext,
	type: string,
	fallback: string,
): ResultModifierLabel => {
	const display = resolveModifierDisplay(context, type);
	return {
		icon: display.icon || '',
		label: display.label || fallback,
	};
};

const formatModifierLabelText = (
	label: ResultModifierLabel,
	fallback: string,
): string => {
	const parts = [label.icon?.trim(), label.label?.trim()].filter(
		(value): value is string => Boolean(value),
	);
	if (parts.length === 0) {
		return fallback;
	}
	if (parts.length === 1) {
		return parts[0]!;
	}
	return `${parts[0]} ${parts[1]}`;
};

const getModifierSummarySymbol = (
	label: ResultModifierLabel,
	fallback: string,
): string => label.icon?.trim() || label.label?.trim() || fallback;

const getCostModifierLabel = (
	context: TranslationContext,
): ResultModifierLabel =>
	buildModifierLabel(context, 'cost', COST_FALLBACK_LABEL);

const getResultModifierLabel = (
	context: TranslationContext,
): ResultModifierLabel =>
	buildModifierLabel(context, 'result', RESULT_FALLBACK_LABEL);

const buildTargetSummaryLabel = (
	modifier: ResultModifierLabel,
	fallback: string,
	targetSummary: string,
): string => {
	if (modifier.icon?.trim()) {
		return `${modifier.icon}${targetSummary}`;
	}
	const labelText = modifier.label?.trim() || fallback;
	return `${labelText} ${targetSummary}`;
};

function formatCostEffect(
	effect: EffectDef,
	context: TranslationContext,
	mode: 'summary' | 'describe',
	method: 'add' | 'remove',
): string {
	const rawKey = effect.params?.['key'];
	const resourceKey = typeof rawKey === 'string' ? rawKey : '';
	const resourceDisplay = resolveResourceDisplay(context, resourceKey);
	const resourceIcon =
		resourceDisplay.icon || resourceDisplay.label || resourceKey || 'Resource';
	const actionId = effect.params?.['actionId'];
	const typedActionId = typeof actionId === 'string' ? actionId : undefined;
	const actionInfo = typedActionId
		? getActionInfo(context, typedActionId)
		: { icon: '', name: 'all actions' };
	const costModifier = getCostModifierLabel(context);
	const modifierSymbol = getModifierSummarySymbol(
		costModifier,
		COST_FALLBACK_LABEL,
	);
	const actionSymbol = typedActionId
		? (actionInfo.icon || actionInfo.name || '').trim()
		: '';
	const summaryPrefix = `${modifierSymbol}${
		actionSymbol ? `${actionSymbol}: ` : ': '
	}${resourceIcon}`;
	const targetLabel = typedActionId
		? formatTargetLabel(actionInfo.icon ?? '', actionInfo.name)
		: actionInfo.name;
	const labelText = formatModifierLabelText(costModifier, COST_FALLBACK_LABEL);
	const label = `${labelText} on ${targetLabel}:`;
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
		const base = `${label} ${direction} cost by`;
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
	const base = `${label} ${direction} cost by`;
	return `${base} ${resourceIcon}${absolute}`;
}

registerModifierEvalHandler('development', {
	summarize: (effect, evaluation, context) => {
		const resultModifierLabel = getResultModifierLabel(context);
		const summary = formatDevelopment(
			resultModifierLabel,
			effect,
			evaluation,
			context,
			false,
		);
		return toArray(summary);
	},
	describe: (effect, evaluation, context) => {
		const resultModifierLabel = getResultModifierLabel(context);
		const description = formatDevelopment(
			resultModifierLabel,
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
		const resultModifierLabel = getResultModifierLabel(context);
		const summary = formatPopulation(
			resultModifierLabel,
			effect,
			evaluation,
			context,
			false,
		);
		return toArray(summary);
	},
	describe: (effect, evaluation, context) => {
		const resultModifierLabel = getResultModifierLabel(context);
		const description = formatPopulation(
			resultModifierLabel,
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
		const resultModifierLabel = getResultModifierLabel(context);
		const targetSummaryLabel = buildTargetSummaryLabel(
			resultModifierLabel,
			RESULT_FALLBACK_LABEL,
			target.summaryLabel,
		);
		const transferIcon = resolveResourceTransferIcon(context);
		const transferAdjustment = `${transferIcon}${sign}${Math.abs(amount)}%`;
		return [`${targetSummaryLabel}: ${transferAdjustment}`];
	},
	describe: (effect, evaluation, context) => {
		const target = resolveTransferModifierTarget(effect, evaluation, context);
		const amount = Number(effect.params?.['adjust'] ?? 0);
		const resultModifierLabel = getResultModifierLabel(context);
		const transferIcon = resolveResourceTransferIcon(context);
		const modifierDescription = formatResultModifierClause(
			formatModifierLabelText(resultModifierLabel, RESULT_FALLBACK_LABEL),
			target.clauseTarget,
			RESULT_EVENT_TRANSFER,
			`${transferIcon} ${increaseOrDecrease(
				amount,
			)} transfer by ${Math.abs(amount)}%`,
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
		const { icon: actionIcon, name: actionName } = actionId
			? getActionInfo(context, actionId)
			: { icon: '', name: 'all actions' };
		const resultModifierLabel = getResultModifierLabel(context);
		return wrapResultModifierEntries(
			resultModifierLabel,
			summaries,
			{ icon: actionIcon, name: actionName },
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
		const resultModifierLabel = getResultModifierLabel(context);
		return wrapResultModifierEntries(
			resultModifierLabel,
			descriptions,
			actionInfo,
			RESULT_EVENT_RESOLVE,
			{ mode: 'describe' },
		);
	},
});
