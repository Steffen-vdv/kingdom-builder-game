import type { EffectDef } from '@kingdom-builder/protocol';
import type { ActionDef } from '@kingdom-builder/contents';
import { formatTargetLabel, formatGainFrom } from './modifier_helpers';
import type { ResultModifierLabel } from './modifier_helpers';
import type { TranslationContext } from '../../context';
import { selectPopulationDescriptor } from '../registrySelectors';
import { humanizeIdentifier } from '../stringUtils';

export function formatPopulation(
	label: ResultModifierLabel,
	effectDefinition: EffectDef,
	evaluation: { id: string },
	translationContext: TranslationContext,
	detailed: boolean,
) {
	const { icon, name } = getActionInfo(translationContext, evaluation.id);
	const amount = Number(effectDefinition.params?.['amount'] ?? 0);
	const population = selectPopulationDescriptor(translationContext, undefined);
	const populationLabel = [population.icon, population.label ?? 'Population']
		.filter(Boolean)
		.join(' ')
		.trim();
	const targetDescription =
		`${populationLabel} through ${formatTargetLabel(icon, name)}`.trim();
	return formatGainFrom(
		label,
		{
			summaryTargetIcon: population.icon ?? '',
			summaryContextIcon: icon,
			description: targetDescription,
		},
		amount,
		translationContext,
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
		const fallbackLabel = humanizeIdentifier(id) || id;
		return { icon: '', name: fallbackLabel };
	}
}
