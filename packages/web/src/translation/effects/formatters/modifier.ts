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
	formatPopulation,
	formatResultModifierClause,
	formatTargetLabel,
	getActionInfo,
	wrapResultModifierEntries,
} from './modifier_helpers';
import { resolveTransferModifierTarget } from './transfer_helpers';
import { describeContent } from '../../content';
import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import type { EngineContext, EffectDef } from '@kingdom-builder/engine';
import type { Summary } from '../../content/types';

interface ModifierEvalHandler {
	summarize: (
		eff: EffectDef,
		evaluation: { type: string; id: string },
		ctx: EngineContext,
	) => Summary;
	describe: (
		eff: EffectDef,
		evaluation: { type: string; id: string },
		ctx: EngineContext,
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

registerModifierEvalHandler('development', {
	summarize: (eff, evaluation, ctx) => {
		const summary = formatDevelopment(
			RESULT_MODIFIER_INFO,
			eff,
			evaluation,
			ctx,
			false,
		);
		return toArray(summary);
	},
	describe: (eff, evaluation, ctx) => {
		const description = formatDevelopment(
			RESULT_MODIFIER_INFO,
			eff,
			evaluation,
			ctx,
			true,
		);
		return toArray(description);
	},
});

registerModifierEvalHandler('population', {
	summarize: (eff, evaluation, ctx) => {
		const summary = formatPopulation(
			RESULT_MODIFIER_INFO,
			eff,
			evaluation,
			ctx,
			false,
		);
		return toArray(summary);
	},
	describe: (eff, evaluation, ctx) => {
		const description = formatPopulation(
			RESULT_MODIFIER_INFO,
			eff,
			evaluation,
			ctx,
			true,
		);
		return toArray(description);
	},
});

registerModifierEvalHandler('transfer_pct', {
	summarize: (eff, evaluation, ctx) => {
		const target = resolveTransferModifierTarget(eff, evaluation, ctx);
		const amount = Number(eff.params?.['adjust'] ?? 0);
		const sign = amount >= 0 ? '+' : '';
		return [
			`${RESULT_MODIFIER_INFO.icon}${target.summaryLabel}: ${RESOURCE_TRANSFER_ICON}${sign}${Math.abs(
				amount,
			)}%`,
		];
	},
	describe: (eff, evaluation, ctx) => {
		const target = resolveTransferModifierTarget(eff, evaluation, ctx);
		const amount = Number(eff.params?.['adjust'] ?? 0);
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
			const card = describeContent('action', target.actionId, ctx);
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
	summarize: (eff, ctx) => {
		const key = eff.params?.['key'] as string;
		const icon = RESOURCES[key as ResourceKey]?.icon || key;
		const amount = Number(eff.params?.['amount']);
		const actionId = eff.params?.['actionId'] as string | undefined;
		const actionIcon = actionId ? getActionInfo(ctx, actionId).icon : '';
		const prefix = actionId ? `${actionIcon}: ` : ': ';
		return `${modifierInfo.cost.icon}${prefix}${icon}${signed(
			amount,
		)}${Math.abs(amount)}`;
	},
	describe: (eff, ctx) => {
		const key = eff.params?.['key'] as string;
		const icon = RESOURCES[key as ResourceKey]?.icon || key;
		const amount = Number(eff.params?.['amount']);
		const actionId = eff.params?.['actionId'] as string | undefined;
		const { icon: actionIcon, name: actionName } = actionId
			? getActionInfo(ctx, actionId)
			: { icon: '', name: 'all actions' };
		const target = actionId ? `${actionIcon} ${actionName}` : actionName;
		return `${COST_MODIFIER_LABEL} on ${target}: ${increaseOrDecrease(
			amount,
		)} cost by ${icon}${Math.abs(amount)}`;
	},
});

registerEffectFormatter('cost_mod', 'remove', {
	summarize: (eff, ctx) => {
		const key = eff.params?.['key'] as string;
		const icon = RESOURCES[key as ResourceKey]?.icon || key;
		const amount = Number(eff.params?.['amount']);
		const actionId = eff.params?.['actionId'] as string | undefined;
		const actionIcon = actionId ? getActionInfo(ctx, actionId).icon : '';
		const prefix = actionId ? `${actionIcon}: ` : ': ';
		const delta = -amount;
		const sign = delta >= 0 ? '+' : '-';
		return `${modifierInfo.cost.icon}${prefix}${icon}${sign}${Math.abs(delta)}`;
	},
	describe: (eff, ctx) => {
		const key = eff.params?.['key'] as string;
		const icon = RESOURCES[key as ResourceKey]?.icon || key;
		const amount = Number(eff.params?.['amount']);
		const actionId = eff.params?.['actionId'] as string | undefined;
		const { icon: actionIcon, name: actionName } = actionId
			? getActionInfo(ctx, actionId)
			: { icon: '', name: 'all actions' };
		const target = actionId ? `${actionIcon} ${actionName}` : actionName;
		return `${COST_MODIFIER_LABEL} on ${target}: ${increaseOrDecrease(
			-amount,
		)} cost by ${icon}${Math.abs(amount)}`;
	},
});

registerEffectFormatter('result_mod', 'add', {
	summarize: (eff, ctx) => {
		const sub = summarizeEffects(eff.effects || [], ctx);
		const evaluation = eff.params?.['evaluation'] as
			| { type: string; id: string }
			| undefined;
		if (evaluation) {
			const handler = MODIFIER_EVAL_HANDLERS[evaluation.type];
			return handler ? handler.summarize(eff, evaluation, ctx) : [];
		}
		const actionId = eff.params?.['actionId'] as string | undefined;
		const { icon: actionIcon, name: actionName } = actionId
			? getActionInfo(ctx, actionId)
			: { icon: '', name: 'all actions' };
		return wrapResultModifierEntries(
			RESULT_MODIFIER_INFO,
			sub,
			{ icon: actionIcon, name: actionName },
			RESULT_EVENT_RESOLVE,
			{ mode: 'summary' },
		);
	},
	describe: (eff, ctx) => {
		const sub = describeEffects(eff.effects || [], ctx);
		const evaluation = eff.params?.['evaluation'] as
			| { type: string; id: string }
			| undefined;
		if (evaluation) {
			const handler = MODIFIER_EVAL_HANDLERS[evaluation.type];
			return handler ? handler.describe(eff, evaluation, ctx) : [];
		}
		const actionId = eff.params?.['actionId'] as string | undefined;
		const actionInfo = actionId
			? getActionInfo(ctx, actionId)
			: { icon: '', name: 'all actions' };
		return wrapResultModifierEntries(
			RESULT_MODIFIER_INFO,
			sub,
			actionInfo,
			RESULT_EVENT_RESOLVE,
			{ mode: 'describe' },
		);
	},
});
