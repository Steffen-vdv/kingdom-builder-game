import {
	MODIFIER_INFO as modifierInfo,
	RESOURCES,
	RESOURCE_TRANSFER_ICON,
} from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
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

interface ModifierEvalHandler {
	summarize: (
		effectDefinition: EffectDef,
		evaluation: { type: string; id: string },
		translationContext: TranslationContext,
	) => Summary;
	describe: (
		effectDefinition: EffectDef,
		evaluation: { type: string; id: string },
		translationContext: TranslationContext,
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
const resultModifier = modifierInfo.result;
const costModifier = modifierInfo.cost;
const RESULT_MODIFIER_LABEL = `${resultModifier.icon} ${resultModifier.label}`;
const COST_MODIFIER_LABEL = `${costModifier.icon} ${costModifier.label}`;
const RESULT_MODIFIER_INFO = modifierInfo.result;

function formatCostEffect(
	effectDefinition: EffectDef,
	translationContext: TranslationContext,
	mode: 'summary' | 'describe',
	method: 'add' | 'remove',
): string {
	const key = effectDefinition.params?.['key'] as string;
	const resourceIcon = RESOURCES[key as ResourceKey]?.icon || key;
	const actionId = effectDefinition.params?.['actionId'] as string | undefined;
	const actionInfo = actionId
		? getActionInfo(translationContext, actionId)
		: { icon: '', name: 'all actions' };
	const prefixIcon = actionId ? `${actionInfo.icon}: ` : ': ';
	const summaryPrefix = `${modifierInfo.cost.icon}${prefixIcon}${resourceIcon}`;
	const target = actionId
		? `${actionInfo.icon} ${actionInfo.name}`
		: actionInfo.name;
	const label = `${COST_MODIFIER_LABEL} on ${target}:`;
	const percent = parseNumericParam(effectDefinition.params?.['percent']);
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
	const rawAmount = parseNumericParam(effectDefinition.params?.['amount']) ?? 0;
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
	summarize: (effectDefinition, evaluation, translationContext) => {
		const summary = formatDevelopment(
			RESULT_MODIFIER_INFO,
			effectDefinition,
			evaluation,
			translationContext,
			false,
		);
		return toArray(summary);
	},
	describe: (effectDefinition, evaluation, translationContext) => {
		const description = formatDevelopment(
			RESULT_MODIFIER_INFO,
			effectDefinition,
			evaluation,
			translationContext,
			true,
		);
		return toArray(description);
	},
});

registerModifierEvalHandler('population', {
	summarize: (effectDefinition, evaluation, translationContext) => {
		const summary = formatPopulation(
			RESULT_MODIFIER_INFO,
			effectDefinition,
			evaluation,
			translationContext,
			false,
		);
		return toArray(summary);
	},
	describe: (effectDefinition, evaluation, translationContext) => {
		const description = formatPopulation(
			RESULT_MODIFIER_INFO,
			effectDefinition,
			evaluation,
			translationContext,
			true,
		);
		return toArray(description);
	},
});

registerModifierEvalHandler('transfer_pct', {
	summarize: (effectDefinition, evaluation, translationContext) => {
		const target = resolveTransferModifierTarget(
			effectDefinition,
			evaluation,
			translationContext,
		);
		const amount = Number(effectDefinition.params?.['adjust'] ?? 0);
		const sign = amount >= 0 ? '+' : '';
		return [
			`${RESULT_MODIFIER_INFO.icon}${target.summaryLabel}: ${RESOURCE_TRANSFER_ICON}${sign}${Math.abs(
				amount,
			)}%`,
		];
	},
	describe: (effectDefinition, evaluation, translationContext) => {
		const target = resolveTransferModifierTarget(
			effectDefinition,
			evaluation,
			translationContext,
		);
		const amount = Number(effectDefinition.params?.['adjust'] ?? 0);
		const modifierDescription = formatResultModifierClause(
			RESULT_MODIFIER_LABEL,
			target.clauseTarget,
			RESULT_EVENT_TRANSFER,
			`${RESOURCE_TRANSFER_ICON} ${increaseOrDecrease(
				amount,
			)} transfer by ${Math.abs(amount)}%`,
		);
		const entries: Summary = [modifierDescription];
		if (target.actionId) {
			const card = describeContent(
				'action',
				target.actionId,
				translationContext,
			);
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
	summarize: (effectDefinition, translationContext) =>
		formatCostEffect(effectDefinition, translationContext, 'summary', 'add'),
	describe: (effectDefinition, translationContext) =>
		formatCostEffect(effectDefinition, translationContext, 'describe', 'add'),
});

registerEffectFormatter('cost_mod', 'remove', {
	summarize: (effectDefinition, translationContext) =>
		formatCostEffect(effectDefinition, translationContext, 'summary', 'remove'),
	describe: (effectDefinition, translationContext) =>
		formatCostEffect(
			effectDefinition,
			translationContext,
			'describe',
			'remove',
		),
});

registerEffectFormatter('result_mod', 'add', {
	summarize: (effectDefinition, translationContext) => {
		const subEffectSummaries = summarizeEffects(
			effectDefinition.effects || [],
			translationContext,
		);
		const evaluation = effectDefinition.params?.['evaluation'] as
			| { type: string; id: string }
			| undefined;
		if (evaluation) {
			const handler = MODIFIER_EVAL_HANDLERS[evaluation.type];
			return handler
				? handler.summarize(effectDefinition, evaluation, translationContext)
				: [];
		}
		const actionId = effectDefinition.params?.['actionId'] as
			| string
			| undefined;
		const { icon: actionIcon, name: actionName } = actionId
			? getActionInfo(translationContext, actionId)
			: { icon: '', name: 'all actions' };
		return wrapResultModifierEntries(
			RESULT_MODIFIER_INFO,
			subEffectSummaries,
			{ icon: actionIcon, name: actionName },
			RESULT_EVENT_RESOLVE,
			{ mode: 'summary' },
		);
	},
	describe: (effectDefinition, translationContext) => {
		const subEffectSummaries = describeEffects(
			effectDefinition.effects || [],
			translationContext,
		);
		const evaluation = effectDefinition.params?.['evaluation'] as
			| { type: string; id: string }
			| undefined;
		if (evaluation) {
			const handler = MODIFIER_EVAL_HANDLERS[evaluation.type];
			return handler
				? handler.describe(effectDefinition, evaluation, translationContext)
				: [];
		}
		const actionId = effectDefinition.params?.['actionId'] as
			| string
			| undefined;
		const actionInfo = actionId
			? getActionInfo(translationContext, actionId)
			: { icon: '', name: 'all actions' };
		return wrapResultModifierEntries(
			RESULT_MODIFIER_INFO,
			subEffectSummaries,
			actionInfo,
			RESULT_EVENT_RESOLVE,
			{ mode: 'describe' },
		);
	},
});
