import type { EffectDef } from '@kingdom-builder/protocol';
import { formatTargetLabel } from './modifier_helpers';
import { getActionInfo } from './modifier_targets';
import { selectTransferDescriptor } from '../registrySelectors';
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

	let fallbackName = 'affected actions';
	if (paramActionId) {
		fallbackName = humanizeIdentifier(paramActionId) || paramActionId;
	} else if (evaluationId) {
		fallbackName = humanizeIdentifier(evaluationId) || evaluationId;
	} else if (
		evaluation?.type === 'transfer_pct' ||
		evaluation?.type === 'transfer_amt'
	) {
		fallbackName = 'resource transfers';
	} else if (evaluation) {
		fallbackName = humanizeIdentifier(evaluation.type) || evaluation.type;
	}
	if (
		(evaluation?.type === 'transfer_pct' &&
			(!evaluationId || evaluationId === 'percent')) ||
		(evaluation?.type === 'transfer_amt' &&
			(!evaluationId || evaluationId === 'amount'))
	) {
		fallbackName = 'resource transfers';
	}

	const clauseTarget = formatTargetLabel('', fallbackName);
	const summaryLabel =
		evaluation?.type === 'transfer_pct' || evaluation?.type === 'transfer_amt'
			? selectTransferDescriptor(translationContext).icon
			: fallbackName;
	return {
		icon: '',
		name: fallbackName,
		summaryLabel,
		clauseTarget,
	};
}
