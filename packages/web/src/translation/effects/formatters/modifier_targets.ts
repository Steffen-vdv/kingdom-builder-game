import type { EffectDef } from '@kingdom-builder/protocol';
import { POPULATION_INFO } from '@kingdom-builder/contents';
import type { ActionDef } from '@kingdom-builder/contents';
import { formatTargetLabel, formatGainFrom } from './modifier_helpers';
import type { ResultModifierLabel } from './modifier_helpers';
import type { TranslationContext } from '../../context';

export function formatPopulation(
	label: ResultModifierLabel,
	eff: EffectDef,
	evaluation: { id: string },
	ctx: TranslationContext,
	detailed: boolean,
) {
	const { icon, name } = getActionInfo(ctx, evaluation.id);
	const amount = Number(eff.params?.['amount'] ?? 0);
	return formatGainFrom(
		label,
		{
			summaryTargetIcon: POPULATION_INFO.icon,
			summaryContextIcon: icon,
			description: `${POPULATION_INFO.icon} ${POPULATION_INFO.label} through ${formatTargetLabel(
				icon,
				name,
			)}`,
		},
		amount,
		{ detailed },
	);
}

export function getActionInfo(ctx: TranslationContext, id: string) {
	try {
		const action: ActionDef = ctx.actions.get(id);
		return { icon: action.icon ?? id, name: action.name ?? id };
	} catch {
		return { icon: id, name: id };
	}
}
