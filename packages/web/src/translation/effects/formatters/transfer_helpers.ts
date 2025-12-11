import type { EffectDef } from '@kingdom-builder/protocol';
import { formatTargetLabel } from './modifier_helpers';
import { getActionInfo } from './modifier_targets';
import {
	selectTransferDescriptor,
	selectActionDescriptor,
} from '../registrySelectors';
import { humanizeIdentifier } from '../stringUtils';
import type { TranslationContext } from '../../context';

export interface TransferModifierTarget {
	actionId?: string;
	icon: string;
	name: string;
	summaryLabel: string;
	clauseTarget: string;
}

export function resolveTransferModifierTarget(
	effectDefinition: EffectDef,
	evaluation: { type: string; id: string } | undefined,
	translationContext: TranslationContext,
): TransferModifierTarget {
	const params = effectDefinition.params ?? {};
	// Validate transfer descriptor is available (will throw if missing)
	selectTransferDescriptor(translationContext);
	const rawActionId = params['actionId'];
	const paramActionId =
		typeof rawActionId === 'string' ? rawActionId : undefined;
	const evaluationId = evaluation?.id;
	const candidates = [paramActionId, evaluationId].filter(
		(id): id is string => typeof id === 'string' && id.length > 0,
	);

	for (const candidate of candidates) {
		if (!translationContext.actions.has(candidate)) {
			continue;
		}
		const actionInfo = getActionInfo(translationContext, candidate);
		const hasIcon = actionInfo.icon && actionInfo.icon.trim().length > 0;
		const summaryLabel = hasIcon ? actionInfo.icon : actionInfo.name;
		return {
			actionId: candidate,
			icon: actionInfo.icon,
			name: actionInfo.name,
			summaryLabel,
			clauseTarget: formatTargetLabel(actionInfo.icon, actionInfo.name),
		};
	}

	// For global transfer modifiers, use the action keyword for "All Actions"
	const actionKeyword = selectActionDescriptor(translationContext);
	const globalActionName = `All ${actionKeyword.plural}`;
	let fallbackName = globalActionName;
	if (paramActionId) {
		fallbackName = humanizeIdentifier(paramActionId) || paramActionId;
	} else if (evaluationId) {
		fallbackName = humanizeIdentifier(evaluationId) || evaluationId;
	} else if (evaluation) {
		fallbackName = humanizeIdentifier(evaluation.type) || globalActionName;
	}
	if (
		(evaluation?.type === 'transfer_pct' ||
			evaluation?.type === 'transfer_amount') &&
		(!evaluationId || evaluationId === 'percent' || evaluationId === 'amount')
	) {
		fallbackName = globalActionName;
	}

	const clauseTarget = formatTargetLabel(actionKeyword.icon, fallbackName);
	const summaryLabel = actionKeyword.icon;
	return {
		icon: actionKeyword.icon,
		name: fallbackName,
		summaryLabel,
		clauseTarget,
	};
}
