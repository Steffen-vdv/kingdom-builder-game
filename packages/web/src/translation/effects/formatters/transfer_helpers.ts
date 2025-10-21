import type { EffectDef } from '@kingdom-builder/protocol';
import { GENERAL_RESOURCE_ICON } from '../../../icons';
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

	const transferDescriptor =
		evaluation?.type === 'transfer_pct'
			? selectTransferDescriptor(translationContext)
			: undefined;
	const resourceTransfersLabel = transferDescriptor
		? `${GENERAL_RESOURCE_ICON}${transferDescriptor.icon} Resource Transfers`
		: undefined;

	let fallbackName = 'affected actions';
	if (paramActionId) {
		fallbackName = humanizeIdentifier(paramActionId) || paramActionId;
	} else if (evaluationId) {
		fallbackName = humanizeIdentifier(evaluationId) || evaluationId;
	} else if (evaluation?.type === 'transfer_pct') {
		fallbackName = resourceTransfersLabel ?? 'resource transfers';
	} else if (evaluation) {
		fallbackName = humanizeIdentifier(evaluation.type) || evaluation.type;
	}
	if (
		evaluation?.type === 'transfer_pct' &&
		(!evaluationId || evaluationId === 'percent')
	) {
		fallbackName = resourceTransfersLabel ?? 'resource transfers';
	}

	const clauseTarget = formatTargetLabel('', fallbackName);
	const summaryLabel =
		evaluation?.type === 'transfer_pct'
			? fallbackName === resourceTransfersLabel
				? (resourceTransfersLabel ?? '')
				: (transferDescriptor?.icon ?? fallbackName)
			: fallbackName;
	return {
		icon: '',
		name: fallbackName,
		summaryLabel,
		clauseTarget,
	};
}
