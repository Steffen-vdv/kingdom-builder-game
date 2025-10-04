import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import { formatTargetLabel, getActionInfo } from './modifier_helpers';

export interface TransferModifierTarget {
	actionId?: string;
	icon: string;
	name: string;
	summaryLabel: string;
	clauseTarget: string;
}

export function resolveTransferModifierTarget(
	eff: EffectDef,
	evaluation: { type: string; id: string } | undefined,
	ctx: EngineContext,
): TransferModifierTarget {
	const params = eff.params ?? {};
	const rawActionId = params['actionId'];
	const paramActionId =
		typeof rawActionId === 'string' ? rawActionId : undefined;
	const evaluationId = evaluation?.id;
	const candidates = [paramActionId, evaluationId].filter(
		(id): id is string => typeof id === 'string' && id.length > 0,
	);

	for (const candidate of candidates) {
		if (!ctx.actions.has(candidate)) {
			continue;
		}
		const info = getActionInfo(ctx, candidate);
		const hasIcon = info.icon && info.icon.trim().length > 0;
		const summaryLabel = hasIcon ? info.icon : info.name;
		return {
			actionId: candidate,
			icon: info.icon,
			name: info.name,
			summaryLabel,
			clauseTarget: formatTargetLabel(info.icon, info.name),
		};
	}

	let fallbackName = 'affected actions';
	if (paramActionId) {
		fallbackName = paramActionId;
	} else if (evaluationId) {
		fallbackName = evaluationId;
	} else if (evaluation?.type === 'transfer_pct') {
		fallbackName = 'resource transfers';
	} else if (evaluation) {
		fallbackName = evaluation.type;
	}
	if (
		evaluation?.type === 'transfer_pct' &&
		(!evaluationId || evaluationId === 'percent')
	) {
		fallbackName = 'resource transfers';
	}

	const clauseTarget = formatTargetLabel('', fallbackName);
	return {
		icon: '',
		name: fallbackName,
		summaryLabel: fallbackName,
		clauseTarget,
	};
}
