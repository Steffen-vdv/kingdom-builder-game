import type { EffectDef } from '@kingdom-builder/protocol';
import { POPULATION_INFO } from '@kingdom-builder/contents';
import type { ActionDef } from '@kingdom-builder/contents';
import { formatTargetLabel, formatGainFrom } from './modifier_helpers';
import type { ResultModifierLabel } from './modifier_helpers';
import type { TranslationContext } from '../../context';

export function formatPopulation(
	label: ResultModifierLabel,
	effectDefinition: EffectDef,
	evaluation: { id: string },
	translationContext: TranslationContext,
	detailed: boolean,
) {
	const { icon, name } = getActionInfo(translationContext, evaluation.id);
	const amount = Number(effectDefinition.params?.['amount'] ?? 0);
	const targetDescription = `${POPULATION_INFO.icon} ${POPULATION_INFO.label} through ${formatTargetLabel(
		icon,
		name,
	)}`;
	return formatGainFrom(
		label,
		{
			summaryTargetIcon: POPULATION_INFO.icon,
			summaryContextIcon: icon,
			description: targetDescription,
		},
		amount,
		{ detailed },
	);
}

export function getActionInfo(
	translationContext: TranslationContext,
	id: string,
) {
	try {
		const actionDefinition: ActionDef = translationContext.actions.get(id);
		return {
			icon: actionDefinition.icon ?? id,
			name: actionDefinition.name ?? id,
		};
	} catch {
		return { icon: id, name: id };
	}
}
